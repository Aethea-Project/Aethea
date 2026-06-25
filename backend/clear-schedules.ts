import 'dotenv/config';
import prisma from './src/lib/prisma.js';

async function main() {
  console.log('Deleting all Reservations...');
  const resDel = await prisma.reservation.deleteMany({});
  console.log(`Deleted ${resDel.count} reservations.`);
  
  console.log('Deleting all DoctorSchedules...');
  const schedDel = await prisma.doctorSchedule.deleteMany({});
  console.log(`Deleted ${schedDel.count} schedules.`);
  
  console.log('Done.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
