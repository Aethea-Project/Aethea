/**
 * Maps Service — secure Google Maps proxy with caching and request deduplication.
 */

import { createHash } from 'node:crypto';
import { AppError } from '../lib/AppError.js';
import logger from '../lib/logger.js';
import { getRedisClient } from '../lib/redisClient.js';
import { listDoctors } from '../repositories/doctorRepository.js';

const GOOGLE_TIMEOUT_MS = 8_000;
const DEFAULT_CACHE_TTL_SECONDS = 10 * 60;
const MEMORY_CACHE_MAX_ITEMS = 300;
const REGISTERED_DOCTOR_FETCH_LIMIT = 40;
const REGISTERED_DOCTOR_GEO_BATCH_SIZE = 6;
const LOCATION_MATCH_MAX_DISTANCE_METERS = 120;

type NearbyType = 'doctor' | 'hospital' | 'pharmacy';
type RouteMode = 'driving' | 'walking';

interface CacheEntry {
  expiresAt: number;
  value: unknown;
}

interface GoogleApiErrorPayload {
  status?: string;
  error_message?: string;
}

interface GoogleNearbyResult {
  place_id?: string;
  name?: string;
  vicinity?: string;
  rating?: number;
  user_ratings_total?: number;
  opening_hours?: { open_now?: boolean };
  geometry?: {
    location?: {
      lat?: number;
      lng?: number;
    };
  };
}

interface GoogleNearbyResponse extends GoogleApiErrorPayload {
  results?: GoogleNearbyResult[];
}

interface GoogleAddressComponent {
  long_name?: string;
  types?: string[];
}

interface GoogleGeocodeResult {
  place_id?: string;
  formatted_address?: string;
  address_components?: GoogleAddressComponent[];
  geometry?: {
    location?: {
      lat?: number;
      lng?: number;
    };
  };
}

interface GoogleGeocodeResponse extends GoogleApiErrorPayload {
  results?: GoogleGeocodeResult[];
}

interface GoogleDirectionsLeg {
  distance?: {
    text?: string;
    value?: number;
  };
  duration?: {
    text?: string;
    value?: number;
  };
}

interface GoogleDirectionsRoute {
  summary?: string;
  legs?: GoogleDirectionsLeg[];
}

interface GoogleDirectionsResponse extends GoogleApiErrorPayload {
  routes?: GoogleDirectionsRoute[];
}

export interface NearbyPlace {
  id: string;
  name: string;
  address: string;
  rating: number | null;
  ratingsCount: number;
  openNow: boolean | null;
  location: {
    lat: number;
    lng: number;
  };
}

export interface AddressCandidate {
  placeId: string;
  formattedAddress: string;
  city: string | null;
  location: {
    lat: number;
    lng: number;
  };
}

export interface FastestRouteSummary {
  distanceText: string;
  durationText: string;
  distanceMeters: number;
  durationSeconds: number;
  routeSummary: string;
  mode: RouteMode;
}

type ListedDoctor = Awaited<ReturnType<typeof listDoctors>>['rows'][number];

interface LatLng {
  lat: number;
  lng: number;
}

const memoryCache = new Map<string, CacheEntry>();
const pendingRequests = new Map<string, Promise<unknown>>();

function getGoogleMapsApiKey(): string {
  const key = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (!key) {
    throw new AppError('Maps service is not configured', 503, 'MAPS_UNAVAILABLE');
  }
  return key;
}

function hashCacheKey(prefix: string, raw: string): string {
  const hash = createHash('sha1').update(raw).digest('hex');
  return `${prefix}:${hash}`;
}

function roundCoord(value: number, decimals = 4): number {
  return Number(value.toFixed(decimals));
}

function pruneMemoryCache(): void {
  if (memoryCache.size <= MEMORY_CACHE_MAX_ITEMS) {
    return;
  }

  const keys = memoryCache.keys();
  while (memoryCache.size > MEMORY_CACHE_MAX_ITEMS) {
    const next = keys.next();
    if (next.done) {
      break;
    }
    memoryCache.delete(next.value);
  }
}

