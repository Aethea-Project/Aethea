import React, { useEffect, useState } from 'react';
import { FeatureHeader } from '../../components/FeatureHeader';
import { imageAssets } from '../../constants/imageAssets';
import { useDoctors } from '../../hooks/useDoctors';
import { DoctorMap } from './DoctorMap';
import { DoctorCard } from './DoctorCard';
import { useNearbyMedicalPlaces } from '../../hooks/useNearbyMedicalPlaces';
import './styles.css';

const SPECIALTIES = [
  'All Specialties',
  'Cardiology',
  'Dermatology',
  'Pediatrics',
  'Orthopedics',
  'Neurology',
  'Ophthalmology',
  'Gynecology',
  'Psychiatry',
  'General Practice',
];

export default function DoctorFinderPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('All Specialties');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { doctors, loading: doctorsLoading, error: doctorsError } = useDoctors({
    search: debouncedSearch || undefined,
    specialty: selectedSpecialty === 'All Specialties' ? undefined : selectedSpecialty,
  });

  const {
    userLocation,
    doctors: nearbyDoctors,
    hospitals: nearbyHospitals,
    pharmacies: nearbyPharmacies,
    loading: nearbyLoading,
    error: nearbyError,
    routeError,
    routeByPlaceId,
    routeLoadingPlaceId,
    fetchFastestRoute,
  } = useNearbyMedicalPlaces({
    doctorSearch: debouncedSearch || undefined,
    doctorSpecialty: selectedSpecialty === 'All Specialties' ? undefined : selectedSpecialty,
  });

  return (
    <div className="doctor-finder-page">
      <FeatureHeader
        title="Care Locator"
        subtitle="Find doctors, nearby hospitals, and pharmacies"
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
          onChange={(event) => setSearchTerm(event.target.value)}
          aria-label="Search doctors"
        />

        <select
          className="specialty-select"
          value={selectedSpecialty}
          onChange={(event) => setSelectedSpecialty(event.target.value)}
          aria-label="Filter by specialty"
        >
          {SPECIALTIES.map((specialty) => (
            <option key={specialty}>{specialty}</option>
          ))}
        </select>
      </div>

      {doctorsError && <div className="error">{doctorsError}</div>}

      {doctorsLoading ? (
        <p className="loading">Loading doctors...</p>
      ) : doctors.length === 0 ? (
        <p className="loading">No doctors found matching your criteria.</p>
      ) : (
        <div className="doctors-grid">
          {doctors.map((doctor) => (
            <DoctorCard key={doctor.id} doctor={doctor} />
          ))}
        </div>
      )}

      <section className="map-section" aria-labelledby="nearby-medical-title">
        <h2 id="nearby-medical-title">Nearest Medical Places</h2>
        <DoctorMap
          loading={nearbyLoading}
          error={nearbyError}
          routeError={routeError}
          userLocation={userLocation}
          nearbyDoctors={nearbyDoctors}
          nearbyHospitals={nearbyHospitals}
          nearbyPharmacies={nearbyPharmacies}
          routeByPlaceId={routeByPlaceId}
          routeLoadingPlaceId={routeLoadingPlaceId}
          onEstimateRoute={(place) => {
            void fetchFastestRoute(place, 'driving');
          }}
        />
      </section>
    </div>
  );
}
