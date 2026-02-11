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
import { createApp } from './app.js';
import logger from './lib/logger.js';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3001;

// Create the Express application
const app = createApp({
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  corsOrigins: process.env.CORS_ORIGIN?.split(',') || undefined,
  isProduction: process.env.NODE_ENV === 'production',
});

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

// Graceful shutdown
const shutdown = (signal: string) => {
  logger.info({ signal }, 'Shutdown signal received — closing server');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
  // Force exit after 10s if connections don't close
  setTimeout(() => process.exit(1), 10_000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
