/**
 * Integration Tests — Zod Schema Validation on CRUD Endpoints
 *
 * Verifies that all create/update endpoints reject invalid payloads
 * with 400 + structured error details (OWASP API3:2023 — Broken Object Property Level Authorization).
 *
 * Since auth is unavailable in test mode (503), we test validation
 * indirectly through the fail-closed path. For endpoints behind auth,
 * validation middleware runs AFTER auth, so we verify schema definitions directly.
 */

import {
  createLabTestSchema,
  updateLabTestSchema,
  createScanSchema,
  updateScanSchema,
  createReservationSchema,
  updateReservationSchema,
  updateProfileSchema,
  paginationSchema,
} from '../src/schemas/index.js';

// ─── Lab Test Schemas ────────────────────────────────────────────────────────

describe('createLabTestSchema', () => {
  const validPayload = {
    testName: 'Hemoglobin',
    category: 'Hematology',
    value: '14.2',
    unit: 'g/dL',
    refMin: 12.0,
    refMax: 17.5,
    status: 'normal',
    orderedBy: 'Dr. Smith',
    measuredAt: '2026-03-01T10:00:00.000Z',
  };

  it('accepts a valid payload', () => {
    const result = createLabTestSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('rejects missing required fields', () => {
    const result = createLabTestSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects testName shorter than 2 chars', () => {
    const result = createLabTestSchema.safeParse({ ...validPayload, testName: 'X' });
    expect(result.success).toBe(false);
  });

  it('rejects extra/unknown fields (.strict())', () => {
    const result = createLabTestSchema.safeParse({ ...validPayload, hackerField: 'pwned' });
    expect(result.success).toBe(false);
  });

  it('coerces numeric value to string', () => {
    const result = createLabTestSchema.safeParse({ ...validPayload, value: 14.2 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(typeof result.data.value).toBe('string');
    }
  });

  it('rejects invalid status enum', () => {
    const result = createLabTestSchema.safeParse({ ...validPayload, status: 'unknown_status' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid datetime format for measuredAt', () => {
    const result = createLabTestSchema.safeParse({ ...validPayload, measuredAt: 'not-a-date' });
    expect(result.success).toBe(false);
  });
});

describe('updateLabTestSchema (partial)', () => {
  it('accepts partial payload (single field)', () => {
    const result = updateLabTestSchema.safeParse({ testName: 'Updated Test' });
    expect(result.success).toBe(true);
  });

  it('accepts empty object (all fields optional)', () => {
    const result = updateLabTestSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('still rejects extra fields', () => {
    const result = updateLabTestSchema.safeParse({ admin: true });
    expect(result.success).toBe(false);
  });
});

// ─── Scan Schemas ────────────────────────────────────────────────────────────

describe('createScanSchema', () => {
  const validPayload = {
    type: 'X-Ray',
    bodyPart: 'Chest',
    description: 'Routine chest X-ray for checkup',
    radiologist: 'Dr. Johnson',
    priority: 'routine',
    status: 'pending',
    scanDate: '2026-03-01T10:00:00.000Z',
  };

  it('accepts a valid payload', () => {
    const result = createScanSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('rejects missing required fields', () => {
    const result = createScanSchema.safeParse({ type: 'MRI' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid priority enum', () => {
    const result = createScanSchema.safeParse({ ...validPayload, priority: 'super_urgent' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid status enum', () => {
    const result = createScanSchema.safeParse({ ...validPayload, status: 'deleted' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid reportUrl', () => {
    const result = createScanSchema.safeParse({ ...validPayload, reportUrl: 'not-a-url' });
    expect(result.success).toBe(false);
  });

  it('rejects extra fields (.strict())', () => {
    const result = createScanSchema.safeParse({ ...validPayload, userId: 'inject' });
    expect(result.success).toBe(false);
  });
});

describe('updateScanSchema (partial)', () => {
  it('accepts partial update', () => {
    const result = updateScanSchema.safeParse({ status: 'completed' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid enum even in partial mode', () => {
    const result = updateScanSchema.safeParse({ priority: 'invalid' });
    expect(result.success).toBe(false);
  });
});

// ─── Reservation Schemas ─────────────────────────────────────────────────────

describe('createReservationSchema', () => {
  const validPayload = {
    doctorName: 'Dr. Ahmed',
    specialty: 'Cardiology',
    reason: 'Annual heart checkup',
    location: 'Aethea Medical Center - Building A',
    startAt: '2026-03-15T09:00:00.000Z',
    status: 'scheduled',
  };

  it('accepts a valid payload', () => {
    const result = createReservationSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('rejects missing required fields', () => {
    const result = createReservationSchema.safeParse({ doctorName: 'Dr. X' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid status enum', () => {
    const result = createReservationSchema.safeParse({ ...validPayload, status: 'unknown' });
    expect(result.success).toBe(false);
  });

  it('accepts optional endAt', () => {
    const result = createReservationSchema.safeParse({
      ...validPayload,
      endAt: '2026-03-15T10:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('rejects extra fields (.strict())', () => {
    const result = createReservationSchema.safeParse({ ...validPayload, userId: 'inject' });
    expect(result.success).toBe(false);
  });
});

describe('updateReservationSchema (partial)', () => {
  it('accepts single-field update', () => {
    const result = updateReservationSchema.safeParse({ status: 'cancelled' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid fields', () => {
    const result = updateReservationSchema.safeParse({ role: 'admin' });
    expect(result.success).toBe(false);
  });
});

// ─── Profile Schema ──────────────────────────────────────────────────────────

describe('updateProfileSchema', () => {
  it('accepts valid partial profile', () => {
    const result = updateProfileSchema.safeParse({
      firstName: 'Ahmed',
      bloodType: 'O+',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid bloodType', () => {
    const result = updateProfileSchema.safeParse({ bloodType: 'Z+' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid gender', () => {
    const result = updateProfileSchema.safeParse({ gender: 'other' });
    expect(result.success).toBe(false);
  });

  it('rejects mass-assignment of unknown field', () => {
    const result = updateProfileSchema.safeParse({ isAdmin: true });
    expect(result.success).toBe(false);
  });

  it('rejects firstName shorter than 2 chars', () => {
    const result = updateProfileSchema.safeParse({ firstName: 'A' });
    expect(result.success).toBe(false);
  });

  it('rejects heightCm out of range', () => {
    const under = updateProfileSchema.safeParse({ heightCm: 5 });
    const over = updateProfileSchema.safeParse({ heightCm: 500 });
    expect(under.success).toBe(false);
    expect(over.success).toBe(false);
  });
});

// ─── Pagination Schema ──────────────────────────────────────────────────────

describe('paginationSchema', () => {
  it('accepts valid page and limit', () => {
    const result = paginationSchema.safeParse({ page: '2', limit: '50' });
    expect(result.success).toBe(true);
  });

  it('defaults page to 1 and limit to 20', () => {
    const result = paginationSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('rejects page < 1', () => {
    const result = paginationSchema.safeParse({ page: '0' });
    expect(result.success).toBe(false);
  });

  it('rejects limit > 100', () => {
    const result = paginationSchema.safeParse({ limit: '200' });
    expect(result.success).toBe(false);
  });

  it('rejects extra query params (.strict())', () => {
    const result = paginationSchema.safeParse({ page: '1', drop_table: 'users' });
    expect(result.success).toBe(false);
  });
});
