import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is required to run seed');
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// Test account UUIDs (must exist in Supabase Auth before seeding)
const ACCOUNTS = {
  admin:       { id: '980035ac-6e2b-46cd-adb6-1eb3dc170233', email: 'admin@aethea.com' },
  patient:     { id: '60185e1c-88c3-4ef1-8d19-cb60dfd3d643', email: 'patient@aethea.com' },
  doctor:      { id: '26df25b3-a9ca-47c6-8df5-f52841d55682', email: 'doctor@aethea.com' },
  pharmacist:  { id: '25bdbbcd-abaa-4467-a386-1f7033cbb745', email: 'pharmacist@aethea.com' },
};

async function main() {
  const now = new Date();
  const days  = (d: number) => d * 24 * 60 * 60 * 1000;

  const daysAgo      = (d: number) => new Date(now.getTime() - days(d));

  // ── 1. Upsert all 4 users ──────────────────────────────────────────────────
  console.log('Upserting users…');

  await prisma.user.upsert({
    where:  { id: ACCOUNTS.admin.id },
    update: { email: ACCOUNTS.admin.email, accountType: 'admin' },
    create: { id: ACCOUNTS.admin.id, email: ACCOUNTS.admin.email, accountType: 'admin' },
  });

  await prisma.user.upsert({
    where:  { id: ACCOUNTS.patient.id },
    update: { email: ACCOUNTS.patient.email, accountType: 'patient' },
    create: { id: ACCOUNTS.patient.id, email: ACCOUNTS.patient.email, accountType: 'patient' },
  });

  await prisma.user.upsert({
    where:  { id: ACCOUNTS.doctor.id },
    update: { email: ACCOUNTS.doctor.email, accountType: 'doctor' },
    create: { id: ACCOUNTS.doctor.id, email: ACCOUNTS.doctor.email, accountType: 'doctor' },
  });

  await prisma.user.upsert({
    where:  { id: ACCOUNTS.pharmacist.id },
    update: { email: ACCOUNTS.pharmacist.email, accountType: 'pharmacist' },
    create: { id: ACCOUNTS.pharmacist.id, email: ACCOUNTS.pharmacist.email, accountType: 'pharmacist' },
  });

  // ── 2. Patient lab tests ───────────────────────────────────────────────────
  console.log('Seeding lab tests…');

  await prisma.labTest.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'dddddddd-0001-0001-0001-000000000001',
        userId: ACCOUNTS.patient.id,
        testName: 'Complete Blood Count',
        category: 'Haematology',
        value: 'Normal',
        unit: 'N/A',
        status: 'normal',
        orderedBy: 'Aethea Cardiology Team',
        measuredAt: daysAgo(5),
      },
      {
        id: 'dddddddd-0001-0001-0001-000000000002',
        userId: ACCOUNTS.patient.id,
        testName: 'Lipid Panel',
        category: 'Biochemistry',
        value: '130',
        unit: 'mg/dL',
        refMin: 0,
        refMax: 100,
        status: 'borderline',
        orderedBy: 'Aethea Cardiology Team',
        measuredAt: daysAgo(12),
      },
      {
        id: 'dddddddd-0001-0001-0001-000000000003',
        userId: ACCOUNTS.patient.id,
        testName: 'Blood Glucose (Fasting)',
        category: 'Biochemistry',
        value: '95',
        unit: 'mg/dL',
        refMin: 70,
        refMax: 99,
        status: 'normal',
        orderedBy: 'Aethea Cardiology Team',
        measuredAt: daysAgo(20),
      },
    ],
  });

  // ── 3. Patient scans ───────────────────────────────────────────────────────
  console.log('Seeding scans…');

  await prisma.scan.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'eeeeeeee-0001-0001-0001-000000000001',
        userId: ACCOUNTS.patient.id,
        type: 'MRI',
        bodyPart: 'Lumbar Spine',
        description: 'Lower back pain investigation',
        priority: 'routine',
        status: 'completed',
        radiologist: 'Dr. Layla Ibrahim',
        scanDate: daysAgo(8),
      },
      {
        id: 'eeeeeeee-0001-0001-0001-000000000002',
        userId: ACCOUNTS.patient.id,
        type: 'CT Scan',
        bodyPart: 'Chest',
        description: 'Persistent cough follow-up',
        priority: 'urgent',
        status: 'in_progress',
        radiologist: 'Dr. Kareem Nour',
        scanDate: daysAgo(2),
      },
    ],
  });

  // ── 4. Setup clean Developer Doctor Profilte ────────────────────────────────
  console.log('Verifying developer doctor profile…');

  // Ensure referential integrity for the dev doctor account. 
  // No fake schedules or appointments, just a clean profile row so the UI works.
  await prisma.doctorProfile.upsert({
    where: { userId: ACCOUNTS.doctor.id },
    update: { 
      firstName: 'Developer',
      lastName: 'Doctor',
      specialty: 'Internal Medicine',
      clinicName: 'Aethea Local Dev Clinic',
      consultFee: 150
    },
    create: {
      userId: ACCOUNTS.doctor.id,
      firstName: 'Developer',
      lastName: 'Doctor',
      specialty: 'Internal Medicine',
      clinicName: 'Aethea Local Dev Clinic',
      consultFee: 150,
      languages: ["English"],
      verified: true
    }
  });

  console.log('✅ Seed completed. Test accounts structured. Mock noise deleted.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
