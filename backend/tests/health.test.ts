/**
 * Integration Tests — Health & API index endpoints
 *
 * These tests import the Express app directly (no real server started)
 * via Supertest, verifying HTTP status codes, headers, and response bodies.
 */

import request from 'supertest';
import { createApp } from '../src/app.js';

// Create app without Supabase creds (non-production mode)
const app = createApp({
  supabaseUrl: undefined,
  supabaseServiceKey: undefined,
  isProduction: false,
});

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('environment');
  });

  it('returns Cache-Control: no-store header', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['cache-control']).toBe('no-store');
  });
});

describe('GET /api', () => {
  it('returns 200 with API info', async () => {
    const res = await request(app).get('/api');
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('Medical Platform API');
    expect(res.body.version).toBe('1.0.0');
    expect(res.body.endpoints).toBeDefined();
  });
});

describe('404 handler', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not found');
  });
});
