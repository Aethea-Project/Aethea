import { useCallback, useEffect, useRef, useState } from 'react';
import { medicalApi, FastestRoute, NearbyPlace } from '../services/medicalApi';

export interface LatLng {
  lat: number;
  lng: number;
}

interface NearbyMedicalPlacesState {
  userLocation: LatLng;
  doctors: NearbyPlace[];
  hospitals: NearbyPlace[];
  pharmacies: NearbyPlace[];
  loading: boolean;
  error: string | null;
  routeByPlaceId: Record<string, FastestRoute | undefined>;
  routeLoadingPlaceId: string | null;
  refresh: () => Promise<void>;
  fetchFastestRoute: (place: NearbyPlace, mode?: 'driving' | 'walking') => Promise<void>;
}

const DEFAULT_CENTER: LatLng = { lat: 30.0444, lng: 31.2357 };

const getCurrentPositionAsync = () =>
  new Promise<LatLng>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      (error) => reject(error),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  });

export function useNearbyMedicalPlaces(): NearbyMedicalPlacesState {
  const [userLocation, setUserLocation] = useState<LatLng>(DEFAULT_CENTER);
  const userLocationRef = useRef<LatLng>(DEFAULT_CENTER);
  const [doctors, setDoctors] = useState<NearbyPlace[]>([]);
  const [hospitals, setHospitals] = useState<NearbyPlace[]>([]);
  const [pharmacies, setPharmacies] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [routeByPlaceId, setRouteByPlaceId] = useState<Record<string, FastestRoute | undefined>>({});
  const [routeLoadingPlaceId, setRouteLoadingPlaceId] = useState<string | null>(null);

  const loadNearby = useCallback(async (location: LatLng) => {
    const [doctorPlaces, hospitalPlaces, pharmacyPlaces] = await Promise.all([
      medicalApi.fetchNearbyPlaces({ ...location, type: 'doctor', radius: 4000, limit: 10 }),
      medicalApi.fetchNearbyPlaces({ ...location, type: 'hospital', radius: 4000, limit: 10 }),
      medicalApi.fetchNearbyPlaces({ ...location, type: 'pharmacy', radius: 4000, limit: 10 }),
    ]);

    setDoctors(doctorPlaces);
    setHospitals(hospitalPlaces);
    setPharmacies(pharmacyPlaces);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let location = userLocationRef.current;
      try {
        location = await getCurrentPositionAsync();
        userLocationRef.current = location;
        setUserLocation(location);
      } catch {
        // Keep default/last known location when geolocation is denied.
      }

      await loadNearby(location);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load nearby places');
    } finally {
      setLoading(false);
    }
  }, [loadNearby]);

  const fetchFastestRoute = useCallback(
    async (place: NearbyPlace, mode: 'driving' | 'walking' = 'driving') => {
      setRouteLoadingPlaceId(place.id);
      try {
        const route = await medicalApi.fetchFastestRoute({
          originLat: userLocation.lat,
          originLng: userLocation.lng,
          destinationLat: place.location.lat,
          destinationLng: place.location.lng,
          mode,
        });

        setRouteByPlaceId((prev) => ({
          ...prev,
          [place.id]: route,
        }));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to calculate route ETA');
      } finally {
        setRouteLoadingPlaceId(null);
      }
    },
    [userLocation.lat, userLocation.lng],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    userLocation,
    doctors,
    hospitals,
    pharmacies,
    loading,
    error,
    routeByPlaceId,
    routeLoadingPlaceId,
    refresh,
    fetchFastestRoute,
  };
}
