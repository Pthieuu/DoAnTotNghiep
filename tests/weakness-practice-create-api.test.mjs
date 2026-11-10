import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  load, loadGeneration, plain, sourceId, userId, sourceSession, answers, questions, cvSchema, rubric,
} from './helpers/weakness-practice-fixtures.mjs';

const defaultBody = { selectedCriteria: ['C02', 'C01'], idempotencyKey: 'practice-request-1' };

function fixture(options = {}) {
  const state = { sessions: [], generated: [], calls: [] };
  if (options.existing) state.sessions.push(options.existing);
  const source = options.source === undefined ? sourceSession() : options.source;
  const generation = loadGeneration(async input => {
    state.generated.push(plain(input));
    if (options.generate) await options.generate();
    if (options.aiError) throw new Error('AI unavailable');
    return questions();
  });
  const client = {
    auth: { getUser: async () => ({ data: { user: options.anonymous ? null : { id: userId } }, error: options.authError ?? null }) },
    from(table) {
      const call = { table, filters: {} };
      state.calls.push(call);
      let payload;
      const builder = {
        select(columns) { call.columns = columns; return builder; },
        eq(key, value) { call.filters[key] = value; return builder; },
        insert(value) { payload = plain(value); return builder; },
        async maybeSingle() {
          if ('practice_idempotency_key' in call.filters) {
            return { data: state.sessions.find(session => session.user_id === call.filters.user_id
              && session.practice_idempotency_key === call.filters.practice_idempotency_key) ?? null,
            error: options.lookupError ?? null };
          }
          return { data: source && source.id === call.filters.id && source.user_id === call.filters.user_id ? source : null,
            error: options.sourceError ?? null };
        },
        async order() {
          const rows = (options.answers ?? answers()).map(answer => ({
            question_index: answer.questionIndex, answer: answer.answer, rubric_json: answer.rubric,
          }));
          return { data: rows, error: options.answersError ?? null };
        },
        async single() {
          if (options.insertError) return { data: null, error: options.insertError };
          if (state.sessions.some(session => session.user_id === payload.user_id
            && session.practice_idempotency_key === payload.practice_idempotency_key)) {
            return { data: null, error: { code: '23505' } };
          }
          const session = { ...payload, id: `created-${state.sessions.length + 1}` };
          state.sessions.push(session);
          return { data: session, error: null };
        },
      };
      return builder;
    },
  };
  const api = load('src/app/api/interviews/[id]/practice/route.ts', {
    '@/lib/supabase/server': { createClient: async () => client },
    '@/lib/auth-http': {
      checkRequest: request => request.headers.get('origin') === 'http://localhost' ? null : Response.json({ error: 'origin' }, { status: 403 }),
      json: (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } }),
    },
    '@/lib/cv-schema': cvSchema,
    '@/lib/interview-rubric': rubric,
    '@/lib/weakness-practice-generation': generation,
  }, { console: { error() {} } });
  return {
    state,
    post: (body = defaultBody, id = sourceId, origin = 'http://localhost') => api.POST(new Request(`http://localhost/api/interviews/${id}/practice`, {
      method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    }), { params: Promise.resolve({ id }) }),
    malformed: () => api.POST(new Request('http://localhost', {
      method: 'POST', headers: { origin: 'http://localhost' }, body: '{',
    }), { params: Promise.resolve({ id: sourceId }) }),
  };
}

test('creates and persists a complete practice session from server-owned source context', async () => {
  const instance = fixture();
  const response = await instance.post({ ...defaultBody, cvData: { fake: true }, level: 'N1', practice_context: { fake: true } });
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.reused, false);
  const saved = instance.state.sessions[0];
  const source = sourceSession();
  assert.equal(body.sessionId, saved.id);
  for (const field of ['title', 'level', 'target_role', 'company', 'job_description', 'cv_id', 'cv_snapshot', 'interview_type', 'interview_language']) {
    assert.deepEqual(plain(saved[field]), plain(source[field]));
  }
  assert.equal(saved.user_id, userId);
  assert.equal(saved.source_session_id, sourceId);
  assert.equal(saved.status, 'in_progress');
  assert.equal(saved.question_count, 4);
  assert.equal(saved.questions.length, 4);
  assert.deepEqual(saved.selected_criteria, ['C01', 'C02']);
  assert.equal(saved.practice_context.targets.length, 2);
  assert.equal(saved.practice_context.previousAnswers[0].answer, answers()[0].answer);
  assert.deepEqual(instance.state.calls[0].filters, { id: sourceId, user_id: userId });
  assert.ok(instance.state.calls.some(call => call.table === 'interview_answers' && call.filters.session_id === sourceId));
});

