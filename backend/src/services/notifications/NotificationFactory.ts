import { INotificationPayload } from './DeliveryStrategies.js';
import { NotificationType } from '../../generated/prisma/client.js';

export class NotificationFactory {
  
  static buildReservationConfirmed(
    userId: string, 
    role: 'patient' | 'doctor', 
    metadata: { 
      reservationId: string; 
      doctorId: string; 
      patientId: string; 
      startAt: Date;
      patientName: string;
      doctorName: string;
    }
  ): INotificationPayload {
    const formattedDate = new Date(metadata.startAt).toLocaleString();

    if (role === 'patient') {
      const bodyText = `Your appointment with Dr. ${metadata.doctorName} is confirmed for ${formattedDate}.`;
      return {
        userId,
        type: 'reservation_confirmed',
        title: 'Appointment Confirmed',
        body: bodyText,
        metadata: { reservationId: metadata.reservationId },
        emailTemplate: {
          subject: 'Aethea - Appointment Confirmed',
          text: bodyText
        }
      };
    } else {
      const bodyText = `You have a new booking with patient ${metadata.patientName} on ${formattedDate}.`;
      return {
        userId,
        type: 'reservation_confirmed',
        title: 'New Patient Booking',
        body: bodyText,
        metadata: { reservationId: metadata.reservationId },
        emailTemplate: {
          subject: 'Aethea - New Patient Booking',
          text: bodyText
        }
      };
    }
  }

  static buildReservationCancelled(
    userId: string, 
    role: 'patient' | 'doctor', 
    metadata: { 
      reservationId: string; 
      cancelledByRole: string;
      patientName: string;
      doctorName: string;
      startAt?: Date | string;
    }
  ): INotificationPayload {
    const formattedDate = metadata.startAt ? ` scheduled for ${new Date(metadata.startAt).toLocaleString()}` : '';
    if (role === 'patient') {
      const byDoctor = metadata.cancelledByRole === 'doctor';
      const bodyText = byDoctor 
        ? `Your appointment${formattedDate} was cancelled by Dr. ${metadata.doctorName}.` 
        : `Your appointment with Dr. ${metadata.doctorName}${formattedDate} has been cancelled.`;
      return {
        userId,
        type: 'reservation_cancelled',
        title: 'Appointment Cancelled',
        body: bodyText,
        metadata: { reservationId: metadata.reservationId }
      };
    } else {
      const byPatient = metadata.cancelledByRole === 'patient';
      const bodyText = byPatient 
        ? `Patient ${metadata.patientName} has cancelled their appointment${formattedDate}.` 
        : `The appointment with patient ${metadata.patientName}${formattedDate} has been cancelled.`;
      return {
        userId,
        type: 'reservation_cancelled',
        title: 'Appointment Cancelled',
        body: bodyText,
        metadata: { reservationId: metadata.reservationId }
      };
    }
  }

  static buildScheduleFull(doctorId: string, scheduleDate: Date): INotificationPayload {
    return {
      userId: doctorId,
      type: 'schedule_full',
      title: 'Schedule Full',
      body: `Your schedule for ${new Date(scheduleDate).toLocaleDateString()} is fully booked!`,
    };
  }

  // Generic method for other types
  static buildGeneric(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    metadata?: Record<string, unknown>
  ): INotificationPayload {
    return {
      userId,
      type,
      title,
      body,
      metadata
    };
  }
}
