/**
 * Maps Google Client — typed HTTP client for Google Maps API
 *
 * Handles timeouts, error detection, and API key resolution.
 */

import { AppError } from '../../lib/AppError.js';

const GOOGLE_TIMEOUT_MS = 8_000;

/* ─── Google API Response Types ─── */

interface GoogleApiErrorPayload {
  status?: string;
  error_message?: string;
}

export interface GoogleNearbyResult {
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

export interface GoogleNearbyResponse extends GoogleApiErrorPayload {
  results?: GoogleNearbyResult[];
}

export interface GoogleGeocodeResult {
  place_id?: string;
  formatted_address?: string;
  address_components?: {
    long_name?: string;
    types?: string[];
  }[];
  geometry?: {
    location?: {
      lat?: number;
      lng?: number;
    };
  };
}

export interface GoogleGeocodeResponse extends GoogleApiErrorPayload {
  results?: GoogleGeocodeResult[];
}

interface GoogleDirectionsLeg {
  distance?: { text?: string; value?: number };
  duration?: { text?: string; value?: number };
}

interface GoogleDirectionsRoute {
  summary?: string;
  legs?: GoogleDirectionsLeg[];
}

export interface GoogleDirectionsResponse extends GoogleApiErrorPayload {
  routes?: GoogleDirectionsRoute[];
}

/* ─── Core Utilities ─── */

export function getGoogleMapsApiKey(): string {
  const key = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (!key) {
    throw new AppError('Maps service is not configured', 503, 'MAPS_UNAVAILABLE');
  }
  return key;
}

export async function fetchGoogleJson<T>(url: string): Promise<T> {
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

export function assertGoogleStatus(status: string | undefined, errorMessage: string | undefined): void {
  if (status === 'OK' || status === 'ZERO_RESULTS') {
    return;
  }

  throw new AppError(
    errorMessage || `Map provider returned status: ${status ?? 'unknown'}`,
    502,
    'MAPS_PROVIDER_ERROR',
  );
}
