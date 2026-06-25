/**
 * User Repository
 */

import prisma from '../lib/prisma.js';

export const updatePublicProfile = async (
  userId: string,
  email: string,
  updates: Record<string, unknown>
): Promise<void> => {
  // Map fields to Prisma format, filtering out undefined
  const data: Record<string, any> = {};
  
  if (updates.firstName !== undefined) data.firstName = updates.firstName === '' ? null : updates.firstName;
  if (updates.lastName !== undefined) data.lastName = updates.lastName === '' ? null : updates.lastName;
  if (updates.gender !== undefined) data.gender = updates.gender === '' ? null : updates.gender;
  if (updates.phone !== undefined) data.phone = updates.phone === '' ? null : updates.phone;
  
  if (updates.dateOfBirth !== undefined) {
    if (updates.dateOfBirth === '' || updates.dateOfBirth === null) {
      data.dateOfBirth = null;
    } else {
      data.dateOfBirth = new Date(updates.dateOfBirth as string);
    }
  }

  if (updates.bloodType !== undefined) data.bloodType = updates.bloodType === '' ? null : updates.bloodType;
  if (updates.heightCm !== undefined) data.heightCm = updates.heightCm === '' ? null : updates.heightCm;
  if (updates.weightKg !== undefined) data.weightKg = updates.weightKg === '' ? null : updates.weightKg;

  if (updates.avatarUrl !== undefined) data.avatarUrl = updates.avatarUrl === '' ? null : updates.avatarUrl;

  await prisma.profiles.upsert({
    where: { id: userId },
    update: data,
    create: {
      id: userId,
      email: email,
      ...data
    }
  });
};
