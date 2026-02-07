/**
 * Profile Routes - Backend API
 * GET  /api/profile      → Fetch authenticated user's profile
 * PUT  /api/profile      → Update authenticated user's profile
 * 
 * All routes require JWT authentication via authMiddleware.
 * Uses Supabase service-role client for server-side DB operations.
 */

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

// Authenticated request extends Express Request with user payload
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    [key: string]: any;
  };
}

/**
 * Factory: creates profile router with injected Supabase credentials.
 * Follows Dependency Injection to keep routes testable.
 */
export const createProfileRouter = (supabaseUrl: string, supabaseServiceKey: string): Router => {
  const router = Router();

  // Service-role client — bypasses RLS for admin-level reads/writes
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ──────────────────────────────────────────────
  // GET /api/profile — Return current user's profile
  // ──────────────────────────────────────────────
  router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // Profile row may not exist yet (new user before trigger fires)
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Profile not found' });
        }
        return res.status(500).json({ error: error.message });
      }

      // Map snake_case DB columns → camelCase response
      const profile = mapRowToProfile(data);

      return res.json({ profile });
    } catch (err: any) {
      console.error('GET /api/profile error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ──────────────────────────────────────────────
  // PUT /api/profile — Update current user's profile
  // ──────────────────────────────────────────────
  router.put('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const body = req.body;

      // --- Server-side validation ---
      const validationError = validateProfileUpdate(body);
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }

      // Build update payload (only set provided fields → PATCH semantics)
      const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };

      if (body.firstName !== undefined) updatePayload.first_name = body.firstName;
      if (body.lastName !== undefined) updatePayload.last_name = body.lastName;
      // full_name is auto-generated from first_name + last_name (GENERATED ALWAYS)
      if (body.gender !== undefined) updatePayload.gender = body.gender;
      if (body.phone !== undefined) updatePayload.phone = body.phone;
      if (body.dateOfBirth !== undefined) updatePayload.date_of_birth = body.dateOfBirth;
      if (body.bloodType !== undefined) updatePayload.blood_type = body.bloodType;
      if (body.allergies !== undefined) updatePayload.allergies = body.allergies;
      if (body.chronicConditions !== undefined) updatePayload.chronic_conditions = body.chronicConditions;
      if (body.heightCm !== undefined) updatePayload.height_cm = body.heightCm;
      if (body.weightKg !== undefined) updatePayload.weight_kg = body.weightKg;
      if (body.emergencyContactName !== undefined) updatePayload.emergency_contact_name = body.emergencyContactName;
      if (body.emergencyContactPhone !== undefined) updatePayload.emergency_contact_phone = body.emergencyContactPhone;
      if (body.insuranceProvider !== undefined) updatePayload.insurance_provider = body.insuranceProvider;
      if (body.insurancePolicyNumber !== undefined) updatePayload.insurance_policy_number = body.insurancePolicyNumber;
      if (body.medicalNotes !== undefined) updatePayload.medical_notes = body.medicalNotes;
      if (body.avatarUrl !== undefined) updatePayload.avatar_url = body.avatarUrl;

      const { data, error } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      const profile = mapRowToProfile(data);

      return res.json({ profile, message: 'Profile updated successfully' });
    } catch (err: any) {
      console.error('PUT /api/profile error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

/** Map Supabase row (snake_case) → API response (camelCase) */
function mapRowToProfile(row: any) {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    fullName: row.full_name,
    gender: row.gender,
    phone: row.phone,
    dateOfBirth: row.date_of_birth,
    bloodType: row.blood_type,
    allergies: row.allergies,
    chronicConditions: row.chronic_conditions,
    heightCm: row.height_cm,
    weightKg: row.weight_kg,
    emergencyContactName: row.emergency_contact_name,
    emergencyContactPhone: row.emergency_contact_phone,
    insuranceProvider: row.insurance_provider,
    insurancePolicyNumber: row.insurance_policy_number,
    medicalNotes: row.medical_notes,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Validate profile update payload — returns error string or null */
function validateProfileUpdate(body: any): string | null {
  // Name validations
  if (body.firstName !== undefined && typeof body.firstName === 'string') {
    if (body.firstName.length < 2) return 'First name must be at least 2 characters';
    if (body.firstName.length > 50) return 'First name must be less than 50 characters';
    if (!/^[A-Z]/.test(body.firstName)) return 'First name must start with a capital letter';
  }

  if (body.lastName !== undefined && typeof body.lastName === 'string') {
    if (body.lastName.length < 2) return 'Last name must be at least 2 characters';
    if (body.lastName.length > 50) return 'Last name must be less than 50 characters';
    if (!/^[A-Z]/.test(body.lastName)) return 'Last name must start with a capital letter';
  }

  // Height validation (30 – 300 cm)
  if (body.heightCm !== undefined) {
    const h = Number(body.heightCm);
    if (isNaN(h) || h < 30 || h > 300) return 'Height must be between 30 and 300 cm';
  }

  // Weight validation (1 – 500 kg)
  if (body.weightKg !== undefined) {
    const w = Number(body.weightKg);
    if (isNaN(w) || w < 1 || w > 500) return 'Weight must be between 1 and 500 kg';
  }

  // Blood type validation
  const validBloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  if (body.bloodType !== undefined && body.bloodType !== null) {
    if (!validBloodTypes.includes(body.bloodType)) return 'Invalid blood type';
  }

  // Gender validation
  const validGenders = ['male', 'female', 'other', 'prefer_not_to_say'];
  if (body.gender !== undefined && body.gender !== null) {
    if (!validGenders.includes(body.gender)) return 'Invalid gender';
  }

  return null;
}
