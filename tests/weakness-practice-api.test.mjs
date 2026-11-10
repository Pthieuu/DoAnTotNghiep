import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(file, dependencies = {}, globals = {}) {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, ...globals, require: name => {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
    return dependencies[name];
  } });
  return exports;
}

const rubric = load('src/lib/interview-rubric.ts');
const practice = load('src/lib/weakness-practice.ts', { './interview-rubric': rubric });
const id = '11111111-1111-4111-8111-111111111111';
const userId = 'user-1';
const question = '経験を教えてください。';
const answerText = 'チームで開発しました。';

function answerRow(index = 0, criteria = [{ id: 'C01', status: 'scored', level: 2, evidence: answerText, reason: 'Cần nêu rõ ý chính.' }]) {
  return { question_index: index, answer: answerText, rubric_json: {
    version: rubric.RUBRIC_VERSION, criteria, practice: 'Trả lời trực tiếp câu hỏi.',
  } };
}

function fixture(options = {}) {
  const calls = [];
  const session = options.session === undefined
    ? { id, user_id: userId, status: 'completed', questions: [{ text: question }] }
    : options.session;
  const client = {
    auth: { getUser: async () => ({ data: { user: options.anonymous ? null : { id: userId } }, error: options.authError ?? null }) },
    from(table) {
      const call = { table, filters: {} };
      calls.push(call);
      const builder = {
        select(columns) { call.columns = columns; return builder; },
        eq(key, value) { call.filters[key] = value; return builder; },
        async maybeSingle() {
          return {
            data: session && session.id === call.filters.id && session.user_id === call.filters.user_id ? session : null,
            error: options.sessionError ?? null,
          };
        },
        async order(key, order) {
          call.order = { key, ...order };
          return { data: options.rows === undefined ? [answerRow()] : options.rows, error: options.answersError ?? null };
        },
      };
      return builder;
    },
  };
  const api = load('src/app/api/interviews/[id]/weaknesses/route.ts', {
    '@/lib/supabase/server': { createClient: async () => {
      if (options.throwClient) throw new Error('Database unavailable');
      return client;
    } },
    '@/lib/auth-http': { json: (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } }) },
    '@/lib/weakness-practice': practice,
  }, { console: { error() {} } });
  return { calls, get: (sessionId = id) => api.GET(new Request(`http://localhost/api/interviews/${sessionId}/weaknesses`), {
    params: Promise.resolve({ id: sessionId }),
  }) };
}

test('returns structured weaknesses from persisted rubric with ownership and session filters', async () => {
  const instance = fixture();
  const response = await instance.get();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  const body = await response.json();
  assert.equal(body.sessionId, id);
  assert.equal(body.weaknesses[0].criterionId, 'C01');
  assert.equal(body.weaknesses[0].sources[0].question, question);
  assert.equal(body.weaknesses[0].sources[0].level, 2);
  assert.deepEqual(instance.calls[0].filters, { id, user_id: userId });
  assert.deepEqual(instance.calls[1].filters, { session_id: id });
  assert.deepEqual(instance.calls[1].order, { key: 'question_index', ascending: true });
});

test('rejects unauthenticated requests and authentication errors before querying sessions', async () => {
  for (const options of [{ anonymous: true }, { authError: { message: 'expired' } }]) {
    const instance = fixture(options);
    assert.equal((await instance.get()).status, 401);
    assert.equal(instance.calls.length, 0);
  }
});

test('rejects malformed session IDs without a database query', async () => {
  const instance = fixture();
  assert.equal((await instance.get('invalid')).status, 400);
  assert.equal(instance.calls.length, 0);
});

test('missing and other-user sessions both return 404 without reading answers', async () => {
  for (const session of [null, { id, user_id: 'other-user', status: 'completed' }]) {
    const instance = fixture({ session });
    assert.equal((await instance.get()).status, 404);
    assert.equal(instance.calls.length, 1);
  }
});

test('requires a completed session before reading answers', async () => {
  for (const status of ['in_progress', 'cancelled']) {
    const instance = fixture({ session: { id, user_id: userId, status } });
    assert.equal((await instance.get()).status, 409);
    assert.equal(instance.calls.length, 1);
  }
});

test('groups low criteria and excludes high, unassessed, empty and legacy answers', async () => {
  const criteria = rubric.CRITERIA.map(({ id }, index) => ({
    id, status: index === 3 ? 'insufficient_data' : index === 4 ? 'not_applicable' : 'scored',
    level: index === 2 ? 4 : index >= 3 ? null : index,
    evidence: answerText, reason: 'Cần cải thiện.',
  }));
  const rows = [answerRow(0, criteria), answerRow(1),
    { ...answerRow(2), answer: null }, { ...answerRow(3), rubric_json: null },
    { ...answerRow(4), rubric_json: {} }, answerRow(99),
    { ...answerRow(5), answer: '  ' }];
  const instance = fixture({ rows, session: {
    id, user_id: userId, status: 'completed', questions: Array.from({ length: 6 }, () => ({ text: question })),
  } });
  const body = await (await instance.get()).json();
  assert.deepEqual(body.weaknesses.map(target => target.criterionId), ['C01', 'C02']);
  assert.deepEqual(body.weaknesses[0].sources.map(source => source.questionIndex), [0, 1]);
});

test('returns an empty list for absent answers, missing questions and malformed question entries', async () => {
  for (const options of [{ rows: [] }, { rows: null }, ...[null, [], [null], [{}], [{ text: 4 }]].map(questions => ({
    session: { id, user_id: userId, status: 'completed', questions },
  }))]) {
    const response = await fixture(options).get();
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).weaknesses, []);
  }
});

test('reports database failures instead of returning an empty success response', async () => {
  for (const options of [{ sessionError: { message: 'failed' } }, { answersError: { message: 'failed' } }]) {
    const response = await fixture(options).get();
    assert.equal(response.status, 500);
    assert.ok((await response.json()).error);
  }
  assert.equal((await fixture({ throwClient: true }).get()).status, 503);
});
