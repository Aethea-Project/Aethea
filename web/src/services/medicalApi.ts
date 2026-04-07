/**
 * Medical API — Repository Layer
 *
 * Responsibilities:
 *   - Call the Aethea backend via the shared `authFetch` client
 *   - Normalize raw server shapes into typed domain models
 *
 * Architecture (Modular Monolith — Repository pattern):
 *   Pages → Hooks (use-case) → medicalApi (repository) → apiClient (infrastructure)
 *
 * Domain hooks that consume this file live in src/hooks/:
 *   useLabTests, useScans, useReservations, useDoctors, useNotifications
 */

import {
  LabCategory,
  LabTest,
  LabStatus,
  MedicalScan,
  ScanImage,
  ScanPriority,
  ScanStatus,
  ScanType,
} from '@core/types/medical';
import { authFetch } from '../lib/apiClient';

/* ─── Raw server shapes ─── */

type RawLabTest = {
  id: string;
  testName: string;
  category: LabCategory;
  value: number | string;
  unit?: string;
  refMin?: number;
  refMax?: number;
  refText?: string;
  status: LabStatus;
  measuredAt?: string;
  date?: string;
  orderedBy?: string;
  notes?: string;
};

type RawMedicalScan = {
  id: string;
  type: ScanType;
  bodyPart?: string;
  scanDate?: string;
  date?: string;
  description?: string;
  findings?: string;
  radiologist?: string;
  priority: ScanPriority;
  status: ScanStatus;
  images?: ScanImage[];
  reportUrl?: string;
};

type RawReservation = {
  id: string;
  userId: string;
  doctorScheduleId: string;
  slotIndex: number;
  startAt: string;
  endAt: string;
  reason: string;
  status: ReservationStatus;
  notes?: string | null;
  shareHealthData: boolean;
  notifyOnCancel: boolean;
  cancelDeadlineAt: string;
  createdAt: string;
  doctorSchedule?: {
    doctorProfile?: {
      firstName: string;
      lastName: string;
      specialty: string;
      clinicName?: string | null;
      address?: string | null;
      city?: string | null;
      photoUrl?: string | null;
    };
  };
};

type RawNearbyPlace = {
  id: string;
  name: string;
  address: string;
  rating: number | null;
  ratingsCount: number;
  openNow: boolean | null;
  location: {
    lat: number;
    lng: number;
  };
};

type RawAddressCandidate = {
  placeId: string;
  formattedAddress: string;
  city: string | null;
  location: {
    lat: number;
    lng: number;
  };
};

type RawFastestRoute = {
  distanceText: string;
  durationText: string;
  distanceMeters: number;
  durationSeconds: number;
  routeSummary: string;
  mode: 'driving' | 'walking';
};

type RawDoctorProfile = {
  id: string;
  firstName: string;
  lastName: string;
  specialty: string;
  bio?: string | null;
  clinicName?: string | null;
  address?: string | null;
  city?: string | null;
  photoUrl?: string | null;
  consultFee?: number | null;
  languages: string[];
  verified: boolean;
};

type RawDoctorSchedule = {
  id: string;
  doctorProfileId: string;
  scheduleDate: string;
  startAt: string;
  endAt: string;
  slotDurationMins: number;
  maxPatients: number;
  isPublished: boolean;
  _count?: { reservations: number };
  reservations?: Array<{ slotIndex: number }>;
};

type RawMarketplaceSchedulePost = RawDoctorSchedule & {
  doctorProfile: RawDoctorProfile;
};

type RawNotification = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
};

/* ─── Normalisers ─── */

const toLabTest = (item: RawLabTest): LabTest => {
  const numericValue = Number(item.value);
  const value = Number.isFinite(numericValue) ? numericValue : item.value;

  return {
    id: item.id,
    testName: item.testName,
    category: item.category,
    value,
    unit: item.unit ?? '',
    referenceRange: {
      min: item.refMin ?? undefined,
      max: item.refMax ?? undefined,
      text: item.refText ?? undefined,
    },
    status: item.status as LabStatus,
    date: new Date(item.measuredAt ?? item.date ?? Date.now()),
    orderedBy: item.orderedBy ?? '—',
    notes: item.notes ?? undefined,
  };
};

const toMedicalScan = (item: RawMedicalScan): MedicalScan => {
  const date = new Date(item.scanDate ?? item.date ?? Date.now());
  return {
    id: item.id,
    type: item.type,
    bodyPart: item.bodyPart ?? '—',
    date,
    description: item.description ?? '',
    findings: item.findings ?? '',
    radiologist: item.radiologist ?? '—',
    priority: item.priority as ScanPriority,
    status: item.status as ScanStatus,
    images: item.images ?? [],
    reportUrl: item.reportUrl ?? undefined,
  };
};

