/**
 * Email Service — notification delivery
 *
 * All email functions properly await the SMTP handoff so that the
 * Node.js runtime does not terminate before the email is queued.
 *
 * The sendEmail() helper already catches transport errors gracefully,
 * so callers will not crash if SMTP is unavailable.
 */

import logger from '../lib/logger.js';

/* ─── Payload Interfaces ─── */

interface ReservationEmailPayload {
  to: string;
  doctorName: string;
  specialty: string;
  startAt: Date;
  endAt: Date;
  clinic?: string;
}

interface SlotAvailableEmailPayload {
  to: string;
  doctorName: string;
  specialty: string;
  scheduleDate: Date;
  startAt: Date;
  endAt: Date;
}

interface ReservationCancelledEmailPayload {
  to: string;
  doctorName: string;
  specialty: string;
  startAt: Date;
  endAt: Date;
  clinic?: string;
  reason?: string;
}

interface ProfileUpdateOtpEmailPayload {
  to: string;
  code: string;
  expiresInSeconds: number;
}

interface PasswordChangeOtpEmailPayload {
  to: string;
  code: string;
  expiresInSeconds: number;
}

interface AdminPasswordChangedNoticeEmailPayload {
  to: string;
}

/* ─── Transport ─── */

type MailerTransport = {
  sendMail: (message: { from: string; to: string; subject: string; text: string }) => Promise<unknown>;
};

let transport: MailerTransport | null = null;
let nodemailerUnavailableLogged = false;

const isEmailEnabled = (): boolean => {
  const flag = (process.env.EMAIL_NOTIFICATIONS_ENABLED ?? 'true').toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(flag);
};

const getTransport = async (): Promise<MailerTransport | null> => {
  if (transport) {
    return transport;
  }

  if (!isEmailEnabled()) {
    return null;
  }

  const host = process.env.SMTP_HOST?.trim() || 'mailhog';
  const port = Number(process.env.SMTP_PORT ?? 1025);
  const secure = (process.env.SMTP_SECURE ?? 'false').toLowerCase() === 'true';
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();

  try {
    const nodemailerModule = await import('nodemailer');
    transport = nodemailerModule.default.createTransport({
      host,
      port,
      secure,
      ...(user && pass ? { auth: { user, pass } } : {}),
    });
  } catch (error) {
    if (!nodemailerUnavailableLogged) {
      nodemailerUnavailableLogged = true;
      logger.warn({ err: error }, 'nodemailer is not available; email notifications are disabled');
    }
    return null;
  }

  return transport;
};

/* ─── Core Send ─── */

export async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  if (!to) {
    return;
  }

  const sender = process.env.EMAIL_FROM?.trim() || 'Aethea <no-reply@aethea.me>';
  const mailer = await getTransport();

  if (!mailer) {
    logger.info({ to, subject }, 'Email notifications are disabled; skipping send');
    return;
  }

  try {
    await mailer.sendMail({
      from: sender,
      to,
      subject,
      text,
    });
  } catch (error) {
    logger.warn({ err: error, to, subject }, 'Failed to send notification email');
  }
}

/* ─── Formatting Helpers ─── */

const TIMEZONE = 'Africa/Cairo';

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeZone: TIMEZONE }).format(date);
};

const formatTime = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', { timeStyle: 'short', timeZone: TIMEZONE }).format(date);
};

/* ─── Public Email Functions ─── */

export async function sendReservationBookedEmail(payload: ReservationEmailPayload): Promise<void> {
  const date = formatDate(payload.startAt);
  const startTime = formatTime(payload.startAt);
  const endTime = formatTime(payload.endAt);

  const lines = [
    'Your appointment has been confirmed.',
    '',
    `Doctor: ${payload.doctorName}`,
    `Specialty: ${payload.specialty}`,
    `Date: ${date}`,
    `Time: ${startTime} - ${endTime}`,
    `Clinic: ${payload.clinic || 'N/A'}`,
    '',
    'Thank you for using Aethea.',
  ];

  await sendEmail(payload.to, 'Aethea - Appointment Confirmed', lines.join('\n'));
}

