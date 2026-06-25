import React, { useEffect, useMemo, useState } from 'react';
import type { FastestRoute, NearbyPlace } from '../../services/medicalApi';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/Button';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/Tabs';
import { List, ListItem } from '../../components/ui/List';
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';

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

// Map styles to hide businesses
const mapStyles = [
  {
    featureType: "poi.business",
    stylers: [{ visibility: "off" }]
  },
  {
    featureType: "poi.medical",
    stylers: [{ visibility: "on" }]
  }
];

// Helper to generate modern circular SVG markers
function getMarkerSvg(color: string, innerShape: string) {
  const svg = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="16" r="14" fill="${color}" stroke="white" stroke-width="2.5"/>
    <g transform="translate(2, 2)">${innerShape}</g>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const doctorIcon = getMarkerSvg('#3b82f6', '<circle cx="14" cy="14" r="5" fill="white"/>');
const hospitalIcon = getMarkerSvg('#ef4444', '<path d="M12 8h4v12h-4z" fill="white"/><path d="M8 12h12v4H8z" fill="white"/>');
const pharmacyIcon = getMarkerSvg('#10b981', '<path d="M14 8l5 5-5 5-5-5 5-5z" fill="white"/>');
const userIcon = getMarkerSvg('#8b5cf6', '<circle cx="14" cy="14" r="4" fill="white"/>');
const selectedIcon = getMarkerSvg('#eab308', '<circle cx="14" cy="14" r="6" fill="white"/>');

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
  const [activeTab, setActiveTab] = useState<'doctors' | 'hospitals' | 'pharmacies'>('doctors');
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    // Catch global auth failures from Google Maps API to trigger fallback
    (window as any).gm_authFailure = () => {
      console.error("Google Maps Authentication/Quota Error detected. Falling back to OpenStreetMap.");
      setMapError(true);
    };
  }, []);

  const enrichedDoctors = useMemo(() => enrichPlaces(nearbyDoctors, userLocation), [nearbyDoctors, userLocation]);
  const enrichedHospitals = useMemo(() => enrichPlaces(nearbyHospitals, userLocation), [nearbyHospitals, userLocation]);
  const enrichedPharmacies = useMemo(() => enrichPlaces(nearbyPharmacies, userLocation), [nearbyPharmacies, userLocation]);

  const activePlaces = useMemo(() => {
    switch (activeTab) {
      case 'doctors': return enrichedDoctors;
      case 'hospitals': return enrichedHospitals;
      case 'pharmacies': return enrichedPharmacies;
      default: return [];
    }
  }, [activeTab, enrichedDoctors, enrichedHospitals, enrichedPharmacies]);

  // Auto-select first place if none selected when places change
  useEffect(() => {
    if (activePlaces.length > 0 && !activePlaces.some(p => p.id === selectedPlaceId)) {
      setSelectedPlaceId(activePlaces[0].id);
    } else if (activePlaces.length === 0) {
      setSelectedPlaceId(null);
    }
  }, [activePlaces, selectedPlaceId]);

  const selectedPlace = useMemo(() => {
    return [...enrichedDoctors, ...enrichedHospitals, ...enrichedPharmacies].find(p => p.id === selectedPlaceId) ?? null;
  }, [selectedPlaceId, enrichedDoctors, enrichedHospitals, enrichedPharmacies]);

  const selectedPlaceRoute = selectedPlace ? routeByPlaceId[selectedPlace.id] : undefined;
  const mapFocusLocation = selectedPlace?.location ?? userLocation;

  const getPinIcon = (type: typeof activeTab) => {
    if (type === 'doctors') return doctorIcon;
    if (type === 'hospitals') return hospitalIcon;
    return pharmacyIcon;
  };

  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  return (
    <div className="mt-4 flex flex-col gap-4" aria-busy={loading}>
      {/* Error Messages (Full Width) */}
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}
      {routeError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{routeError}</p>
      )}

      {/* Main Two-Column Layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* ── Left Column: Map & Actions ─────────── */}
        <div className="w-full lg:w-3/5 flex flex-col gap-4">

        {/* Map Container */}
        <div className="relative w-full h-[600px] lg:h-[700px] bg-sand-50 overflow-hidden rounded-2xl shadow-sm border border-sand-200">
          {!loading ? (
            mapError || !googleMapsApiKey ? (
              // FALLBACK: OpenStreetMap
              <iframe
                className="absolute inset-0 h-full w-full"
                title={selectedPlace ? `Map for ${selectedPlace.name}` : 'Map around your location'}
                src={mapEmbedLink(mapFocusLocation)}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : (
              // PRIMARY: Google Maps
              <APIProvider apiKey={googleMapsApiKey} onLoad={() => console.log('Google Maps API Loaded')}>
                <Map
                  defaultZoom={14}
                  center={mapFocusLocation}
                  styles={mapStyles}
                  disableDefaultUI={false}
                  className="absolute inset-0 h-full w-full"
                  mapTypeControl={false}
                  streetViewControl={false}
                >
                  {/* User Location Marker */}
                  <Marker
                    position={userLocation}
                    icon={{ url: userIcon }}
                    title="Your Location"
                    zIndex={10}
                  />

                  {/* Active Medical Places Markers */}
                  {activePlaces.map(place => (
                    <Marker
                      key={place.id}
                      position={place.location}
                      onClick={() => setSelectedPlaceId(place.id)}
                      icon={{
                        url: selectedPlaceId === place.id ? selectedIcon : getPinIcon(activeTab)
                      }}
                      title={place.name}
                      zIndex={selectedPlaceId === place.id ? 20 : 1}
                    />
                  ))}
                </Map>
              </APIProvider>
            )
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-sand-500 font-medium">Loading Map...</p>
            </div>
          )}

          {/* Contextual Action Bar Overlay (Floating Card) */}
          {selectedPlace && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-lg bg-white/95 backdrop-blur-md shadow-xl rounded-2xl p-5 border border-white/50 z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300">
              <div className="flex-1">
                <h3 className="font-bold text-sand-900 text-lg leading-tight">{selectedPlace.name}</h3>
                <p className="text-sm text-sand-500 mt-1 line-clamp-2">{selectedPlace.address || 'Address not available'}</p>
                {selectedPlaceRoute && (
                  <p className="mt-2 inline-flex rounded-full bg-sand-100 px-3 py-1 text-sm font-medium text-sand-700 border border-sand-200">
                    ETA: {selectedPlaceRoute.durationText} • {selectedPlaceRoute.distanceText} via {selectedPlaceRoute.mode}
                  </p>
                )}
              </div>
              <div className="flex flex-row sm:flex-col gap-2 shrink-0">
                <Button 
                  variant="outline" 
                  size="default"
                  className="flex-1 justify-center shadow-sm bg-white"
                  onClick={() => onEstimateRoute(selectedPlace)}
                  disabled={routeLoadingPlaceId === selectedPlace.id}
                >
                  {routeLoadingPlaceId === selectedPlace.id ? 'Calculating...' : 'Get Route'}
                </Button>
                <a
                  href={mapDirectionsLink(selectedPlace.location)}
                  target="_blank"
                  rel="noreferrer"
                  className="no-underline flex-1 flex"
                >
                  <Button variant="dark" size="default" className="w-full justify-center shadow-md">
                    Maps
                  </Button>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Right Column: Segmented Tabs & Lists ─────────── */}
      <div className="w-full lg:w-2/5 flex flex-col h-[600px] lg:h-[700px] bg-surface rounded-2xl p-4 shadow-sm border border-sand-200">
        {/* iOS Style Segmented Tabs */}
        <Tabs className="mb-4">
          <TabsList className="bg-sand-100 p-1 rounded-full flex w-full">
            {(['doctors', 'hospitals', 'pharmacies'] as const).map((tab) => (
              <TabsTrigger
                key={tab}
                active={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex-1 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200", 
                  activeTab === tab 
                    ? "bg-white text-sand-900 shadow-sm" 
                    : "text-sand-600 hover:text-sand-900 hover:bg-sand-200/50"
                )}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Spacious List Content */}
        <div className="flex-1 overflow-y-auto pr-3 custom-scrollbar flex flex-col min-h-0">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-sand-500">Loading nearby places...</p>
            </div>
          ) : activePlaces.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-xl border border-sand-200 border-dashed bg-sand-50/50 my-auto">
              <p className="text-sm text-sand-600">No {activeTab} found in this area.</p>
            </div>
          ) : (
            <List className="rounded-xl flex flex-col gap-2 bg-transparent border-0 p-0 shadow-none">
              {activePlaces.map((place) => {
                const isSelected = selectedPlaceId === place.id;
                
                return (
                  <ListItem
                    key={place.id}
                    interactive
                    selected={isSelected}
                    onClick={() => setSelectedPlaceId(place.id)}
                    className={cn(
                      "flex flex-col gap-2 p-4 rounded-xl transition-all duration-200 border",
                      isSelected 
                        ? "bg-sand-100 border-sand-300 shadow-sm" 
                        : "bg-white border-sand-100 hover:border-sand-200 hover:bg-sand-50"
                    )}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg" aria-hidden="true">
                            {activeTab === 'doctors' ? '👨‍⚕️' : activeTab === 'hospitals' ? '🏥' : '💊'}
                          </span>
                          <h4 className={cn("font-semibold text-base leading-tight", isSelected ? "text-sand-900" : "text-sand-800")}>
                            {place.name}
                          </h4>
                        </div>
                        {/* No more line-clamp, comfortable padding */}
                        <p className="text-sm text-sand-500 mt-2 leading-relaxed">{place.address}</p>
                      </div>
                      <div className="text-right whitespace-nowrap shrink-0 mt-1">
                        <span className={cn(
                          "text-xs font-bold px-2.5 py-1 rounded-full",
                          isSelected ? "bg-white text-sand-800 shadow-sm" : "bg-sand-100 text-sand-700"
                        )}>
                          {place.distanceKm.toFixed(1)} km
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs font-medium mt-1">
                      {place.openNow !== null && (
                        <span className="flex items-center gap-1.5">
                          <span className={cn("w-2 h-2 rounded-full", place.openNow ? "bg-emerald-500" : "bg-red-400")} />
                          <span className={place.openNow ? "text-emerald-700" : "text-red-700"}>
                            {place.openNow ? 'Open Now' : 'Closed'}
                          </span>
                        </span>
                      )}
                      {place.rating !== null && (
                        <span className="text-amber-600 flex items-center gap-1">
                          ★ {place.rating.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </ListItem>
                );
              })}
            </List>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};
