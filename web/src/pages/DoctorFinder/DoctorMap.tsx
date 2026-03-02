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
  nearbyPharmacies: NearbyPlace[];
  nearbyDoctors: NearbyPlace[];
  userLocation: LatLng;
  googleMapsApiKey?: string;
}

export const DoctorMap: React.FC<DoctorMapProps> = ({
  mapReady,
  mapError,
  nearbyPharmacies,
  nearbyDoctors,
  userLocation,
  googleMapsApiKey,
}) => {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any | null>(null);
  const googleMapsRef = useRef<any | null>(null);
  const placeMarkersRef = useRef<any[]>([]);

  const GOOGLE_MAPS_SCRIPT_ID = 'aethea-google-maps-script';

  const loadGoogleMapsApi = (apiKey: string) =>
    new Promise<any>((resolve, reject) => {
      const windowWithGoogle = window as Window & {
        google?: {
          maps?: any;
        };
      };

      if (windowWithGoogle.google?.maps) {
        resolve(windowWithGoogle.google);
        return;
      }

      const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID) as HTMLScriptElement | null;
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(windowWithGoogle.google));
        existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Maps script')));
        return;
      }

      const script = document.createElement('script');
      script.id = GOOGLE_MAPS_SCRIPT_ID;
      script.async = true;
      script.defer = true;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
      script.onload = () => resolve(windowWithGoogle.google);
      script.onerror = () => reject(new Error('Failed to load Google Maps script'));
      document.head.appendChild(script);
    });

  const clearMarkers = (markersRef: React.MutableRefObject<any[]>) => {
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];
  };

  useEffect(() => {
    let cancelled = false;

    const initializeMap = async () => {
      if (!googleMapsApiKey || !mapElementRef.current) return;

      try {
        const google = await loadGoogleMapsApi(googleMapsApiKey);
        if (cancelled || !mapElementRef.current) return;

        googleMapsRef.current = google;

        const map = new google.maps.Map(mapElementRef.current, {
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

        new google.maps.Marker({
          map,
          position: userLocation,
          title: 'Your current location',
          icon: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
        });
      } catch (err) {
        console.error('Failed to init map', err);
      }
    };

    void initializeMap();
    return () => { cancelled = true; };
  }, [googleMapsApiKey, userLocation]);

  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !googleMapsRef.current) return;

    clearMarkers(placeMarkersRef);
    const google = googleMapsRef.current;
    const places = [
      ...nearbyPharmacies.map((p) => ({ ...p, icon: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png' })),
      ...nearbyDoctors.map((p) => ({ ...p, icon: 'https://maps.google.com/mapfiles/ms/icons/purple-dot.png' })),
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
  }, [mapReady, nearbyPharmacies, nearbyDoctors]);

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
