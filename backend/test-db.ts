import { PrismaClient } from './src/generated/prisma/client/index.js';
const prisma = new PrismaClient();
async function main() {
  const count = await prisma.medicine.count({ where: { photoUrl: { not: null } } });
  console.log('Medicines with photos:', count);
  const meds = await prisma.medicine.findMany({
    where: { photoUrl: { not: null } },
    take: 1,
    select: { id: true, brandNameEn: true, photoUrl: true }
  });
  console.log('Sample:', meds);
}
main().finally(() => prisma.$disconnect());
