import { PrismaClient } from '../src/generated/prisma/client/index.js';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'pat@aethea.me' },
    include: { patientConditions: true }
  });
  console.log(JSON.stringify(user?.patientConditions, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
