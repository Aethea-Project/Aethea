/**
 * Maps Geo Utilities — pure functions for geographic calculations
 *
 * No external dependencies. Safe to unit test in isolation.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export function roundCoord(value: number, decimals = 4): number {
  return Number(value.toFixed(decimals));
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

/**
 * Haversine formula for distance between two lat/lng points.
 */
export function calculateDistanceMeters(origin: LatLng, destination: LatLng): number {
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

export function normalizeComparableText(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface GoogleAddressComponent {
  long_name?: string;
  types?: string[];
}

export function extractCity(addressComponents: GoogleAddressComponent[] | undefined): string | null {
  if (!addressComponents) {
    return null;
  }

  const cityComponent = addressComponents.find((component) =>
    (component.types ?? []).includes('locality') ||
    (component.types ?? []).includes('administrative_area_level_2'),
  );

  return cityComponent?.long_name?.trim() || null;
}
