/**
 * Backend Server Entry Point (thin)
 *
 * Only responsibilities:
 *   1. Load environment variables
 *   2. Create the Express app via factory (app.ts)
 *   3. Start listening
 *   4. Handle graceful shutdown
 *
 * The actual Express configuration, middleware, and routes live in app.ts
 * so Supertest can import the app without starting a server.
 */

import dotenv from 'dotenv';
import { createApp, setShuttingDown } from './app.js';
import logger from './lib/logger.js';
import prisma from './lib/prisma.js';
import { createHttpTerminator } from 'http-terminator';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3001;

import { registerCronJobs } from './jobs/cron.registry.js';
import { closeBullMQ } from './lib/bullmq.js';

// Create the Express application
const app = createApp({
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  corsOrigins: process.env.CORS_ORIGIN?.split(',') || undefined,
  isProduction: process.env.NODE_ENV === 'production',
});

// Start background jobs
registerCronJobs().catch((err) => {
  logger.error({ err }, 'Failed to register BullMQ cron jobs');
});

// Initialize workers
import './workers/extraction.worker.js';

// Start server
const server = app.listen(PORT, () => {
  logger.info(
    {
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
      supabaseConfigured: !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    },
    `🏥 Aethea Medical Platform API — listening on http://localhost:${PORT}`
  );
});

const httpTerminator = createHttpTerminator({ server, gracefulTerminationTimeout: 10000 });

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info({ signal }, 'Shutdown signal received — initiating graceful shutdown');
  setShuttingDown(true); // Fail /health check with 503
  
  // Wait 3 seconds for load balancers to propagate the failed health check
  await new Promise(resolve => setTimeout(resolve, 3000)); 
  
  logger.info('Draining active HTTP requests...');
  await httpTerminator.terminate();
  
  logger.info('Closing background jobs and database connections...');
  await closeBullMQ();
  await prisma.$disconnect();
  
  logger.info('Shutdown complete');
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