test('replays the same key and selection, including reordered criteria, without another AI call', async () => {
  const instance = fixture();
  const first = await (await instance.post()).json();
  const response = await instance.post({ ...defaultBody, selectedCriteria: ['C01', 'C02'] });
  assert.equal(response.status, 200);
  const replay = await response.json();
  assert.equal(replay.reused, true);
  assert.equal(replay.sessionId, first.sessionId);
  assert.equal(instance.state.generated.length, 1);
  assert.equal(instance.state.sessions.length, 1);
});

test('rejects the same key reused with different criteria or a different source', async () => {
  const instance = fixture();
  await instance.post();
  assert.equal((await instance.post({ ...defaultBody, selectedCriteria: ['C01'] })).status, 409);
  const other = fixture({ existing: {
    ...instance.state.sessions[0], source_session_id: '22222222-2222-4222-8222-222222222222',
  } });
  assert.equal((await other.post()).status, 409);
  assert.equal(other.state.generated.length, 0);
});

test('concurrent requests save one session and return the same session ID', async () => {
  let release;
  const ready = new Promise(resolve => { release = resolve; });
  let pending = 0;
  const instance = fixture({ generate: async () => { if (++pending === 2) release(); await ready; } });
  const responses = await Promise.all([instance.post(), instance.post()]);
  assert.deepEqual(responses.map(response => response.status).sort(), [200, 201]);
  const bodies = await Promise.all(responses.map(response => response.json()));
  assert.equal(bodies[0].sessionId, bodies[1].sessionId);
  assert.equal(instance.state.sessions.length, 1);
});

test('checks origin, authentication and ownership before reading source answers or generating', async () => {
  const origin = fixture();
  assert.equal((await origin.post(defaultBody, sourceId, 'https://other.example')).status, 403);
  assert.equal(origin.state.calls.length, 0);
  for (const options of [{ anonymous: true }, { authError: { message: 'expired' } }]) {
    const instance = fixture(options);
    assert.equal((await instance.post()).status, 401);
    assert.equal(instance.state.calls.length, 0);
  }
  for (const source of [null, sourceSession({ user_id: 'other-user' })]) {
    const instance = fixture({ source });
    assert.equal((await instance.post()).status, 404);
    assert.equal(instance.state.calls.length, 1);
    assert.equal(instance.state.generated.length, 0);
  }
});

test('rejects malformed JSON, IDs, criteria and idempotency keys', async () => {
  const instance = fixture();
  assert.equal((await instance.malformed()).status, 400);
  assert.equal((await instance.post(defaultBody, 'invalid')).status, 400);
  for (const body of [null, [], {}, ...[[], ['C99'], ['C01', 'C01'], ['C01', 1]].map(selectedCriteria => ({ ...defaultBody, selectedCriteria })),
    ...['', 'short', 'contains spaces', 'x'.repeat(129), null].map(idempotencyKey => ({ ...defaultBody, idempotencyKey }))]) {
    assert.equal((await instance.post(body)).status, 400);
  }
  assert.equal(instance.state.generated.length, 0);
  assert.equal(instance.state.sessions.length, 0);
});

test('rejects non-weak criteria, absent rubric, incomplete sessions and invalid source configuration', async () => {
  for (const options of [{ answers: [] }, { answers: [{ ...answers()[0], rubric: null }] }]) {
    const instance = fixture(options);
    assert.equal((await instance.post()).status, 400);
    assert.equal(instance.state.generated.length, 0);
  }
  const high = fixture();
  assert.equal((await high.post({ ...defaultBody, selectedCriteria: ['C03'] })).status, 400);
  for (const source of [sourceSession({ status: 'in_progress' }), sourceSession({ status: 'cancelled' }),
    sourceSession({ level: null }), sourceSession({ cv_snapshot: {} }), sourceSession({ interview_language: 'en' })]) {
    const instance = fixture({ source });
    assert.equal((await instance.post()).status, 409);
    assert.equal(instance.state.generated.length, 0);
  }
});

test('supports manual source sessions without a CV snapshot', async () => {
  const instance = fixture({ source: sourceSession({ cv_snapshot: null }) });
  assert.equal((await instance.post()).status, 201);
  assert.deepEqual(instance.state.sessions[0].cv_snapshot.skills, []);
});

test('AI failure creates no session and the same key can be retried', async () => {
  let attempt = 0;
  const instance = fixture({ generate: async () => { if (++attempt === 1) throw new Error('timeout'); } });
  assert.equal((await instance.post()).status, 503);
  assert.equal(instance.state.sessions.length, 0);
  assert.equal((await instance.post()).status, 201);
  assert.equal(instance.state.sessions.length, 1);
});

test('reports read and insert failures without leaving partial sessions', async () => {
  for (const options of [{ sourceError: { code: 'failed' } }, { lookupError: { code: 'failed' } },
    { answersError: { code: 'failed' } }, { insertError: { code: 'failed' } }, { insertError: { code: '23505' } }]) {
    const instance = fixture(options);
    assert.equal((await instance.post()).status, 500);
    assert.equal(instance.state.sessions.length, 0);
  }
});
