/**
 * Maps Service — secure Google Maps proxy with caching and doctor matching.
 *
 * This is the slim orchestrator that composes:
 *  - cache.ts (two-tier Memory LRU + Redis caching)
 *  - client.ts (Google API HTTP client)
 *  - geo.ts (Haversine distance, coordinate utils)
 *
 * Public exports: findNearbyPlaces, searchAddressCandidates, reverseGeocode, getFastestRoute
 */

import logger from '../../lib/logger.js';
import { listDoctors } from '../../repositories/doctorRepository.js';
import { withCache, DEFAULT_CACHE_TTL_SECONDS } from './cache.js';
import {
  getGoogleMapsApiKey,
  fetchGoogleJson,
  assertGoogleStatus,
  type GoogleNearbyResponse,
  type GoogleGeocodeResponse,
  type GoogleDirectionsResponse,
} from './client.js';
import {
  roundCoord,
  calculateDistanceMeters,
  normalizeComparableText,
  extractCity,
  type LatLng,
} from './geo.js';

/* ─── Constants ─── */

const REGISTERED_DOCTOR_FETCH_LIMIT = 40;
const REGISTERED_DOCTOR_GEO_BATCH_SIZE = 6;
const LOCATION_MATCH_MAX_DISTANCE_METERS = 120;

type NearbyType = 'doctor' | 'hospital' | 'pharmacy';
type RouteMode = 'driving' | 'walking';

/* ─── Public Types ─── */

export interface NearbyPlace {
  id: string;
  name: string;
  address: string;
  rating: number | null;
  ratingsCount: number;
  openNow: boolean | null;
  location: LatLng;
}

export interface AddressCandidate {
  placeId: string;
  formattedAddress: string;
  city: string | null;
  location: LatLng;
}

export interface FastestRouteSummary {
  distanceText: string;
  durationText: string;
  distanceMeters: number;
  durationSeconds: number;
  routeSummary: string;
  mode: RouteMode;
}

/* ─── Doctor Place Matching ─── */

type ListedDoctor = Awaited<ReturnType<typeof listDoctors>>['rows'][number];

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

/* ─── Place Deduplication & Scoring ─── */

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

  if (incomingScore > existingScore) return incoming;
  if (existingScore > incomingScore) return existing;
  if (incoming.ratingsCount > existing.ratingsCount) return incoming;

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

/* ─── Public API ─── */

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
      throw new (await import('../../lib/AppError.js')).AppError('Unable to calculate route right now', 502, 'MAPS_ROUTE_UNAVAILABLE');
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
