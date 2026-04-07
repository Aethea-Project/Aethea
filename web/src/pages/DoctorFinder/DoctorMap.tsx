import React, { useMemo, useState } from 'react';
import type { FastestRoute, NearbyPlace } from '../../services/medicalApi';

interface LatLng {
  lat: number;
  lng: number;
}

interface DoctorMapProps {
  loading: boolean;
  error: string | null;
  userLocation: LatLng;
  nearbyDoctors: NearbyPlace[];
  nearbyHospitals: NearbyPlace[];
  nearbyPharmacies: NearbyPlace[];
  routeByPlaceId: Record<string, FastestRoute | undefined>;
  routeLoadingPlaceId: string | null;
  onEstimateRoute: (place: NearbyPlace) => void;
}

interface NearbyPlaceWithDistance extends NearbyPlace {
  distanceKm: number;
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function calculateDistanceKm(origin: LatLng, destination: LatLng): number {
  const earthRadiusKm = 6371;
  const dLat = toRadians(destination.lat - origin.lat);
  const dLng = toRadians(destination.lng - origin.lng);
  const lat1 = toRadians(origin.lat);
  const lat2 = toRadians(destination.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function mapDirectionsLink(destination: LatLng): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}`;
}

function enrichPlaces(places: NearbyPlace[], userLocation: LatLng): NearbyPlaceWithDistance[] {
  return places
    .map((place) => ({
      ...place,
      distanceKm: calculateDistanceKm(userLocation, place.location),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

function applyFilters(
  places: NearbyPlaceWithDistance[],
  maxDistanceKm: number,
  minRating: number,
  openNowOnly: boolean,
): NearbyPlaceWithDistance[] {
  return places.filter((place) => {
    if (place.distanceKm > maxDistanceKm) return false;
    if (place.rating !== null && place.rating < minRating) return false;
    if (openNowOnly && place.openNow !== true) return false;
    return true;
  });
}

function PlacesSection({
  title,
  places,
  routeByPlaceId,
  routeLoadingPlaceId,
  onEstimateRoute,
}: {
  title: string;
  places: NearbyPlaceWithDistance[];
  routeByPlaceId: Record<string, FastestRoute | undefined>;
  routeLoadingPlaceId: string | null;
  onEstimateRoute: (place: NearbyPlace) => void;
}) {
  return (
    <section className="finder-nearby-section" aria-label={title}>
      <h3>{title}</h3>
      {places.length === 0 ? (
        <p className="finder-nearby-empty">No nearby places matching current filters.</p>
      ) : (
        <div className="finder-nearby-list">
          {places.map((place) => {
            const route = routeByPlaceId[place.id];
            return (
              <article key={place.id} className="finder-nearby-card">
                <div className="finder-nearby-main">
                  <p className="finder-nearby-name">{place.name}</p>
                  <p className="finder-nearby-address">{place.address}</p>
                </div>
                <div className="finder-nearby-meta">
                  <span>{place.distanceKm.toFixed(1)} km</span>
                  <span>Rating: {place.rating?.toFixed(1) ?? 'N/A'}</span>
                  <span>{place.openNow === true ? 'Open now' : place.openNow === false ? 'Closed now' : 'Status unknown'}</span>
                </div>
                {route && (
                  <p className="finder-route-pill" aria-live="polite">
                    ETA: {route.durationText} • {route.distanceText}
                  </p>
                )}
                <div className="finder-nearby-actions">
                  <button
                    type="button"
                    className="finder-action-btn"
                    onClick={() => onEstimateRoute(place)}
                    disabled={routeLoadingPlaceId === place.id}
                  >
                    {routeLoadingPlaceId === place.id ? 'Calculating...' : 'Fastest Route'}
                  </button>
                  <a
                    className="finder-action-btn finder-action-link"
                    href={mapDirectionsLink(place.location)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open in Maps
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export const DoctorMap: React.FC<DoctorMapProps> = ({
  loading,
  error,
  userLocation,
  nearbyDoctors,
  nearbyHospitals,
  nearbyPharmacies,
  routeByPlaceId,
  routeLoadingPlaceId,
  onEstimateRoute,
}) => {
  const [maxDistanceKm, setMaxDistanceKm] = useState(10);
  const [minRating, setMinRating] = useState(0);
  const [openNowOnly, setOpenNowOnly] = useState(false);

  const enrichedDoctors = useMemo(() => enrichPlaces(nearbyDoctors, userLocation), [nearbyDoctors, userLocation]);
  const enrichedHospitals = useMemo(() => enrichPlaces(nearbyHospitals, userLocation), [nearbyHospitals, userLocation]);
  const enrichedPharmacies = useMemo(() => enrichPlaces(nearbyPharmacies, userLocation), [nearbyPharmacies, userLocation]);

  const filteredDoctors = useMemo(
    () => applyFilters(enrichedDoctors, maxDistanceKm, minRating, openNowOnly),
    [enrichedDoctors, maxDistanceKm, minRating, openNowOnly],
  );
  const filteredHospitals = useMemo(
    () => applyFilters(enrichedHospitals, maxDistanceKm, minRating, openNowOnly),
    [enrichedHospitals, maxDistanceKm, minRating, openNowOnly],
  );
  const filteredPharmacies = useMemo(
    () => applyFilters(enrichedPharmacies, maxDistanceKm, minRating, openNowOnly),
    [enrichedPharmacies, maxDistanceKm, minRating, openNowOnly],
  );

  const nearestDoctor = filteredDoctors[0] ?? null;

  return (
    <div className="finder-map-shell" aria-busy={loading}>
      <div className="finder-filter-row">
        <label>
          Max distance (km)
          <input
            type="range"
            min={1}
            max={30}
            value={maxDistanceKm}
            onChange={(event) => setMaxDistanceKm(Number(event.target.value))}
          />
          <span>{maxDistanceKm} km</span>
        </label>
        <label>
          Min rating
          <select value={minRating} onChange={(event) => setMinRating(Number(event.target.value))}>
            <option value={0}>Any</option>
            <option value={3}>3.0+</option>
            <option value={3.5}>3.5+</option>
            <option value={4}>4.0+</option>
            <option value={4.5}>4.5+</option>
          </select>
        </label>
        <label className="finder-checkbox-filter">
          <input
            type="checkbox"
            checked={openNowOnly}
            onChange={(event) => setOpenNowOnly(event.target.checked)}
          />
          Open now only
        </label>
      </div>

      {nearestDoctor && (
        <div className="finder-quick-actions" role="region" aria-label="Quick actions">
          <button type="button" className="finder-quick-btn" onClick={() => onEstimateRoute(nearestDoctor)}>
            Nearest Doctor
          </button>
          <button type="button" className="finder-quick-btn" onClick={() => onEstimateRoute(nearestDoctor)}>
            Fastest Route
          </button>
          <a href={mapDirectionsLink(nearestDoctor.location)} target="_blank" rel="noreferrer" className="finder-quick-btn finder-action-link">
            Open Direction
          </a>
        </div>
      )}

      {loading && <p className="loading">Loading nearby medical places...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && (
        <div className="finder-nearby-grid">
          <PlacesSection
            title="Nearby Doctors"
            places={filteredDoctors}
            routeByPlaceId={routeByPlaceId}
            routeLoadingPlaceId={routeLoadingPlaceId}
            onEstimateRoute={onEstimateRoute}
          />
          <PlacesSection
            title="Nearby Hospitals"
            places={filteredHospitals}
            routeByPlaceId={routeByPlaceId}
            routeLoadingPlaceId={routeLoadingPlaceId}
            onEstimateRoute={onEstimateRoute}
          />
          <PlacesSection
            title="Nearby Pharmacies"
            places={filteredPharmacies}
            routeByPlaceId={routeByPlaceId}
            routeLoadingPlaceId={routeLoadingPlaceId}
            onEstimateRoute={onEstimateRoute}
          />
        </div>
      )}
    </div>
  );
};
