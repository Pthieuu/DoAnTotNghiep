import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as jsxRuntime from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import { load, plain, rubric, cvSchema, sourceSession, answers, userId } from './helpers/weakness-practice-fixtures.mjs';
import { nodes, content } from './helpers/component-harness.mjs';

const domain = load('src/lib/dashboard-data.ts', { './cv-schema': cvSchema, './interview-rubric': rubric });
const { buildDashboardData, loadDashboardData } = domain;
const profile = { full_name: 'Nguyễn An', target: 'Data Engineer', jlpt_level: 'N4', industries: ['Data'], technical_skills: [{ name: 'SQL' }] };
const cv = { id: 'cv-1', file_name: 'resume.pdf', status: 'confirmed', updated_at: '2026-11-01',
  confirmed_data: { ...cvSchema.emptyCv, summary: 'Kinh nghiệm từ CV đã xác nhận.', skills: ['TypeScript'] } };

function session(id = 'latest', overrides = {}) {
  return { ...sourceSession(), id, score: 75, question_count: 1, summary_json: { provisional: false },
    completed_at: '2026-11-10T10:00:00Z', created_at: '2026-11-10T09:00:00Z', ...overrides };
}
function row(id = 'latest', level = 3, overrides = {}) {
  const input = answers()[0];
  return { session_id: id, question_index: 0, answer: input.answer,
    rubric_json: { ...input.rubric, criteria: input.rubric.criteria.map(criterion => ({ ...criterion, level })) }, ...overrides };
}
function build(overrides = {}) {
  return buildDashboardData({ profile, cv, sessions: [session()], answers: [row()], ...overrides });
}

test('derives profile, confirmed CV, session metrics and five rubric skills from real fields', () => {
  const result = build();
  assert.equal(result.profile.target, 'Data Engineer');
  assert.equal(result.confirmedCv.summary, cv.confirmed_data.summary);
  assert.equal(result.completedCount, 1);
  assert.equal(result.averageScore, 75);
  assert.deepEqual(plain(result.skills.map(skill => skill.percent)), [75, 75, 75, 75, 75]);
  assert.ok(result.skills.every(skill => skill.assessedAnswers === 1));
});

test('missing assessments remain null while a valid zero remains zero', () => {
  const empty = build({ profile: null, cv: null, sessions: [], answers: [] });
  assert.equal(empty.averageScore, null);
  assert.ok(empty.skills.every(skill => skill.percent === null));
  const zero = row('latest', 0);
  zero.rubric_json.criteria.forEach(criterion => { criterion.evidence = ''; });
  const result = build({ sessions: [session('latest', { score: 0 })], answers: [zero] });
  assert.equal(result.averageScore, 0);
  assert.equal(result.skills[0].percent, 0);
});

test('unassessed, malformed, unsupported or unquoted rubric criteria are excluded independently', () => {
  for (const overrides of [{ status: 'insufficient_data', level: null }, { status: 'not_applicable', level: null },
    { level: '2' }, { level: 1.5 }, { level: 5 }, { evidence: '' }, { evidence: 'invented' }, { reason: ' ' }]) {
    const input = row();
    Object.assign(input.rubric_json.criteria[0], overrides);
    const result = build({ answers: [input] });
    assert.equal(result.skills[0].percent, null);
    assert.equal(result.skills[1].percent, 75);
    assert.equal(result.averageScore, null);
  }
  for (const rubric_json of [null, {}, { ...row().rubric_json, version: 'old' }]) {
    assert.ok(build({ answers: [row('latest', 3, { rubric_json })] }).skills.every(skill => skill.percent === null));
  }
});

test('duplicate and out-of-range question indices never contribute skill percentages or formal averages', () => {
  for (const inputs of [[row(), row()], [row('latest', 3, { question_index: -1 })], [row('latest', 3, { question_index: 99 })]]) {
    const result = build({ answers: inputs });
    assert.equal(result.averageScore, null);
    assert.ok(result.skills.every(skill => skill.percent === null));
  }
});

