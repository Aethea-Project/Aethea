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
 *   useLabTests, useScans, useReservations
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
  doctorName: string;
  specialty: string;
  reason: string;
  location: string;
  startAt?: string;
  start_at?: string;
  endAt?: string | null;
  end_at?: string | null;
  status: ReservationStatus;
  notes?: string | null;
};

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
  doctorName: item.doctorName,
  specialty: item.specialty,
  reason: item.reason,
  location: item.location,
  startAt: item.startAt ?? item.start_at ?? '',
  endAt: item.endAt ?? item.end_at ?? null,
  status: item.status as ReservationStatus,
  notes: item.notes ?? null,
});

export const medicalApi = {
  async fetchLabTests(): Promise<LabTest[]> {
    // Support both paginated envelope and legacy flat response
    const data = await authFetch<{ data?: RawLabTest[]; tests?: RawLabTest[] }>('/lab-tests');
    const items = data.data ?? data.tests ?? [];
    return items.map(toLabTest);
  },

  async fetchScans(): Promise<(MedicalScan & { scanDate?: Date })[]> {
    const data = await authFetch<{ data?: RawMedicalScan[]; scans?: RawMedicalScan[] }>('/scans');
    const items = data.data ?? data.scans ?? [];
    return items.map(toMedicalScan);
  },

  async fetchReservations(): Promise<Reservation[]> {
    const data = await authFetch<{ data?: RawReservation[]; reservations?: RawReservation[] }>('/reservations');
    const items = data.data ?? data.reservations ?? [];
    return items.map(toReservation);
  },

  async createReservation(payload: ReservationPayload): Promise<Reservation> {
    const data = await authFetch<{ reservation: RawReservation }>('/reservations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return toReservation(data.reservation);
  },

  async updateReservation(id: string, payload: Partial<ReservationPayload>): Promise<Reservation> {
    const data = await authFetch<{ reservation: RawReservation }>(`/reservations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return toReservation(data.reservation);
  },
};

export type ReservationStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';

export interface Reservation {
  id: string;
  doctorName: string;
  specialty: string;
  reason: string;
  location: string;
  startAt: string;
  endAt?: string | null;
  status: ReservationStatus;
  notes?: string | null;
}

export interface ReservationPayload {
  doctorName: string;
  specialty: string;
  reason: string;
  location: string;
  startAt: string;
  endAt?: string;
  status?: ReservationStatus;
  notes?: string;
}
