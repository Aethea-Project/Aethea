import React from 'react';
import type { Doctor } from '../../data/mocks/doctors';

interface BookingModalProps {
  doctor: Doctor;
  selectedSlot: string;
  onSelectSlot: (slot: string) => void;
  onBook: () => void;
  bookingInProgress: boolean;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  doctor,
  selectedSlot,
  onSelectSlot,
  onBook,
  bookingInProgress,
}) => {
  return (
    <div className="booking-form">
      <h3>
        Book Appointment with <span>{doctor.name}</span>
      </h3>
      <p>
        <span>Specialty:</span> {doctor.specialty}
      </p>
      <p>
        <span>Location:</span> {doctor.location.district}, {doctor.location.city}
      </p>

      <div className="slot-selection">
        <h4>Available Slots Today</h4>
        <div className="slots-grid">
          {doctor.availableSlots.map((slot) => (
            <button
              key={slot}
              className={`slot-btn ${selectedSlot === slot ? 'active' : ''}`}
              onClick={() => onSelectSlot(slot)}
              disabled={bookingInProgress}
            >
              {slot}
            </button>
          ))}
        </div>
      </div>

      <div className="modal-actions">
        <button
          className="book-btn"
          onClick={onBook}
          disabled={!selectedSlot || bookingInProgress}
        >
          {bookingInProgress ? 'Processing...' : 'Confirm Reservation'}
        </button>
      </div>
    </div>
  );
};