export async function sendSlotAvailableEmail(payload: SlotAvailableEmailPayload): Promise<void> {
  const date = formatDate(payload.scheduleDate);
  const startTime = formatTime(payload.startAt);
  const endTime = formatTime(payload.endAt);

  const lines = [
    'Good news. A slot is now available.',
    '',
    `Doctor: ${payload.doctorName}`,
    `Specialty: ${payload.specialty}`,
    `Date: ${date}`,
    `Schedule window: ${startTime} - ${endTime}`,
    '',
    'Open Aethea and book the slot before it is taken again.',
  ];

  await sendEmail(payload.to, 'Aethea - Slot Available', lines.join('\n'));
}

export async function sendReservationCancelledEmail(payload: ReservationCancelledEmailPayload): Promise<void> {
  const date = formatDate(payload.startAt);
  const startTime = formatTime(payload.startAt);
  const endTime = formatTime(payload.endAt);

  const lines = [
    'Your appointment has been cancelled.',
    '',
    `Doctor: ${payload.doctorName}`,
    `Specialty: ${payload.specialty}`,
    `Date: ${date}`,
    `Time: ${startTime} - ${endTime}`,
    `Clinic: ${payload.clinic || 'N/A'}`,
  ];
  
  if (payload.reason) {
    lines.push(`Reason: ${payload.reason}`);
  }
  
  lines.push('', 'If this was a mistake, you can book another slot from the Appointments Marketplace.');

  await sendEmail(payload.to, 'Aethea - Appointment Cancelled', lines.join('\n'));
}

export async function sendProfileUpdateOtpEmail(payload: ProfileUpdateOtpEmailPayload): Promise<void> {
  const minutes = Math.floor(payload.expiresInSeconds / 60);
  const lines = [
    'You have requested to update your profile data.',
    '',
    `Your verification code is: ${payload.code}`,
    `This code will expire in ${minutes} minutes.`,
    '',
    'If you did not request this change, please contact support and change your password immediately.',
  ];
  await sendEmail(payload.to, 'Aethea - Profile Update Verification Code', lines.join('\n'));
}

export async function sendPasswordChangeOtpEmail(payload: PasswordChangeOtpEmailPayload): Promise<void> {
  const minutes = Math.floor(payload.expiresInSeconds / 60);
  const lines = [
    'You have requested to change your password.',
    '',
    `Your verification code is: ${payload.code}`,
    `This code will expire in ${minutes} minutes.`,
    '',
    'If you did not request this action, please contact support immediately.',
  ];

  await sendEmail(payload.to, 'Aethea - Password Change Verification Code', lines.join('\n'));
}

export async function sendAdminPasswordChangedNoticeEmail(payload: AdminPasswordChangedNoticeEmailPayload): Promise<void> {
  const lines = [
    'Your account password was changed by an Aethea administrator.',
    '',
    'If this action was expected, sign in using the temporary password provided by the administrator, then change your password immediately.',
    'If you did not request this action, contact support immediately.',
  ];

  await sendEmail(payload.to, 'Aethea - Password Changed by Admin', lines.join('\n'));
}

export async function sendErrorAlert(error: unknown, context: string): Promise<void> {
  const adminEmail = process.env.EMAIL_FROM?.match(/<(.+?)>/)?.[1] || process.env.SMTP_USER || 'aethea.email.8@gmail.com';
  
  const lines = [
    'Critical Server Error Alert',
    '==========================',
    `Context: ${context}`,
    `Time: ${new Date().toISOString()}`,
    '',
    'Error Details:',
    typeof error === 'string' ? error : JSON.stringify(error, Object.getOwnPropertyNames(error as object), 2),
  ];

  await sendEmail(adminEmail, `Aethea Alert: Server Error in ${context}`, lines.join('\n'));
}

export interface PatientVisitCompletedEmailPayload {
  to: string;
  patientName: string;
  doctorName: string;
}

export async function sendPatientVisitCompletedEmail(payload: PatientVisitCompletedEmailPayload): Promise<void> {
  const lines = [
    `Hello ${payload.patientName},`,
    '',
    `We hope you had a good experience during your visit with Dr. ${payload.doctorName}.`,
    '',
    'Your feedback is extremely valuable to help us improve our services. Please take a moment to review your visit by logging into your account.',
    'All reviews are fully anonymized to protect your identity.',
    '',
    'Thank you for choosing Aethea.',
  ];

  await sendEmail(payload.to, 'Aethea - How was your visit?', lines.join('\n'));
}

