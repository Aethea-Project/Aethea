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
import { verifyActiveSession } from './middleware/verifyActiveSession.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { createAuthRoutes } from './routes/auth.routes.js';
import { createUserRoutes } from './routes/users.routes.js';
import { createScanRoutes } from './routes/scans.routes.js';
import { createLabTestRoutes } from './routes/labTests.routes.js';
import { createLabResultsRoutes } from './routes/labResults.routes.js';
import { createReservationRoutes } from './routes/reservations.routes.js';
import { createAdminRoutes } from './routes/admin.routes.js';
import { createStaffVerificationRoutes } from './routes/staffVerification.routes.js';
import { createAdminVerificationRoutes } from './routes/adminVerification.routes.js';
import { createDoctorRoutes } from './routes/doctors.routes.js';
import { createNotificationRoutes } from './routes/notifications.routes.js';
import { createMapsRoutes } from './routes/maps.routes.js';
import { createMedicineRoutes } from './routes/medicine.routes.js';
import { createProgressRoutes } from './routes/progress.routes.js';

import { createFeedbackRoutes } from './routes/feedback.routes.js';
import { createPrescriptionRoutes } from './routes/prescription.routes.js';
import { createAnalyticsRoutes } from './routes/analytics.routes.js';
import { createResearchRoutes } from './routes/research.routes.js';
import prisma from './lib/prisma.js';
import { startNotificationWorker } from './services/notifications/NotificationWorker.js';
import swaggerUi from 'swagger-ui-express';
import { getOpenApiDocumentation } from './docs/swagger.js';

import logger from './lib/logger.js';

interface AppConfig {
  supabaseUrl?: string;
  supabaseServiceKey?: string;
  corsOrigins?: string[];
  isProduction?: boolean;
  startWorkers?: boolean;
}

let isShuttingDown = false;
export const setShuttingDown = (value: boolean) => { isShuttingDown = value; };

export function createApp(config: AppConfig = {}) {
  const app = express();

  // Securely trust private proxy networks (e.g. NGINX in Docker) rather than
  // trusting any hop count, preventing IP spoofing on direct connections.
  app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);

  const {
    supabaseUrl,
    supabaseServiceKey,
    corsOrigins = ['http://localhost:5173', 'https://aethea.me'],
    isProduction = process.env.NODE_ENV === 'production',
    startWorkers = process.env.NODE_ENV !== 'test',
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
  // API-only CSP: this is an API backend, not a document server.
  // Enforced actively to secure boundaries in production.
  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      reportOnly: false,       // Enforce mode active
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
        connectSrc: ["'self'", 'https://*.aethea.me', 'https://aethea.me'],
        scriptSrc: ["'self'", 'https://aethea.me', 'https://*.cloudflare.com'],
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
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

  // ─── Prevent sensitive API responses from being cached ───
  app.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  // ─── Body parsing with size limit ───
  // Source: OWASP REST Input Validation
  //   "Define an appropriate request size limit and reject requests with HTTP 413."
  app.use('/api/v1/scans', express.json({ limit: '15mb' }));
  app.use('/api/scans', express.json({ limit: '15mb' }));
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  // ─── Structured request logging (Pino) ───
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/health' } }));

  // ─── Global API rate limiter ───
  app.use('/api', apiLimiter);

  // ─── Initialize Supabase JWT verifier ───
  const jwtVerifier = supabaseUrl && supabaseServiceKey
    ? initializeJWTVerifier(supabaseUrl, supabaseServiceKey)
    : null;

  // Build auth middleware (fail-closed: rejects all if no verifier)
  const baseAuthMiddleware: RequestHandler = jwtVerifier
    ? jwtVerifier.authMiddleware()
    : (_req, res, _next) => {
        res.status(503).json({
          error: 'Authentication service not configured',
          code: 'AUTH_UNAVAILABLE',
        });
      };

  const authMiddleware: RequestHandler = (req, res, next) => {
    baseAuthMiddleware(req, res, (err) => {
      if (err) return next(err);
      verifyActiveSession(req, res, next);
    });
  };

  // ─── Health check (no auth, no rate limit) ───
  app.get('/health', (_req, res) => {
    if (isShuttingDown) {
      res.status(503).json({ status: 'shutting_down' });
      return;
    }
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    });
  });

  // ─── API Documentation (Swagger UI) ───
  // Serve dynamic, Zod-generated OpenAPI document
  const openApiDocument = getOpenApiDocumentation();
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

  // ─── API index ───
  app.get('/api', (_req, res) => {
    res.json({
      message: 'Aethea Medical Platform API',
      version: '1.0.0',
      endpoints: {
        docs: '/api/docs',
        health: '/health',
        auth: '/api/v1/auth/*',
        users: '/api/v1/users/*',
        scans: '/api/v1/scans/*',
        labTests: '/api/v1/lab-tests/*',
        reservations: '/api/v1/reservations/*',
        admin: '/api/v1/admin/*',
        staffVerification: '/api/v1/staff/verification/*',
        maps: '/api/v1/maps/*',
        medicines: '/api/v1/medicines/*',
      },
    });
  });

  // ─── Mount route modules at both versioned and non-versioned paths ───
  const routeModules: [string, any][] = [
    ['auth', createAuthRoutes(authMiddleware, jwtVerifier)],
    ['users', createUserRoutes(authMiddleware)],
    ['scans', createScanRoutes(authMiddleware)],
    ['lab-tests', createLabTestRoutes(authMiddleware)],
    ['lab-results', createLabResultsRoutes(authMiddleware)],
    ['reservations', createReservationRoutes(authMiddleware)],
    ['admin', createAdminRoutes(authMiddleware)],
    ['staff/verification', createStaffVerificationRoutes(authMiddleware)],
    ['doctors', createDoctorRoutes(authMiddleware)],
    ['notifications', createNotificationRoutes(authMiddleware)],
    ['maps', createMapsRoutes(authMiddleware)],
    ['medicines', createMedicineRoutes(prisma, authMiddleware)],
    ['prescriptions', createPrescriptionRoutes(authMiddleware)],
    ['analytics', createAnalyticsRoutes(authMiddleware)],
    ['jobs', createProgressRoutes(authMiddleware)],

    ['feedbacks', createFeedbackRoutes(authMiddleware)],
    ['research', createResearchRoutes(authMiddleware)],
  ];

  // Admin verification shares the /admin path
  const adminVerificationRoutes = createAdminVerificationRoutes(authMiddleware);
  routeModules.push(['admin', adminVerificationRoutes]);

  for (const [path, router] of routeModules) {
    app.use(`/api/v1/${path}`, router);  // API v1 — explicit versioning
    app.use(`/api/${path}`, router);     // Backward-compatible alias
  }

  // ─── Error handling (must be LAST) ───
  app.use(notFoundHandler);
  app.use(errorHandler);

  // ─── Start the notification event bus worker ───
  if (startWorkers) {
    startNotificationWorker();
  }

  return app;
}

export default createApp;
