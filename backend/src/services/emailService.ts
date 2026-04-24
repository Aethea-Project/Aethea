import logger from '../lib/logger.js';

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

type MailerTransport = {
  sendMail: (message: { from: string; to: string; subject: string; text: string }) => Promise<unknown>;
};

let transport: MailerTransport | null = null;
let nodemailerUnavailableLogged = false;

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

async function sendEmail(to: string, subject: string, text: string): Promise<void> {
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

/**
 * Queue an email send without blocking the request/response lifecycle.
 *
 * Note: this is best-effort. If the process terminates immediately after
 * responding (e.g. serverless), the queued send may not execute.
 */
function queueEmailSend(to: string, subject: string, text: string): void {
  if (!to) return;

  // Defer execution to allow the API response to complete first.
  setImmediate(() => {
    void sendEmail(to, subject, text).catch((error) => {
      logger.warn({ err: error, to, subject }, 'Async email send failed');
    });
  });
}

const TIMEZONE = 'Africa/Cairo';

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeZone: TIMEZONE }).format(date);
};

const formatTime = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', { timeStyle: 'short', timeZone: TIMEZONE }).format(date);
};

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

  queueEmailSend(payload.to, 'Aethea - Appointment Confirmed', lines.join('\n'));
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

  queueEmailSend(payload.to, 'Aethea - Slot Available', lines.join('\n'));
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

  queueEmailSend(payload.to, 'Aethea - Appointment Cancelled', lines.join('\n'));
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
  queueEmailSend(payload.to, 'Aethea - Profile Update Verification Code', lines.join('\n'));
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

  queueEmailSend(payload.to, 'Aethea - Password Change Verification Code', lines.join('\n'));
}

export async function sendAdminPasswordChangedNoticeEmail(payload: AdminPasswordChangedNoticeEmailPayload): Promise<void> {
  const lines = [
    'Your account password was changed by an Aethea administrator.',
    '',
    'If this action was expected, sign in using the temporary password provided by the administrator, then change your password immediately.',
    'If you did not request this action, contact support immediately.',
  ];

  queueEmailSend(payload.to, 'Aethea - Password Changed by Admin', lines.join('\n'));
}

export async function sendErrorAlert(error: any, context: string): Promise<void> {
  const adminEmail = process.env.EMAIL_FROM?.match(/<(.+?)>/)?.[1] || process.env.SMTP_USER || 'aethea.email.8@gmail.com';
  
  const lines = [
    'Critical Server Error Alert',
    '==========================',
    `Context: ${context}`,
    `Time: ${new Date().toISOString()}`,
    '',
    'Error Details:',
    typeof error === 'string' ? error : JSON.stringify(error, Object.getOwnPropertyNames(error), 2),
  ];

  queueEmailSend(adminEmail, `Aethea Alert: Server Error in ${context}`, lines.join('\n'));
}

