/**
 * Integration Tests — CORS Policy Enforcement
 *
 * Verifies that the Express CORS middleware correctly allows/blocks
 * origins per the configured allowlist and aethea.me subdomain pattern.
 *
 * Source: OWASP REST Security — CORS
 *   "Validate and restrict allowed origins to a strict allowlist."
 */

import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp({
  supabaseUrl: undefined,
  supabaseServiceKey: undefined,
  corsOrigins: ['http://localhost:5173', 'https://aethea.me'],
  isProduction: false,
});

describe('CORS — allowed origins', () => {
  it('allows explicit allowlist origin', async () => {
    const res = await request(app)
      .options('/api')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'GET');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('allows https://aethea.me (exact)', async () => {
    const res = await request(app)
      .options('/api')
      .set('Origin', 'https://aethea.me')
      .set('Access-Control-Request-Method', 'GET');
    expect(res.headers['access-control-allow-origin']).toBe('https://aethea.me');
  });

  it('allows *.aethea.me subdomains', async () => {
    const res = await request(app)
      .options('/api')
      .set('Origin', 'https://dashboard.aethea.me')
      .set('Access-Control-Request-Method', 'GET');
    expect(res.headers['access-control-allow-origin']).toBe('https://dashboard.aethea.me');
  });

  it('allows server-to-server requests (no origin header)', async () => {
    const res = await request(app).get('/health');
    // Should succeed — no Origin header means no CORS enforcement
    expect(res.status).toBe(200);
  });
});

describe('CORS — blocked origins', () => {
  it('blocks unknown origins', async () => {
    const res = await request(app)
      .get('/api')
      .set('Origin', 'https://evil.example.com');
    // Express CORS middleware returns 500 (or the error is caught) for blocked origins
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('blocks http scheme for aethea.me (requires https)', async () => {
    const res = await request(app)
      .get('/api')
      .set('Origin', 'http://aethea.me');
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

describe('API versioned vs aliased endpoints', () => {
  it('GET /api/v1/lab-tests and /api/lab-tests both resolve', async () => {
    const v1 = await request(app).get('/api/v1/lab-tests');
    const alias = await request(app).get('/api/lab-tests');
    // Both should resolve (503 because auth is unavailable, not 404)
    expect(v1.status).not.toBe(404);
    expect(alias.status).not.toBe(404);
  });

  it('GET /api/v1/scans and /api/scans both resolve', async () => {
    const v1 = await request(app).get('/api/v1/scans');
    const alias = await request(app).get('/api/scans');
    expect(v1.status).not.toBe(404);
    expect(alias.status).not.toBe(404);
  });

  it('GET /api/v1/reservations and /api/reservations both resolve', async () => {
    const v1 = await request(app).get('/api/v1/reservations');
    const alias = await request(app).get('/api/reservations');
    expect(v1.status).not.toBe(404);
    expect(alias.status).not.toBe(404);
  });
});
