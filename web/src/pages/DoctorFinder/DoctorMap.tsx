import React, { useEffect, useMemo, useState } from 'react';
import type { FastestRoute, NearbyPlace } from '../../services/medicalApi';
import { cn } from '../../lib/utils';

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

/* ── Reusable Tailwind class tokens ───────────── */
const actionBtnClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:border-slate-400 disabled:opacity-50 disabled:cursor-not-allowed';
const actionLinkClass =
  'no-underline rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 text-center transition-colors hover:bg-slate-50 hover:border-slate-400';
const quickBtnClass =
  'rounded-lg bg-teal-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed';
const quickLinkClass =
  'no-underline rounded-lg bg-teal-600 px-3.5 py-2 text-xs font-semibold text-white text-center transition-colors hover:bg-teal-700';

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
    <section aria-label={title}>
      <h3 className="mb-3 text-base font-bold text-slate-900">{title}</h3>
      {places.length === 0 ? (
        <p className="text-sm text-slate-500">No nearby places matching current filters.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {places.map((place) => {
            const route = routeByPlaceId[place.id];
            const isSelected = selectedPlaceId === place.id;

            return (
              <article
                key={place.id}
                className={cn(
                  'rounded-xl border bg-white p-4 transition-colors',
                  isSelected ? 'border-teal-500 ring-1 ring-teal-500' : 'border-slate-200',
                )}
              >
                <div className="mb-2">
                  <p className="text-sm font-semibold text-slate-900">{place.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{place.address || 'Address not available'}</p>
                </div>
                <div className="mb-3 flex flex-wrap gap-2 text-xs text-slate-600">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5">{place.distanceKm.toFixed(1)} km</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5">Rating: {place.rating?.toFixed(1) ?? 'N/A'}</span>
                  <span className={cn('rounded-full px-2 py-0.5', place.openNow === true ? 'bg-emerald-100 text-emerald-700' : place.openNow === false ? 'bg-red-100 text-red-700' : 'bg-slate-100')}>
                    {place.openNow === true ? 'Open now' : place.openNow === false ? 'Closed now' : 'Status unknown'}
                  </span>
                </div>
                {route && (
                  <p className="mb-3 inline-flex rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-800" aria-live="polite">
                    ETA: {route.durationText} • {route.distanceText}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={actionBtnClass}
                    onClick={() => onSelectPlace(place)}
                  >
                    {isSelected ? 'Selected on Map' : 'Show on Map'}
                  </button>
                  <button
                    type="button"
                    className={actionBtnClass}
                    onClick={() => onEstimateRoute(place)}
                    disabled={routeLoadingPlaceId === place.id}
                  >
                    {routeLoadingPlaceId === place.id ? 'Calculating...' : 'Fastest Route'}
                  </button>
                  <a
                    className={actionLinkClass}
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
    <div className="mt-4" aria-busy={loading}>
      {/* ── Filter row ────────────────── */}
      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Max distance (km)
          <input
            type="range"
            min={1}
            max={30}
            value={maxDistanceKm}
            onChange={(event) => setMaxDistanceKm(Number(event.target.value))}
            className="accent-teal-600"
          />
          <span className="text-xs text-slate-500">{maxDistanceKm} km</span>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Min rating
          <select
            value={minRating}
            onChange={(event) => setMinRating(Number(event.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
          >
            <option value={0}>Any</option>
            <option value={3}>3.0+</option>
            <option value={3.5}>3.5+</option>
            <option value={4}>4.0+</option>
            <option value={4.5}>4.5+</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={openNowOnly}
            onChange={(event) => setOpenNowOnly(event.target.checked)}
            className="h-4 w-4 accent-teal-600"
          />
          Open now only
        </label>
      </div>

      {/* ── Quick actions ─────────────── */}
      {nearestDoctor && (
        <div className="mt-4 flex flex-wrap gap-2" role="region" aria-label="Quick actions">
          <button
            type="button"
            className={quickBtnClass}
            onClick={() => setSelectedPlaceId(nearestDoctor.id)}
          >
            Select Nearest Doctor
          </button>
          <button
            type="button"
            className={quickBtnClass}
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
            className={quickLinkClass}
          >
            Open Direction
          </a>
        </div>
      )}

      {/* ── Loading / errors ──────────── */}
      {loading && <p className="mt-4 text-sm text-slate-500">Loading nearby medical places...</p>}
      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>
      )}
      {routeError && (
        <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{routeError}</p>
      )}

      {/* ── Map + place lists ─────────── */}
      {!loading && (!error || hasAnyNearby) && (
        <>
          <section className="mt-5 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden" aria-label="Selected place on map">
            <div className="p-4">
              <h3 className="text-base font-bold text-slate-900">{selectedPlace ? selectedPlace.name : 'Your area'}</h3>
              <p className="mt-0.5 text-xs text-slate-500">
                {selectedPlace?.address || 'Select any nearby place to focus the map and estimate route.'}
              </p>
              {selectedPlace && (
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5">{selectedPlace.distanceKm.toFixed(1)} km away</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5">Rating: {selectedPlace.rating?.toFixed(1) ?? 'N/A'}</span>
                  <span className={cn('rounded-full px-2 py-0.5', selectedPlace.openNow === true ? 'bg-emerald-100 text-emerald-700' : selectedPlace.openNow === false ? 'bg-red-100 text-red-700' : 'bg-slate-100')}>
                    {selectedPlace.openNow === true
                      ? 'Open now'
                      : selectedPlace.openNow === false
                        ? 'Closed now'
                        : 'Status unknown'}
                  </span>
                </div>
              )}
              {selectedPlaceRoute && (
                <p className="mt-2 inline-flex rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-800" aria-live="polite">
                  ETA: {selectedPlaceRoute.durationText} • {selectedPlaceRoute.distanceText}
                </p>
              )}
            </div>
            <div className="relative w-full" style={{ paddingBottom: '45%' }}>
              <iframe
                className="absolute inset-0 h-full w-full border-t border-slate-200"
                title={selectedPlace ? `Map for ${selectedPlace.name}` : 'Map around your location'}
                src={mapEmbedLink(mapFocusLocation)}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </section>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
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
