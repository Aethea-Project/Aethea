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

import { authFetch, authFetchStream } from '../lib/apiClient';
import { supabase } from './auth';

/* ─── Medical domain types (colocated with their consumer) ─── */

export interface LabTest {
  id: string;
  testName: string;
  category: LabCategory;
  value: number | string;
  unit: string;
  referenceRange?: {
    min?: number;
    max?: number;
    text?: string;
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

export type LabStatus = 'normal' | 'borderline' | 'high' | 'low';

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
  view?: string;
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


export interface PatientCondition {
  id: string;
  patientId: string;
  condition: string;
  source: string;
  detectedAt: string;
}

export interface Feedback {
  id: string;
  userId: string;
  condition: string;
  riskLevel: string;
  relatedMedicines: string[];
  doctorAnalysis?: string;
  patientSummary?: string;
  createdAt: string;
}

export interface PatientHealthData {
  labTests: LabTest[];
  scans: MedicalScan[];
  conditions: PatientCondition[];
  feedbacks: Feedback[];
}

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
    bookingMode?: 'slot' | 'token';
    clinicInfo?: any;
    doctorProfile?: {
      firstName: string;
      lastName: string;
      specialty: string;
      clinicName?: string | null;
      address?: string | null;
      locationUrl?: string | null;
      city?: string | null;
      photoUrl?: string | null;
      consultFee?: number | null;
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
  locationUrl?: string | null;
  city?: string | null;
  photoUrl?: string | null;
  consultFee?: number | null;
  languages: string[];
  savedClinics?: any | null;
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
  bookingMode?: 'slot' | 'token';
  clinicInfo?: any | null;
  createdAt: string;
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

  const hasRef = item.refMin != null || item.refMax != null || item.refText != null;

  return {
    id: item.id,
    testName: item.testName,
    category: item.category,
    value,
    unit: item.unit ?? '',
    referenceRange: hasRef ? {
      min: item.refMin ?? undefined,
      max: item.refMax ?? undefined,
      text: item.refText ?? undefined,
    } : undefined,
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
  doctorSchedule: item.doctorSchedule ? {
    bookingMode: item.doctorSchedule.bookingMode ?? 'slot',
    clinicInfo: item.doctorSchedule.clinicInfo ?? null,
  } : undefined,
  doctor: item.doctorSchedule?.doctorProfile
    ? {
        firstName: item.doctorSchedule.doctorProfile.firstName,
        lastName: item.doctorSchedule.doctorProfile.lastName,
        specialty: item.doctorSchedule.doctorProfile.specialty,
        clinicName: (item.doctorSchedule.clinicInfo as any)?.clinicName ?? item.doctorSchedule.doctorProfile.clinicName ?? null,
        address: (item.doctorSchedule.clinicInfo as any)?.address ?? item.doctorSchedule.doctorProfile.address ?? null,
        locationUrl: (item.doctorSchedule.clinicInfo as any)?.locationUrl ?? item.doctorSchedule.doctorProfile.locationUrl ?? null,
        city: (item.doctorSchedule.clinicInfo as any)?.city ?? item.doctorSchedule.doctorProfile.city ?? null,
        photoUrl: item.doctorSchedule.doctorProfile.photoUrl ?? null,
        consultFee: (item.doctorSchedule.clinicInfo as any)?.consultFee ?? item.doctorSchedule.doctorProfile.consultFee ?? null,
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
  locationUrl: item.locationUrl ?? null,
  city: item.city ?? null,
  photoUrl: item.photoUrl ?? null,
  consultFee: item.consultFee ?? null,
  languages: item.languages,
  savedClinics: item.savedClinics ?? null,
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
  bookingMode: item.bookingMode ?? 'slot',
  clinicInfo: item.clinicInfo ?? null,
  createdAt: item.createdAt,
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

  async fetchLabFeedbacks(): Promise<any[]> {
    const data = await authFetch<{ data?: any[] }>('/lab-results/feedbacks');
    const items = data.data ?? [];
    return items.map((feedback) => ({
      ...feedback,
      labTests: (feedback.labTests || []).map(toLabTest),
    }));
  },

  async updateLabFeedback(id: string, condition: string): Promise<any> {
    return await authFetch(`/lab-results/feedbacks/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ condition }),
    });
  },

  async deleteLabFeedback(id: string): Promise<any> {
    return await authFetch(`/lab-results/feedbacks/${id}`, {
      method: 'DELETE',
    });
  },

  async updateLabTest(id: string, data: Partial<LabTest>): Promise<any> {
    return await authFetch(`/lab-tests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /* ── Medical Myth Buster (Research) ── */
  async fetchResearchArticles(category?: string): Promise<any[]> {
    const qs = category && category !== 'all' ? `?category=${category}` : '';
    const response = await authFetch<{ data: any[] }>(`/research/articles${qs}`);
    return response.data;
  },

  async askResearchQuestion(query: string): Promise<any[]> {
    const response = await authFetch<{ data: any[] }>('/research/ask', {
      method: 'POST',
      body: JSON.stringify({ query })
    });
    return response.data;
  },

  async chatWithPaper(documentId: string, message: string, history: { role: string, content: string }[] = []): Promise<string> {
    const response = await authFetch<{ answer: string }>('/research/chat', {
      method: 'POST',
      body: JSON.stringify({ documentId, message, history })
    });
    return response.answer;
  },

  /* ── Scans ── */
  async fetchScans(): Promise<(MedicalScan & { scanDate?: Date })[]> {
    const data = await authFetch<{ data?: RawMedicalScan[]; scans?: RawMedicalScan[] }>('/scans');
    const items = data.data ?? data.scans ?? [];
    return items.map(toMedicalScan);
  },

  async createScan(payload: {
    fileBase64: string;
    fileName: string;
    type: string;
    bodyPart: string;
    description: string;
    radiologist: string;
    priority: string;
    scanDate: string;
  }): Promise<MedicalScan> {
    const data = await authFetch<{ scan: RawMedicalScan }>('/scans', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return toMedicalScan(data.scan);
  },

  async deleteScan(id: string): Promise<void> {
    await authFetch<void>(`/scans/${id}`, { method: 'DELETE' });
  },

  /* ── Reservations (patient) ── */
  async fetchReservations(tab: 'upcoming' | 'past' | 'cancelled' = 'upcoming'): Promise<Reservation[]> {
    const data = await authFetch<{ data?: RawReservation[]; reservations?: RawReservation[] }>(`/reservations?tab=${tab}`);
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

  async fetchPatientDataForReservation(reservationId: string): Promise<PatientHealthData> {
    return authFetch<PatientHealthData>(`/reservations/${reservationId}/patient-data`);
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
    if (params.search) {
      qs.set('search', params.search);
    }
    if (params.specialty) {
      qs.set('specialty', params.specialty);
    }
    if (params.language) {
      qs.set('language', params.language);
    }

    const data = await authFetch<{ places: RawNearbyPlace[] }>(`/maps/nearby?${qs.toString()}`);
    return data.places;
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

  async fetchAddressCandidates(query: string): Promise<AddressCandidate[]> {
    const qs = new URLSearchParams({
      query,
      limit: '1',
    });
    const data = await authFetch<{ candidates: AddressCandidate[] }>(`/maps/geocode?${qs.toString()}`);
    return data.candidates;
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

  /* ── Doctor: weekly template management ── */
  async fetchMyWeeklyTemplate(): Promise<WeeklyTemplate[]> {
    const data = await authFetch<{ templates: WeeklyTemplate[] }>('/doctors/me/weekly-template');
    return data.templates ?? [];
  },

  async saveMyWeeklyTemplate(templates: WeeklyTemplateInput[]): Promise<WeeklyTemplate[]> {
    const data = await authFetch<{ templates: WeeklyTemplate[] }>('/doctors/me/weekly-template', {
      method: 'PUT',
      body: JSON.stringify({ templates }),
    });
    return data.templates ?? [];
  },

  /* ── Doctor: schedule exception management ── */
  async fetchMyScheduleExceptions(from?: string, to?: string): Promise<ScheduleException[]> {
    const qs = new URLSearchParams();
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    const data = await authFetch<{ exceptions: ScheduleException[] }>(`/doctors/me/exceptions${query}`);
    return data.exceptions ?? [];
  },

  async createMyScheduleException(input: ScheduleExceptionInput): Promise<ScheduleException> {
    const data = await authFetch<{ exception: ScheduleException }>('/doctors/me/exceptions', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return data.exception;
  },

  async deleteMyScheduleException(exceptionId: string): Promise<void> {
    await authFetch<void>(`/doctors/me/exceptions/${exceptionId}`, { method: 'DELETE' });
  },

  /* ── Doctor: generate schedules from template ── */
  async generateSchedulesFromTemplate(weeksAhead: number, timezoneOffset?: number): Promise<GenerateSchedulesResult> {
    return authFetch<GenerateSchedulesResult>('/doctors/me/generate-schedules', {
      method: 'POST',
      body: JSON.stringify({ weeksAhead, timezoneOffset }),
    });
  },

  /* ── Doctor: publish drafts ── */
  async publishDoctorSchedules(scheduleIds: string[]): Promise<{ publishedCount: number }> {
    return authFetch<{ publishedCount: number }>('/doctors/me/schedules/publish', {
      method: 'PATCH',
      body: JSON.stringify({ scheduleIds }),
    });
  },

  /* ── Doctor: update reservation status ── */
  async updateReservationStatus(reservationId: string, status: ReservationStatus, notes?: string): Promise<Reservation> {
    const data = await authFetch<{ reservation: RawReservation }>(`/reservations/${reservationId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    });
    return toReservation(data.reservation);
  },

  /* ── Doctor: fetch patient records shared with them ── */
  async fetchDoctorSharedRecords(page = 1, limit = 10): Promise<{ reservations: Reservation[]; total: number }> {
    const data = await authFetch<{ data?: RawReservation[]; pagination?: { total: number } }>(`/doctors/me/shared-records?page=${page}&limit=${limit}`);
    const items = data.data ?? [];
    return {
      reservations: items.map(toReservation),
      total: data.pagination?.total ?? 0,
    };
  },

  /* ── Patient: fetch pending feedback ── */
  async fetchPendingFeedback(): Promise<{ pending: boolean; reservation: Reservation | null }> {
    const data = await authFetch<{ pending: boolean; reservation: RawReservation | null }>('/reservations/pending-feedback');
    return {
      pending: data.pending,
      reservation: data.reservation ? toReservation(data.reservation) : null,
    };
  },

  /* ── Patient: submit feedback ── */
  async submitFeedback(payload: { reservationId: string; rating: number; comments?: string }): Promise<{ success: boolean; message: string }> {
    return authFetch<{ success: boolean; message: string }>('/feedbacks/submit', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /* ── Doctor: fetch reviews (insights) ── */
  async fetchDoctorReviews(): Promise<{ averageRating: number; totalReviews: number; feedbacks: { id: string; rating: number; comments?: string; createdAt: string }[] }> {
    return authFetch<{ averageRating: number; totalReviews: number; feedbacks: { id: string; rating: number; comments?: string; createdAt: string }[] }>('/feedbacks/doctor');
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

  async uploadLabResult(file: File): Promise<{ jobId: string; feedbackId: string; message: string }> {
    const userResult = await supabase.auth.getUser();
    const userId = userResult.data.user?.id;
    if (!userId) {
      throw new Error('User is not authenticated');
    }

    // Calculate file hash for deduplication
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const fileHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    const ext = file.name.split('.').pop() || 'tmp';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

    // Get a signed upload URL from the backend to bypass RLS
    const uploadUrlResponse = await authFetch<{ duplicate?: boolean; feedbackId?: string; signedUrl?: string; token?: string; path?: string; storagePath?: string }>('/lab-results/upload-url', {
      method: 'POST',
      body: JSON.stringify({ fileName, fileHash }),
    });

    if (uploadUrlResponse.duplicate && uploadUrlResponse.feedbackId) {
      const err: any = new Error('You have already uploaded this document.');
      err.duplicate = true;
      err.duplicateFeedbackId = uploadUrlResponse.feedbackId;
      throw err;
    }

    const { signedUrl, path: storagePath, token } = uploadUrlResponse;
    if (!signedUrl || !token || !storagePath) {
      throw new Error('Failed to generate secure upload URL.');
    }

    // Upload directly to Supabase Storage using the signed URL
    const { error } = await supabase.storage
      .from('clinical-documents')
      .uploadToSignedUrl(storagePath, token, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      throw new Error(`Failed to upload file to storage: ${error.message}`);
    }

    // Call the backend to enqueue the extraction job
    return authFetch<{ jobId: string; feedbackId: string; message: string }>('/lab-results/upload', {
      method: 'POST',
      body: JSON.stringify({ storagePath, fileHash }),
    });
  },
};

/* ─── Domain types (exported for use in hooks and pages) ─── */

export type ReservationStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
export type NotificationType = 'slot_available' | 'reservation_confirmed' | 'reservation_cancelled' | 'system_broadcast' | 'schedule_full' | 'lab_result_ready' | 'account_verified';
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
  doctorSchedule?: {
    bookingMode: 'slot' | 'token';
    clinicInfo?: any;
  };
  doctor?: {
    firstName: string;
    lastName: string;
    specialty: string;
    clinicName: string | null;
    address: string | null;
    locationUrl: string | null;
    city: string | null;
    photoUrl: string | null;
    consultFee: number | null;
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
  patientLat?: number;
  patientLng?: number;
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

export interface DoctorProfile {
  id: string;
  firstName: string;
  lastName: string;
  specialty: string;
  bio: string | null;
  clinicName: string | null;
  address: string | null;
  locationUrl: string | null;
  city: string | null;
  photoUrl: string | null;
  consultFee: number | null;
  languages: string[];
  savedClinics: any | null;
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
  bookingMode: 'slot' | 'token';
  clinicInfo: any | null;
  createdAt: string;
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
  locationUrl?: string;
  city?: string;
  consultFee?: number;
  languages?: string[];
  savedClinics?: any;
}

export interface NearbyPlacesQuery {
  lat: number;
  lng: number;
  type: NearbyPlaceType;
  radius?: number;
  limit?: number;
  search?: string;
  specialty?: string;
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
  bookingMode?: 'slot' | 'token';
  clinicInfo?: any;
}

export interface WeeklyTemplate {
  id: string;
  doctorProfileId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMins: number;
  maxCases: number;
  bookingMode: 'slot' | 'token';
  isActive: boolean;
  clinicInfo?: any;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyTemplateInput {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMins: number;
  maxCases: number;
  bookingMode: 'slot' | 'token';
  isActive: boolean;
  clinicInfo?: any;
}

export type ScheduleExceptionType = 'unavailable' | 'modified_hours';

export interface ScheduleException {
  id: string;
  doctorProfileId: string;
  exceptionDate: string;
  type: ScheduleExceptionType;
  reason: string | null;
  startTime: string | null;
  endTime: string | null;
  createdAt: string;
}

export interface ScheduleExceptionInput {
  exceptionDate: string;
  type: ScheduleExceptionType;
  reason?: string;
  startTime?: string;
  endTime?: string;
}

export interface GenerateSchedulesResult {
  created: number;
  skipped: number;
}

/** @deprecated use BookReservationPayload */
export type ReservationPayload = BookReservationPayload;
