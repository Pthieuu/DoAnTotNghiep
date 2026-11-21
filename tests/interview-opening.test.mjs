import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers/weakness-practice-fixtures.mjs';
const opening = load('src/lib/interview-opening.ts');
test('only unanswered active sessions with no saved introduction start with opening', () => {
  assert.equal(opening.needsIntroduction('in_progress', 0, null), true);
  assert.equal(opening.needsIntroduction('in_progress', 0, 'Hello'), false);
  assert.equal(opening.needsIntroduction('in_progress', 1, null), false);
  assert.equal(opening.needsIntroduction('completed', 0, null), false);
});
test('fixed opening identifies AI Hiro and invites self introduction in selected language', () => {
  assert.match(opening.interviewOpening('ja').text, /AIのヒロ/);
  assert.match(opening.interviewOpening('ja').text, /自己紹介/);
  assert.match(opening.interviewOpening('vi').text, /Hiro/);
  assert.match(opening.interviewOpening('vi').text, /giới thiệu/);
});

function fixture(options = {}) {
  const state = { writes: [], calls: [], session: { id: 'session', status: 'in_progress', self_introduction: null, ...options.session } };
  const client = {
    auth: { getUser: async () => ({ data: { user: options.anonymous ? null : { id: 'owner' } } }) },
    from(table) {
      const filters = {};
      let update;
      const builder = {
        select: () => builder, eq: (key, value) => { filters[key] = value; return builder; },
        is: (key, value) => { filters[key] = value; return builder; },
        update: value => { update = value; return builder; },
        limit: async () => ({ data: options.answers || [], error: options.answersError ? {} : null }),
        order: async () => ({ data: options.answers || [], error: null }),
        maybeSingle: async () => {
          state.calls.push({ table, filters });
          if (options.otherOwner) return { data: null, error: null };
          if (options.dbError) return { data: null, error: {} };
          if (update) {
            if (options.saveError) return { data: null, error: {} };
            if (options.race) return { data: null, error: null };
            state.writes.push({ ...update });
            Object.assign(state.session, update);
          }
          return { data: state.session, error: null };
        },
      };
      return builder;
    },
  };
  const dependencies = {
    '@/lib/supabase/server': { createClient: async () => client },
    '@/lib/auth-http': { checkRequest: () => null, json: (body, status = 200) => Response.json(body, { status }) },
    '@/lib/interview-opening': opening,
  };
  const api = load('src/app/api/interviews/[id]/introduction/route.ts', dependencies);
  return { state, dependencies, post: answer => api.POST(new Request('http://localhost', { method: 'POST', body: JSON.stringify({ answer }) }), { params: Promise.resolve({ id: 'session' }) }) };
}
test('introduction saves separately without scoring and retries do not overwrite it', async () => {
  const f = fixture();
  assert.equal((await f.post('  Hello  ')).status, 200);
  assert.equal(f.state.writes[0].self_introduction, 'Hello');
  assert.equal((await f.post('Hello')).status, 200);
  assert.equal((await f.post('Different')).status, 409);
  assert.equal(f.state.writes.length, 1);
  assert.ok(f.state.calls.every(call => call.table === 'interview_sessions' && call.filters.user_id === 'owner'));
  assert.equal(f.state.writes[0].score, undefined);
});
test('invalid, unauthorized, resumed and failed writes never advance opening', async () => {
  for (const answer of ['', ' ', 'x'.repeat(10001), null]) assert.equal((await fixture().post(answer)).status, 400);
  for (const [options, status] of [[{ anonymous: true }, 401], [{ otherOwner: true }, 404], [{ session: { status: 'completed' } }, 409], [{ answers: [{ question_index: 0 }] }, 409], [{ saveError: true }, 500], [{ dbError: true }, 500], [{ answersError: true }, 500], [{ race: true }, 409]]) {
    const f = fixture(options);
    assert.equal((await f.post('Hello')).status, status);
    assert.equal(f.state.writes.length, 0);
  }
});
test('live token uses server opening, rejects premature question and thanks after saved introduction', async () => {
  for (const introduced of [false, true]) {
    const f = fixture({ session: { title: 'Engineer', interview_language: 'ja', questions: [{ text: 'First question' }], self_introduction: introduced ? 'Hello' : null } });
    const requests = [];
    const api = load('src/app/api/interviews/[id]/live-token/route.ts', f.dependencies, {
      process: { env: { GEMINI_API_KEY: 'test' } }, console,
      fetch: async (_url, init) => { requests.push(JSON.parse(init.body)); return Response.json({ name: 'token' }); },
    });
    const call = text => api.POST(new Request('http://localhost', { method: 'POST', body: JSON.stringify({ questionIndex: 0, questionText: text }) }), { params: Promise.resolve({ id: 'session' }) });
    const current = introduced ? 'First question' : opening.interviewOpening('ja').text;
    assert.equal((await call(introduced ? opening.interviewOpening('ja').text : 'First question')).status, 409);
    const response = await call(current);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.opening, !introduced);
    assert.equal(body.questionIndex, 0);
    assert.equal(body.questionText, current);
    assert.ok(body.spokenText.includes(introduced ? '自己紹介ありがとうございます' : 'AIのヒロ'));
    assert.ok(!JSON.stringify(requests).includes('self_introduction'));
    assert.equal(requests.length, 1);
  }
});
