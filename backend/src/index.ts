/**
 * Backend Server Entry Point
 * Express API with Supabase authentication
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { initializeJWTVerifier } from './auth/jwt/verify.js';
import { createProfileRouter } from './routes/profile.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173', 'http://localhost:19006'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Supabase authentication
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️  Warning: Supabase credentials not configured in .env file');
}

// Initialize JWT verifier for protected routes
const jwtVerifier = supabaseUrl && supabaseServiceKey
  ? initializeJWTVerifier(supabaseUrl, supabaseServiceKey)
  : null;

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API routes
app.get('/api', (req, res) => {
  res.json({
    message: 'Medical Platform API',
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

// Auth middleware helper
const authMiddleware = jwtVerifier?.authMiddleware() || ((req: any, res: any, next: any) => next());

// Auth routes
app.post('/api/auth/verify', async (req, res) => {
  const token = jwtVerifier?.extractTokenFromHeader(req.headers.authorization);
  
  if (!token || !jwtVerifier) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const verification = await jwtVerifier.verifyToken(token);
  
  if (!verification.valid) {
    return res.status(401).json({ error: verification.error });
  }

  res.json({
    valid: true,
    user: verification.user,
  });
});

// User profile route
app.get('/api/users/profile', authMiddleware, (req, res) => {
  res.json({
    user: (req as any).user,
  });
});

// Profile API routes (GET + PUT)
if (supabaseUrl && supabaseServiceKey) {
  app.use('/api/profile', authMiddleware, createProfileRouter(supabaseUrl, supabaseServiceKey));
}

// Scans routes (placeholder - returns empty until database integration)
app.get('/api/scans', authMiddleware, (req, res) => {
  res.json({ scans: [] });
});

// Lab tests routes (placeholder - returns empty until database integration)
app.get('/api/lab-tests', authMiddleware, (req, res) => {
  res.json({ tests: [] });
});

// Reservations routes (placeholder - returns empty until database integration)
app.get('/api/reservations', authMiddleware, (req, res) => {
  res.json({ reservations: [] });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║                                               ║
║   🏥  Medical Platform API Server             ║
║                                               ║
║   🚀  Server running on port ${PORT}            ║
║   🌍  http://localhost:${PORT}                  ║
║   📚  API Docs: http://localhost:${PORT}/api    ║
║                                               ║
║   Environment: ${process.env.NODE_ENV || 'development'}                    ║
║                                               ║
╚═══════════════════════════════════════════════╝
  `);

  if (!supabaseUrl || !supabaseServiceKey) {
    console.log('\n⚠️  Configure Supabase credentials in .env to enable authentication\n');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n👋 SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n👋 SIGINT received. Shutting down gracefully...');
  process.exit(0);
});
