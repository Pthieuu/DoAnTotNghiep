import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load, plain, practice, rubric, sourceId, userId, sourceSession, answers, questions, sessionQuery } from './helpers/weakness-practice-fixtures.mjs';

const progressModule = load('src/lib/weakness-practice-progress.ts', { './interview-rubric': rubric });
const practiceId = '22222222-2222-4222-8222-222222222222';
const summary = { totalScore: 75, grade: 'B', provisional: false, strengths: ['Có ví dụ.'], weaknesses: [], improvementTips: ['Luyện tiếp.'] };

function rows(level, count) {
  return Array.from({ length: count }, (_, question_index) => {
    const answer = answers()[0];
    return { question_index, answer: answer.answer, score: 7.5, feedback: 'Feedback', rubric_json: {
      ...answer.rubric, criteria: answer.rubric.criteria.map(criterion => ({ ...criterion, level })),
    } };
  });
}

function fixture(options = {}) {
  const state = { calls: [], generated: [], updates: [] };
  const current = sourceSession({ id: practiceId, question_count: 4, questions: questions(), summary_json: options.cached ?? null,
    source_session_id: options.normal ? null : sourceId, selected_criteria: options.normal ? [] : ['C01', 'C02'], ...options.current,
  });
  const source = options.source === null ? null : sourceSession({ questions: questions().slice(0, 2), ...options.source });
  const currentRows = options.currentRows ?? rows(3, 4);
  const sourceRows = options.sourceRows ?? rows(1, 2);
  const api = load('src/app/api/interviews/[id]/summary/route.ts', {
    '@/lib/auth-http': { checkRequest: () => null, json: (body, status = 200) => Response.json(body, { status }) },
    '@/lib/weakness-practice': practice,
    '@/lib/interview-session-query': sessionQuery,
    '@/lib/weakness-practice-progress': progressModule,
    '@/lib/interview-summary': { generateSummary: async input => {
      state.generated.push(plain(input));
      if (options.aiError) throw new Error('AI failed');
      return plain(summary);
    } },
    '@/lib/supabase/server': { createClient: async () => ({
      auth: { getUser: async () => ({ data: { user: options.anonymous ? null : { id: userId } } }) },
      from: table => {
        const call = { table, filters: {} };
        state.calls.push(call);
        let update;
        const builder = {
          select: columns => { call.columns = columns; return builder; },
          eq: (key, value) => { call.filters[key] = value; return builder; },
          update: value => { update = value; return builder; },
          maybeSingle: async () => {
            if (options.missingPracticeColumns && call.columns.includes('source_session_id')) {
              return { data: null, error: { code: '42703', message: 'column interview_sessions.source_session_id does not exist' } };
            }
            const session = call.filters.id === practiceId ? current : source;
            return {
              data: session && session.user_id === call.filters.user_id ? session : null,
              error: call.filters.id === sourceId ? options.sourceError ?? null : null,
            };
          },
          order: async () => ({
            data: call.filters.session_id === practiceId ? currentRows : sourceRows,
            error: call.filters.session_id === sourceId ? options.sourceAnswersError ?? null : null,
          }),
          then: (resolve, reject) => {
            if (!options.saveError) state.updates.push({ value: plain(update), filters: { ...call.filters } });
            return Promise.resolve({ error: options.saveError ?? null }).then(resolve, reject);
          },
        };
        return builder;
      },
    }) },
  }, { console: { error() {} } });
  return { state, post: () => api.POST(new Request(`http://localhost/api/interviews/${practiceId}/summary`, { method: 'POST' }), {
    params: Promise.resolve({ id: practiceId }),
  }) };
}

test('practice summary saves backend progress while preserving normal full-rubric summary scores', async () => {
  const instance = fixture();
  const response = await instance.post();
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.summary.totalScore, summary.totalScore);
  assert.equal(body.summary.grade, summary.grade);
  const progress = body.summary.practiceProgress;
  assert.equal(progress.sourceSessionId, sourceId);
  assert.deepEqual(progress.criteria.map(criterion => criterion.delta), [2, 2]);
  assert.equal(progress.criteria[0].source.assessedAnswers, 2);
  assert.equal(progress.criteria[0].practice.assessedAnswers, 4);
  assert.match(progress.comparisonNote, /hai bộ câu hỏi khác nhau/);
  assert.equal(instance.state.generated[0].answers[0].rubric.criteria.length, 5);
  assert.deepEqual(instance.state.updates[0].filters, { id: practiceId, user_id: userId });
  assert.deepEqual(instance.state.updates[0].value.summary_json.practiceProgress, progress);
  assert.equal(instance.state.updates[0].value.score, 75);
});

test('cached practice summaries get fresh comparisons without regenerating AI comments', async () => {
  const instance = fixture({ cached: { ...summary, practiceProgress: { stale: true } }, sourceRows: rows(2, 2) });
  const body = await (await instance.post()).json();
  assert.equal(instance.state.generated.length, 0);
  assert.equal(body.summary.practiceProgress.criteria[0].delta, 1);
  assert.equal(body.summary.practiceProgress.stale, undefined);
  assert.equal(body.summary.totalScore, 75);
});

