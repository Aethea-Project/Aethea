/**
 * User Repository
 */

import prisma from '../lib/prisma.js';

export const updatePublicProfile = async (
  userId: string,
  email: string,
  updates: Record<string, unknown>
): Promise<void> => {
  const clean = (val: unknown) => (val === '' ? null : val);
  
  const args: unknown[] = [userId, email];
  let idx = 3;

  const getArg = (val: unknown) => {
    if (val !== undefined) {
      args.push(clean(val));
      return `$${idx++}`;
    }
    return 'NULL';
  };

  const f_firstName = getArg(updates.firstName);
  const f_lastName = getArg(updates.lastName);
  const f_gender = getArg(updates.gender);
  const f_phone = getArg(updates.phone);
  
  let f_dob = 'NULL';
  if (updates.dateOfBirth !== undefined) {
    const cleaned = clean(updates.dateOfBirth);
    if (cleaned === null) {
      f_dob = 'NULL';
    } else {
      args.push(cleaned);
      f_dob = `$${idx++}::DATE`;
    }
  }
  
  const f_bloodType = getArg(updates.bloodType);
  const f_allergies = getArg(updates.allergies);
  const f_chronic = getArg(updates.chronicConditions);
  const f_height = getArg(updates.heightCm);
  const f_weight = getArg(updates.weightKg);
  const f_ecName = getArg(updates.emergencyContactName);
  const f_ecPhone = getArg(updates.emergencyContactPhone);
  const f_avatar = getArg(updates.avatarUrl);

  const setFields: string[] = [];
  if (updates.firstName !== undefined) setFields.push(`first_name = EXCLUDED.first_name`);
  if (updates.lastName !== undefined) setFields.push(`last_name = EXCLUDED.last_name`);
  if (updates.gender !== undefined) setFields.push(`gender = EXCLUDED.gender`);
  if (updates.phone !== undefined) setFields.push(`phone = EXCLUDED.phone`);
  if (updates.dateOfBirth !== undefined) setFields.push(`date_of_birth = EXCLUDED.date_of_birth`);
  if (updates.bloodType !== undefined) setFields.push(`blood_type = EXCLUDED.blood_type`);
  if (updates.allergies !== undefined) setFields.push(`allergies = EXCLUDED.allergies`);
  if (updates.chronicConditions !== undefined) setFields.push(`chronic_conditions = EXCLUDED.chronic_conditions`);
  if (updates.heightCm !== undefined) setFields.push(`height_cm = EXCLUDED.height_cm`);
  if (updates.weightKg !== undefined) setFields.push(`weight_kg = EXCLUDED.weight_kg`);
  if (updates.emergencyContactName !== undefined) setFields.push(`emergency_contact_name = EXCLUDED.emergency_contact_name`);
  if (updates.emergencyContactPhone !== undefined) setFields.push(`emergency_contact_phone = EXCLUDED.emergency_contact_phone`);
  if (updates.avatarUrl !== undefined) setFields.push(`avatar_url = EXCLUDED.avatar_url`);

  if (setFields.length === 0) return;
  setFields.push('updated_at = NOW()');

  const query = `
    INSERT INTO public.profiles (
      id, email, first_name, last_name, gender, phone, date_of_birth,
      blood_type, allergies, chronic_conditions, height_cm, weight_kg,
      emergency_contact_name, emergency_contact_phone, avatar_url, updated_at
    ) VALUES (
      $1::UUID, $2, ${f_firstName}, ${f_lastName}, ${f_gender}, ${f_phone}, ${f_dob},
      ${f_bloodType}, ${f_allergies}, ${f_chronic}, ${f_height}, ${f_weight},
      ${f_ecName}, ${f_ecPhone}, ${f_avatar}, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
    ${setFields.join(', ')}
  `;

  const rowsAffected = await prisma.$executeRawUnsafe(query, ...args);
  
  if (rowsAffected === 0) {
    throw new Error('Profile UPSERT failed: No rows affected.');
  }
};
