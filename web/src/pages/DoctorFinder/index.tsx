import React, { useState } from 'react';
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

  const filteredDoctors = mockDoctors.filter((doctor) => {
    const matchesSearch =
      doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.location.district.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSpecialty =
      selectedSpecialty === 'All Specialties' || doctor.specialty === selectedSpecialty;
    return matchesSearch && matchesSpecialty;
  });

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
      <div className="page-header">
        <div className="header-content">
          <h1>📍 Find a Doctor</h1>
          <p>Search for doctors near you and book appointments instantly</p>
        </div>
      </div>

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
          {/* Map Mockup */}
          <div className="map-container">
            <div className="map-placeholder">
              <span className="map-icon">🗺️</span>
              <p>Interactive Map View</p>
              <small>Showing {filteredDoctors.length} doctors near you</small>
            </div>
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
