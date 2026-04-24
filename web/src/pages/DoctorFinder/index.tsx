import React, { useEffect, useState } from 'react';
import { FeatureHeader } from '../../components/FeatureHeader';
import { imageAssets } from '../../constants/imageAssets';
import { useDoctors } from '../../hooks/useDoctors';
import { DoctorMap } from './DoctorMap';
import { DoctorCard } from './DoctorCard';
import { useNearbyMedicalPlaces } from '../../hooks/useNearbyMedicalPlaces';

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
    <div className="mx-auto max-w-[1240px] px-6 pb-10 pt-6">
      <FeatureHeader
        title="Care Locator"
        subtitle="Find doctors, nearby hospitals, and pharmacies"
        variant="doc"
        imageSrc={imageAssets.headers.doctor}
        imageAlt="Care Locator"
      />

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input
          className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100"
          type="text"
          placeholder="Search by name, specialty, or city..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          aria-label="Search doctors"
        />

        <select
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100 sm:w-56"
          value={selectedSpecialty}
          onChange={(event) => setSelectedSpecialty(event.target.value)}
          aria-label="Filter by specialty"
        >
          {SPECIALTIES.map((specialty) => (
            <option key={specialty}>{specialty}</option>
          ))}
        </select>
      </div>

      {doctorsError && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {doctorsError}
        </div>
      )}

      {doctorsLoading ? (
        <p className="mt-6 text-sm text-slate-500">Loading doctors...</p>
      ) : doctors.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">No doctors found matching your criteria.</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {doctors.map((doctor) => (
            <DoctorCard key={doctor.id} doctor={doctor} />
          ))}
        </div>
      )}

      <section className="mt-10" aria-labelledby="nearby-medical-title">
        <h2 id="nearby-medical-title" className="text-xl font-bold text-slate-900">Nearest Medical Places</h2>
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
