import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FeatureHeader } from '../../components/FeatureHeader';
import { imageAssets } from '../../constants/imageAssets';
import { useDoctors } from '../../hooks/useDoctors';
import { DoctorMap } from './DoctorMap';
import { DoctorCard } from './DoctorCard';
import './styles.css';

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

const DEFAULT_CENTER: LatLng = { lat: 30.0444, lng: 31.2357 };
const GOOGLE_MAPS_SCRIPT_ID = 'aethea-google-maps-script';

const getCurrentPositionAsync = () =>
  new Promise<LatLng>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  });

const loadGoogleMapsApi = (apiKey: string) =>
  new Promise<any>((resolve, reject) => {
    const w = window as Window & { google?: { maps?: any } };
    if (w.google?.maps) { resolve(w.google); return; }
    const existing = document.getElementById(GOOGLE_MAPS_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve(w.google));
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Maps')));
      return;
    }
    const script = document.createElement('script');
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
    script.onload = () => resolve(w.google);
    script.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(script);
  });

const SPECIALTIES = [
  'All Specialties', 'Cardiology', 'Dermatology', 'Pediatrics',
  'Orthopedics', 'Neurology', 'Ophthalmology', 'Gynecology',
  'Psychiatry', 'General Practice',
];

export default function DoctorFinderPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('All Specialties');

  const [mapError, setMapError] = useState('');
  const [mapReady, setMapReady] = useState(false);
  const [nearbyPharmacies, setNearbyPharmacies] = useState<NearbyPlace[]>([]);
  const [nearbyDoctors, setNearbyDoctors] = useState<NearbyPlace[]>([]);
  const [nearbyMedicalBuildings, setNearbyMedicalBuildings] = useState<NearbyPlace[]>([]);

  const userLocationRef = useRef<LatLng>(DEFAULT_CENTER);
  const googleMapsRef = useRef<any | null>(null);
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const { doctors, loading: doctorsLoading, error: doctorsError } = useDoctors({
    search: debouncedSearch || undefined,
    specialty: selectedSpecialty === 'All Specialties' ? undefined : selectedSpecialty,
  });

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      if (!googleMapsApiKey) {
        setMapError('Add VITE_GOOGLE_MAPS_API_KEY in web/.env to enable map and nearby places.');
        return;
      }
      try {
        const google = await loadGoogleMapsApi(googleMapsApiKey);
        if (cancelled) return;
        googleMapsRef.current = google;
        try { userLocationRef.current = await getCurrentPositionAsync(); } catch { /* use default */ }

        const div = document.createElement('div');
        const svc = new google.maps.places.PlacesService(div);

        const searchNearby = (type: string, setter: React.Dispatch<React.SetStateAction<NearbyPlace[]>>) =>
          new Promise<void>((res) => {
            svc.nearbySearch({ location: userLocationRef.current, radius: 4000, type }, (results: any[] | null, status: string) => {
              if (cancelled) { res(); return; }
              if (status !== google.maps.places.PlacesServiceStatus.OK || !results) { setter([]); res(); return; }
              const places = results.slice(0, 6).map((p: any) => {
                const lat = p.geometry?.location?.lat?.();
                const lng = p.geometry?.location?.lng?.();
                if (typeof lat !== 'number' || typeof lng !== 'number') return null;
                return { id: p.place_id, name: p.name, address: p.vicinity ?? 'Address unavailable', location: { lat, lng } } as NearbyPlace;
              }).filter((p): p is NearbyPlace => p !== null);
              setter(places);
              res();
            });
          });

        await Promise.all([
          searchNearby('pharmacy', setNearbyPharmacies),
          searchNearby('doctor', setNearbyDoctors),
          searchNearby('hospital', setNearbyMedicalBuildings),
        ]);
        if (!cancelled) { setMapReady(true); setMapError(''); }
      } catch {
        if (!cancelled) { setMapReady(false); setMapError('Could not load Google Maps right now.'); }
      }
    };
    void init();
    return () => { cancelled = true; };
  }, [googleMapsApiKey]);

  return (
    <div className="doctor-finder-page">
      <FeatureHeader
        title="Care Locator"
        subtitle="Find doctors, nearby pharmacies, and medical buildings"
        variant="doc"
        imageSrc={imageAssets.headers.doctor}
        imageAlt="Care Locator"
      />

      <div className="finder-controls">
        <input
          className="search-input"
          type="text"
          placeholder="Search by name, specialty, or city..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          className="specialty-select"
          value={selectedSpecialty}
          onChange={(e) => setSelectedSpecialty(e.target.value)}
        >
          {SPECIALTIES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {doctorsError && <div className="error">{doctorsError}</div>}

      {doctorsLoading ? (
        <p className="loading">Loading doctors...</p>
      ) : doctors.length === 0 ? (
        <p className="loading">No doctors found matching your criteria.</p>
      ) : (
        <div className="doctors-grid">
          {doctors.map((doc) => (
            <DoctorCard key={doc.id} doctor={doc} />
          ))}
        </div>
      )}

      <section className="map-section">
        <h2>Nearby Doctors, Pharmacies, and Medical Buildings</h2>
        <DoctorMap
          mapReady={mapReady}
          mapError={mapError}
          userLocation={userLocationRef.current}
          nearbyDoctors={nearbyDoctors}
          nearbyPharmacies={nearbyPharmacies}
          nearbyMedicalBuildings={nearbyMedicalBuildings}
          googleMapsApiKey={googleMapsApiKey}
        />
      </section>
    </div>
  );
}