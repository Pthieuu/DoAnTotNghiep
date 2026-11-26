import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load, plain } from './helpers/weakness-practice-fixtures.mjs';

function makeRequest(url, body, origin = 'http://localhost') {
  return new Request(url, {
    method: 'POST',
    headers: { origin, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('reset-password requires SUPABASE_SERVICE_ROLE_KEY and SMTP config', async () => {
  const env = { NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co' };
  const { POST } = load(
    'src/app/api/auth/reset-password/route.ts',
    {
      '@supabase/supabase-js': { createClient: () => { throw new Error('should not be called'); } },
      '@/lib/auth-http': { checkRequest: () => null, json: (body, status = 200) => Response.json(body, { status }) },
      '@/lib/email': { getSmtpConfig: () => null, sendPasswordResetOtpEmail: async () => {} },
    },
    { process: { env } },
  );

  const res = await POST(makeRequest('http://localhost/api/auth/reset-password', { email: 'user@example.com' }));
  assert.equal(res.status, 503);
});

test('reset-password generates recovery OTP and sends email via personal SMTP', async () => {
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'service-role-secret',
  };
  const sent = [];
  const generated = [];

  const { POST } = load(
    'src/app/api/auth/reset-password/route.ts',
    {
      '@supabase/supabase-js': {
        createClient: () => ({
          auth: {
            admin: {
              generateLink: async (params) => {
                generated.push(params);
                return { data: { properties: { email_otp: '482910' } }, error: null };
              },
            },
          },
        }),
      },
      '@/lib/auth-http': { checkRequest: () => null, json: (body, status = 200) => Response.json(body, { status }) },
      '@/lib/email': {
        getSmtpConfig: () => ({ host: 'smtp.gmail.com', port: 465, user: 'me@gmail.com', pass: 'app-pass', from: 'Aizuchi.AI <me@gmail.com>' }),
        sendPasswordResetOtpEmail: async (payload) => { sent.push(payload); },
      },
    },
    { process: { env } },
  );

  const res = await POST(makeRequest('http://localhost/api/auth/reset-password', { email: ' user@example.com ' }));
  assert.equal(res.status, 200);
  assert.deepEqual(plain(generated), [{ type: 'recovery', email: 'user@example.com' }]);
  assert.deepEqual(plain(sent), [{ to: 'user@example.com', otp: '482910' }]);
});

test('reset-password handles missing user without leaking existence', async () => {
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'service-role-secret',
  };
  let emailCalled = false;

  const { POST } = load(
    'src/app/api/auth/reset-password/route.ts',
    {
      '@supabase/supabase-js': {
        createClient: () => ({
          auth: {
            admin: {
              generateLink: async () => ({ data: null, error: { status: 404, code: 'user_not_found', message: 'User not found' } }),
            },
          },
        }),
      },
      '@/lib/auth-http': { checkRequest: () => null, json: (body, status = 200) => Response.json(body, { status }) },
      '@/lib/email': {
        getSmtpConfig: () => ({ host: 'smtp.gmail.com', port: 465, user: 'me@gmail.com', pass: 'app-pass', from: 'Aizuchi.AI <me@gmail.com>' }),
        sendPasswordResetOtpEmail: async () => { emailCalled = true; },
      },
    },
    { process: { env } },
  );

  const res = await POST(makeRequest('http://localhost/api/auth/reset-password', { email: 'missing@example.com' }));
  assert.equal(res.status, 200);
  assert.equal(emailCalled, false);
});

test('update-password-otp enforces minimum password length and verifies recovery OTP', async () => {
  const verified = [];
  const updated = [];
  const { POST } = load('src/app/api/auth/update-password-otp/route.ts', {
    '@/lib/supabase/server': {
      createClient: async () => ({
        auth: {
          verifyOtp: async (params) => { verified.push(params); return { error: null }; },
          updateUser: async (params) => { updated.push(params); return { error: null }; },
        },
      }),
    },
    '@/lib/auth-http': { checkRequest: () => null, json: (body, status = 200) => Response.json(body, { status }) },
  });

  const shortRes = await POST(makeRequest('http://localhost/api/auth/update-password-otp', {
    email: 'user@example.com', otp: '482910', password: 'short',
  }));
  assert.equal(shortRes.status, 400);

  const okRes = await POST(makeRequest('http://localhost/api/auth/update-password-otp', {
    email: ' user@example.com ', otp: ' 482910 ', password: 'strong-password-123',
  }));
  assert.equal(okRes.status, 200);
  assert.deepEqual(plain(verified), [{ email: 'user@example.com', token: '482910', type: 'recovery' }]);
  assert.deepEqual(plain(updated), [{ password: 'strong-password-123' }]);
});
