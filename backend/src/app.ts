/**
 * Express Application Factory
 *
 * Exports a fully configured Express app **without** calling app.listen().
 * This allows Supertest to import the app directly for integration tests
 * without starting a real server.
 *
 * Design Patterns used:
 *   - Factory: createApp() builds a configured app instance
 *   - Middleware Chain: security → logging → parsing → rate-limit → routes → error handling
 *   - Router: routes split into modular files
 *   - Controller: request handling separated from route wiring
 *
 * Security (OWASP / Express best practices):
 *   - Helmet for security headers
 *   - CORS with explicit origin allowlist
 *   - express.json with 10kb body limit (prevents payload DoS)
 *   - Server-side rate limiting (general + strict auth)
 *   - Cache-Control: no-store on API responses
 *   - Structured Pino logging (redacts auth headers)
 *   - Centralized error handler (never leaks stack traces)
 *   - Fail-closed: throws at startup if Supabase creds are missing in production
 */

import express, { RequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import pinoHttp from 'pino-http';
import { initializeJWTVerifier } from './auth/jwt/verify.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.routes.js';
import { createUserRoutes } from './routes/users.routes.js';
import { createScanRoutes } from './routes/scans.routes.js';
import { createLabTestRoutes } from './routes/labTests.routes.js';
import { createReservationRoutes } from './routes/reservations.routes.js';
import logger from './lib/logger.js';

interface AppConfig {
  supabaseUrl?: string;
  supabaseServiceKey?: string;
  corsOrigins?: string[];
  isProduction?: boolean;
}

export function createApp(config: AppConfig = {}) {
  const app = express();
  const {
    supabaseUrl,
    supabaseServiceKey,
    corsOrigins = ['http://localhost:5173', 'http://localhost:19006', 'https://aethea.me'],
    isProduction = process.env.NODE_ENV === 'production',
  } = config;

  // ─── Fail closed: in production, missing Supabase creds is fatal ───
  // Source: OWASP API2:2023 — never silently skip authentication
  if (isProduction && (!supabaseUrl || !supabaseServiceKey)) {
    throw new Error(
      'FATAL: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in production. ' +
      'The server refuses to start without authentication configured.'
    );
  }

  // ─── Security headers (OWASP REST Security Headers) ───
  app.use(helmet());

  // ─── CORS with explicit origins (OWASP REST CORS) ───
  app.use(cors({
    origin: corsOrigins,
    credentials: true,
  }));

  // ─── Compression (Express Performance Best Practices) ───
  app.use(compression());

  // ─── Body parsing with size limit ───
  // Source: OWASP REST Input Validation
  //   "Define an appropriate request size limit and reject requests with HTTP 413."
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  // ─── Structured request logging (Pino) ───
  app.use(pinoHttp({ logger, autoLogging: !isProduction ? true : { ignore: (req) => req.url === '/health' } }));

  // ─── Cache-Control: no-store on all API responses ───
  // Source: OWASP REST Security Headers
  //   "Providing no-store prevents sensitive information from being cached."
  app.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  // ─── Global API rate limiter ───
  app.use('/api', apiLimiter);

  // ─── Initialize Supabase JWT verifier ───
  const jwtVerifier = supabaseUrl && supabaseServiceKey
    ? initializeJWTVerifier(supabaseUrl, supabaseServiceKey)
    : null;

  // Store on app for controllers to access
  app.set('jwtVerifier', jwtVerifier);

  // Build auth middleware (fail-closed: rejects all if no verifier)
  const authMiddleware: RequestHandler = jwtVerifier
    ? jwtVerifier.authMiddleware()
    : (_req, res, _next) => {
        res.status(503).json({
          error: 'Authentication service not configured',
          code: 'AUTH_UNAVAILABLE',
        });
      };

  // ─── Health check (no auth, no rate limit) ───
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    });
  });

  // ─── API index ───
  app.get('/api', (_req, res) => {
    res.json({
      message: 'Aethea Medical Platform API',
      version: '1.0.0',
      endpoints: {
        health: '/health',
        auth: '/api/auth/*',
        users: '/api/users/*',
        scans: '/api/scans/*',
        labTests: '/api/lab-tests/*',
        reservations: '/api/reservations/*',
      },
    });
  });

  // ─── Mount route modules (Router Pattern) ───
  app.use('/api/auth', authRoutes);
  app.use('/api/users', createUserRoutes(authMiddleware));
  app.use('/api/scans', createScanRoutes(authMiddleware));
  app.use('/api/lab-tests', createLabTestRoutes(authMiddleware));
  app.use('/api/reservations', createReservationRoutes(authMiddleware));

  // ─── Error handling (must be LAST) ───
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;
