import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

declare global {
  var prisma: PrismaClient | undefined;
  var pgPool: pg.Pool | undefined;
}

const connectionString = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/postgres';

if (!globalThis.pgPool) {
  const poolLimit = process.env.DATABASE_POOL_LIMIT ? parseInt(process.env.DATABASE_POOL_LIMIT, 10) : 10;
  globalThis.pgPool = new pg.Pool({
    connectionString,
    max: poolLimit,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
  });
}

const pool = globalThis.pgPool;
const adapter = new PrismaPg(pool);

const prisma = globalThis.prisma ?? new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  transactionOptions: {
    maxWait: 5000,
    timeout: 10000,
  },
});

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
  globalThis.pgPool = pool;
}

export default prisma;
