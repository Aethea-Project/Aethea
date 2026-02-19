import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FeatureHeader } from '../../components/FeatureHeader';
import { imageAssets } from '../../constants/imageAssets';
import './styles.css';

/**
 * Aethea - Doctor Finder & Reservation System
 * Location-based search with Google Maps integration (mockup)
 */

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  reviewCount: number;
  experience: number;
  location: {
    address: string;
    district: string;
    city: string;
    coordinates: { lat: number; lng: number };
  };
  availableSlots: string[];
  languages: string[];
  fees: number;
  image: string;
  verified: boolean;
}

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

const mockDoctors: Doctor[] = [
  {
    id: 'dr-001',
    name: 'Dr. Ahmed Hassan',
    specialty: 'Cardiologist',
    rating: 4.8,
    reviewCount: 156,
    experience: 15,
    location: {
      address: '23 El-Merghany St.',
      district: 'Heliopolis',
      city: 'Cairo',
      coordinates: { lat: 30.0906, lng: 31.3207 },
    },
    availableSlots: ['10:00 AM', '11:00 AM', '2:00 PM', '4:00 PM'],
    languages: ['Arabic', 'English'],
    fees: 500,
    image: '👨‍⚕️',
    verified: true,
  },
  {
    id: 'dr-002',
    name: 'Dr. Fatma El-Sayed',
    specialty: 'Dermatologist',
    rating: 4.9,
    reviewCount: 203,
    experience: 12,
    location: {
      address: '45 Gameat El Dowal St.',
      district: 'Mohandessin',
      city: 'Giza',
      coordinates: { lat: 30.0481, lng: 31.2004 },
    },
    availableSlots: ['9:00 AM', '11:30 AM', '1:00 PM', '3:30 PM'],
    languages: ['Arabic', 'English', 'French'],
    fees: 450,
    image: '👩‍⚕️',
    verified: true,
  },
  {
    id: 'dr-003',
    name: 'Dr. Mohamed Khaled',
    specialty: 'Orthopedic Surgeon',
    rating: 4.7,
    reviewCount: 142,
    experience: 18,
    location: {
      address: '15 Mustafa El-Nahas St.',
      district: 'Nasr City',
      city: 'Cairo',
      coordinates: { lat: 30.0626, lng: 31.3459 },
    },
    availableSlots: ['10:30 AM', '12:00 PM', '3:00 PM'],
    languages: ['Arabic', 'English'],
    fees: 600,
    image: '👨‍⚕️',
    verified: true,
  },
  {
    id: 'dr-004',
    name: 'Dr. Nour Ibrahim',
    specialty: 'Pediatrician',
    rating: 5.0,
    reviewCount: 89,
    experience: 10,
    location: {
      address: '78 El-Hegaz St.',
      district: 'Heliopolis',
      city: 'Cairo',
      coordinates: { lat: 30.0876, lng: 31.3150 },
    },
    availableSlots: ['9:00 AM', '10:00 AM', '11:00 AM', '1:00 PM', '2:00 PM'],
    languages: ['Arabic', 'English'],
    fees: 400,
    image: '👩‍⚕️',
    verified: true,
  },
  {
    id: 'dr-005',
    name: 'Dr. Youssef Mansour',
    specialty: 'Neurologist',
    rating: 4.6,
    reviewCount: 97,
    experience: 20,
    location: {
      address: '12 El-Thawra St.',
      district: 'Dokki',
      city: 'Giza',
      coordinates: { lat: 30.0384, lng: 31.2100 },
    },
    availableSlots: ['11:00 AM', '2:00 PM', '4:00 PM'],
    languages: ['Arabic', 'English', 'German'],
    fees: 700,
    image: '👨‍⚕️',
    verified: true,
  },
];

