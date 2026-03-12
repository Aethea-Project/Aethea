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

// Stable IDs so the seed is idempotent
const DOCTOR_PROFILE_ID  = 'aaaaaaaa-0001-0001-0001-000000000001';
const SCHEDULE_FUTURE_1  = 'bbbbbbbb-0001-0001-0001-000000000001';
const SCHEDULE_FUTURE_2  = 'bbbbbbbb-0001-0001-0001-000000000002';
const SCHEDULE_PAST      = 'bbbbbbbb-0001-0001-0001-000000000003';
const RESERVATION_1      = 'cccccccc-0001-0001-0001-000000000001';
const RESERVATION_2      = 'cccccccc-0001-0001-0001-000000000002';
const RESERVATION_PAST   = 'cccccccc-0001-0001-0001-000000000003';

async function main() {
  const now = new Date();
  const mins  = (m: number) => m * 60 * 1000;
  const days  = (d: number) => d * 24 * 60 * 60 * 1000;

  const daysAgo      = (d: number) => new Date(now.getTime() - days(d));
  const daysFromNow  = (d: number) => new Date(now.getTime() + days(d));

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
        orderedBy: 'Dr. Amir Hassan',
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
        orderedBy: 'Dr. Amir Hassan',
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
        orderedBy: 'Dr. Amir Hassan',
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

  // ── 4. Doctor profile ──────────────────────────────────────────────────────
  console.log('Seeding doctor profile…');

  await prisma.doctorProfile.upsert({
    where:  { id: DOCTOR_PROFILE_ID },
    update: {},
    create: {
      id:         DOCTOR_PROFILE_ID,
      userId:     ACCOUNTS.doctor.id,
      firstName:  'Amir',
      lastName:   'Hassan',
      specialty:  'Cardiology',
      bio:        'Board-certified cardiologist with 12 years of experience in interventional cardiology and heart failure management.',
      clinicName: 'Aethea Heart Center',
      address:    '45 Tahrir Square, Downtown',
      city:       'Cairo',
      photoUrl:   null,   // placeholder — real photo uploaded via Supabase Storage in production
      consultFee: 400,
      languages:  ['Arabic', 'English'],
      verified:   true,
    },
  });

  // ── 5. Doctor schedules ────────────────────────────────────────────────────
  console.log('Seeding doctor schedules…');

  // Future schedule 1 — 5 days from now, morning session
  const sched1Date  = daysFromNow(5);
  sched1Date.setHours(9, 0, 0, 0);
  const sched1End   = new Date(sched1Date.getTime() + mins(6 * 30)); // 6 slots × 30 min = 3 h

  // Future schedule 2 — 9 days from now, morning session
  const sched2Date  = daysFromNow(9);
  sched2Date.setHours(9, 0, 0, 0);
  const sched2End   = new Date(sched2Date.getTime() + mins(6 * 30));

  // Past schedule — 10 days ago (to attach a completed reservation)
  const schedPastDate = daysAgo(10);
  schedPastDate.setHours(9, 0, 0, 0);
  const schedPastEnd  = new Date(schedPastDate.getTime() + mins(6 * 30));

  await prisma.doctorSchedule.createMany({
    skipDuplicates: true,
    data: [
      {
        id:              SCHEDULE_FUTURE_1,
        doctorProfileId: DOCTOR_PROFILE_ID,
        scheduleDate:    sched1Date,
        startAt:         sched1Date,
        endAt:           sched1End,
        slotDurationMins: 30,
        maxPatients:     6,
        isPublished:     true,
      },
      {
        id:              SCHEDULE_FUTURE_2,
        doctorProfileId: DOCTOR_PROFILE_ID,
        scheduleDate:    sched2Date,
        startAt:         sched2Date,
        endAt:           sched2End,
        slotDurationMins: 30,
        maxPatients:     6,
        isPublished:     true,
      },
      {
        id:              SCHEDULE_PAST,
        doctorProfileId: DOCTOR_PROFILE_ID,
        scheduleDate:    schedPastDate,
        startAt:         schedPastDate,
        endAt:           schedPastEnd,
        slotDurationMins: 30,
        maxPatients:     6,
        isPublished:     true,
      },
    ],
  });

  // ── 6. Patient reservations ────────────────────────────────────────────────
  console.log('Seeding reservations…');

  // Reservation 1: upcoming, slot 0 of schedule 1
  const res1Start      = sched1Date;
  const res1End        = new Date(res1Start.getTime() + mins(30));
  const res1Deadline   = new Date(res1Start.getTime() - mins(6 * 60));

  // Reservation 2: upcoming, slot 2 of schedule 2
  const res2Start      = new Date(sched2Date.getTime() + mins(2 * 30));
  const res2End        = new Date(res2Start.getTime() + mins(30));
  const res2Deadline   = new Date(res2Start.getTime() - mins(6 * 60));

  // Reservation past: slot 0 of past schedule
  const resPastStart   = schedPastDate;
  const resPastEnd     = new Date(resPastStart.getTime() + mins(30));
  const resPastDeadline = new Date(resPastStart.getTime() - mins(6 * 60));

  await prisma.reservation.createMany({
    skipDuplicates: true,
    data: [
      {
        id:              RESERVATION_1,
        userId:          ACCOUNTS.patient.id,
        doctorScheduleId: SCHEDULE_FUTURE_1,
        slotIndex:       0,
        startAt:         res1Start,
        endAt:           res1End,
        reason:          'Follow-up on elevated LDL cholesterol from lipid panel',
        status:          'scheduled',
        shareHealthData: true,
        notifyOnCancel:  true,
        cancelDeadlineAt: res1Deadline,
      },
      {
        id:              RESERVATION_2,
        userId:          ACCOUNTS.patient.id,
        doctorScheduleId: SCHEDULE_FUTURE_2,
        slotIndex:       2,
        startAt:         res2Start,
        endAt:           res2End,
        reason:          'Routine cardiac check-up',
        status:          'confirmed',
        shareHealthData: false,
        notifyOnCancel:  true,
        cancelDeadlineAt: res2Deadline,
      },
      {
        id:              RESERVATION_PAST,
        userId:          ACCOUNTS.patient.id,
        doctorScheduleId: SCHEDULE_PAST,
        slotIndex:       0,
        startAt:         resPastStart,
        endAt:           resPastEnd,
        reason:          'Initial cardiology consultation',
        status:          'completed',
        shareHealthData: true,
        notifyOnCancel:  false,
        cancelDeadlineAt: resPastDeadline,
      },
    ],
  });

  // ── 7. Sample notifications ────────────────────────────────────────────────
  console.log('Seeding notifications…');

  await prisma.notification.createMany({
    skipDuplicates: true,
    data: [
      {
        id:     'ffffffff-0001-0001-0001-000000000001',
        userId: ACCOUNTS.patient.id,
        type:   'reservation_confirmed',
        title:  'Reservation Confirmed',
        body:   'Your appointment with Dr. Amir Hassan on ' + sched2Date.toDateString() + ' has been confirmed.',
        isRead: false,
        metadata: { reservationId: RESERVATION_2 },
      },
      {
        id:     'ffffffff-0001-0001-0001-000000000002',
        userId: ACCOUNTS.doctor.id,
        type:   'reservation_confirmed',
        title:  'New Booking',
        body:   'A patient has booked slot 0 on your schedule for ' + sched1Date.toDateString() + '.',
        isRead: false,
        metadata: { reservationId: RESERVATION_1 },
      },
    ],
  });

  console.log('✅ Seed completed for all 4 test accounts');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