const toReservation = (item: RawReservation): Reservation => ({
  id: item.id,
  userId: item.userId,
  doctorScheduleId: item.doctorScheduleId,
  slotIndex: item.slotIndex,
  startAt: item.startAt,
  endAt: item.endAt,
  reason: item.reason,
  status: item.status,
  notes: item.notes ?? null,
  shareHealthData: item.shareHealthData,
  notifyOnCancel: item.notifyOnCancel,
  cancelDeadlineAt: item.cancelDeadlineAt,
  createdAt: item.createdAt,
  doctor: item.doctorSchedule?.doctorProfile
    ? {
        firstName: item.doctorSchedule.doctorProfile.firstName,
        lastName: item.doctorSchedule.doctorProfile.lastName,
        specialty: item.doctorSchedule.doctorProfile.specialty,
        clinicName: item.doctorSchedule.doctorProfile.clinicName ?? null,
        address: item.doctorSchedule.doctorProfile.address ?? null,
        city: item.doctorSchedule.doctorProfile.city ?? null,
        photoUrl: item.doctorSchedule.doctorProfile.photoUrl ?? null,
      }
    : undefined,
});

const toDoctorProfile = (item: RawDoctorProfile): DoctorProfile => ({
  id: item.id,
  firstName: item.firstName,
  lastName: item.lastName,
  specialty: item.specialty,
  bio: item.bio ?? null,
  clinicName: item.clinicName ?? null,
  address: item.address ?? null,
  city: item.city ?? null,
  photoUrl: item.photoUrl ?? null,
  consultFee: item.consultFee ?? null,
  languages: item.languages,
  verified: item.verified,
});

const toDoctorSchedule = (item: RawDoctorSchedule): DoctorSchedule => ({
  id: item.id,
  doctorProfileId: item.doctorProfileId,
  scheduleDate: item.scheduleDate,
  startAt: item.startAt,
  endAt: item.endAt,
  slotDurationMins: item.slotDurationMins,
  maxPatients: item.maxPatients,
  isPublished: item.isPublished,
  bookedCount: item.reservations?.length ?? item._count?.reservations ?? 0,
  bookedSlotIndexes: (item.reservations ?? []).map((reservation) => reservation.slotIndex),
});

const toNotification = (item: RawNotification): Notification => ({
  id: item.id,
  userId: item.userId,
  type: item.type,
  title: item.title,
  body: item.body,
  isRead: item.isRead,
  metadata: item.metadata ?? null,
  createdAt: item.createdAt,
});

/* ─── API surface ─── */

