import React, { useEffect, useMemo, useState } from 'react';
import type { FastestRoute, NearbyPlace } from '../../services/medicalApi';

interface LatLng {
  lat: number;
  lng: number;
}

interface DoctorMapProps {
  loading: boolean;
  error: string | null;
  routeError: string | null;
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

function mapEmbedLink(destination: LatLng): string {
  const zoomPadding = 0.015;
  const left = destination.lng - zoomPadding;
  const right = destination.lng + zoomPadding;
  const top = destination.lat + zoomPadding;
  const bottom = destination.lat - zoomPadding;

  return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${destination.lat}%2C${destination.lng}`;
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
  selectedPlaceId,
  onSelectPlace,
  routeByPlaceId,
  routeLoadingPlaceId,
  onEstimateRoute,
}: {
  title: string;
  places: NearbyPlaceWithDistance[];
  selectedPlaceId: string | null;
  onSelectPlace: (place: NearbyPlaceWithDistance) => void;
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
            const isSelected = selectedPlaceId === place.id;

            return (
              <article
                key={place.id}
                className={`finder-nearby-card${isSelected ? ' finder-nearby-card-selected' : ''}`}
              >
                <div className="finder-nearby-main">
                  <p className="finder-nearby-name">{place.name}</p>
                  <p className="finder-nearby-address">{place.address || 'Address not available'}</p>
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
                    onClick={() => onSelectPlace(place)}
                  >
                    {isSelected ? 'Selected on Map' : 'Show on Map'}
                  </button>
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
  routeError,
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
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

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

  const allFilteredPlaces = useMemo(
    () => [...filteredDoctors, ...filteredHospitals, ...filteredPharmacies],
    [filteredDoctors, filteredHospitals, filteredPharmacies],
  );

  useEffect(() => {
    if (allFilteredPlaces.length === 0) {
      if (selectedPlaceId !== null) {
        setSelectedPlaceId(null);
      }
      return;
    }

    const selectedStillExists = selectedPlaceId
      ? allFilteredPlaces.some((place) => place.id === selectedPlaceId)
      : false;

    if (!selectedStillExists) {
      setSelectedPlaceId(allFilteredPlaces[0].id);
    }
  }, [allFilteredPlaces, selectedPlaceId]);

  const selectedPlace = useMemo(
    () => allFilteredPlaces.find((place) => place.id === selectedPlaceId) ?? null,
    [allFilteredPlaces, selectedPlaceId],
  );

  const selectedPlaceRoute = selectedPlace ? routeByPlaceId[selectedPlace.id] : undefined;

  const nearestDoctor = filteredDoctors[0] ?? null;
  const hasAnyNearby = allFilteredPlaces.length > 0;
  const mapFocusLocation = selectedPlace?.location ?? userLocation;

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
          <button
            type="button"
            className="finder-quick-btn"
            onClick={() => setSelectedPlaceId(nearestDoctor.id)}
          >
            Select Nearest Doctor
          </button>
          <button
            type="button"
            className="finder-quick-btn"
            onClick={() => {
              const place = selectedPlace ?? nearestDoctor;
              setSelectedPlaceId(place.id);
              onEstimateRoute(place);
            }}
          >
            Fastest Route
          </button>
          <a
            href={mapDirectionsLink((selectedPlace ?? nearestDoctor).location)}
            target="_blank"
            rel="noreferrer"
            className="finder-quick-btn finder-action-link"
          >
            Open Direction
          </a>
        </div>
      )}

      {loading && <p className="loading">Loading nearby medical places...</p>}
      {error && <p className="error">{error}</p>}
      {routeError && <p className="error">{routeError}</p>}

      {!loading && (!error || hasAnyNearby) && (
        <>
          <section className="finder-selected-map" aria-label="Selected place on map">
            <div className="finder-selected-map-meta">
              <h3>{selectedPlace ? selectedPlace.name : 'Your area'}</h3>
              <p className="finder-nearby-address">
                {selectedPlace?.address || 'Select any nearby place to focus the map and estimate route.'}
              </p>
              {selectedPlace && (
                <div className="finder-nearby-meta">
                  <span>{selectedPlace.distanceKm.toFixed(1)} km away</span>
                  <span>Rating: {selectedPlace.rating?.toFixed(1) ?? 'N/A'}</span>
                  <span>
                    {selectedPlace.openNow === true
                      ? 'Open now'
                      : selectedPlace.openNow === false
                        ? 'Closed now'
                        : 'Status unknown'}
                  </span>
                </div>
              )}
              {selectedPlaceRoute && (
                <p className="finder-route-pill" aria-live="polite">
                  ETA: {selectedPlaceRoute.durationText} • {selectedPlaceRoute.distanceText}
                </p>
              )}
            </div>
            <div className="finder-selected-map-frame-wrap">
              <iframe
                title={selectedPlace ? `Map for ${selectedPlace.name}` : 'Map around your location'}
                src={mapEmbedLink(mapFocusLocation)}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </section>

          <div className="finder-nearby-grid">
            <PlacesSection
              title="Nearby Doctors"
              places={filteredDoctors}
              selectedPlaceId={selectedPlaceId}
              onSelectPlace={(place) => setSelectedPlaceId(place.id)}
              routeByPlaceId={routeByPlaceId}
              routeLoadingPlaceId={routeLoadingPlaceId}
              onEstimateRoute={onEstimateRoute}
            />
            <PlacesSection
              title="Nearby Hospitals"
              places={filteredHospitals}
              selectedPlaceId={selectedPlaceId}
              onSelectPlace={(place) => setSelectedPlaceId(place.id)}
              routeByPlaceId={routeByPlaceId}
              routeLoadingPlaceId={routeLoadingPlaceId}
              onEstimateRoute={onEstimateRoute}
            />
            <PlacesSection
              title="Nearby Pharmacies"
              places={filteredPharmacies}
              selectedPlaceId={selectedPlaceId}
              onSelectPlace={(place) => setSelectedPlaceId(place.id)}
              routeByPlaceId={routeByPlaceId}
              routeLoadingPlaceId={routeLoadingPlaceId}
              onEstimateRoute={onEstimateRoute}
            />
          </div>
        </>
      )}
    </div>
  );
};
