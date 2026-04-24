import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { DoctorProfile } from '../../services/medicalApi';
import { cn } from '../../lib/utils';

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
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center gap-3 border-b border-slate-100 p-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">
          {doctor.photoUrl ? (
            <img src={doctor.photoUrl} alt={name} className="h-full w-full rounded-full object-cover" />
          ) : (
            <span>{doctor.firstName[0]}{doctor.lastName[0]}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-sm font-semibold text-slate-900">{name}</h3>
            {doctor.verified && (
              <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-teal-600 text-[10px] text-white" title="Verified">✓</span>
            )}
          </div>
          <p className="text-xs text-slate-500">{doctor.specialty}</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4 text-sm text-slate-600">
        {location && (
          <div className="flex items-start gap-2">
            <span className="shrink-0 text-slate-400">📍</span>
            <span className="break-words">{location}</span>
          </div>
        )}
        {doctor.languages.length > 0 && (
          <div className="flex items-start gap-2">
            <span className="shrink-0 text-slate-400">💬</span>
            <span>{doctor.languages.join(', ')}</span>
          </div>
        )}
        {doctor.consultFee != null && (
          <div className="flex items-start gap-2">
            <span className="shrink-0 text-slate-400">💰</span>
            <span>{doctor.consultFee} EGP</span>
          </div>
        )}
      </div>

      <div className="border-t border-slate-100 p-4 pt-3">
        <button
          className="w-full rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
          type="button"
          onClick={handleViewInMarketplace}
        >
          View In Marketplace
        </button>
      </div>
    </div>
  );
};