test('incomplete or early-finished sessions cannot inflate formal averages; their valid skills remain readable', () => {
  const result = build({ sessions: [session('latest', { score: 99, summary_json: { provisional: true, completionScope: { answeredCount: 1 } } })] });
  assert.equal(result.averageScore, null);
  assert.equal(result.skills[0].percent, 75);
  assert.equal(result.completedCount, 1);
  const running = build({ sessions: [session('latest', { status: 'in_progress' })] });
  assert.equal(running.completedCount, 0);
  assert.equal(running.averageScore, null);
});

test('averages and trends only include recent sessions with matching rubric and assessment configuration', () => {
  const older = session('older', { score: 50, completed_at: '2026-11-09T10:00:00Z' });
  const other = session('other', { score: 100, level: 'N1', completed_at: '2026-11-08T10:00:00Z' });
  const legacy = session('legacy', { score: 100, completed_at: '2026-11-07T10:00:00Z' });
  const result = build({ sessions: [older, other, legacy, session()], answers: [row('older', 2), row('other', 4), row('legacy', 4, { rubric_json: null }), row()] });
  assert.equal(result.averageScore, 63);
  assert.equal(result.scoredCount, 2);
  assert.equal(result.trend, 25);
  assert.deepEqual(plain(result.scores.map(item => item.id)), ['older', 'latest']);
});

test('latest-session skill breakdown does not reuse stale percentages from older interviews', () => {
  const result = build({ sessions: [session('older', { completed_at: '2026-11-09T10:00:00Z' }), session()], answers: [row('older'), row('latest', 3, { rubric_json: null })] });
  assert.ok(result.skills.every(skill => skill.percent === null));
});

test('unconfirmed CV data never appears as confirmed career achievements', () => {
  assert.equal(build({ cv: { ...cv, status: 'parsed' } }).confirmedCv, null);
  assert.equal(build({ cv: { ...cv, confirmed_data: {} } }).confirmedCv, null);
});

function clientFixture(options = {}) {
  const calls = [];
  const client = { from: table => {
    const call = { table, filters: {} };
    calls.push(call);
    const builder = {
      select: columns => { call.columns = columns; return builder; },
      eq: (key, value) => { call.filters[key] = value; return builder; },
      in: (key, value) => { call.filters[key] = plain(value); return builder; },
      order: () => builder, limit: count => { call.limit = count; return builder; },
      maybeSingle: async () => ({ data: table === 'candidate_profiles' ? profile : cv, error: options.failedTable === table ? { code: 'failed' } : null }),
      then: (resolve, reject) => Promise.resolve({
        data: table === 'interview_sessions' ? [session()] : [row()], error: options.failedTable === table ? { code: 'failed' } : null,
      }).then(resolve, reject),
    };
    return builder;
  } };
  return { calls, get: () => loadDashboardData(client, userId) };
}

test('loader filters profile, CV and sessions by owner and restricts rubric reads to those completed sessions', async () => {
  const instance = clientFixture();
  const data = await instance.get();
  assert.equal(data.errors.length, 0);
  assert.equal(data.averageScore, 75);
  for (const table of ['candidate_profiles', 'candidate_cvs', 'interview_sessions']) {
    assert.equal(instance.calls.find(call => call.table === table).filters.user_id, userId);
  }
  assert.deepEqual(instance.calls.find(call => call.table === 'interview_answers').filters, { session_id: ['latest'] });
  assert.equal(instance.calls.find(call => call.table === 'candidate_cvs').limit, 1);
});

test('source failures remain visible while successfully loaded sections keep their own data', async () => {
  for (const table of ['candidate_profiles', 'candidate_cvs', 'interview_sessions', 'interview_answers']) {
    const data = await clientFixture({ failedTable: table }).get();
    assert.equal(data.errors.length, 1);
    if (table === 'interview_sessions') assert.equal(data.completedCount, null);
    if (table === 'interview_answers') {
      assert.equal(data.averageScore, null);
      assert.ok(data.skills.every(skill => skill.percent === null));
      assert.equal(data.profile.target, profile.target);
    }
  }
});

