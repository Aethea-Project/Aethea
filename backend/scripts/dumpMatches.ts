import 'dotenv/config';
import prisma from '../src/lib/prisma.js';
import { getLabDefinition } from '../../web/src/lib/labDictionary.js';

async function main() {
  const tests = await prisma.labTest.findMany({
    select: { testName: true }
  });
  
  const uniqueNames = new Set(tests.map(t => t.testName));
  console.log(`Found ${uniqueNames.size} unique test names.`);

  for (const name of uniqueNames) {
    const def = getLabDefinition(name);
    if (!def) {
      console.log(`[NULL] ${name}`);
    } else {
      console.log(`[OK] ${name.padEnd(30)} -> ${def.title}`);
    }
  }
}

main().finally(() => prisma.$disconnect());
