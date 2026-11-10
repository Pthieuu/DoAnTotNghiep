import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as jsxRuntime from 'react/jsx-runtime';
import { load, plain, practice, sessionQuery, sourceId, userId, sourceSession, answers } from './helpers/weakness-practice-fixtures.mjs';
import { componentHarness, nodes, content } from './helpers/component-harness.mjs';

const { loadDashboardPractice } = load('src/lib/dashboard-practice.ts', {
  './interview-session-query': sessionQuery, './weakness-practice': practice,
});

function dataFixture(options = {}) {
  const calls = [];
  const session = options.session === undefined ? sourceSession() : options.session;
  const client = { from: table => {
    const call = { table, filters: {}, orders: [] };
    calls.push(call);
    const builder = {
      select: columns => { call.columns = columns; return builder; },
      eq: (key, value) => { call.filters[key] = value; return builder; },
      order: (key, order) => { call.orders.push({ key, ...order }); return builder; },
      limit: count => { call.limit = count; return builder; },
      maybeSingle: async () => {
        if (options.missingColumns && call.columns.includes('source_session_id')) {
          return { data: null, error: { code: '42703', message: 'column source_session_id does not exist' } };
        }
        return { data: session && session.user_id === call.filters.user_id && session.status === call.filters.status ? session : null,
          error: options.sessionError ?? null };
      },
      then: (resolve, reject) => Promise.resolve({
        data: (options.answers ?? answers()).map(answer => ({ question_index: answer.questionIndex, answer: answer.answer, rubric_json: answer.rubric })),
        error: options.answersError ?? null,
      }).then(resolve, reject),
    };
    return builder;
  } };
  return { calls, get: () => loadDashboardPractice(client, userId) };
}

test('loads the latest completed owned session and derives low-score recommendations from persisted rubric', async () => {
  const instance = dataFixture();
  const data = await instance.get();
  assert.equal(data.error, null);
  assert.equal(data.practiceAvailable, true);
  assert.equal(data.session.id, sourceId);
  assert.deepEqual(plain(data.targets.map(target => target.criterionId)), ['C01', 'C02']);
  assert.deepEqual(instance.calls[0].filters, { user_id: userId, status: 'completed' });
  assert.deepEqual(instance.calls[0].orders[0], { key: 'completed_at', ascending: false, nullsFirst: false });
  assert.equal(instance.calls[0].limit, 1);
  assert.deepEqual(instance.calls[1].filters, { session_id: sourceId });
});

test('does not read answers for missing, incomplete or other-user sessions', async () => {
  for (const session of [null, sourceSession({ user_id: 'other-user' }), sourceSession({ status: 'in_progress' })]) {
    const instance = dataFixture({ session });
    const result = await instance.get();
    assert.equal(result.session, null);
    assert.equal(result.targets.length, 0);
    assert.equal(instance.calls.length, 1);
  }
});

test('does not resurface older weaknesses when the latest session has no low scored criteria', async () => {
  const latest = answers();
  latest[0].rubric.criteria.forEach(criterion => { criterion.level = 4; });
  const instance = dataFixture({ answers: latest });
  assert.equal((await instance.get()).targets.length, 0);
  assert.equal(instance.calls.filter(call => call.table === 'interview_sessions').length, 1);
});

test('excludes legacy, empty, unassessed, unknown-version and unsupported evidence data', async () => {
  for (const change of [
    answer => { answer.rubric = null; }, answer => { answer.answer = ''; },
    answer => { answer.rubric.version = 'old'; },
    answer => { answer.rubric.criteria.forEach(criterion => { criterion.status = 'insufficient_data'; }); },
    answer => { answer.rubric.criteria.forEach(criterion => { criterion.evidence = 'invented'; }); },
  ]) {
    const input = answers();
    change(input[0]);
    assert.equal((await dataFixture({ answers: input }).get()).targets.length, 0);
  }
});

test('keeps recommendations readable but disables practice when migrations are absent', async () => {
  const instance = dataFixture({ missingColumns: true });
  const data = await instance.get();
  assert.equal(data.practiceAvailable, false);
  assert.equal(data.targets.length, 2);
  assert.deepEqual(instance.calls[1].filters, { user_id: userId, status: 'completed' });
});

test('database failures are reported instead of being presented as no recommendations', async () => {
  for (const options of [{ sessionError: { code: 'failed' } }, { answersError: { code: 'failed' } }]) {
    const data = await dataFixture(options).get();
    assert.ok(data.error);
    assert.equal(data.targets.length, 0);
  }
});

function dashboard(data) {
  const harness = componentHarness();
  let refreshed = 0;
  const Panel = () => null;
  const { default: Component } = load('src/components/dashboard-practice.tsx', {
    react: harness.hooks, 'react/jsx-runtime': jsxRuntime,
    'next/link': { __esModule: true, default: () => null },
    'next/navigation': { useRouter: () => ({ refresh: () => refreshed++ }) },
    '@/components/icon': { __esModule: true, default: () => null },
    '@/components/weakness-practice-panel': { __esModule: true, default: Panel },
  });
  harness.mount(Component, { data });
  return { harness, Panel, refreshCount: () => refreshed };
}

test('shows actual recommendation counts, expands all cards and opens practice with the chosen criterion', () => {
  const sample = answers();
  sample[0].rubric.criteria.forEach((criterion, index) => { criterion.level = index % 3; });
  const data = { session: { id: sourceId, title: 'Engineer' }, targets: practice.identifyWeaknesses(sample), practiceAvailable: true, error: null };
  const instance = dashboard(data);
  assert.equal(nodes(instance.harness.tree, node => node.type === 'article').length, 3);
  const all = nodes(instance.harness.tree, node => node.type === 'button' && content(node).includes('View All'))[0];
  assert.equal(content(all).trim(), 'View All (5)');
  all.props.onClick();
  instance.harness.render();
  assert.equal(nodes(instance.harness.tree, node => node.type === 'article').length, 5);
  const launch = nodes(instance.harness.tree, node => node.type === 'button' && content(node).startsWith('Luyện:'))[4];
  launch.props.onClick();
  instance.harness.render();
  const setup = nodes(instance.harness.tree, node => node.type === instance.Panel)[0];
  assert.equal(setup.props.sessionId, sourceId);
  assert.deepEqual(plain(setup.props.initialSelectedCriteria), ['C05']);
  assert.ok(nodes(instance.harness.tree, node => node.props?.href === `/summary?sessionId=${sourceId}`).length);
});

test('empty, unavailable and error states provide real actions without mock practice cards', async () => {
  const empty = dashboard({ session: null, targets: [], practiceAvailable: false, error: null });
  assert.match(content(empty.harness.tree), /Hoàn thành một buổi phỏng vấn/);
  assert.equal(nodes(empty.harness.tree, node => node.type === 'article').length, 0);
  const unavailable = dashboard(await dataFixture({ missingColumns: true }).get());
  assert.match(content(unavailable.harness.tree), /chưa được kích hoạt/);
  assert.ok(nodes(unavailable.harness.tree, node => node.type === 'button').every(node => node.props.disabled));
  const failed = dashboard({ session: null, targets: [], practiceAvailable: false, error: 'Load failed' });
  nodes(failed.harness.tree, node => node.type === 'button')[0].props.onClick();
  assert.equal(failed.refreshCount(), 1);
});
