import { PrismaClient } from './src/generated/prisma/index.js';

async function checkPolicies() {
  const prisma = new PrismaClient();
  
  const res = await prisma.$queryRaw`
    SELECT polname, polcmd, polqual, polwithcheck 
    FROM pg_policy 
    WHERE polrelid = 'storage.objects'::regclass;
  `;
  
  console.log("Policies:", JSON.stringify(res, null, 2));
  
  const res2 = await prisma.$queryRaw`
    SELECT id, name, public FROM storage.buckets;
  `;
  console.log("Buckets:", JSON.stringify(res2, null, 2));
  
  await prisma.$disconnect();
}

checkPolicies().catch(console.error);
