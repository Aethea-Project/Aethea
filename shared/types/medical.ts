/**
 * Aethea Medical Data Types
 * Enterprise-level type definitions for medical data
 */

// Lab Test Result Types
export interface LabTest {
  id: string;
  testName: string;
  category: LabCategory;
  value: number | string;
  unit: string;
  referenceRange: {
    min?: number;
    max?: number;
    text?: string; // For non-numeric ranges
  };
  status: LabStatus;
  date: Date;
  orderedBy: string;
  notes?: string;
}

export type LabCategory = 
  | 'Blood Chemistry'
  | 'Complete Blood Count'
  | 'Lipid Panel'
  | 'Liver Function'
  | 'Kidney Function'
  | 'Thyroid Panel'
  | 'Urinalysis'
  | 'Other';

export type LabStatus = 'normal' | 'borderline' | 'abnormal' | 'critical';

export interface LabTestHistory {
  testName: string;
  data: Array<{
    date: Date;
    value: number;
  }>;
  unit: string;
}

// Medical Scan Types
export interface MedicalScan {
  id: string;
  type: ScanType;
  bodyPart: string;
  date: Date;
  description: string;
  findings?: string;
  radiologist: string;
  priority: ScanPriority;
  images: ScanImage[];
  status: ScanStatus;
  reportUrl?: string;
}

export type ScanType = 
  | 'X-Ray'
  | 'CT Scan'
  | 'MRI'
  | 'Ultrasound'
  | 'PET Scan'
  | 'Mammogram';

export type ScanPriority = 'routine' | 'urgent' | 'emergency';

export type ScanStatus = 'pending' | 'in-progress' | 'completed' | 'reviewed';

export interface ScanImage {
  id: string;
  url: string;
  thumbnail: string;
  caption?: string;
  view?: string; // e.g., "Frontal", "Lateral", "Oblique"
  annotations?: Annotation[];
}

export interface Annotation {
  id: string;
  type: 'arrow' | 'circle' | 'text' | 'measurement';
  coordinates: {
    x: number;
    y: number;
    width?: number;
    height?: number;
  };
  text?: string;
  color: string;
}

// Appointment/Reservation Types
export interface Appointment {
  id: string;
  type: AppointmentType;
  doctor: Doctor;
  date: Date;
  duration: number; // minutes
  status: AppointmentStatus;
  reason: string;
  location: string;
  notes?: string;
  reminder?: boolean;
}

export type AppointmentType = 
  | 'Consultation'
  | 'Follow-up'
  | 'Lab Test'
  | 'Imaging'
  | 'Procedure'
  | 'Vaccination';

export type AppointmentStatus = 
  | 'scheduled'
  | 'confirmed'
  | 'in-progress'
  | 'completed'
  | 'cancelled'
  | 'no-show';

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  photo?: string;
  rating?: number;
}

// User/Patient Profile
export interface PatientProfile {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: 'male' | 'female' | 'other';
  bloodType?: string;
  allergies: string[];
  chronicConditions: string[];
  medications: Medication[];
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  photo?: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  startDate: Date;
  endDate?: Date;
  prescribedBy: string;
}

// Dashboard Statistics
export interface DashboardStats {
  upcomingAppointments: number;
  pendingLabResults: number;
  newScans: number;
  medicationsToRefill: number;
  lastVisit?: Date;
}

// Notification Types
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  date: Date;
  read: boolean;
  actionUrl?: string;
}

export type NotificationType = 
  | 'appointment'
  | 'lab-result'
  | 'scan-result'
  | 'medication'
  | 'general';
