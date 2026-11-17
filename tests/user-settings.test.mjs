import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load, plain } from './helpers/weakness-practice-fixtures.mjs';

const schema = load('src/lib/user-settings.ts');

function service({ user = { id: 'owner' }, data = null, error = null } = {}) {
  const calls = [];
  const query = {
    select: () => query,
    eq: (...args) => { calls.push(args); return query; },
    maybeSingle: async () => ({ data, error }),
    single: async () => ({ data, error }),
    upsert: (row, options) => { calls.push(plain({ row, options })); return query; },
  };
  const api = load('src/lib/user-settings-server.ts', {
    'server-only': {}, './user-settings': schema,
    '@/lib/supabase/config': { supabaseConfig: () => ({}) },
    '@/lib/supabase/server': { createClient: async () => ({
      auth: { getUser: async () => ({ data: { user }, error: null }) },
      from: () => { calls.push('query'); return query; },
    }) },
  });
  return { ...api, calls };
}

test('settings reject invalid values, empty patches and ownership/metadata injection', () => {
  for (const input of [null, [], {}, { default_jlpt: 'N6' }, { interview_lang: 'en' },
    { eval_framework: null }, { ai_voice: 1 }, { user_id: 'other' },
    { default_jlpt: 'N2', updated_at: 'yesterday' }, { toString: 'x' }]) {
    assert.equal(schema.isUserSettingsUpdate(input), false);
  }
  assert.equal(schema.isUserSettingsUpdate({ default_jlpt: 'N2', ai_voice: 'Kore' }), true);
});

test('new users receive defaults without a database write; reads filter by authenticated user', async () => {
  const api = service();
  assert.deepEqual(plain(await api.getUserSettings()), plain(schema.defaultUserSettings));
  assert.deepEqual(api.calls, ['query', ['user_id', 'owner']]);
});

test('updates use authenticated owner and preserve omitted fields in the upsert payload', async () => {
  const data = { ...schema.defaultUserSettings, default_jlpt: 'N1' };
  const api = service({ data });
  assert.equal(await api.updateUserSettings({ default_jlpt: 'N1' }), data);
  assert.deepEqual(api.calls[1], {
    row: { default_jlpt: 'N1', user_id: 'owner' },
    options: { onConflict: 'user_id', defaultToNull: false },
  });
});

test('unauthenticated requests never reach the database', async () => {
  const api = service({ user: null });
  await assert.rejects(api.getUserSettings(), { status: 401 });
  await assert.rejects(api.updateUserSettings({ default_jlpt: 'N1' }), { status: 401 });
  assert.deepEqual(api.calls, []);
});

test('validation errors never write and database errors are not replaced with defaults', async () => {
  const api = service();
  await assert.rejects(api.updateUserSettings({ user_id: 'other' }), { status: 400 });
  assert.deepEqual(api.calls, []);
  await assert.rejects(service({ error: { code: 'PGRST205' } }).getUserSettings(), { status: 503 });
  await assert.rejects(service({ error: { code: '42501' } }).getUserSettings(), { status: 500 });
});

test('routes handle invalid JSON, content types, origin rejection, and service failures', async () => {
  const api = service();
  const route = load('src/app/api/settings/route.ts', {
    '@/lib/auth-http': {
      json: (body, status = 200) => Response.json(body, { status }),
      checkRequest: request => request.headers.get('origin') === 'http://localhost'
        ? null : Response.json({}, { status: 403 }),
    },
    '@/lib/user-settings-server': api,
  });
  const request = (body, contentType = 'application/json', origin = 'http://localhost') =>
    new Request('http://localhost/api/settings', {
      method: 'PATCH', headers: { 'content-type': contentType, origin }, body,
    });
  assert.equal((await route.PATCH(request('{'))).status, 400);
  assert.equal((await route.PATCH(request('{}', 'text/plain'))).status, 415);
  assert.equal((await route.PATCH(request('{}', 'application/json', 'https://other.test'))).status, 403);
  assert.equal((await route.PATCH(request('{}'))).status, 400);
  assert.equal((await route.GET()).status, 200);
  api.getUserSettings = async () => { throw new Error('private database details'); };
  const failed = await route.GET();
  assert.equal(failed.status, 503);
  assert.doesNotMatch(await failed.text(), /private database/);
});