const specialties = [
  'All Specialties',
  'Cardiologist',
  'Dermatologist',
  'Orthopedic Surgeon',
  'Pediatrician',
  'Neurologist',
  'General Practitioner',
  'Ophthalmologist',
  'Dentist',
];

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

  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any | null>(null);
  const userLocationRef = useRef<LatLng>(DEFAULT_CENTER);
  const googleMapsRef = useRef<any | null>(null);
  const placeMarkersRef = useRef<any[]>([]);

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

  const clearMarkers = (markers: React.MutableRefObject<any[]>) => {
    markers.current.forEach((marker) => marker.setMap(null));
    markers.current = [];
  };

  useEffect(() => {
    let cancelled = false;

    const initializeMap = async () => {
      if (!googleMapsApiKey) {
        setMapError('Add VITE_GOOGLE_MAPS_API_KEY in web/.env to enable map and nearby places.');
        return;
      }

      if (!mapElementRef.current) {
        return;
      }

      try {
        const google = await loadGoogleMapsApi(googleMapsApiKey);
        if (cancelled || !mapElementRef.current) {
          return;
        }

        googleMapsRef.current = google;

        try {
          userLocationRef.current = await getCurrentPositionAsync();
        } catch {
          userLocationRef.current = DEFAULT_CENTER;
        }

        const map = new google.maps.Map(mapElementRef.current, {
          center: userLocationRef.current,
          zoom: 13,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
          styles: [
            {
              featureType: 'poi',
              stylers: [{ visibility: 'off' }],
            },
            {
              featureType: 'poi.business',
              elementType: 'all',
              stylers: [{ visibility: 'off' }],
            },
            {
              featureType: 'poi.school',
              elementType: 'all',
              stylers: [{ visibility: 'off' }],
            },
            {
              featureType: 'poi.medical',
              elementType: 'all',
              stylers: [{ visibility: 'off' }],
            },
            {
              featureType: 'poi.attraction',
              elementType: 'all',
              stylers: [{ visibility: 'off' }],
            },
            {
              featureType: 'poi.government',
              elementType: 'all',
              stylers: [{ visibility: 'off' }],
            },
            {
              featureType: 'poi.place_of_worship',
              elementType: 'all',
              stylers: [{ visibility: 'off' }],
            },
            {
              featureType: 'poi.sports_complex',
              elementType: 'all',
              stylers: [{ visibility: 'off' }],
            },
            {
              featureType: 'poi.park',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }],
            },
            {
              featureType: 'transit.station',
              elementType: 'all',
              stylers: [{ visibility: 'off' }],
            },
            {
              featureType: 'transit',
              stylers: [{ visibility: 'off' }],
            },
          ],
        });

        mapInstanceRef.current = map;

        new google.maps.Marker({
          map,
          position: userLocationRef.current,
          title: 'Your current location',
          icon: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
        });

        const placesService = new google.maps.places.PlacesService(map);

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
      } catch {
        if (!cancelled) {
          setMapReady(false);
          setMapError('Could not load Google Maps right now. Please verify the API key and enabled APIs.');
        }
      }
    };

    void initializeMap();

    return () => {
      cancelled = true;
    };
  }, [googleMapsApiKey]);

  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !googleMapsRef.current) {
      return;
    }

    clearMarkers(placeMarkersRef);

    const google = googleMapsRef.current;
    const places = [
      ...nearbyPharmacies.map((place) => ({ ...place, icon: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png' })),
      ...nearbyDoctors.map((place) => ({ ...place, icon: 'https://maps.google.com/mapfiles/ms/icons/purple-dot.png' })),
    ];

    placeMarkersRef.current = places.map((place) =>
      new google.maps.Marker({
        map: mapInstanceRef.current,
        position: place.location,
        title: place.name,
        icon: place.icon,
      })
    );

    return () => {
      clearMarkers(placeMarkersRef);
    };
  }, [nearbyPharmacies, nearbyDoctors, mapReady]);

  const focusOnPlace = (place: NearbyPlace) => {
    if (!mapInstanceRef.current) {
      return;
    }

    mapInstanceRef.current.panTo(place.location);
    mapInstanceRef.current.setZoom(15);
  };

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
        {/* Sidebar - Search & Filters */}
        <div className="sidebar">
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
              {specialties.map((specialty) => (
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

          <div className="filter-section">
            <h3>Quick Filters</h3>
            <label className="checkbox-label">
              <input type="checkbox" />
              <span>Available Today</span>
            </label>
            <label className="checkbox-label">
              <input type="checkbox" />
              <span>Verified Doctors</span>
            </label>
            <label className="checkbox-label">
              <input type="checkbox" />
              <span>Accepts Insurance</span>
            </label>
            <label className="checkbox-label">
              <input type="checkbox" />
              <span>Video Consultation</span>
            </label>
          </div>
        </div>

        {/* Main Content */}
        <div className="main-content">
          {/* Map */}
          <div className="map-container">
            {mapError ? (
              <div className="map-status">{mapError}</div>
            ) : (
              <>
                <div ref={mapElementRef} className="map-canvas" aria-label="Map showing nearby doctors and pharmacies" />
                <div className="map-summary">
                  <div className="map-summary-item">
                    <strong>{filteredDoctors.length}</strong>
                    <span>Doctors in Aethea list</span>
                  </div>
                  <div className="map-summary-item">
                    <strong>{nearbyPharmacies.length}</strong>
                    <span>Nearby pharmacies</span>
                  </div>
                  <div className="map-summary-item">
                    <strong>{nearbyDoctors.length}</strong>
                    <span>Nearby doctors</span>
                  </div>
                </div>
                <div className="nearby-grid">
                  <div className="nearby-column">
                    <h3>Nearby Pharmacies</h3>
                    {nearbyPharmacies.length === 0 ? (
                      <p className="nearby-empty">No nearby pharmacies were found.</p>
                    ) : (
                      nearbyPharmacies.map((pharmacy) => (
                        <button
                          key={pharmacy.id}
                          type="button"
                          className="nearby-item"
                          onClick={() => focusOnPlace(pharmacy)}
                        >
                          <span>{pharmacy.name}</span>
                          <small>{pharmacy.address}</small>
                        </button>
                      ))
                    )}
                  </div>
                  <div className="nearby-column">
                    <h3>Nearby Doctors</h3>
                    {nearbyDoctors.length === 0 ? (
                      <p className="nearby-empty">No nearby doctors were found.</p>
                    ) : (
                      nearbyDoctors.map((doctor) => (
                        <button
                          key={doctor.id}
                          type="button"
                          className="nearby-item"
                          onClick={() => focusOnPlace(doctor)}
                        >
                          <span>{doctor.name}</span>
                          <small>{doctor.address}</small>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Doctor Cards */}
          <div className="doctors-grid">
            {filteredDoctors.map((doctor) => (
              <div key={doctor.id} className="doctor-card">
                <div className="doctor-card-header">
                  <div className="doctor-avatar">{doctor.image}</div>
                  <div className="doctor-info">
                    <div className="doctor-name-row">
                      <h3>{doctor.name}</h3>
                      {doctor.verified && (
                        <span className="verified-badge" title="Verified">
                          ✓
                        </span>
                      )}
                    </div>
                    <p className="doctor-specialty">{doctor.specialty}</p>
                    <div className="doctor-rating">
                      <span className="stars">⭐ {doctor.rating}</span>
                      <span className="review-count">({doctor.reviewCount} reviews)</span>
                    </div>
                  </div>
                </div>

                <div className="doctor-details">
                  <div className="detail-row">
                    <span className="detail-icon">💼</span>
                    <span>{doctor.experience} years experience</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-icon">📍</span>
                    <span>
                      {doctor.location.district}, {doctor.location.city}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-icon">💬</span>
                    <span>{doctor.languages.join(', ')}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-icon">💰</span>
                    <span>{doctor.fees} EGP</span>
                  </div>
                </div>

                <div className="doctor-actions">
                  <button
                    className="view-profile-btn"
                    onClick={() => {
                      setSelectedDoctor(doctor);
                      setShowBooking(false);
                    }}
                  >
                    View Profile
                  </button>
                  <button
                    className="book-btn"
                    onClick={() => {
                      setSelectedDoctor(doctor);
                      setShowBooking(true);
                    }}
                  >
                    Book Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {showBooking && selectedDoctor && (
        <div className="modal-overlay" onClick={() => setShowBooking(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Book Appointment</h2>
              <button className="close-modal-btn" onClick={() => setShowBooking(false)}>
                ×
              </button>
            </div>

            <div className="booking-doctor-info">
              <div className="booking-avatar">{selectedDoctor.image}</div>
              <div>
                <h3>{selectedDoctor.name}</h3>
                <p>{selectedDoctor.specialty}</p>
                <p className="booking-location">
                  {selectedDoctor.location.address}, {selectedDoctor.location.district}
                </p>
              </div>
            </div>

            <div className="booking-section">
              <h3>Select Date</h3>
              <div className="date-picker">
                <button className="date-btn active">Today</button>
                <button className="date-btn">Tomorrow</button>
                <button className="date-btn">Sun, Feb 10</button>
                <button className="date-btn">Mon, Feb 11</button>
              </div>
            </div>

            <div className="booking-section">
              <h3>Available Time Slots</h3>
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

            <div className="booking-summary">
              <div className="summary-row">
                <span>Consultation Fee:</span>
                <span className="fee-amount">{selectedDoctor.fees} EGP</span>
              </div>
            </div>

            <button
              className="confirm-booking-btn"
              onClick={handleBookAppointment}
              disabled={!selectedSlot}
            >
              Confirm Booking
            </button>
          </div>
        </div>
      )}

      {/* Doctor Profile Modal */}
      {selectedDoctor && !showBooking && (
        <div className="modal-overlay" onClick={() => setSelectedDoctor(null)}>
          <div className="modal-content profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Doctor Profile</h2>
              <button className="close-modal-btn" onClick={() => setSelectedDoctor(null)}>
                ×
              </button>
            </div>

            <div className="profile-content">
              <div className="profile-header">
                <div className="profile-avatar">{selectedDoctor.image}</div>
                <div>
                  <h2>{selectedDoctor.name}</h2>
                  <p className="profile-specialty">{selectedDoctor.specialty}</p>
                  <div className="profile-rating">
                    <span className="stars">⭐ {selectedDoctor.rating}</span>
                    <span>({selectedDoctor.reviewCount} reviews)</span>
                  </div>
                </div>
              </div>

              <div className="profile section">
                <h3>About</h3>
                <p>
                  {selectedDoctor.name} is a highly experienced {selectedDoctor.specialty.toLowerCase()} with{' '}
                  {selectedDoctor.experience} years of practice. Specialized in providing comprehensive care
                  with a patient-first approach.
                </p>
              </div>

              <div className="profile-section">
                <h3>Languages</h3>
                <div className="language-badges">
                  {selectedDoctor.languages.map((lang) => (
                    <span key={lang} className="language-badge">
                      {lang}
                    </span>
                  ))}
                </div>
              </div>

              <div className="profile-section">
                <h3>Location</h3>
                <p>
                  {selectedDoctor.location.address}
                  <br />
                  {selectedDoctor.location.district}, {selectedDoctor.location.city}
                </p>
              </div>

              <div className="profile-section">
                <h3>Consultation Fee</h3>
                <p className="fee-large">{selectedDoctor.fees} EGP</p>
              </div>

              <button
                className="book-appointment-btn"
                onClick={() => {
                  setShowBooking(true);
                }}
              >
                Book Appointment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
