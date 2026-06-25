import 'dotenv/config';
import prisma from '../src/lib/prisma.js';
import { getLabDefinition } from '../../web/src/lib/labDictionary.js'; // This requires compiling or tsx mapping, let's just copy the logic

async function main() {
  const feedbacks = await prisma.feedback.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { labTests: true }
  });

  for (const fb of feedbacks) {
    console.log(`\n--- Feedback ${fb.id} (${fb.createdAt.toISOString()}) ---`);
    let missingCount = 0;
    for (const test of fb.labTests) {
      // Just check what testName is
      // console.log(test.testName);
      // Wait, we can't easily import the frontend TS file directly into node without tsconfig paths issues.
      // So I will just print the test names to see if there is any anomaly.
      console.log(`Test: "${test.testName}"`);
    }
  }
}

main().finally(() => prisma.$disconnect());
