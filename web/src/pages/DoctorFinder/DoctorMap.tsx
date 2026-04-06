import React, { useRef, useEffect } from 'react';

interface LatLng {
  lat: number;
  lng: number;
}

interface NearbyPlace {
  id: string;
  name: string;
  address: string;
  location: LatLng;
}

interface DoctorMapProps {
  mapReady: boolean;
  mapError: string;
  onInitError?: (message: string) => void;
  nearbyPharmacies: NearbyPlace[];
  nearbyDoctors: NearbyPlace[];
  nearbyMedicalBuildings: NearbyPlace[];
  userLocation: LatLng;
  googleMapsApiKey?: string;
}

export const DoctorMap: React.FC<DoctorMapProps> = ({
  mapReady,
  mapError,
  onInitError,
  nearbyPharmacies,
  nearbyDoctors,
  nearbyMedicalBuildings,
  userLocation,
  googleMapsApiKey,
}) => {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any | null>(null);
  const googleMapsRef = useRef<any | null>(null);
  const placeMarkersRef = useRef<any[]>([]);

  const clearMarkers = (markersRef: React.MutableRefObject<any[]>) => {
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];
  };

  useEffect(() => {
    let cancelled = false;

    const initializeMap = async () => {
      if (!googleMapsApiKey || !mapReady || !mapElementRef.current) return;
      if (!(mapElementRef.current instanceof HTMLElement)) return;
      if (mapInstanceRef.current) return;

      try {
        const windowWithGoogle = window as Window & { google?: { maps?: Record<string, unknown> } };
        const google = windowWithGoogle.google;
        if (!google || cancelled || !mapElementRef.current) return;

        if (typeof google.maps?.Map !== 'function') {
          throw new Error('Google Maps failed to initialize. Check API key and billing/project status.');
        }

        const googleMaps = google as any;

        googleMapsRef.current = googleMaps;

        const map = new googleMaps.maps.Map(mapElementRef.current, {
          center: userLocation,
          zoom: 13,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
          styles: [
            { featureType: 'poi', stylers: [{ visibility: 'off' }] },
            { featureType: 'poi.business', elementType: 'all', stylers: [{ visibility: 'off' }] },
            { featureType: 'poi.medical', elementType: 'all', stylers: [{ visibility: 'off' }] },
            { featureType: 'transit', stylers: [{ visibility: 'off' }] },
          ],
        });

        mapInstanceRef.current = map;

        new googleMaps.maps.Marker({
          map,
          position: userLocation,
          title: 'Your current location',
          icon: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
        });
      } catch (err) {
        console.error('Failed to init map', err);
        onInitError?.('Could not initialize Google Maps. Verify VITE_GOOGLE_MAPS_API_KEY and Google Cloud project status.');
      }
    };

    void initializeMap();
    return () => {
      cancelled = true;
      clearMarkers(placeMarkersRef);
      mapInstanceRef.current = null;
      googleMapsRef.current = null;
    };
  }, [googleMapsApiKey, mapReady, onInitError, userLocation]);

  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !googleMapsRef.current) return;

    clearMarkers(placeMarkersRef);
    const google = googleMapsRef.current;
    const places = [
      ...nearbyPharmacies.map((p) => ({ ...p, icon: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png' })),
      ...nearbyDoctors.map((p) => ({ ...p, icon: 'https://maps.google.com/mapfiles/ms/icons/purple-dot.png' })),
      ...nearbyMedicalBuildings.map((p) => ({ ...p, icon: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png' })),
    ];

    placeMarkersRef.current = places.map((place) => {
      const marker = new google.maps.Marker({
        position: place.location,
        map: mapInstanceRef.current,
        title: place.name,
        icon: place.icon,
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; color: #1e293b;">
            <div style="font-weight: 600; font-size: 14px; margin-bottom: 2px;">\${place.name}</div>
            <div style="font-size: 12px; color: #64748b;">\${place.address}</div>
          </div>
        `,
      });

      marker.addListener('click', () => {
        infoWindow.open(mapInstanceRef.current, marker);
      });

      return marker;
    });
  }, [mapReady, nearbyPharmacies, nearbyDoctors, nearbyMedicalBuildings]);

  return (
    <div className="map-container">
      {mapError ? (
        <div className="map-placeholder">
          <p>{mapError}</p>
        </div>
      ) : (
        <div ref={mapElementRef} className="google-map" />
      )}
      {!mapReady && !mapError && (
        <div className="map-loading-overlay">
          <div className="spinner"></div>
          <p>Finding nearby medical facilities...</p>
        </div>
      )}
    </div>
  );
};
