import React from 'react';
import type { Doctor } from '../../data/mocks/doctors';

interface DoctorCardProps {
  doctor: Doctor;
  onViewProfile: (doctor: Doctor) => void;
  onBook: (doctor: Doctor) => void;
}

export const DoctorCard: React.FC<DoctorCardProps> = ({ doctor, onViewProfile, onBook }) => {
  return (
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
        <button className="view-profile-btn" onClick={() => onViewProfile(doctor)}>
          View Profile
        </button>
        <button className="book-btn" onClick={() => onBook(doctor)}>
          Book Now
        </button>
      </div>
    </div>
  );
};
