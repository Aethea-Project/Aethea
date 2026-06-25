import 'dotenv/config';
import prisma from '../src/lib/prisma.js';

async function main() {
  const feedback = await prisma.feedback.findFirst({
    include: { labTests: true },
    orderBy: { createdAt: 'desc' }
  });

  if (!feedback) return;

  console.log('Lab Tests for Feedback:', feedback.id);
  for (const t of feedback.labTests) {
    console.log(`- ${t.testName} (createdAt: ${t.createdAt.toISOString()})`);
  }
}

main().finally(() => prisma.$disconnect());
