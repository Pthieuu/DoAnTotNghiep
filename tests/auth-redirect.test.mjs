import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers/weakness-practice-fixtures.mjs';

function createMockRequest(pathname, search = '') {
  const url = `http://localhost:3000${pathname}${search}`;
  const parsed = new URL(url);
  const cookieJar = new Map();
  return {
    url,
    nextUrl: {
      pathname: parsed.pathname,
      search: parsed.search,
      clone() {
        return new URL(url);
      },
    },
    cookies: {
      getAll: () => Array.from(cookieJar.entries()).map(([name, value]) => ({ name, value })),
      set: (name, value) => cookieJar.set(name, value),
    },
  };
}

function createProxy(claimsResult = { data: null, error: null }) {
  const nextResponseMock = {
    next: () => {
      const headers = new Map();
      const cookies = new Map();
      return {
        status: 200,
        headers: {
          get: (k) => headers.get(k.toLowerCase()),
          set: (k, v) => headers.set(k.toLowerCase(), v),
        },
        cookies: {
          set: (opts) => cookies.set(typeof opts === 'string' ? opts : opts.name, opts),
          getAll: () => Array.from(cookies.values()),
        },
      };
    },
    redirect: (targetUrl) => {
      const headers = new Map();
      headers.set('location', targetUrl.toString());
      const cookies = new Map();
      return {
        status: 307,
        headers: {
          get: (k) => headers.get(k.toLowerCase()),
          set: (k, v) => headers.set(k.toLowerCase(), v),
        },
        cookies: {
          set: (opts) => cookies.set(typeof opts === 'string' ? opts : opts.name, opts),
          getAll: () => Array.from(cookies.values()),
        },
      };
    },
  };

  const supabaseMock = {
    auth: {
      getClaims: async () => claimsResult,
    },
  };

  return load('src/proxy.ts', {
    '@supabase/ssr': {
      createServerClient: () => supabaseMock,
    },
    'next/server': {
      NextResponse: nextResponseMock,
    },
    '@/lib/supabase/config': {
      authCookieOptions: {},
      supabaseConfig: () => ({ url: 'https://example.supabase.co', key: 'mock-key' }),
    },
  });
}

test('proxy redirects authenticated user from / to /dashboard', async () => {
  const { proxy } = createProxy({ data: { claims: { sub: 'user-123' } }, error: null });
  const request = createMockRequest('/');
  const response = await proxy(request);

  assert.equal(response.status, 307);
  assert.equal(new URL(response.headers.get('location')).pathname, '/dashboard');
});

test('proxy preserves query parameters when redirecting / to /dashboard', async () => {
  const { proxy } = createProxy({ data: { claims: { sub: 'user-123' } }, error: null });
  const request = createMockRequest('/', '?ref=email');
  const response = await proxy(request);

  assert.equal(response.status, 307);
  const target = new URL(response.headers.get('location'));
  assert.equal(target.pathname, '/dashboard');
  assert.equal(target.search, '?ref=email');
});

test('proxy allows unauthenticated user on / to view landing page', async () => {
  const { proxy } = createProxy({ data: null, error: null });
  const request = createMockRequest('/');
  const response = await proxy(request);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('location'), undefined);
});

test('proxy redirects authenticated user from /login to /dashboard', async () => {
  const { proxy } = createProxy({ data: { claims: { sub: 'user-123' } }, error: null });
  const request = createMockRequest('/login');
  const response = await proxy(request);

  assert.equal(response.status, 307);
  assert.equal(new URL(response.headers.get('location')).pathname, '/dashboard');
});

test('proxy allows unauthenticated user on /login to view login page', async () => {
  const { proxy } = createProxy({ data: null, error: null });
  const request = createMockRequest('/login');
  const response = await proxy(request);

  assert.equal(response.status, 200);
});

test('proxy does not redirect on protected routes /dashboard or /profile', async () => {
  const { proxy } = createProxy({ data: { claims: { sub: 'user-123' } }, error: null });
  const dashboardReq = createMockRequest('/dashboard');
  const dashboardRes = await proxy(dashboardReq);
  assert.equal(dashboardRes.status, 200);

  const profileReq = createMockRequest('/profile');
  const profileRes = await proxy(profileReq);
  assert.equal(profileRes.status, 200);
});

test('home page redirects authenticated user to /dashboard', async () => {
  let redirectedTo = null;
  const mockRedirect = (url) => {
    redirectedTo = url;
    throw new Error('NEXT_REDIRECT');
  };

  const { default: Home } = load('src/app/page.tsx', {
    'next/navigation': { redirect: mockRedirect },
    '@/lib/auth': { getUser: async () => ({ id: 'user-123', email: 'test@example.com' }) },
    '@/components/icon': () => null,
    'next/image': () => null,
    'react/jsx-runtime': { jsx: () => null, jsxs: () => null, Fragment: () => null },
  });

  await assert.rejects(async () => {
    await Home();
  }, /NEXT_REDIRECT/);

  assert.equal(redirectedTo, '/dashboard');
});

test('home page renders normally for unauthenticated visitor', async () => {
  let redirected = false;
  const mockRedirect = () => {
    redirected = true;
    throw new Error('NEXT_REDIRECT');
  };

  const { default: Home } = load('src/app/page.tsx', {
    'next/navigation': { redirect: mockRedirect },
    '@/lib/auth': { getUser: async () => null },
    '@/components/icon': () => null,
    'next/image': () => null,
    'react/jsx-runtime': { jsx: () => ({ type: 'rendered' }), jsxs: () => ({ type: 'rendered' }), Fragment: () => null },
  });

  const result = await Home();
  assert.equal(redirected, false);
  assert.ok(result);
});