export const medicalApi = {
  /* ── Lab tests ── */
  async fetchLabTests(): Promise<LabTest[]> {
    const data = await authFetch<{ data?: RawLabTest[]; tests?: RawLabTest[] }>('/lab-tests');
    const items = data.data ?? data.tests ?? [];
    return items.map(toLabTest);
  },

  /* ── Scans ── */
  async fetchScans(): Promise<(MedicalScan & { scanDate?: Date })[]> {
    const data = await authFetch<{ data?: RawMedicalScan[]; scans?: RawMedicalScan[] }>('/scans');
    const items = data.data ?? data.scans ?? [];
    return items.map(toMedicalScan);
  },

  /* ── Reservations (patient) ── */
  async fetchReservations(): Promise<Reservation[]> {
    const data = await authFetch<{ data?: RawReservation[]; reservations?: RawReservation[] }>('/reservations');
    const items = data.data ?? data.reservations ?? [];
    return items.map(toReservation);
  },

  async bookReservation(payload: BookReservationPayload): Promise<Reservation> {
    const data = await authFetch<{ reservation: RawReservation }>('/reservations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return toReservation(data.reservation);
  },

  async cancelReservation(id: string): Promise<void> {
    await authFetch<void>(`/reservations/${id}`, { method: 'DELETE' });
  },

  async subscribeToAvailabilityAlert(doctorScheduleId: string): Promise<{ subscribed: boolean; message: string }> {
    return authFetch<{ subscribed: boolean; message: string }>('/reservations/alerts', {
      method: 'POST',
      body: JSON.stringify({ doctorScheduleId }),
    });
  },

  /* ── Maps proxy (secured by backend) ── */
  async fetchNearbyPlaces(params: NearbyPlacesQuery): Promise<NearbyPlace[]> {
    const qs = new URLSearchParams({
      lat: String(params.lat),
      lng: String(params.lng),
      type: params.type,
      radius: String(params.radius ?? 4000),
      limit: String(params.limit ?? 10),
    });
    if (params.language) {
      qs.set('language', params.language);
    }

    const data = await authFetch<{ places: RawNearbyPlace[] }>(`/maps/nearby?${qs.toString()}`);
    return data.places;
  },

  async searchAddressCandidates(query: string, limit = 5): Promise<AddressCandidate[]> {
    const qs = new URLSearchParams({ query, limit: String(limit) });
    const data = await authFetch<{ candidates: RawAddressCandidate[] }>(`/maps/geocode?${qs.toString()}`);
    return data.candidates;
  },

  async reverseGeocode(lat: number, lng: number): Promise<AddressCandidate | null> {
    const qs = new URLSearchParams({ lat: String(lat), lng: String(lng) });
    const data = await authFetch<{ candidate: RawAddressCandidate | null }>(`/maps/reverse-geocode?${qs.toString()}`);
    return data.candidate;
  },

  async fetchFastestRoute(params: FastestRouteQuery): Promise<FastestRoute> {
    const qs = new URLSearchParams({
      originLat: String(params.originLat),
      originLng: String(params.originLng),
      destinationLat: String(params.destinationLat),
      destinationLng: String(params.destinationLng),
      mode: params.mode ?? 'driving',
    });

    const data = await authFetch<{ route: RawFastestRoute }>(`/maps/route?${qs.toString()}`);
    return data.route;
  },

  /* ── Doctor discovery (any authenticated user) ── */
  async fetchDoctors(params?: DoctorListParams): Promise<{ doctors: DoctorProfile[]; total: number }> {
    const qs = new URLSearchParams();
    if (params?.specialty) qs.set('specialty', params.specialty);
    if (params?.city) qs.set('city', params.city);
    if (params?.search) qs.set('search', params.search);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    const query = qs.toString() ? `?${qs.toString()}` : '';
    const data = await authFetch<{ data?: RawDoctorProfile[]; pagination?: { total: number } }>(`/doctors${query}`);
    return {
      doctors: (data.data ?? []).map(toDoctorProfile),
      total: data.pagination?.total ?? 0,
    };
  },

  async fetchDoctorById(id: string): Promise<DoctorProfile> {
    const data = await authFetch<{ doctor: RawDoctorProfile }>(`/doctors/${id}`);
    return toDoctorProfile(data.doctor);
  },

  async fetchDoctorSchedules(doctorId: string, params?: ScheduleQueryParams): Promise<{ schedules: DoctorSchedule[]; total: number }> {
    const qs = new URLSearchParams();
    if (params?.from) qs.set('from', params.from);
    if (params?.to) qs.set('to', params.to);
    if (params?.page) qs.set('page', String(params.page));
    const query = qs.toString() ? `?${qs.toString()}` : '';
    const data = await authFetch<{ data?: RawDoctorSchedule[]; pagination?: { total: number } }>(`/doctors/${doctorId}/schedules${query}`);
    return {
      schedules: (data.data ?? []).map(toDoctorSchedule),
      total: data.pagination?.total ?? 0,
    };
  },

  async fetchMarketplaceSchedules(params?: MarketplaceScheduleQuery): Promise<{ posts: MarketplaceSchedulePost[]; total: number }> {
    const qs = new URLSearchParams();
    if (params?.specialty) qs.set('specialty', params.specialty);
    if (params?.city) qs.set('city', params.city);
    if (params?.search) qs.set('search', params.search);
    if (params?.date) qs.set('date', params.date);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    const query = qs.toString() ? `?${qs.toString()}` : '';
    const data = await authFetch<{ data?: RawMarketplaceSchedulePost[]; pagination?: { total: number } }>(`/doctors/marketplace/posts${query}`);
    return {
      posts: (data.data ?? []).map((post) => ({
        doctor: toDoctorProfile(post.doctorProfile),
        schedule: toDoctorSchedule(post),
      })),
      total: data.pagination?.total ?? 0,
    };
  },

  /* ── Doctor self-management ── */
  async fetchMyDoctorProfile(): Promise<DoctorProfile> {
    const data = await authFetch<{ profile: RawDoctorProfile }>('/doctors/me/profile');
    return toDoctorProfile(data.profile);
  },

  async upsertMyDoctorProfile(payload: UpsertProfilePayload): Promise<DoctorProfile> {
    const data = await authFetch<{ profile: RawDoctorProfile }>('/doctors/me/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return toDoctorProfile(data.profile);
  },

  async createMySchedule(payload: CreateSchedulePayload): Promise<DoctorSchedule> {
    const data = await authFetch<{ schedule: RawDoctorSchedule }>('/doctors/me/schedules', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return toDoctorSchedule(data.schedule);
  },

  async deleteMySchedule(scheduleId: string, reason: string): Promise<void> {
    await authFetch<void>(`/doctors/me/schedules/${scheduleId}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    });
  },

  /* ── Doctor: view own schedule's anonymized slots ── */
  async fetchScheduleSlots(scheduleId: string): Promise<ScheduleSlotView> {
    return authFetch<ScheduleSlotView>(`/reservations/schedule/${scheduleId}/slots`);
  },

  /* ── Notifications ── */
  async fetchNotifications(page = 1): Promise<{ notifications: Notification[]; total: number }> {
    const data = await authFetch<{ data?: RawNotification[]; pagination?: { total: number } }>(`/notifications?page=${page}`);
    return {
      notifications: (data.data ?? []).map(toNotification),
      total: data.pagination?.total ?? 0,
    };
  },

  async fetchUnreadCount(): Promise<number> {
    const data = await authFetch<{ count: number }>('/notifications/unread-count');
    return data.count;
  },

  async markNotificationsRead(ids: string[]): Promise<void> {
    await authFetch<void>('/notifications/read', {
      method: 'PATCH',
      body: JSON.stringify({ ids }),
    });
  },
};

/* ─── Domain types (exported for use in hooks and pages) ─── */

export type ReservationStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
export type NotificationType = 'slot_available' | 'reservation_confirmed' | 'reservation_cancelled';
export type NearbyPlaceType = 'doctor' | 'hospital' | 'pharmacy';

export interface Reservation {
  id: string;
  userId: string;
  doctorScheduleId: string;
  slotIndex: number;
  startAt: string;
  endAt: string;
  reason: string;
  status: ReservationStatus;
  notes?: string | null;
  shareHealthData: boolean;
  notifyOnCancel: boolean;
  cancelDeadlineAt: string;
  createdAt: string;
  doctor?: {
    firstName: string;
    lastName: string;
    specialty: string;
    clinicName: string | null;
    address: string | null;
    city: string | null;
    photoUrl: string | null;
  };
}

export interface NearbyPlace {
  id: string;
  name: string;
  address: string;
  rating: number | null;
  ratingsCount: number;
  openNow: boolean | null;
  location: {
    lat: number;
    lng: number;
  };
}

export interface AddressCandidate {
  placeId: string;
  formattedAddress: string;
  city: string | null;
  location: {
    lat: number;
    lng: number;
  };
}

export interface FastestRoute {
  distanceText: string;
  durationText: string;
  distanceMeters: number;
  durationSeconds: number;
  routeSummary: string;
  mode: 'driving' | 'walking';
}

export interface BookReservationPayload {
  doctorScheduleId: string;
  slotIndex: number;
  reason: string;
  notes?: string;
  shareHealthData?: boolean;
  notifyOnCancel?: boolean;
}

export interface DoctorProfile {
  id: string;
  firstName: string;
  lastName: string;
  specialty: string;
  bio: string | null;
  clinicName: string | null;
  address: string | null;
  city: string | null;
  photoUrl: string | null;
  consultFee: number | null;
  languages: string[];
  verified: boolean;
}

export interface DoctorSchedule {
  id: string;
  doctorProfileId: string;
  scheduleDate: string;
  startAt: string;
  endAt: string;
  slotDurationMins: number;
  maxPatients: number;
  isPublished: boolean;
  bookedCount: number;
  bookedSlotIndexes: number[];
}

export interface MarketplaceSchedulePost {
  doctor: DoctorProfile;
  schedule: DoctorSchedule;
}

export interface ScheduleSlot {
  slotIndex: number;
  startAt: string;
  endAt: string;
  status: 'available' | ReservationStatus;
  reservationId?: string;
  patientLabel?: string;
  reason?: string;
  shareHealthData?: boolean;
}

export interface ScheduleSlotView {
  scheduleId: string;
  scheduleDate: string;
  startAt: string;
  endAt: string;
  slotDurationMins: number;
  slots: ScheduleSlot[];
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface DoctorListParams {
  specialty?: string;
  city?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ScheduleQueryParams {
  from?: string;
  to?: string;
  page?: number;
}

export interface MarketplaceScheduleQuery {
  specialty?: string;
  city?: string;
  search?: string;
  date?: string;
  page?: number;
  limit?: number;
}

export interface UpsertProfilePayload {
  firstName: string;
  lastName: string;
  specialty: string;
  bio?: string;
  clinicName?: string;
  address?: string;
  city?: string;
  consultFee?: number;
  languages?: string[];
}

export interface NearbyPlacesQuery {
  lat: number;
  lng: number;
  type: NearbyPlaceType;
  radius?: number;
  limit?: number;
  language?: string;
}

export interface FastestRouteQuery {
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  mode?: 'driving' | 'walking';
}

export interface CreateSchedulePayload {
  scheduleDate: string;
  startAt: string;
  endAt: string;
  slotDurationMins: number;
  maxPatients: number;
  isPublished?: boolean;
}

/** @deprecated use BookReservationPayload */
export type ReservationPayload = BookReservationPayload;
