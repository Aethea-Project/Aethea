/**
 * Mock chat data for DoctorChat page
 * Will be replaced by real-time API calls when the backend endpoints are ready.
 */

export interface ChatDoctor {
  id: string;
  name: string;
  specialty: string;
  avatar: string;
  status: 'online' | 'offline' | 'busy';
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'patient' | 'doctor';
  content: string;
  timestamp: Date;
  type: 'text' | 'image' | 'file';
  fileUrl?: string;
  fileName?: string;
}

export const mockDoctor: ChatDoctor = {
  id: 'dr-001',
  name: 'Dr. Ahmed Hassan',
  specialty: 'Cardiologist',
  avatar: '👨‍⚕️',
  status: 'online',
};

export const mockMessages: ChatMessage[] = [
  {
    id: 'msg-001',
    senderId: 'dr-001',
    senderName: 'Dr. Ahmed Hassan',
    senderRole: 'doctor',
    content: 'Good morning! I reviewed your recent lab results. How have you been feeling?',
    timestamp: new Date('2026-02-08T09:15:00'),
    type: 'text',
  },
  {
    id: 'msg-002',
    senderId: 'patient-001',
    senderName: 'You',
    senderRole: 'patient',
    content:
      'Good morning Doctor. I have been feeling much better since following the diet plan you recommended.',
    timestamp: new Date('2026-02-08T09:17:00'),
    type: 'text',
  },
  {
    id: 'msg-003',
    senderId: 'dr-001',
    senderName: 'Dr. Ahmed Hassan',
    senderRole: 'doctor',
    content:
      'That is great to hear! Your cholesterol levels have improved significantly. Continue with the current plan and let me know if you have any concerns.',
    timestamp: new Date('2026-02-08T09:19:00'),
    type: 'text',
  },
  {
    id: 'msg-004',
    senderId: 'patient-001',
    senderName: 'You',
    senderRole: 'patient',
    content:
      'Thank you! Should I continue taking the medication at the same dosage?',
    timestamp: new Date('2026-02-08T09:21:00'),
    type: 'text',
  },
];
