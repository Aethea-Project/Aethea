import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { DoctorProfile } from '../../services/medicalApi';

interface DoctorCardProps {
  doctor: DoctorProfile;
}

export const DoctorCard: React.FC<DoctorCardProps> = ({ doctor }) => {
  const navigate = useNavigate();
  const name = `Dr. ${doctor.firstName} ${doctor.lastName}`;
  const location = doctor.address || [doctor.clinicName, doctor.city].filter(Boolean).join(', ') || 'Location unknown';

  const handleViewInMarketplace = () => {
    const params = new URLSearchParams();
    params.set('search', `${doctor.firstName} ${doctor.lastName}`);
    if (doctor.specialty) {
      params.set('specialty', doctor.specialty);
    }
    if (doctor.city) {
      params.set('city', doctor.city);
    }
    navigate(`/appointments-marketplace?${params.toString()}`);
  };

  return (
    <div className="doctor-card">
      <div className="doctor-card-header">
        <div className="doctor-avatar">
          {doctor.photoUrl ? (
            <img src={doctor.photoUrl} alt={name} />
          ) : (
            <span>{doctor.firstName[0]}{doctor.lastName[0]}</span>
          )}
        </div>
        <div className="doctor-info">
          <div className="doctor-name-row">
            <h3>{name}</h3>
            {doctor.verified && (
              <span className="verified-badge" title="Verified">✓</span>
            )}
          </div>
          <p className="doctor-specialty">{doctor.specialty}</p>
        </div>
      </div>

      <div className="doctor-details">
        {location && (
          <div className="detail-row">
            <span className="detail-icon">📍</span>
            <span>{location}</span>
          </div>
        )}
        {doctor.languages.length > 0 && (
          <div className="detail-row">
            <span className="detail-icon">💬</span>
            <span>{doctor.languages.join(', ')}</span>
          </div>
        )}
        {doctor.consultFee != null && (
          <div className="detail-row">
            <span className="detail-icon">💰</span>
            <span>{doctor.consultFee} EGP</span>
          </div>
        )}
      </div>

      <div className="doctor-actions">
        <button className="book-btn" type="button" onClick={handleViewInMarketplace}>
          View In Marketplace
        </button>
      </div>
    </div>
  );
};