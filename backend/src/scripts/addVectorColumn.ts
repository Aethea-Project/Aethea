import 'dotenv/config';
import prisma from '../lib/prisma.js';

async function addVectorColumn() {
  console.log('Safely applying pgvector schema updates to Supabase...');
  try {
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector;`);
    console.log('✅ Extension "vector" verified.');

    // We use a try-catch for the column because IF NOT EXISTS isn't standard in all Postgres ALTER TABLE
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE research_articles ADD COLUMN embedding vector(768);`);
      console.log('✅ Column "embedding" added to research_articles.');
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log('✅ Column "embedding" already exists.');
      } else {
        throw e;
      }
    }
  } catch (err) {
    console.error('Failed to update schema:', err);
  } finally {
    await prisma.$disconnect();
  }
}

addVectorColumn();
