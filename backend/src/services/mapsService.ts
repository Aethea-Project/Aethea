/**
 * Maps Service — secure Google Maps proxy with caching and request deduplication.
 */

import { createHash } from 'node:crypto';
import { AppError } from '../lib/AppError.js';
import logger from '../lib/logger.js';
import { getRedisClient } from '../lib/redisClient.js';

const GOOGLE_TIMEOUT_MS = 8_000;
const DEFAULT_CACHE_TTL_SECONDS = 10 * 60;
const MEMORY_CACHE_MAX_ITEMS = 300;

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

export async function findNearbyPlaces(input: {
  lat: number;
  lng: number;
  type: NearbyType;
  radius: number;
  limit: number;
  language?: string;
}): Promise<NearbyPlace[]> {
  const apiKey = getGoogleMapsApiKey();

  const normalizedLat = roundCoord(input.lat);
  const normalizedLng = roundCoord(input.lng);
  const cacheRawKey = `nearby:${input.type}:${normalizedLat}:${normalizedLng}:${input.radius}:${input.limit}:${input.language ?? 'en'}`;

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

    const results = response.results ?? [];

    return results
      .slice(0, input.limit)
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
