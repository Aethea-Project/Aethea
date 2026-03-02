import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FeatureHeader } from '../../components/FeatureHeader';
import { Modal } from '../../components/Modal';
import { imageAssets } from '../../constants/imageAssets';
import { mockDoctors, SPECIALTIES, type Doctor } from '../../data/mocks/doctors';
import { DoctorMap } from './DoctorMap';
import { DoctorCard } from './DoctorCard';
import './styles.css';

/**
 * Aethea - Doctor Finder & Reservation System
 * Location-based search with Google Maps integration (mockup)
 */

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
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => reject(error),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  });

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

export default function DoctorFinderPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('All Specialties');
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [showBooking, setShowBooking] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState('');

  const [mapError, setMapError] = useState('');
  const [mapReady, setMapReady] = useState(false);
  const [nearbyPharmacies, setNearbyPharmacies] = useState<NearbyPlace[]>([]);
  const [nearbyDoctors, setNearbyDoctors] = useState<NearbyPlace[]>([]);

  const userLocationRef = useRef<LatLng>(DEFAULT_CENTER);
  const googleMapsRef = useRef<any | null>(null);

  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const filteredDoctors = useMemo(
    () =>
      mockDoctors.filter((doctor) => {
        const matchesSearch =
          doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          doctor.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
          doctor.location.district.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesSpecialty =
          selectedSpecialty === 'All Specialties' || doctor.specialty === selectedSpecialty;
        return matchesSearch && matchesSpecialty;
      }),
    [searchTerm, selectedSpecialty]
  );

  useEffect(() => {
    let cancelled = false;

    const initializePlaces = async () => {
      if (!googleMapsApiKey) {
        setMapError('Add VITE_GOOGLE_MAPS_API_KEY in web/.env to enable map and nearby places.');
        return;
      }

      try {
        const google = await loadGoogleMapsApi(googleMapsApiKey);
        if (cancelled) return;

        googleMapsRef.current = google;

        try {
          userLocationRef.current = await getCurrentPositionAsync();
        } catch {
          userLocationRef.current = DEFAULT_CENTER;
        }

        // Invisible div for places service if map is not used but for consistency 
        // we'll just use a mock map instance or the real one. 
        // Better: We'll keep the searchNearby logic here as it manages state for the page.
        const placesServiceDiv = document.createElement('div');
        const placesService = new google.maps.places.PlacesService(placesServiceDiv);

        const searchNearby = (type: string, setter: React.Dispatch<React.SetStateAction<NearbyPlace[]>>) =>
          new Promise<void>((resolve) => {
            placesService.nearbySearch(
              {
                location: userLocationRef.current,
                radius: 4000,
                type,
              },
              (results: any[] | null, status: string) => {
                if (cancelled) {
                  resolve();
                  return;
                }

                if (status !== google.maps.places.PlacesServiceStatus.OK || !results) {
                  setter([]);
                  resolve();
                  return;
                }

                const places = results
                  .slice(0, 6)
                  .map((place) => {
                    const lat = place.geometry?.location?.lat?.();
                    const lng = place.geometry?.location?.lng?.();

                    if (typeof lat !== 'number' || typeof lng !== 'number') {
                      return null;
                    }

                    return {
                      id: place.place_id,
                      name: place.name,
                      address: place.vicinity ?? 'Address unavailable',
                      location: { lat, lng },
                    } as NearbyPlace;
                  })
                  .filter((place): place is NearbyPlace => place !== null);

                setter(places);
                resolve();
              }
            );
          });

        await Promise.all([
          searchNearby('pharmacy', setNearbyPharmacies),
          searchNearby('doctor', setNearbyDoctors),
        ]);

        if (!cancelled) {
          setMapReady(true);
          setMapError('');
        }
      } catch (err) {
        if (!cancelled) {
          setMapReady(false);
          setMapError('Could not load Google Maps right now.');
        }
      }
    };

    void initializePlaces();

    return () => {
      cancelled = true;
    };
  }, [googleMapsApiKey]);

  const handleBookAppointment = () => {
    if (selectedSlot) {
      alert(`Appointment booked with ${selectedDoctor?.name} at ${selectedSlot}!`);
      setShowBooking(false);
      setSelectedSlot('');
    }
  };

  return (
    <div className="doctor-finder-page">
      {/* Header */}
      <FeatureHeader
        title="Find a Doctor"
        subtitle="Search for doctors near you and book appointments instantly"
        variant="doc"
        imageSrc={imageAssets.headers.doctor}
        imageAlt="Healthcare professionals"
      />

      <div className="content-layout">
        <aside className="sidebar">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by name, specialty, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-section">
            <h3>Specialty</h3>
            <div className="specialty-list">
              {SPECIALTIES.map((specialty) => (
                <button
                  key={specialty}
                  className={`specialty-btn ${selectedSpecialty === specialty ? 'active' : ''}`}
                  onClick={() => setSelectedSpecialty(specialty)}
                >
                  {specialty}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <main className="main-content">
          <DoctorMap
            mapReady={mapReady}
            mapError={mapError}
            nearbyPharmacies={nearbyPharmacies}
            nearbyDoctors={nearbyDoctors}
            userLocation={userLocationRef.current}
            googleMapsApiKey={googleMapsApiKey}
          />

          <div className="doctors-grid">
            {filteredDoctors.map((doctor) => (
              <DoctorCard
                key={doctor.id}
                doctor={doctor}
                onViewProfile={(d) => {
                  setSelectedDoctor(d);
                  setShowBooking(false);
                }}
                onBook={(d) => {
                  setSelectedDoctor(d);
                  setShowBooking(true);
                }}
              />
            ))}
          </div>
        </main>
      </div>

      <Modal isOpen={showBooking && !!selectedDoctor} onClose={() => setShowBooking(false)} ariaLabel="Book appointment">
        {selectedDoctor && (
          <div className="modal-inner">
            <div className="modal-header">
              <h2>Book Appointment</h2>
              <button className="close-modal-btn" onClick={() => setShowBooking(false)}>×</button>
            </div>
            {/* Modal Body Simplified for Clarity */}
            <div className="booking-doctor-info">
              <div className="booking-avatar">{selectedDoctor.image}</div>
              <div>
                <h3>{selectedDoctor.name}</h3>
                <p>{selectedDoctor.specialty}</p>
              </div>
            </div>
            <div className="booking-section">
              <h3>Available Slots Today</h3>
              <div className="time-slots">
                {selectedDoctor.availableSlots.map((slot) => (
                  <button
                    key={slot}
                    className={`time-slot-btn ${selectedSlot === slot ? 'selected' : ''}`}
                    onClick={() => setSelectedSlot(slot)}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>
            <button className="confirm-booking-btn" onClick={handleBookAppointment} disabled={!selectedSlot}>
              Confirm Booking
            </button>
          </div>
        )}
      </Modal>

      <Modal isOpen={!!selectedDoctor && !showBooking} onClose={() => setSelectedDoctor(null)} contentClassName="profile-modal" ariaLabel="Doctor profile">
        {selectedDoctor && (
          <div className="modal-inner">
            <div className="modal-header">
              <h2>Doctor Profile</h2>
              <button className="close-modal-btn" onClick={() => setSelectedDoctor(null)}>×</button>
            </div>
            <div className="profile-content">
              <h2>{selectedDoctor.name}</h2>
              <p>{selectedDoctor.specialty}</p>
              <button className="book-appointment-btn" onClick={() => setShowBooking(true)}>
                Book Appointment
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

