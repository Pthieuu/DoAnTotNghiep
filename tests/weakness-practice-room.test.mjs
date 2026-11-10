import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as jsxRuntime from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { load, plain, practice, rubric, sourceId, userId, sourceSession, answers, questions, sessionQuery } from './helpers/weakness-practice-fixtures.mjs';

const practiceMetadata = { sourceSessionId: sourceId, selectedCriteria: ['C01', 'C02'] };

test('practice goals render selected criterion names and a link to the source summary', () => {
  const { default: Goals } = load('src/components/weakness-practice-goals.tsx', {
    'react/jsx-runtime': jsxRuntime, 'next/link': { __esModule: true, default: props => jsxRuntime.jsx('a', props) }, '@/lib/interview-rubric': rubric,
  });
  const html = renderToStaticMarkup(jsxRuntime.jsx(Goals, { practice: practiceMetadata }));
  assert.match(html, /Mục tiêu luyện tập điểm yếu/);
  assert.ok(html.includes(rubric.CRITERIA[0].name));
  assert.ok(html.includes(rubric.CRITERIA[1].name));
  assert.ok(!html.includes(rubric.CRITERIA[4].name));
  assert.ok(html.includes(`/summary?sessionId=${sourceId}`));
  assert.match(html, /đầy đủ 5 tiêu chí/);
});

test('room client renders goals only for practice sessions and retains the interview controls', () => {
  const Link = { __esModule: true, default: props => jsxRuntime.jsx('a', props) };
  const { default: Goals } = load('src/components/weakness-practice-goals.tsx', {
    'react/jsx-runtime': jsxRuntime, 'next/link': Link, '@/lib/interview-rubric': rubric,
  });
  const { default: Room } = load('src/app/interview-room/client-page.tsx', {
    react: React, 'react/jsx-runtime': jsxRuntime, 'next/link': Link,
    'next/navigation': { useRouter: () => ({ refresh() {}, push() {} }) },
    '@/components/icon': { __esModule: true, default: () => null },
    '@/components/vrm-avatar': { __esModule: true, default: () => null },
    '@/components/rubric-details': { __esModule: true, default: () => null },
    '@/components/weakness-practice-goals': { __esModule: true, default: Goals },
    '@/hooks/useGeminiLiveInterview': { useGeminiLiveInterview: () => ({
      state: 'idle', candidateTranscript: '', interviewerTranscript: '', clarifying: false,
    }) },
  });
  for (const targeted of [true, false]) {
    const html = renderToStaticMarkup(jsxRuntime.jsx(Room, { session: {
      id: 'practice-id', title: 'Engineer', company: null, level: 'N3', interviewType: 'mixed', interviewLanguage: 'ja',
      total: 4, currentQuestion: questions()[0], turns: [], completed: false,
      practice: targeted ? practiceMetadata : null,
    } }));
    assert.equal(html.includes('Mục tiêu luyện tập điểm yếu'), targeted);
    for (const control of ['Tạm dừng', 'Thoát', 'Hỏi lại từ vựng / ngữ pháp', 'Gửi câu trả lời']) assert.ok(html.includes(control));
  }
});

test('room page passes practice metadata, turns and current question to the client without exposing snapshots', async () => {
  for (const isPractice of [true, false]) {
    const session = sourceSession({ id: 'practice-id', status: 'in_progress', questions: questions(),
      source_session_id: isPractice ? sourceId : null, selected_criteria: isPractice ? ['C02', 'C01'] : [],
      practice_context: { private: true },
    });
    const filters = [];
    const { default: Page } = load('src/app/interview-room/page.tsx', {
      'react/jsx-runtime': jsxRuntime,
      'next/navigation': { redirect: () => { throw new Error('unexpected redirect'); } },
      '@/lib/auth': { getUser: async () => ({ id: userId }) },
      '@/components/dashboard-shell': { default: () => null }, './client-page': { default: () => null },
      '@/lib/weakness-practice': practice,
      '@/lib/interview-session-query': sessionQuery,
      '@/lib/supabase/server': { createClient: async () => ({ from: table => {
        const builder = {
          select: () => builder, eq: (key, value) => { filters.push([table, key, value]); return builder; },
          maybeSingle: async () => ({ data: session, error: null }),
          order: async () => ({ data: [{ question_index: 0, answer: 'Saved', rubric_json: null }], error: null }),
        };
        return builder;
      } }) },
    });
    const element = await Page({ searchParams: Promise.resolve({ sessionId: session.id }) });
    const room = element.props.children.props.session;
    assert.deepEqual(plain(room.practice), isPractice ? practiceMetadata : null);
    assert.equal(room.turns.length, 1);
    assert.equal(room.currentQuestion.text, questions()[1].text);
    assert.equal(room.practice_context, undefined);
    assert.ok(filters.some(([table, key, value]) => table === 'interview_sessions' && key === 'user_id' && value === userId));
  }
});

