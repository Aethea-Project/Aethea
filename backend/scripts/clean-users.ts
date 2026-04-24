import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanDb() {
  const ids = [
    '1c8e4f56-8af4-452a-ae6f-7b20a6d3d9b7',
    'ae0b9899-7075-4b2d-bfaa-93e3aed947bc',
    'db2417ae-914d-468f-9db1-0503fb556b24',
    'c58b6c74-f6d3-4fe8-90fd-ed1ad15840c9'
  ];

  console.log('Attempting to delete related records for old UUIDs...');

  try {
    // 1. Audit logs (no cascade defined)
    await prisma.$executeRawUnsafe(`DELETE FROM public.admin_audit_log WHERE actor_id IN ('${ids.join("','")}') OR target_user_id IN ('${ids.join("','")}');`);
    console.log('Cleared audit logs.');

    // 2. Staff verifications (reviewed_by does not cascade)
    await prisma.$executeRawUnsafe(`DELETE FROM auth.staff_verifications WHERE user_id IN ('${ids.join("','")}') OR reviewed_by IN ('${ids.join("','")}');`);
    console.log('Cleared staff verifications.');

    // 3. User authorization roles (approved_by does not cascade)
    await prisma.$executeRawUnsafe(`DELETE FROM auth.user_authorization_roles WHERE id IN ('${ids.join("','")}') OR approved_by IN ('${ids.join("','")}');`);
    console.log('Cleared authorization roles.');

    // 4. Finally, force delete from auth.users (this will cascade to public.users via the triggers/fks if they exist, or we manually delete them)
    await prisma.$executeRawUnsafe(`DELETE FROM public.users WHERE id IN ('${ids.join("','")}');`);
    console.log('Deleted from public.users.');
    
    await prisma.$executeRawUnsafe(`DELETE FROM auth.users WHERE id IN ('${ids.join("','")}');`);
    console.log('Deleted from auth.users.');

    console.log('\nSuccess! The 5 old accounts and their constraints have been wiped from the database.');
  } catch (error) {
    console.error('Error cleaning database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanDb();