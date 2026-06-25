import prisma from './src/lib/prisma.ts';

async function main() {
  const tests = await prisma.labTest.findMany({ take: 5, orderBy: { measuredAt: 'desc' } });
  console.log(tests);
}

main().catch(console.error);