function answerFixture(isPractice, options = {}) {
  const state = { rows: [], evaluated: [], failures: options.failures ?? 0 };
  const session = sourceSession({ id: 'practice-id', status: 'in_progress', question_count: 4, questions: questions(),
    source_session_id: isPractice ? sourceId : null, selected_criteria: isPractice ? ['C01', 'C02'] : [], ...options.session,
  });
  const evaluatedRubric = { ...answers()[0].rubric, assessedCount: 5, provisional: false, totalScore: 75 };
  const api = load('src/app/api/interviews/[id]/answers/route.ts', {
    '@/lib/supabase/server': { createClient: async () => ({
      auth: { getUser: async () => ({ data: { user: { id: userId } } }) },
      from: table => {
        let update;
        const builder = {
          select: () => builder, eq: () => builder,
          update: value => { update = value; return builder; },
          maybeSingle: async () => {
            if (update) Object.assign(session, update);
            return { data: session, error: null };
          },
          order: async () => ({ data: state.rows, error: null }),
          insert: async value => {
            assert.equal(table, 'interview_answers');
            state.rows.push(plain(value));
            return { error: null };
          },
        };
        return builder;
      },
    }) },
    '@/lib/auth-http': { checkRequest: () => null, json: (body, status = 200) => Response.json(body, { status }) },
    '@/lib/weakness-practice': practice,
    '@/lib/interview-session-query': sessionQuery,
    '@/lib/gemini-retry': { GeminiUnavailableError: class extends Error {} },
    '@/lib/interview-evaluation': { evaluateAnswer: async input => {
      state.evaluated.push(plain(input));
      if (state.failures-- > 0) throw new Error('Temporary AI failure');
      return { score: 7.5, rubric: evaluatedRubric, feedback: 'Feedback', suggestion: 'Practice' };
    } },
  }, { console: { error() {} } });
  return { state, session, submit: (questionIndex, answer = 'Câu trả lời thực tế.') => api.POST(
    new Request('http://localhost/api/interviews/practice-id/answers', {
      method: 'POST', body: JSON.stringify({ questionIndex, answer, selectedCriteria: ['C05'] }),
    }), { params: Promise.resolve({ id: session.id }) },
  ) };
}

test('practice and ordinary sessions complete all four answers using identical full-rubric evaluation inputs', async () => {
  const normal = answerFixture(false);
  const targeted = answerFixture(true);
  for (let index = 0; index < 4; index++) {
    for (const instance of [normal, targeted]) {
      const response = await instance.submit(index);
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.equal(body.completed, index === 3);
      assert.deepEqual(body.practice, instance === targeted ? practiceMetadata : undefined);
    }
  }
  assert.deepEqual(targeted.state.evaluated, normal.state.evaluated);
  assert.equal(targeted.session.status, 'completed');
  assert.equal(normal.session.status, 'completed');
  for (const row of targeted.state.rows) {
    assert.equal(row.rubric_json.criteria.length, 5);
    assert.equal(row.score, 7.5);
    assert.equal(row.rubric_json.totalScore, 75);
  }
  const replay = await targeted.submit(3);
  assert.equal((await replay.json()).completed, true);
  assert.equal(targeted.state.evaluated.length, 4);
});

test('failed practice submissions can be retried and skipped answers use the same evaluation flow', async () => {
  const instance = answerFixture(true, { failures: 1 });
  assert.equal((await instance.submit(0)).status, 500);
  assert.equal(instance.state.rows.length, 0);
  assert.equal((await instance.submit(0)).status, 200);
  assert.equal((await instance.submit(1, 'Ứng viên bỏ qua câu hỏi này.')).status, 200);
  assert.equal(instance.state.rows[1].answer, 'Ứng viên bỏ qua câu hỏi này.');
  assert.equal(instance.state.rows[1].rubric_json.criteria.length, 5);
});

test('invalid practice metadata blocks grading while an ordinary session needs no practice metadata', async () => {
  const invalid = answerFixture(true, { session: { selected_criteria: ['C99'] } });
  assert.equal((await invalid.submit(0)).status, 409);
  assert.equal(invalid.state.evaluated.length, 0);
  const normal = answerFixture(false);
  assert.equal((await normal.submit(0)).status, 200);
});
