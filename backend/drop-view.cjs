const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Dropping profile_statistics view...');
  await prisma.$executeRawUnsafe(`DROP VIEW IF EXISTS profile_statistics CASCADE;`);
  console.log('Dropped view successfully.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
