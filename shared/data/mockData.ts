/**
 * Aethea Mock Data
 * Realistic medical data for UI development and testing
 */

import { 
  LabTest, 
  LabTestHistory, 
  MedicalScan, 
  Appointment,
  PatientProfile,
  DashboardStats,
  Notification 
} from '../types/medical';

// Mock Lab Tests
export const mockLabTests: LabTest[] = [
  // Complete Blood Count
  {
    id: 'lab-001',
    testName: 'White Blood Cell Count',
    category: 'Complete Blood Count',
    value: 7.2,
    unit: '10³/µL',
    referenceRange: { min: 4.5, max: 11.0 },
    status: 'normal',
    date: new Date('2026-01-15'),
    orderedBy: 'Dr. Sarah Johnson',
  },
  {
    id: 'lab-002',
    testName: 'Red Blood Cell Count',
    category: 'Complete Blood Count',
    value: 4.8,
    unit: '10⁶/µL',
    referenceRange: { min: 4.5, max: 5.9 },
    status: 'normal',
    date: new Date('2026-01-15'),
    orderedBy: 'Dr. Sarah Johnson',
  },
  {
    id: 'lab-003',
    testName: 'Hemoglobin',
    category: 'Complete Blood Count',
    value: 13.2,
    unit: 'g/dL',
    referenceRange: { min: 13.5, max: 17.5 },
    status: 'borderline',
    date: new Date('2026-01-15'),
    orderedBy: 'Dr. Sarah Johnson',
    notes: 'Slightly below normal range. Monitor and retest in 2 months.',
  },
  {
    id: 'lab-004',
    testName: 'Platelet Count',
    category: 'Complete Blood Count',
    value: 245,
    unit: '10³/µL',
    referenceRange: { min: 150, max: 400 },
    status: 'normal',
    date: new Date('2026-01-15'),
    orderedBy: 'Dr. Sarah Johnson',
  },

  // Lipid Panel
  {
    id: 'lab-005',
    testName: 'Total Cholesterol',
    category: 'Lipid Panel',
    value: 215,
    unit: 'mg/dL',
    referenceRange: { max: 200 },
    status: 'borderline',
    date: new Date('2026-01-18'),
    orderedBy: 'Dr. Michael Chen',
    notes: 'Consider dietary modifications.',
  },
  {
    id: 'lab-006',
    testName: 'LDL Cholesterol',
    category: 'Lipid Panel',
    value: 135,
    unit: 'mg/dL',
    referenceRange: { max: 100 },
    status: 'abnormal',
    date: new Date('2026-01-18'),
    orderedBy: 'Dr. Michael Chen',
    notes: 'Elevated. Recommend lifestyle changes and possible medication.',
  },
  {
    id: 'lab-007',
    testName: 'HDL Cholesterol',
    category: 'Lipid Panel',
    value: 58,
    unit: 'mg/dL',
    referenceRange: { min: 40 },
    status: 'normal',
    date: new Date('2026-01-18'),
    orderedBy: 'Dr. Michael Chen',
  },
  {
    id: 'lab-008',
    testName: 'Triglycerides',
    category: 'Lipid Panel',
    value: 142,
    unit: 'mg/dL',
    referenceRange: { max: 150 },
    status: 'normal',
    date: new Date('2026-01-18'),
    orderedBy: 'Dr. Michael Chen',
  },

  // Blood Chemistry
  {
    id: 'lab-009',
    testName: 'Glucose (Fasting)',
    category: 'Blood Chemistry',
    value: 102,
    unit: 'mg/dL',
    referenceRange: { min: 70, max: 100 },
    status: 'borderline',
    date: new Date('2026-01-19'),
    orderedBy: 'Dr. Sarah Johnson',
    notes: 'Prediabetic range. Follow-up with A1C test recommended.',
  },
  {
    id: 'lab-010',
    testName: 'Creatinine',
    category: 'Kidney Function',
    value: 1.1,
    unit: 'mg/dL',
    referenceRange: { min: 0.7, max: 1.3 },
    status: 'normal',
    date: new Date('2026-01-19'),
    orderedBy: 'Dr. Sarah Johnson',
  },
];

// Mock Lab Test History (for charts)
export const mockLabHistory: LabTestHistory[] = [
  {
    testName: 'Glucose (Fasting)',
    unit: 'mg/dL',
    data: [
      { date: new Date('2025-07-15'), value: 92 },
      { date: new Date('2025-10-15'), value: 98 },
      { date: new Date('2026-01-19'), value: 102 },
    ],
  },
  {
    testName: 'Total Cholesterol',
    unit: 'mg/dL',
    data: [
      { date: new Date('2025-07-15'), value: 195 },
      { date: new Date('2025-10-15'), value: 205 },
      { date: new Date('2026-01-18'), value: 215 },
    ],
  },
  {
    testName: 'Hemoglobin',
    unit: 'g/dL',
    data: [
      { date: new Date('2025-07-15'), value: 14.1 },
      { date: new Date('2025-10-15'), value: 13.8 },
      { date: new Date('2026-01-15'), value: 13.2 },
    ],
  },
];

