import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const seedUserId = process.env.SEED_USER_ID;
const seedUserEmail = process.env.SEED_USER_EMAIL || 'seed-user@example.com';

async function main() {
  if (!seedUserId) {
    console.error('SEED_USER_ID is required to run seed. Set it to a Supabase user id so records attach to a real user.');
    process.exit(1);
  }

  console.log(`Seeding data for user ${seedUserId}`);

  await prisma.user.upsert({
    where: { id: seedUserId },
    update: { email: seedUserEmail },
    create: {
      id: seedUserId,
      email: seedUserEmail,
    },
  });

  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
  const daysFromNow = (d: number) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

  await prisma.labTest.createMany({
    data: [
      {
        id: crypto.randomUUID(),
        userId: seedUserId,
        testName: 'Complete Blood Count',
        category: 'Complete Blood Count',
        value: 'Normal',
        unit: 'N/A',
        status: 'normal',
        orderedBy: 'Dr. Green',
        measuredAt: daysAgo(5),
      },
      {
        id: crypto.randomUUID(),
        userId: seedUserId,
        testName: 'Lipid Panel',
        category: 'Lipid Panel',
        value: 'LDL 130',
        unit: 'mg/dL',
        status: 'borderline',
        orderedBy: 'Dr. Lee',
        measuredAt: daysAgo(12),
      },
    ],
    skipDuplicates: true,
  });

  await prisma.scan.createMany({
    data: [
      {
        id: crypto.randomUUID(),
        userId: seedUserId,
        type: 'MRI',
        bodyPart: 'Lumbar Spine',
        description: 'Lower back pain investigation',
        priority: 'routine',
        status: 'completed',
        radiologist: 'Dr. Patel',
        scanDate: daysAgo(8),
      },
      {
        id: crypto.randomUUID(),
        userId: seedUserId,
        type: 'CT Scan',
        bodyPart: 'Chest',
        description: 'Persistent cough follow-up',
        priority: 'urgent',
        status: 'in_progress',
        radiologist: 'Dr. Morgan',
        scanDate: daysAgo(2),
      },
    ],
    skipDuplicates: true,
  });

  await prisma.reservation.createMany({
    data: [
      {
        id: crypto.randomUUID(),
        userId: seedUserId,
        doctorName: 'Dr. Carter',
        specialty: 'Cardiology',
        reason: 'Follow-up on lipid panel',
        location: 'Aethea Heart Center',
        startAt: daysFromNow(2),
        status: 'scheduled',
      },
      {
        id: crypto.randomUUID(),
        userId: seedUserId,
        doctorName: 'Dr. Nguyen',
        specialty: 'Radiology',
        reason: 'Review MRI findings',
        location: 'Imaging Suite 3',
        startAt: daysFromNow(5),
        status: 'confirmed',
      },
    ],
    skipDuplicates: true,
  });

  console.log('Seed completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
