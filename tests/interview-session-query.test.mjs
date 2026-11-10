import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as jsxRuntime from 'react/jsx-runtime';
import { load, sessionQuery, practice, sourceId, userId } from './helpers/weakness-practice-fixtures.mjs';

test('only retries without optional columns for missing practice schema errors', async () => {
  for (const code of ['42703', 'PGRST204']) {
    const calls = [];
    const result = await sessionQuery.querySessionWithPractice(async columns => {
      calls.push(columns);
      return calls.length === 1 ? { data: null, error: { code, message: 'column selected_criteria does not exist' } }
        : { data: { id: sourceId }, error: null };
    }, 'id,title');
    assert.equal(result.practiceAvailable, false);
    assert.equal(result.data.id, sourceId);
    assert.deepEqual(calls, ['id,title,source_session_id,selected_criteria', 'id,title']);
  }
});

test('does not hide permission, network or unrelated schema errors', async () => {
  for (const error of [{ code: '42501', message: 'Permission denied' }, { code: '42703', message: 'column summary_json does not exist' },
    { message: 'fetch failed' }]) {
    let calls = 0;
    const result = await sessionQuery.querySessionWithPractice(async () => { calls++; return { data: null, error }; }, 'id');
    assert.equal(calls, 1);
    assert.equal(result.error, error);
  }
});

test('summary page renders ordinary results rather than redirecting when migrations are missing', async () => {
  const reads = [];
  const { default: Page } = load('src/app/summary/page.tsx', {
    'react/jsx-runtime': jsxRuntime,
    'next/navigation': { redirect: url => { throw new Error(`Unexpected redirect: ${url}`); } },
    '@/lib/auth': { getUser: async () => ({ id: userId }) },
    '@/components/dashboard-shell': { default: () => null }, './client-page': { default: () => null },
    '@/lib/weakness-practice': practice, '@/lib/interview-session-query': sessionQuery,
    '@/lib/supabase/server': { createClient: async () => ({ from: () => {
      const call = { filters: {} };
      reads.push(call);
      const builder = {
        select: columns => { call.columns = columns; return builder; },
        eq: (key, value) => { call.filters[key] = value; return builder; },
        maybeSingle: async () => call.columns.includes('source_session_id')
          ? { data: null, error: { code: '42703', message: 'column interview_sessions.source_session_id does not exist' } }
          : { data: { id: sourceId, title: 'Engineer', status: 'completed', summary_json: { totalScore: 75 } }, error: null },
      };
      return builder;
    } }) },
  });
  const result = await Page({ searchParams: Promise.resolve({ sessionId: sourceId }) });
  const props = result.props.children.props;
  assert.equal(props.initialSummary.totalScore, 75);
  assert.equal(props.practiceAvailable, false);
  assert.equal(props.practice, null);
  assert.deepEqual(reads[1].filters, { id: sourceId, user_id: userId });
});