// Mock Medical Scans
export const mockScans: MedicalScan[] = [
  {
    id: 'scan-001',
    type: 'X-Ray',
    bodyPart: 'Chest',
    date: new Date('2026-01-20'),
    description: 'Routine chest X-ray - Frontal and lateral views',
    findings: 'Clear lung fields bilaterally. No acute cardiopulmonary abnormality. Heart size within normal limits.',
    radiologist: 'Dr. Robert Martinez, MD',
    priority: 'routine',
    status: 'completed',
    images: [
      {
        id: 'img-001-1',
        url: 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?w=800',
        thumbnail: 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?w=200',
        caption: 'Frontal View',
        view: 'PA (Posterior-Anterior)',
      },
      {
        id: 'img-001-2',
        url: 'https://images.unsplash.com/photo-1581594549595-35f6edc7b762?w=800',
        thumbnail: 'https://images.unsplash.com/photo-1581594549595-35f6edc7b762?w=200',
        caption: 'Lateral View',
        view: 'Lateral',
      },
    ],
  },
  {
    id: 'scan-002',
    type: 'X-Ray',
    bodyPart: 'Right Knee',
    date: new Date('2026-01-12'),
    description: 'Right knee pain evaluation',
    findings: 'Mild degenerative changes noted. No acute fracture or dislocation. Joint space narrowing consistent with early osteoarthritis.',
    radiologist: 'Dr. Emily Thompson, MD',
    priority: 'routine',
    status: 'reviewed',
    images: [
      {
        id: 'img-002-1',
        url: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800',
        thumbnail: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=200',
        caption: 'AP View',
        view: 'Anterior-Posterior',
      },
      {
        id: 'img-002-2',
        url: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800',
        thumbnail: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=200',
        caption: 'Lateral View',
        view: 'Lateral',
      },
    ],
  },
  {
    id: 'scan-003',
    type: 'CT Scan',
    bodyPart: 'Abdomen',
    date: new Date('2026-01-08'),
    description: 'Abdominal CT with contrast',
    findings: 'Normal liver, spleen, pancreas, and kidneys. No evidence of masses or collections. Bowel loops appear unremarkable.',
    radiologist: 'Dr. Robert Martinez, MD',
    priority: 'urgent',
    status: 'completed',
    images: [
      {
        id: 'img-003-1',
        url: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800',
        thumbnail: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=200',
        caption: 'Axial Slice 1',
        view: 'Axial',
      },
      {
        id: 'img-003-2',
        url: 'https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=800',
        thumbnail: 'https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=200',
        caption: 'Axial Slice 2',
        view: 'Axial',
      },
    ],
  },
];

// Mock Appointments
export const mockAppointments: Appointment[] = [
  {
    id: 'apt-001',
    type: 'Follow-up',
    doctor: {
      id: 'doc-001',
      name: 'Dr. Sarah Johnson',
      specialty: 'Internal Medicine',
      rating: 4.8,
    },
    date: new Date('2026-01-25T10:00:00'),
    duration: 30,
    status: 'confirmed',
    reason: 'Discuss lab results and treatment plan',
    location: 'Medical Center - Building A, Room 205',
    reminder: true,
  },
  {
    id: 'apt-002',
    type: 'Lab Test',
    doctor: {
      id: 'doc-002',
      name: 'Lab Services',
      specialty: 'Laboratory',
    },
    date: new Date('2026-02-01T08:30:00'),
    duration: 15,
    status: 'scheduled',
    reason: 'A1C and lipid panel retest',
    location: 'Medical Center - Lab Wing',
    reminder: true,
  },
  {
    id: 'apt-003',
    type: 'Consultation',
    doctor: {
      id: 'doc-003',
      name: 'Dr. Michael Chen',
      specialty: 'Cardiology',
      rating: 4.9,
    },
    date: new Date('2026-02-10T14:00:00'),
    duration: 45,
    status: 'scheduled',
    reason: 'Cardiovascular health evaluation',
    location: 'Cardiology Clinic - 3rd Floor',
    reminder: true,
  },
];

// Mock Patient Profile
export const mockPatient: PatientProfile = {
  id: 'patient-001',
  firstName: 'John',
  lastName: 'Anderson',
  dateOfBirth: new Date('1985-03-15'),
  gender: 'male',
  bloodType: 'A+',
  allergies: ['Penicillin', 'Peanuts'],
  chronicConditions: ['Hypertension', 'Prediabetes'],
  medications: [
    {
      id: 'med-001',
      name: 'Lisinopril',
      dosage: '10mg',
      frequency: 'Once daily',
      startDate: new Date('2025-06-01'),
      prescribedBy: 'Dr. Sarah Johnson',
    },
    {
      id: 'med-002',
      name: 'Metformin',
      dosage: '500mg',
      frequency: 'Twice daily with meals',
      startDate: new Date('2025-10-15'),
      prescribedBy: 'Dr. Sarah Johnson',
    },
  ],
  emergencyContact: {
    name: 'Jane Anderson',
    relationship: 'Spouse',
    phone: '+1 (555) 123-4567',
  },
};

// Mock Dashboard Stats
export const mockDashboardStats: DashboardStats = {
  upcomingAppointments: 3,
  pendingLabResults: 2,
  newScans: 1,
  medicationsToRefill: 1,
  lastVisit: new Date('2026-01-19'),
};

// Mock Notifications
export const mockNotifications: Notification[] = [
  {
    id: 'notif-001',
    type: 'lab-result',
    title: 'New Lab Results Available',
    message: 'Your recent blood work results are now available to view.',
    date: new Date('2026-01-20T09:30:00'),
    read: false,
    actionUrl: '/lab-results',
  },
  {
    id: 'notif-002',
    type: 'appointment',
    title: 'Appointment Reminder',
    message: 'You have an appointment with Dr. Sarah Johnson on Jan 25 at 10:00 AM',
    date: new Date('2026-01-21T08:00:00'),
    read: false,
    actionUrl: '/appointments',
  },
  {
    id: 'notif-003',
    type: 'scan-result',
    title: 'Imaging Report Ready',
    message: 'Your chest X-ray report has been reviewed and is ready.',
    date: new Date('2026-01-20T15:45:00'),
    read: true,
    actionUrl: '/scans/scan-001',
  },
];
