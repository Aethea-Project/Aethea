/**
 * Integration Tests — Auth endpoints
 *
 * Tests authentication-related security per OWASP API2:2023.
 * Since we don't have real Supabase creds in tests, we verify:
 *   - Missing token → 401
 *   - Auth service unavailable → 503 (fail-closed)
 *   - Protected endpoints without token → rejected
 */

import request from 'supertest';
import { createApp } from '../src/app.js';

// App without Supabase (auth unavailable — fail-closed behavior)
const app = createApp({
  supabaseUrl: undefined,
  supabaseServiceKey: undefined,
  isProduction: false,
});

describe('POST /api/auth/verify', () => {
  it('rejects request with no Authorization header (401)', async () => {
    const res = await request(app)
      .post('/api/auth/verify')
      .send({});
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('rejects request with malformed Authorization header', async () => {
    const res = await request(app)
      .post('/api/auth/verify')
      .set('Authorization', 'NotBearer xyz')
      .send({});
    expect(res.status).toBe(401);
  });

  it('does not leak internal error details in response', async () => {
    const res = await request(app)
      .post('/api/auth/verify')
      .send({});
    // Must NOT contain stack traces, file paths, or internal class names
    const body = JSON.stringify(res.body);
    expect(body).not.toContain('stack');
    expect(body).not.toContain('.ts');
    expect(body).not.toContain('node_modules');
  });
});

describe('Protected endpoints — fail-closed without Supabase', () => {
  it('GET /api/users/profile → 503 when auth not configured', async () => {
    const res = await request(app)
      .get('/api/users/profile')
      .set('Authorization', 'Bearer faketoken');
    // Without Supabase, authMiddleware returns 503 (not 200!)
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('AUTH_UNAVAILABLE');
  });

  it('GET /api/scans → 503 when auth not configured', async () => {
    const res = await request(app).get('/api/scans');
    expect(res.status).toBe(503);
  });

  it('GET /api/lab-tests → 503 when auth not configured', async () => {
    const res = await request(app).get('/api/lab-tests');
    expect(res.status).toBe(503);
  });

  it('GET /api/reservations → 503 when auth not configured', async () => {
    const res = await request(app).get('/api/reservations');
    expect(res.status).toBe(503);
  });
});