function readMemoryCache<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    memoryCache.delete(key);
    return null;
  }

  return entry.value as T;
}

function writeMemoryCache(key: string, value: unknown, ttlSeconds: number): void {
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
  pruneMemoryCache();
}

async function readRedisCache<T>(key: string): Promise<T | null> {
  const redis = await getRedisClient();
  if (!redis) {
    return null;
  }

  try {
    const raw = await redis.get(key);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as T;
  } catch (error) {
    logger.warn({ err: error, key }, 'Redis read failed for map cache key');
    return null;
  }
}

async function writeRedisCache(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) {
    return;
  }

  try {
    await redis.set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch (error) {
    logger.warn({ err: error, key }, 'Redis write failed for map cache key');
  }
}

async function withCache<T>(rawKey: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
  const cacheKey = hashCacheKey('maps', rawKey);

  const memoryHit = readMemoryCache<T>(cacheKey);
  if (memoryHit) {
    return memoryHit;
  }

  const redisHit = await readRedisCache<T>(cacheKey);
  if (redisHit) {
    writeMemoryCache(cacheKey, redisHit, ttlSeconds);
    return redisHit;
  }

  const inFlight = pendingRequests.get(cacheKey) as Promise<T> | undefined;
  if (inFlight) {
    return inFlight;
  }

  const request = (async () => {
    const value = await loader();
    writeMemoryCache(cacheKey, value, ttlSeconds);
    await writeRedisCache(cacheKey, value, ttlSeconds);
    return value;
  })();

  pendingRequests.set(cacheKey, request);

  try {
    return await request;
  } finally {
    pendingRequests.delete(cacheKey);
  }
}

async function fetchGoogleJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GOOGLE_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });

    const payload = (await response.json()) as T;

    if (!response.ok) {
      throw new AppError('Map provider request failed', 502, 'MAPS_UPSTREAM_FAILED');
    }

    return payload;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new AppError('Map provider request timed out', 504, 'MAPS_TIMEOUT');
    }
    throw new AppError('Failed to reach map provider', 502, 'MAPS_UPSTREAM_FAILED');
  } finally {
    clearTimeout(timeout);
  }
}

function assertGoogleStatus(status: string | undefined, errorMessage: string | undefined): void {
  if (status === 'OK' || status === 'ZERO_RESULTS') {
    return;
  }

  throw new AppError(
    errorMessage || `Map provider returned status: ${status ?? 'unknown'}`,
    502,
    'MAPS_PROVIDER_ERROR',
  );
}

function extractCity(addressComponents: GoogleAddressComponent[] | undefined): string | null {
  if (!addressComponents) {
    return null;
  }

  const cityComponent = addressComponents.find((component) =>
    (component.types ?? []).includes('locality') ||
    (component.types ?? []).includes('administrative_area_level_2'),
  );

  return cityComponent?.long_name?.trim() || null;
}

