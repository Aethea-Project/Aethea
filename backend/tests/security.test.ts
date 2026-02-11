/**
 * Security Tests
 *
 * Verifies the backend follows OWASP REST Security Cheat Sheet
 * and Express.js Security Best Practices.
 */

import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp({
  supabaseUrl: undefined,
  supabaseServiceKey: undefined,
  isProduction: false,
});

describe('Security Headers (OWASP REST Security Headers)', () => {
  let headers: Record<string, string>;

  beforeAll(async () => {
    const res = await request(app).get('/health');
    headers = res.headers;
  });

  it('sets X-Content-Type-Options: nosniff', () => {
    expect(headers['x-content-type-options']).toBe('nosniff');
  });

  it('sets X-Frame-Options', () => {
    // Helmet sets SAMEORIGIN by default
    expect(headers['x-frame-options']).toBeDefined();
  });

  it('removes X-Powered-By (reduces fingerprinting)', () => {
    expect(headers['x-powered-by']).toBeUndefined();
  });

  it('sets Content-Security-Policy', () => {
    expect(headers['content-security-policy']).toBeDefined();
  });

  it('sets Strict-Transport-Security', () => {
    expect(headers['strict-transport-security']).toBeDefined();
  });

  it('sets Cache-Control: no-store', () => {
    expect(headers['cache-control']).toBe('no-store');
  });
});

describe('Body size limit (OWASP REST Input Validation)', () => {
  it('rejects oversized JSON body with 413', async () => {
    // Generate a payload > 10kb
    const bigPayload = { data: 'x'.repeat(20_000) };
    const res = await request(app)
      .post('/api/auth/verify')
      .set('Content-Type', 'application/json')
      .send(bigPayload);
    expect(res.status).toBe(413);
  });
});

describe('Error handling (OWASP REST Error Handling)', () => {
  it('404 response does not leak file paths or stack traces', async () => {
    const res = await request(app).get('/api/this/does/not/exist');
    const body = JSON.stringify(res.body);
    expect(body).not.toContain('Error:');
    expect(body).not.toContain('at ');
    expect(body).not.toContain('.ts');
    expect(body).not.toContain('node_modules');
  });
});

describe('Fail-closed auth (OWASP API2:2023)', () => {
  it('throws in production if Supabase creds are missing', () => {
    expect(() => {
      createApp({
        supabaseUrl: undefined,
        supabaseServiceKey: undefined,
        isProduction: true,
      });
    }).toThrow('FATAL');
  });
});
