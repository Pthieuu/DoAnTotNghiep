import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers/weakness-practice-fixtures.mjs';
const schema = load('src/lib/user-settings.ts');
function route({ user = { id: 'owner' }, storageError = null, databaseError = null } = {}) {
  const calls = [];
  let reads = 0;
  const query = {
    select: () => query, eq: (...args) => { calls.push(args); return query; }, order: () => query,
    limit: async () => ({ data: reads++ ? [] : [{ id: 'cv', file_path: 'owner/file' }], error: null }),
    delete: () => { calls.push('delete'); return query; },
    in: async () => ({ error: databaseError }),
  };
  return { calls, ...load('src/app/api/settings/data/route.ts', {
    '@/lib/auth-http': { json: (body, status = 200) => Response.json(body, { status }),
      checkRequest: request => request.headers.get('origin') === 'http://localhost' ? null : Response.json({}, { status: 403 }) },
    '@/lib/supabase/server': { createClient: async () => ({
      auth: { getUser: async () => ({ data: { user }, error: null }) },
      rpc: async name => { calls.push(name); return { error: databaseError }; },
      from: () => query,
      storage: { from: () => ({ remove: async paths => { calls.push([...paths]); return { error: storageError }; } }) },
    }) },
  }) };
}
const request = (body, origin = 'http://localhost') => new Request('http://localhost/api/settings/data', {
  method: 'DELETE', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});
test('destructive API requires confirmation, same origin and authenticated account', async () => {
  const api = route();
  assert.equal((await api.DELETE(request({ target: 'history' }))).status, 400);
  assert.equal((await api.DELETE(request({ target: 'history', confirmation: 'XÓA', user_id: 'victim' }))).status, 400);
  assert.equal((await api.DELETE(request({ target: 'history', confirmation: 'XÓA' }, 'https://other.test'))).status, 403);
  assert.equal((await route({ user: null }).DELETE(request({ target: 'history', confirmation: 'XÓA' }))).status, 401);
  assert.deepEqual(api.calls, []);
});
test('history deletion uses authenticated transaction RPC and propagates errors', async () => {
  const api = route();
  assert.equal((await api.DELETE(request({ target: 'history', confirmation: 'XÓA' }))).status, 200);
  assert.deepEqual(api.calls, ['delete_own_interview_history']);
  assert.equal((await route({ databaseError: {} }).DELETE(request({ target: 'history', confirmation: 'XÓA' }))).status, 500);
});
test('CV deletion removes storage before metadata and scopes every query to owner', async () => {
  const api = route();
  assert.equal((await api.DELETE(request({ target: 'cvs', confirmation: 'XÓA' }))).status, 200);
  assert.deepEqual(api.calls, [['user_id', 'owner'], ['owner/file'], 'delete', ['user_id', 'owner'], ['user_id', 'owner']]);
});
test('failed storage deletion retains metadata for retry', async () => {
  const api = route({ storageError: {} });
  assert.equal((await api.DELETE(request({ target: 'cvs', confirmation: 'XÓA' }))).status, 500);
  assert.equal(api.calls.includes('delete'), false);
});
test('email reminder values are strictly validated', () => {
  assert.equal(schema.isUserSettingsUpdate({ email_reminders: false, reminder_frequency: 'daily' }), true);
  assert.equal(schema.isUserSettingsUpdate({ email_reminders: 'yes' }), false);
  assert.equal(schema.isUserSettingsUpdate({ reminder_frequency: 'hourly' }), false);
});
