/**
 * Doctor Repository — typed queries for doctor profiles
 */

import prisma from '../lib/prisma.js';

export interface DoctorListFilters {
  specialty?: string;
  city?: string;
  search?: string;
}

export interface UpsertDoctorProfileInput {
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

export async function listDoctors(
  filters: DoctorListFilters,
  skip: number,
  take: number,
) {
  const where = buildDoctorWhere(filters);
  const [rows, total] = await Promise.all([
    prisma.doctorProfile.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        specialty: true,
        clinicName: true,
        address: true,
        city: true,
        photoUrl: true,
        consultFee: true,
        languages: true,
        verified: true,
      },
      orderBy: { lastName: 'asc' },
      skip,
      take,
    }),
    prisma.doctorProfile.count({ where }),
  ]);
  return { rows, total };
}

export async function getDoctorProfileById(id: string) {
  return prisma.doctorProfile.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      firstName: true,
      lastName: true,
      specialty: true,
      bio: true,
      clinicName: true,
      address: true,
      city: true,
      photoUrl: true,
      consultFee: true,
      languages: true,
      verified: true,
      createdAt: true,
    },
  });
}

export async function getDoctorProfileByUserId(userId: string) {
  return prisma.doctorProfile.findUnique({
    where: { userId },
  });
}

export async function upsertDoctorProfile(userId: string, data: UpsertDoctorProfileInput) {
  return prisma.doctorProfile.upsert({
    where: { userId },
    update: { ...data },
    create: { userId, ...data },
  });
}

/* ─── Internal helpers ─── */

function buildDoctorWhere(filters: DoctorListFilters) {
  const where: { verified: boolean; specialty?: object; city?: object; OR?: object[] } = {
    verified: true,
  };

  if (filters.specialty) {
    where.specialty = { contains: filters.specialty, mode: 'insensitive' };
  }
  if (filters.city) {
    where.city = { contains: filters.city, mode: 'insensitive' };
  }
  if (filters.search) {
    where.OR = [
      { firstName: { contains: filters.search, mode: 'insensitive' } },
      { lastName: { contains: filters.search, mode: 'insensitive' } },
      { clinicName: { contains: filters.search, mode: 'insensitive' } },
      { specialty: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  return where;
}
