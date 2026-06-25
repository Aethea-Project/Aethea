import React, { useEffect, useState } from 'react';
import { FeatureHeader } from '../../components/FeatureHeader';

import { DoctorMap } from './DoctorMap';
import { useNearbyMedicalPlaces } from '../../hooks/useNearbyMedicalPlaces';
import { SearchBar } from '../../components/ui/SearchBar';
import { FilterSelect } from '../../components/ui/FilterSelect';
import { MEDICAL_SPECIALTIES } from '../../constants/medicalSpecialties';

const SPECIALTIES = [
  'All Specialties',
  ...MEDICAL_SPECIALTIES,
];

export default function DoctorFinderPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('All Specialties');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // The hook handles querying both Aethea doctors and Google Maps locations
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
    <div className="max-w-5xl mx-auto p-10 space-y-12">
      <FeatureHeader
        title="Care Locator"
        subtitle="Find doctors, nearby hospitals, and pharmacies seamlessly"
      />

      <div className="mt-8 mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex-1 w-full">
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search by name, clinic, or city..."
            className="!max-w-none !mb-0"
          />
        </div>

        <FilterSelect
          value={selectedSpecialty}
          onChange={(event) => setSelectedSpecialty(event.target.value)}
          aria-label="Filter by specialty"
        >
          {SPECIALTIES.map((specialty) => (
            <option key={specialty}>{specialty}</option>
          ))}
        </FilterSelect>
      </div>

      <section aria-labelledby="nearby-medical-title">
        <h2 id="nearby-medical-title" className="sr-only">Interactive Care Map</h2>
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
