import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as jsxRuntime from 'react/jsx-runtime';
import { load, sourceId, userId, questions, plain } from './helpers/weakness-practice-fixtures.mjs';
import { componentHarness, nodes, content } from './helpers/component-harness.mjs';

function fixture(options = {}) {
  const state = { updates: [], reads: [] };
  const session = { id: sourceId, user_id: userId, status: 'in_progress', questions: questions(), ...options.session };
  const rows = options.rows ?? [{ question_index: 0, answer: 'Câu trả lời đã lưu.' }];
  const api = load('src/app/api/interviews/[id]/finish/route.ts', {
    '@/lib/auth-http': {
      checkRequest: request => request.headers.get('origin') === 'http://localhost' ? null : Response.json({ error: 'origin' }, { status: 403 }),
      json: (body, status = 200) => Response.json(body, { status }),
    },
    '@/lib/supabase/server': { createClient: async () => ({
      auth: { getUser: async () => ({ data: { user: options.anonymous ? null : { id: userId } }, error: null }) },
      from: table => {
        const filters = {};
        let update;
        const builder = {
          select: () => builder,
          eq: (key, value) => { filters[key] = value; return builder; },
          update: value => { update = value; return builder; },
          maybeSingle: async () => {
            state.reads.push({ table, filters: { ...filters } });
            if (update) {
              if (options.updateError) return { data: null, error: { code: 'failed' } };
              if (options.race) { session.status = options.race; return { data: null, error: null }; }
              state.updates.push({ value: plain(update), filters: { ...filters } });
              Object.assign(session, update);
            }
            return { data: session.id === filters.id && session.user_id === filters.user_id ? session : null,
              error: options.sessionError ? { code: 'failed' } : null };
          },
          order: async () => ({ data: rows, error: options.answersError ? { code: 'failed' } : null }),
        };
        return builder;
      },
    }) },
  }, { console: { error() {} } });
  return { state, session, post: (id = sourceId, origin = 'http://localhost') => api.POST(new Request(`http://localhost/api/interviews/${id}/finish`, {
    method: 'POST', headers: { origin },
  }), { params: Promise.resolve({ id }) }) };
}

test('finishes an owned session using persisted answers and timestamps without changing planned questions', async () => {
  const instance = fixture();
  const response = await instance.post();
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { completed: true, sessionId: sourceId, answeredCount: 1, plannedCount: 4 });
  assert.equal(instance.session.status, 'completed');
  assert.ok(!Number.isNaN(Date.parse(instance.session.completed_at)));
  assert.equal(instance.session.completed_at, instance.session.updated_at);
  assert.equal(instance.session.summary_json, null);
  assert.equal(instance.session.questions.length, 4);
  assert.deepEqual(instance.state.updates[0].filters, { id: sourceId, user_id: userId, status: 'in_progress' });
});

test('retrying a completed finish succeeds without clearing saved results or rewriting timestamps', async () => {
  const instance = fixture();
  await instance.post();
  instance.session.summary_json = { totalScore: 50 };
  const completedAt = instance.session.completed_at;
  assert.equal((await instance.post()).status, 200);
  assert.equal(instance.state.updates.length, 1);
  assert.equal(instance.session.completed_at, completedAt);
  assert.deepEqual(instance.session.summary_json, { totalScore: 50 });
});

test('rejects invalid IDs, cross-origin requests, signed-out users and other-user sessions', async () => {
  assert.equal((await fixture().post('invalid')).status, 400);
  assert.equal((await fixture().post(sourceId, 'http://other.example')).status, 403);
  assert.equal((await fixture({ anonymous: true }).post()).status, 401);
  const other = fixture({ session: { user_id: 'other-user' } });
  assert.equal((await other.post()).status, 404);
  assert.equal(other.state.updates.length, 0);
});

test('does not complete sessions without saved answers, with invalid answers, or already cancelled', async () => {
  for (const options of [{ rows: [] }, { rows: [{ question_index: 8, answer: 'Answer' }] },
    { rows: [{ question_index: 0, answer: ' ' }] }, { session: { status: 'cancelled' } },
    { rows: [{ question_index: 0, answer: 'A' }, { question_index: 0, answer: 'A' }] }]) {
    const instance = fixture(options);
    assert.equal((await instance.post()).status, 409);
    assert.equal(instance.state.updates.length, 0);
  }
});

test('database errors cannot produce a successful finish and concurrent completion can be retried', async () => {
  for (const options of [{ updateError: true }, { sessionError: true }, { answersError: true }]) {
    assert.equal((await fixture(options).post()).status, 500);
  }
  assert.equal((await fixture({ race: 'completed' }).post()).status, 200);
  assert.equal((await fixture({ race: 'cancelled' }).post()).status, 409);
});

