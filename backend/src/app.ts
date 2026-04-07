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
import { createAuthRoutes } from './routes/auth.routes.js';
import { createUserRoutes } from './routes/users.routes.js';
import { createScanRoutes } from './routes/scans.routes.js';
import { createLabTestRoutes } from './routes/labTests.routes.js';
import { createReservationRoutes } from './routes/reservations.routes.js';
import { createAdminRoutes } from './routes/admin.routes.js';
import { createStaffVerificationRoutes } from './routes/staffVerification.routes.js';
import { createAdminVerificationRoutes } from './routes/adminVerification.routes.js';
import { createDoctorRoutes } from './routes/doctors.routes.js';
import { createNotificationRoutes } from './routes/notifications.routes.js';
import logger from './lib/logger.js';

interface AppConfig {
  supabaseUrl?: string;
  supabaseServiceKey?: string;
  corsOrigins?: string[];
  isProduction?: boolean;
}

export function createApp(config: AppConfig = {}) {
  const app = express();

  // Trust the first proxy to enable rate limiting behind NGINX or Cloudflare
  app.set('trust proxy', 1);

  const {
    supabaseUrl,
    supabaseServiceKey,
    corsOrigins = ['http://localhost:5173', 'https://aethea.me'],
    isProduction = process.env.NODE_ENV === 'production',
  } = config;

  const normalizedCorsOrigins = corsOrigins
    .map((origin) => origin.trim())
    .filter(Boolean);

  // ─── Fail closed: in production, missing Supabase creds is fatal ───
  // Source: OWASP API2:2023 — never silently skip authentication
  if (isProduction && (!supabaseUrl || !supabaseServiceKey)) {
    throw new Error(
      'FATAL: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in production. ' +
      'The server refuses to start without authentication configured.'
    );
  }

  // ─── Security headers (OWASP REST Security Headers) ───
  // API-only CSP: browsers should never render API responses as HTML
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'same-origin' },
  }));

  // ─── CORS with explicit origins (OWASP REST CORS) ───
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const isListedOrigin = normalizedCorsOrigins.includes(origin);
      const isAetheaSubdomain = /^https:\/\/[a-z0-9-]+\.aethea\.me$/i.test(origin);

      if (isListedOrigin || origin === 'https://aethea.me' || isAetheaSubdomain) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    optionsSuccessStatus: 204,
  }));

  // ─── Compression (Express Performance Best Practices) ───
  app.use(compression());

  // ─── Body parsing with size limit ───
  // Source: OWASP REST Input Validation
  //   "Define an appropriate request size limit and reject requests with HTTP 413."
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  // ─── Structured request logging (Pino) ───
  app.use(pinoHttp({ logger, autoLogging: isProduction ? { ignore: (req) => req.url === '/health' } : true }));

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
        auth: '/api/v1/auth/*',
        users: '/api/v1/users/*',
        scans: '/api/v1/scans/*',
        labTests: '/api/v1/lab-tests/*',
        reservations: '/api/v1/reservations/*',
        admin: '/api/v1/admin/*',
        staffVerification: '/api/v1/staff/verification/*',
      },
    });
  });

  // ─── Mount route modules (Router Pattern) ───
  // Create each router once, mount at both versioned and non-versioned paths.
  const authRoutes = createAuthRoutes(authMiddleware, jwtVerifier);
  const userRoutes = createUserRoutes(authMiddleware);
  const scanRoutes = createScanRoutes(authMiddleware);
  const labTestRoutes = createLabTestRoutes(authMiddleware);
  const reservationRoutes = createReservationRoutes(authMiddleware);
  const adminRoutes = createAdminRoutes(authMiddleware);
  const staffVerificationRoutes = createStaffVerificationRoutes(authMiddleware);
  const adminVerificationRoutes = createAdminVerificationRoutes(authMiddleware);
  const doctorRoutes = createDoctorRoutes(authMiddleware);
  const notificationRoutes = createNotificationRoutes(authMiddleware);

  // API v1 — explicit versioning (REST best practice)
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/scans', scanRoutes);
  app.use('/api/v1/lab-tests', labTestRoutes);
  app.use('/api/v1/reservations', reservationRoutes);
  app.use('/api/v1/admin', adminRoutes);
  app.use('/api/v1/staff/verification', staffVerificationRoutes);
  app.use('/api/v1/admin', adminVerificationRoutes);
  app.use('/api/v1/doctors', doctorRoutes);
  app.use('/api/v1/notifications', notificationRoutes);

  // Backward-compatible aliases (non-versioned paths → v1)
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/scans', scanRoutes);
  app.use('/api/lab-tests', labTestRoutes);
  app.use('/api/reservations', reservationRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/staff/verification', staffVerificationRoutes);
  app.use('/api/admin', adminVerificationRoutes);
  app.use('/api/doctors', doctorRoutes);
  app.use('/api/notifications', notificationRoutes);

  // ─── Error handling (must be LAST) ───
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;