function normalizeComparableText(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function calculateDistanceMeters(origin: LatLng, destination: LatLng): number {
  const earthRadiusMeters = 6_371_000;
  const latDelta = toRadians(destination.lat - origin.lat);
  const lngDelta = toRadians(destination.lng - origin.lng);
  const latA = toRadians(origin.lat);
  const latB = toRadians(destination.lat);

  const a =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.sin(lngDelta / 2) * Math.sin(lngDelta / 2) * Math.cos(latA) * Math.cos(latB);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMeters * c;
}

function buildDoctorGeoQueries(doctor: ListedDoctor): string[] {
  const address = doctor.address?.trim() || '';
  const clinicName = doctor.clinicName?.trim() || '';
  const city = doctor.city?.trim() || '';

  const values = [
    [address, city].filter(Boolean).join(', '),
    [clinicName, address, city].filter(Boolean).join(', '),
    [clinicName, city].filter(Boolean).join(', '),
    address,
  ].filter((value) => value.length > 0);

  return Array.from(new Set(values));
}

async function resolveRegisteredDoctorPlace(doctor: ListedDoctor, language?: string): Promise<NearbyPlace | null> {
  const queries = buildDoctorGeoQueries(doctor);
  if (queries.length === 0) {
    return null;
  }

  let candidate: AddressCandidate | null = null;

  for (const query of queries) {
    try {
      const [first] = await searchAddressCandidates({
        query,
        limit: 1,
        language,
      });

      if (first) {
        candidate = first;
        break;
      }
    } catch (error) {
      logger.warn({ err: error, doctorId: doctor.id, query }, 'Could not geocode registered doctor address');
    }
  }

  if (!candidate) {
    return null;
  }

  const name = `Dr. ${doctor.firstName} ${doctor.lastName}`;
  const fallbackAddress = [doctor.address, doctor.clinicName, doctor.city]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .join(', ');

  return {
    id: `aethea-doctor:${doctor.id}`,
    name,
    address: fallbackAddress || candidate.formattedAddress,
    rating: null,
    ratingsCount: 0,
    openNow: null,
    location: candidate.location,
  };
}

async function fetchRegisteredDoctorPlaces(input: {
  lat: number;
  lng: number;
  radius: number;
  limit: number;
  language?: string;
  search?: string;
  specialty?: string;
}): Promise<NearbyPlace[]> {
  const { rows } = await listDoctors(
    {
      search: input.search,
      specialty: input.specialty,
    },
    0,
    REGISTERED_DOCTOR_FETCH_LIMIT,
  );

  const doctorsWithLocation = rows.filter((doctor) => buildDoctorGeoQueries(doctor).length > 0);
  if (doctorsWithLocation.length === 0) {
    return [];
  }

  const origin = { lat: input.lat, lng: input.lng };
  const nearbyMatches: NearbyPlace[] = [];
  const desiredMatchCount = Math.max(input.limit * 2, input.limit);

  for (let start = 0; start < doctorsWithLocation.length; start += REGISTERED_DOCTOR_GEO_BATCH_SIZE) {
    const batch = doctorsWithLocation.slice(start, start + REGISTERED_DOCTOR_GEO_BATCH_SIZE);
    const resolvedBatch = await Promise.all(
      batch.map((doctor) => resolveRegisteredDoctorPlace(doctor, input.language)),
    );

    for (const place of resolvedBatch) {
      if (!place) {
        continue;
      }

      const distanceMeters = calculateDistanceMeters(origin, place.location);
      if (distanceMeters <= input.radius) {
        nearbyMatches.push(place);
      }
    }

    if (nearbyMatches.length >= desiredMatchCount) {
      break;
    }
  }

  return nearbyMatches;
}

function isLikelySamePlace(a: NearbyPlace, b: NearbyPlace): boolean {
  const distance = calculateDistanceMeters(a.location, b.location);
  if (distance <= 30) {
    return true;
  }

  if (distance > LOCATION_MATCH_MAX_DISTANCE_METERS) {
    return false;
  }

  const nameA = normalizeComparableText(a.name);
  const nameB = normalizeComparableText(b.name);
  if (nameA && nameB && (nameA === nameB || nameA.includes(nameB) || nameB.includes(nameA))) {
    return true;
  }

  const addressA = normalizeComparableText(a.address);
  const addressB = normalizeComparableText(b.address);

  return Boolean(addressA && addressB && (addressA === addressB || addressA.includes(addressB) || addressB.includes(addressA)));
}

function getPlaceQualityScore(place: NearbyPlace): number {
  let score = 0;

  if (place.id.startsWith('aethea-doctor:')) {
    score += 30;
  }

  if (typeof place.rating === 'number') {
    score += place.rating * 20;
  }

  score += Math.min(place.ratingsCount, 1000) / 20;

  if (place.openNow === true) {
    score += 5;
  }

  if (place.address && place.address !== 'Address unavailable') {
    score += 3;
  }

  return score;
}

function pickPreferredPlace(existing: NearbyPlace, incoming: NearbyPlace): NearbyPlace {
  const existingScore = getPlaceQualityScore(existing);
  const incomingScore = getPlaceQualityScore(incoming);

  if (incomingScore > existingScore) {
    return incoming;
  }

  if (existingScore > incomingScore) {
    return existing;
  }

  if (incoming.ratingsCount > existing.ratingsCount) {
    return incoming;
  }

  return existing;
}

function mergeDoctorPlaces(input: {
  googlePlaces: NearbyPlace[];
  registeredPlaces: NearbyPlace[];
  origin: LatLng;
  limit: number;
}): NearbyPlace[] {
  const merged: NearbyPlace[] = [];

  for (const candidate of [...input.registeredPlaces, ...input.googlePlaces]) {
    const duplicateIndex = merged.findIndex((existing) => isLikelySamePlace(existing, candidate));

    if (duplicateIndex >= 0) {
      merged[duplicateIndex] = pickPreferredPlace(merged[duplicateIndex], candidate);
      continue;
    }

    merged.push(candidate);
  }

  return merged
    .sort(
      (a, b) =>
        calculateDistanceMeters(input.origin, a.location) - calculateDistanceMeters(input.origin, b.location),
    )
    .slice(0, input.limit);
}

export async function findNearbyPlaces(input: {
  lat: number;
  lng: number;
  type: NearbyType;
  radius: number;
  limit: number;
  search?: string;
  specialty?: string;
  language?: string;
}): Promise<NearbyPlace[]> {
  const apiKey = getGoogleMapsApiKey();

  const normalizedSearch = input.search?.trim() || undefined;
  const normalizedSpecialty = input.specialty?.trim() || undefined;

  const normalizedLat = roundCoord(input.lat);
  const normalizedLng = roundCoord(input.lng);
  const cacheRawKey = `nearby:${input.type}:${normalizedLat}:${normalizedLng}:${input.radius}:${input.limit}:${normalizedSearch ?? '-'}:${normalizedSpecialty ?? '-'}:${input.language ?? 'en'}`;

  return withCache(cacheRawKey, DEFAULT_CACHE_TTL_SECONDS, async () => {
    const params = new URLSearchParams({
      key: apiKey,
      location: `${input.lat},${input.lng}`,
      radius: String(input.radius),
      type: input.type,
      language: input.language ?? 'en',
    });

    const response = await fetchGoogleJson<GoogleNearbyResponse>(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params.toString()}`,
    );

    assertGoogleStatus(response.status, response.error_message);

    const googlePlaces = (response.results ?? [])
      .map((place): NearbyPlace | null => {
        const lat = place.geometry?.location?.lat;
        const lng = place.geometry?.location?.lng;

        if (!place.place_id || !place.name || typeof lat !== 'number' || typeof lng !== 'number') {
          return null;
        }

        return {
          id: place.place_id,
          name: place.name,
          address: place.vicinity || 'Address unavailable',
          rating: typeof place.rating === 'number' ? place.rating : null,
          ratingsCount: typeof place.user_ratings_total === 'number' ? place.user_ratings_total : 0,
          openNow: typeof place.opening_hours?.open_now === 'boolean' ? place.opening_hours.open_now : null,
          location: { lat, lng },
        };
      })
      .filter((place): place is NearbyPlace => place !== null);

    if (input.type !== 'doctor') {
      return googlePlaces.slice(0, input.limit);
    }

    const registeredPlaces = await fetchRegisteredDoctorPlaces({
      lat: input.lat,
      lng: input.lng,
      radius: input.radius,
      limit: input.limit,
      language: input.language,
      search: normalizedSearch,
      specialty: normalizedSpecialty,
    });

    return mergeDoctorPlaces({
      googlePlaces,
      registeredPlaces,
      origin: { lat: input.lat, lng: input.lng },
      limit: input.limit,
    });
  });
}

export async function searchAddressCandidates(input: {
  query: string;
  limit: number;
  language?: string;
}): Promise<AddressCandidate[]> {
  const apiKey = getGoogleMapsApiKey();
  const cacheRawKey = `geocode:${input.query.toLowerCase()}:${input.limit}:${input.language ?? 'en'}`;

  return withCache(cacheRawKey, DEFAULT_CACHE_TTL_SECONDS, async () => {
    const params = new URLSearchParams({
      key: apiKey,
      address: input.query,
      language: input.language ?? 'en',
    });

    const response = await fetchGoogleJson<GoogleGeocodeResponse>(
      `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`,
    );

    assertGoogleStatus(response.status, response.error_message);

    return (response.results ?? [])
      .slice(0, input.limit)
      .map((item): AddressCandidate | null => {
        const lat = item.geometry?.location?.lat;
        const lng = item.geometry?.location?.lng;

        if (!item.place_id || !item.formatted_address || typeof lat !== 'number' || typeof lng !== 'number') {
          return null;
        }

        return {
          placeId: item.place_id,
          formattedAddress: item.formatted_address,
          city: extractCity(item.address_components),
          location: { lat, lng },
        };
      })
      .filter((item): item is AddressCandidate => item !== null);
  });
}

export async function reverseGeocode(input: {
  lat: number;
  lng: number;
  language?: string;
}): Promise<AddressCandidate | null> {
  const apiKey = getGoogleMapsApiKey();
  const cacheRawKey = `reverse-geocode:${roundCoord(input.lat)}:${roundCoord(input.lng)}:${input.language ?? 'en'}`;

  return withCache(cacheRawKey, DEFAULT_CACHE_TTL_SECONDS, async () => {
    const params = new URLSearchParams({
      key: apiKey,
      latlng: `${input.lat},${input.lng}`,
      language: input.language ?? 'en',
    });

    const response = await fetchGoogleJson<GoogleGeocodeResponse>(
      `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`,
    );

    assertGoogleStatus(response.status, response.error_message);

    const first = response.results?.[0];
    if (!first) {
      return null;
    }

    const lat = first.geometry?.location?.lat;
    const lng = first.geometry?.location?.lng;
    if (!first.place_id || !first.formatted_address || typeof lat !== 'number' || typeof lng !== 'number') {
      return null;
    }

    return {
      placeId: first.place_id,
      formattedAddress: first.formatted_address,
      city: extractCity(first.address_components),
      location: { lat, lng },
    };
  });
}

export async function getFastestRoute(input: {
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  mode: RouteMode;
  language?: string;
}): Promise<FastestRouteSummary> {
  const apiKey = getGoogleMapsApiKey();
  const cacheRawKey = `route:${roundCoord(input.originLat, 3)}:${roundCoord(input.originLng, 3)}:${roundCoord(input.destinationLat, 3)}:${roundCoord(input.destinationLng, 3)}:${input.mode}:${input.language ?? 'en'}`;

  return withCache(cacheRawKey, 5 * 60, async () => {
    const params = new URLSearchParams({
      key: apiKey,
      origin: `${input.originLat},${input.originLng}`,
      destination: `${input.destinationLat},${input.destinationLng}`,
      mode: input.mode,
      alternatives: 'false',
      language: input.language ?? 'en',
    });

    const response = await fetchGoogleJson<GoogleDirectionsResponse>(
      `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`,
    );

    assertGoogleStatus(response.status, response.error_message);

    const route = response.routes?.[0];
    const leg = route?.legs?.[0];

    if (!route || !leg?.distance?.text || !leg.duration?.text || typeof leg.distance.value !== 'number' || typeof leg.duration.value !== 'number') {
      throw new AppError('Unable to calculate route right now', 502, 'MAPS_ROUTE_UNAVAILABLE');
    }

    return {
      distanceText: leg.distance.text,
      durationText: leg.duration.text,
      distanceMeters: leg.distance.value,
      durationSeconds: leg.duration.value,
      routeSummary: route.summary || 'Best route',
      mode: input.mode,
    };
  });
}