function room(fetch) {
  const harness = componentHarness();
  const navigation = [];
  const { default: Room } = load('src/app/interview-room/client-page.tsx', {
    react: { ...harness.hooks, useCallback: callback => callback }, 'react/jsx-runtime': jsxRuntime,
    'next/navigation': { useRouter: () => ({ push: url => navigation.push(url) }) },
    'next/link': { __esModule: true, default: () => null },
    '@/components/icon': { __esModule: true, default: () => null },
    '@/components/vrm-avatar': { __esModule: true, default: () => null },
    '@/components/rubric-details': { __esModule: true, default: () => null },
    '@/components/weakness-practice-goals': { __esModule: true, default: () => null },
    '@/hooks/useGeminiLiveInterview': { useGeminiLiveInterview: () => ({
      state: 'idle', candidateTranscript: 'Câu chưa gửi', interviewerTranscript: '', stop() {},
    }) },
  }, { fetch, setTimeout, clearTimeout });
  harness.mount(Room, { session: {
    id: sourceId, title: 'Engineer', total: 4, currentQuestion: questions()[1], completed: false,
    turns: [{ question: questions()[0], answer: 'Saved' }],
  } });
  nodes(harness.tree, node => typeof node.props?.onExit === 'function')[0].props.onExit();
  harness.render();
  return { harness, navigation, finish: () => nodes(harness.tree, node => node.type === 'button' && /Kết thúc sớm|Đang kết thúc phiên/.test(content(node)))[0] };
}

test('room waits for successful backend completion and blocks duplicate finish clicks before navigation', async () => {
  let resolve;
  let calls = 0;
  const pending = new Promise(done => { resolve = done; });
  const instance = room(async (url, init) => {
    calls++;
    assert.equal(url, `/api/interviews/${sourceId}/finish`);
    assert.equal(init.method, 'POST');
    return pending;
  });
  try {
    const finish = instance.finish();
    finish.props.onClick();
    finish.props.onClick();
    instance.harness.render();
    assert.equal(calls, 1);
    assert.equal(instance.finish().props.disabled, true);
    assert.equal(instance.navigation.length, 0);
    resolve(Response.json({ completed: true }));
    await instance.harness.settle();
    assert.deepEqual(instance.navigation, [`/summary?sessionId=${sourceId}`]);
  } finally { instance.harness.unmount(); }
});

test('room stays open on finish errors and allows retrying without losing saved turns', async () => {
  let calls = 0;
  const instance = room(async () => ++calls === 1 ? Response.json({ error: 'Finish failed' }, { status: 500 }) : Response.json({ completed: true }));
  try {
    instance.finish().props.onClick();
    await instance.harness.settle();
    assert.equal(instance.navigation.length, 0);
    assert.match(content(instance.harness.tree), /Finish failed/);
    assert.match(content(instance.harness.tree), /1\s*\/\s*4\s+câu đã gửi/);
    instance.finish().props.onClick();
    await instance.harness.settle();
    assert.equal(instance.navigation.length, 1);
  } finally { instance.harness.unmount(); }
});

test('summary displays the answered scope for early completion while ordinary summaries remain unchanged', () => {
  for (const partial of [true, false]) {
    const harness = componentHarness();
    const { default: Summary } = load('src/app/summary/client-page.tsx', {
      react: harness.hooks, 'react/jsx-runtime': jsxRuntime,
      'next/link': { __esModule: true, default: () => null },
      '@/components/icon': { __esModule: true, default: () => null },
      '@/components/weakness-practice-panel': { __esModule: true, default: () => null },
      '@/components/weakness-practice-progress': { __esModule: true, default: () => null },
    }, { AbortController });
    harness.mount(Summary, {
      sessionId: sourceId, title: 'Engineer', status: 'completed', initialSummary: {
        totalScore: 75, grade: partial ? 'Chưa xếp loại' : 'B', provisional: partial,
        strengths: [], weaknesses: [], improvementTips: [],
        ...(partial ? { completionScope: { answeredCount: 2, plannedCount: 4, questionNumbers: [1, 2] } } : {}),
      },
    });
    const scope = nodes(harness.tree, node => node.props?.['aria-label'] === 'Phạm vi tổng kết');
    assert.equal(scope.length, partial ? 1 : 0);
    if (partial) {
      assert.match(content(scope[0]), /2\s*\/\s*4\s+câu/);
      assert.match(content(scope[0]), /không bị tính 0 điểm/);
    }
    harness.unmount();
  }
});
