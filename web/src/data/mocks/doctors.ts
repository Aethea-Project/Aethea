/**
 * Mock doctor data for DoctorFinder page
 * Will be replaced by API calls when the backend endpoints are ready.
 */

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  reviewCount: number;
  experience: number;
  location: {
    address: string;
    district: string;
    city: string;
    coordinates: { lat: number; lng: number };
  };
  availableSlots: string[];
  languages: string[];
  fees: number;
  image: string;
  verified: boolean;
}

export const SPECIALTIES = [
  'All Specialties',
  'Cardiologist',
  'Dermatologist',
  'Orthopedic Surgeon',
  'Pediatrician',
  'Neurologist',
  'General Practitioner',
  'Ophthalmologist',
  'Dentist',
] as const;

export const mockDoctors: Doctor[] = [
  {
    id: 'dr-001',
    name: 'Dr. Ahmed Hassan',
    specialty: 'Cardiologist',
    rating: 4.8,
    reviewCount: 156,
    experience: 15,
    location: {
      address: '23 El-Merghany St.',
      district: 'Heliopolis',
      city: 'Cairo',
      coordinates: { lat: 30.0906, lng: 31.3207 },
    },
    availableSlots: ['10:00 AM', '11:00 AM', '2:00 PM', '4:00 PM'],
    languages: ['Arabic', 'English'],
    fees: 500,
    image: '👨‍⚕️',
    verified: true,
  },
  {
    id: 'dr-002',
    name: 'Dr. Fatma El-Sayed',
    specialty: 'Dermatologist',
    rating: 4.9,
    reviewCount: 203,
    experience: 12,
    location: {
      address: '45 Gameat El Dowal St.',
      district: 'Mohandessin',
      city: 'Giza',
      coordinates: { lat: 30.0481, lng: 31.2004 },
    },
    availableSlots: ['9:00 AM', '11:30 AM', '1:00 PM', '3:30 PM'],
    languages: ['Arabic', 'English', 'French'],
    fees: 450,
    image: '👩‍⚕️',
    verified: true,
  },
  {
    id: 'dr-003',
    name: 'Dr. Mohamed Khaled',
    specialty: 'Orthopedic Surgeon',
    rating: 4.7,
    reviewCount: 142,
    experience: 18,
    location: {
      address: '15 Mustafa El-Nahas St.',
      district: 'Nasr City',
      city: 'Cairo',
      coordinates: { lat: 30.0626, lng: 31.3459 },
    },
    availableSlots: ['10:30 AM', '12:00 PM', '3:00 PM'],
    languages: ['Arabic', 'English'],
    fees: 600,
    image: '👨‍⚕️',
    verified: true,
  },
  {
    id: 'dr-004',
    name: 'Dr. Nour Ibrahim',
    specialty: 'Pediatrician',
    rating: 5.0,
    reviewCount: 89,
    experience: 10,
    location: {
      address: '78 El-Hegaz St.',
      district: 'Heliopolis',
      city: 'Cairo',
      coordinates: { lat: 30.0876, lng: 31.3150 },
    },
    availableSlots: ['9:00 AM', '10:00 AM', '11:00 AM', '1:00 PM', '2:00 PM'],
    languages: ['Arabic', 'English'],
    fees: 400,
    image: '👩‍⚕️',
    verified: true,
  },
  {
    id: 'dr-005',
    name: 'Dr. Youssef Mansour',
    specialty: 'Neurologist',
    rating: 4.6,
    reviewCount: 97,
    experience: 20,
    location: {
      address: '12 El-Thawra St.',
      district: 'Dokki',
      city: 'Giza',
      coordinates: { lat: 30.0384, lng: 31.2100 },
    },
    availableSlots: ['11:00 AM', '2:00 PM', '4:00 PM'],
    languages: ['Arabic', 'English', 'German'],
    fees: 700,
    image: '👨‍⚕️',
    verified: true,
  },
];