const ui = load('src/components/dashboard-overview.tsx', {
  'react/jsx-runtime': jsxRuntime,
  'next/link': { __esModule: true, default: props => jsxRuntime.jsx('a', { href: props.href, className: props.className, children: props.children }) },
  '@/components/icon': { __esModule: true, default: () => null },
});

test('empty dashboard renders unassessed skills without zero bars, fabricated credentials or pass probability', () => {
  const data = build({ profile: null, cv: null, sessions: [], answers: [] });
  const html = renderToStaticMarkup(jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
    jsxRuntime.jsx(ui.DashboardHero, { user: { name: 'User', email: 'user@example.com' }, data }),
    jsxRuntime.jsx(ui.DashboardAnalytics, { data }), jsxRuntime.jsx(ui.DashboardContext, { data }),
  ] }));
  assert.ok(html.includes('Chưa đánh giá'));
  for (const obsolete of ['0%', 'JLPT N2', 'Rakuten', 'Tanaka', 'Estimated Pass Rate', 'role="progressbar"']) assert.ok(!html.includes(obsolete), obsolete);
});

test('populated dashboard renders profile preferences, confirmed CV and JD; valid zero scores are visible', () => {
  const data = build({ sessions: [session('latest', { score: 0, job_description: 'JD riêng của tài khoản' })], answers: [row('latest', 0)] });
  const html = renderToStaticMarkup(jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
    jsxRuntime.jsx(ui.DashboardHero, { user: { name: 'User', email: 'user@example.com' }, data }),
    jsxRuntime.jsx(ui.DashboardAnalytics, { data }), jsxRuntime.jsx(ui.DashboardContext, { data }),
  ] }));
  for (const expected of ['Data Engineer', 'JLPT N4', 'resume.pdf', 'Kinh nghiệm từ CV đã xác nhận.', 'JD riêng của tài khoản', 'SQL', 'TypeScript', '0%', '0/100']) assert.ok(html.includes(expected), expected);
});

test('dashboard page wires real data and preserves history pagination links and cancelled states', async () => {
  const data = build({ sessions: Array.from({ length: 7 }, (_, i) => session(`session-${i}`, { status: i === 1 ? 'cancelled' : 'completed' })) });
  const partial = data.sessions.find(item => item.id === 'session-0');
  partial.score = null;
  partial.summary_json = { provisional: true, totalScore: 60 };
  const { default: Page } = load('src/app/dashboard/page.tsx', {
    'react/jsx-runtime': jsxRuntime, 'next/link': { __esModule: true, default: () => null },
    'next/navigation': { redirect: () => { throw new Error('Unexpected redirect'); } },
    '@/lib/auth': { getUser: async () => ({ id: userId, name: 'User' }) },
    '@/lib/supabase/server': { createClient: async () => ({}) },
    '@/lib/dashboard-data': { loadDashboardData: async (_client, owner) => { assert.equal(owner, userId); return data; } },
    '@/lib/dashboard-practice': { loadDashboardPractice: async () => ({ session: null, targets: [] }) },
    '@/components/dashboard-shell': { __esModule: true, default: () => null },
    '@/components/dashboard-practice': { __esModule: true, default: () => null },
    '@/components/dashboard-overview': ui,
  }, { URLSearchParams });
  const tree = await Page({ searchParams: Promise.resolve({ historyPage: '2', filter: 'kept' }) });
  assert.equal(nodes(tree, node => node.type === 'tr').length, 3);
  assert.ok(nodes(tree, node => node.props?.href === '/dashboard?filter=kept&historyPage=1#history').length);
  assert.equal(nodes(tree, node => node.props?.href === '/interview-room?sessionId=session-1').length, 0);
  assert.ok(content(tree).includes('60/100 (tạm tính)'));
});
