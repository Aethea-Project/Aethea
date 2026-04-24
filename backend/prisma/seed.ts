import 'dotenv/config';
import { PrismaClient, Prisma } from '../src/generated/prisma/client';
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
  admin:       { id: '1c8e4f56-8af4-452a-ae6f-7b20a6d3d9b7', email: 'admin@aethea.com' },
  patient:     { id: 'ae0b9899-7075-4b2d-bfaa-93e3aed947bc', email: 'patient@aethea.com' },
  doctor:      { id: 'db2417ae-914d-468f-9db1-0503fb556b24', email: 'doctor@aethea.com' },
  pharmacist:  { id: 'c58b6c74-f6d3-4fe8-90fd-ed1ad15840c9', email: 'pharmacist@aethea.com' },
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

  // ── 1b. Upsert Supabase authorization state (user_accounts) ───────────────
  // IMPORTANT: Web + backend role guards rely on JWT claims injected from
  // public.user_accounts via Supabase custom_access_token_hook.
  console.log('Upserting user_accounts (authorization claims)…');

  const userAccountsTable = await prisma.$queryRaw<Array<{ exists: boolean }>>(
    Prisma.sql`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'user_accounts'
      ) AS exists
    `,
  );

  if (!userAccountsTable[0]?.exists) {
    console.warn(
      '⚠️  public.user_accounts table not found — skipping auth claim seeding. ' +
      'Run scripts/supabase/2026-03-11_authorization_schema.sql and enable the auth hooks to get account_type JWT claims.',
    );
  } else {
    const authUserExists = async (userId: string) => {
      const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>(
        Prisma.sql`SELECT EXISTS (SELECT 1 FROM auth.users WHERE id = ${userId}::uuid) AS exists`,
      );
      return Boolean(rows[0]?.exists);
    };

    const safeApprovedBy = async (approvedBy: string | null | undefined) => {
      if (!approvedBy) return null;
      return (await authUserExists(approvedBy)) ? approvedBy : null;
    };

    const upsertUserAccount = async (input: {
      userId: string;
      accountType: 'patient' | 'doctor' | 'pharmacist' | 'admin';
      accountStatus: 'pending' | 'active' | 'suspended' | 'rejected';
      mustChangePassword: boolean;
      approvedBy?: string | null;
    }) => {
      if (!(await authUserExists(input.userId))) {
        console.warn(
          `⚠️  auth.users row not found for ${input.userId}; skipping public.user_accounts upsert (create the Supabase Auth user first).`,
        );
        return;
      }

      await prisma.$executeRaw`
        INSERT INTO public.user_accounts (
          id,
          account_type,
          account_status,
          must_change_password,
          approved_by,
          approved_at
        )
        VALUES (
          ${input.userId}::uuid,
          ${input.accountType}::public.account_type,
          ${input.accountStatus}::public.account_status,
          ${input.mustChangePassword},
          ${await safeApprovedBy(input.approvedBy)}::uuid,
          CASE WHEN ${input.accountStatus} = 'active' THEN now() ELSE NULL END
        )
        ON CONFLICT (id) DO UPDATE SET
          account_type = EXCLUDED.account_type,
          account_status = EXCLUDED.account_status,
          must_change_password = EXCLUDED.must_change_password,
          approved_by = EXCLUDED.approved_by,
          approved_at = EXCLUDED.approved_at,
          updated_at = now()
      `;
    };

    // Seed test accounts as ready-to-use (active + no forced password change)
    // so doctor/pharmacist routes are accessible in local dev.
    await upsertUserAccount({
      userId: ACCOUNTS.admin.id,
      accountType: 'admin',
      accountStatus: 'active',
      mustChangePassword: false,
      approvedBy: null,
    });

    await upsertUserAccount({
      userId: ACCOUNTS.patient.id,
      accountType: 'patient',
      accountStatus: 'active',
      mustChangePassword: false,
      approvedBy: null,
    });

    await upsertUserAccount({
      userId: ACCOUNTS.doctor.id,
      accountType: 'doctor',
      accountStatus: 'active',
      mustChangePassword: false,
      approvedBy: ACCOUNTS.admin.id,
    });

    await upsertUserAccount({
      userId: ACCOUNTS.pharmacist.id,
      accountType: 'pharmacist',
      accountStatus: 'active',
      mustChangePassword: false,
      approvedBy: ACCOUNTS.admin.id,
    });
  }

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