test('cached ordinary summaries keep the original response and avoid extra reads or writes', async () => {
  const instance = fixture({ normal: true, cached: summary });
  assert.deepEqual((await (await instance.post()).json()).summary, summary);
  assert.equal(instance.state.calls.length, 1);
  assert.equal(instance.state.generated.length, 0);
  assert.equal(instance.state.updates.length, 0);
});

test('ordinary uncached sessions still generate their standard summary without practice progress', async () => {
  const instance = fixture({ normal: true });
  assert.deepEqual((await (await instance.post()).json()).summary, summary);
  assert.equal(instance.state.generated.length, 1);
  assert.ok(!instance.state.calls.some(call => call.filters.id === sourceId));
});

test('early completion summarizes only persisted answers and records the original scope without assigning zeros', async () => {
  const instance = fixture({ normal: true, currentRows: rows(3, 2) });
  const response = await instance.post();
  assert.equal(response.status, 200);
  const result = (await response.json()).summary;
  assert.deepEqual(result.completionScope, { answeredCount: 2, plannedCount: 4, questionNumbers: [1, 2] });
  assert.equal(result.provisional, true);
  assert.equal(result.grade, 'Chưa xếp loại');
  assert.equal(instance.state.generated[0].answers.length, 2);
  assert.equal(instance.state.generated[0].totalQuestions, 4);
  assert.deepEqual(instance.state.generated[0].answers.map(answer => answer.questionNumber), [1, 2]);
  assert.equal(instance.state.updates[0].value.score, null);
});

test('ordinary summaries still load and generate when practice migrations are absent', async () => {
  for (const cached of [summary, null]) {
    const instance = fixture({ normal: true, cached, missingPracticeColumns: true });
    const response = await instance.post();
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).summary, summary);
    assert.equal(instance.state.generated.length, cached ? 0 : 1);
    assert.ok(instance.state.calls[0].columns.includes('source_session_id'));
    assert.ok(!instance.state.calls[1].columns.includes('source_session_id'));
    assert.deepEqual(instance.state.calls[1].filters, { id: practiceId, user_id: userId });
  }
});

test('source ownership is checked before source answers are read, including cached practice summaries', async () => {
  for (const source of [null, { user_id: 'other-user' }]) {
    const instance = fixture({ source, cached: summary });
    assert.equal((await instance.post()).status, 404);
    assert.ok(instance.state.calls.some(call => call.filters.id === sourceId && call.filters.user_id === userId));
    assert.ok(!instance.state.calls.some(call => call.filters.session_id === sourceId));
    assert.equal(instance.state.updates.length, 0);
  }
});

test('missing or mismatched rubric data yields null deltas rather than legacy score comparisons', async () => {
  const old = rows(1, 2);
  old[0].rubric_json.version = '1.0';
  const mismatch = fixture({ sourceRows: old });
  const oldResult = (await (await mismatch.post()).json()).summary.practiceProgress.criteria[0];
  assert.equal(oldResult.delta, null);
  assert.equal(oldResult.reason, 'rubric_version_mismatch');
  const legacy = fixture({ sourceRows: rows(1, 2).map(row => ({ ...row, rubric_json: null, score: 0 })) });
  const missingResult = (await (await legacy.post()).json()).summary.practiceProgress.criteria[0];
  assert.equal(missingResult.source.averageLevel, null);
  assert.equal(missingResult.delta, null);
});

test('different assessment configurations prevent comparison', async () => {
  for (const source of [{ interview_language: 'vi' }, { level: 'N1' }, { target_role: 'Designer' }, { interview_type: 'technical' }, { job_description: 'Different JD' }]) {
    const instance = fixture({ source });
    const progress = (await (await instance.post()).json()).summary.practiceProgress;
    assert.ok(progress.criteria.every(criterion => criterion.delta === null && criterion.reason === 'scope_mismatch'));
  }
});

test('authentication, incomplete sessions and invalid practice metadata block summary work', async () => {
  const anonymous = fixture({ anonymous: true });
  assert.equal((await anonymous.post()).status, 401);
  assert.equal(anonymous.state.calls.length, 0);
  const incomplete = fixture({ current: { status: 'in_progress' }, cached: summary });
  assert.equal((await incomplete.post()).status, 400);
  const invalid = fixture({ current: { selected_criteria: ['C99'] } });
  assert.equal((await invalid.post()).status, 409);
  assert.equal(invalid.state.generated.length, 0);
});

test('read, AI and save errors never return successful comparisons', async () => {
  for (const options of [{ sourceError: { message: 'failed' } }, { sourceAnswersError: { message: 'failed' } },
    { aiError: true }, { saveError: { message: 'failed' } }]) {
    const instance = fixture(options);
    assert.equal((await instance.post()).status, 500);
    assert.equal(instance.state.updates.length, 0);
  }
  assert.equal((await fixture({ currentRows: [] }).post()).status, 400);
});
