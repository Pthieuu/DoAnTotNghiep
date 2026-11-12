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
      select: (columns, selectOptions) => { call.columns = columns; call.selectOptions = selectOptions; return builder; },
      eq: (key, value) => { call.filters[key] = value; return builder; },
      in: (key, value) => { call.filters[key] = plain(value); return builder; },
      order: () => builder, limit: count => { call.limit = count; return builder; },
      range: (from, to) => { call.range = [from, to]; return builder; },
      maybeSingle: async () => ({ data: table === 'candidate_profiles' ? profile : table === 'candidate_cvs' ? cv : session(), error: options.failedTable === table ? { code: 'failed' } : null }),
      then: (resolve, reject) => {
        let data;
        let count = null;
        if (table === 'interview_answers') data = options.answers ?? [row()];
        else if (call.selectOptions?.head) { data = null; count = options.totalCount ?? 1; }
        else if (call.filters.status === 'completed') { data = options.recent ?? [session()]; count = options.completedCount ?? data.length; }
        else data = (options.historyRows ?? [session()]).slice(call.range[0], call.range[1] + 1);
        return Promise.resolve({ data, count, error: options.failedTable === table ? { code: 'failed' } : null }).then(resolve, reject);
      },
    };
    return builder;
  } };
  return { calls, get: page => loadDashboardData(client, userId, page) };
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
    assert.ok(data.errors.length >= 1);
    if (table === 'interview_sessions') assert.equal(data.completedCount, null);
    if (table === 'interview_answers') {
      assert.equal(data.averageScore, null);
      assert.ok(data.skills.every(skill => skill.percent === null));
      assert.equal(data.profile.target, profile.target);
    }
  }
});

test('queries bound history and analytics independently while using database counts for full account totals', async () => {
  const historyRows = Array.from({ length: 12 }, (_, index) => session(`history-${index}`));
  const instance = clientFixture({ totalCount: 12, completedCount: 9, historyRows });
  const result = await instance.get('2');
  assert.deepEqual(plain(result.history), { page: 2, pageSize: 5, totalCount: 12 });
  assert.equal(result.sessions.length, 5);
  assert.equal(result.completedCount, 9);
  assert.equal(result.skillSession.id, 'latest');
  assert.equal(result.latest.id, 'latest');
  const history = instance.calls.find(call => call.range);
  assert.deepEqual(history.range, [5, 9]);
  assert.equal(history.columns.includes('job_description'), false);
  const recent = instance.calls.find(call => call.filters.status === 'completed');
  assert.equal(recent.limit, 20);
  assert.equal(recent.selectOptions.count, 'exact');
  assert.ok(instance.calls.some(call => call.selectOptions?.head && call.selectOptions.count === 'exact'));
  assert.equal(instance.calls.find(call => call.table === 'interview_answers').limit, 300);
  for (const call of instance.calls.filter(call => call.table !== 'interview_answers')) assert.equal(call.filters.user_id, userId);
});

test('history pages are clamped by database totals and invalid page values use the first page', async () => {
  for (const [requested, expected] of [['999', 3], ['-1', 1], ['NaN', 1], ['Infinity', 1], ['1.5', 1], [['2'], 1]]) {
    const instance = clientFixture({ totalCount: 12 });
    const result = await instance.get(requested);
    assert.equal(result.history.page, expected);
    assert.deepEqual(instance.calls.find(call => call.range).range, [(expected - 1) * 5, expected * 5 - 1]);
  }
});

test('empty accounts do not fetch history rows or rubric answers', async () => {
  const instance = clientFixture({ totalCount: 0, completedCount: 0, recent: [] });
  const result = await instance.get('999');
  assert.equal(result.history.page, 1);
  assert.equal(result.history.totalCount, 0);
  assert.equal(result.completedCount, 0);
  assert.equal(result.sessions.length, 0);
  assert.equal(result.averageScore, null);
  assert.ok(!instance.calls.some(call => call.range || call.table === 'interview_answers'));
});

test('each valid answer rubric is accessed once and reused across skill and score calculations', () => {
  const sessions = Array.from({ length: 20 }, (_, index) => session(`session-${index}`, { question_count: 15 }));
  let reads = 0;
  let sessionReads = 0;
  const inputs = sessions.flatMap(session => Array.from({ length: 15 }, (_, index) => {
    const input = row(session.id, 3, { question_index: index });
    const rubric = input.rubric_json;
    const sessionId = input.session_id;
    Object.defineProperty(input, 'rubric_json', { get() { reads++; return rubric; } });
    Object.defineProperty(input, 'session_id', { get() { sessionReads++; return sessionId; } });
    return input;
  }));
  const result = build({ sessions, answers: inputs });
  assert.equal(reads, 300);
  assert.equal(sessionReads, 300);
  assert.equal(result.scoredCount, 20);
  assert.equal(result.averageScore, 75);
  assert.equal(result.skills[0].assessedAnswers, 15);
});

test('duplicated criteria remain unassessed after indexing, including a third occurrence', () => {
  const input = row();
  input.rubric_json.criteria.push({ ...input.rubric_json.criteria[0] }, { ...input.rubric_json.criteria[0] });
  const result = build({ answers: [input] });
  assert.equal(result.skills[0].percent, null);
  assert.equal(result.skills[1].percent, 75);
  assert.equal(result.averageScore, null);
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
  const tree = ui.DashboardAnalytics({ data });
  for (const heading of ['score-progression-heading', 'skill-breakdown-heading']) {
    const section = nodes(tree, node => node.props?.['aria-labelledby'] === heading)[0];
    const sectionHtml = renderToStaticMarkup(section);
    assert.ok(sectionHtml.includes('href="/interview-setup"'));
    assert.ok(sectionHtml.includes('Start New Interview'));
    assert.ok(sectionHtml.includes('<h3'));
  }
});

test('empty analytics for completed but unassessed sessions offers their summary and a new interview', () => {
  const data = build({ sessions: [session('unassessed', { score: null })], answers: [] });
  const html = renderToStaticMarkup(jsxRuntime.jsx(ui.DashboardAnalytics, { data }));
  assert.equal((html.match(/href="\/summary\?sessionId=unassessed"/g) ?? []).length, 2);
  assert.equal((html.match(/Start New Interview/g) ?? []).length, 2);
  assert.ok(!html.includes('0%'));
});

test('partial skill data stays visible with a nearby action to obtain missing assessments', () => {
  const input = row();
  input.rubric_json.criteria[4].status = 'not_applicable';
  input.rubric_json.criteria[4].level = null;
  const data = build({ answers: [input] });
  const tree = ui.DashboardAnalytics({ data });
  const section = nodes(tree, node => node.props?.['aria-labelledby'] === 'skill-breakdown-heading')[0];
  const html = renderToStaticMarkup(section);
  assert.ok(html.includes('75%'));
  assert.ok(html.includes('Chưa đánh giá'));
  assert.ok(html.includes('Một số tiêu chí chưa được đánh giá'));
  assert.ok(html.includes('href="/interview-setup"'));
});

test('populated dashboard renders profile preferences, confirmed CV and JD; valid zero scores are visible', () => {
  const data = build({ sessions: [session('latest', { score: 0, job_description: 'JD riêng của tài khoản' })], answers: [row('latest', 0)] });
  const html = renderToStaticMarkup(jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
    jsxRuntime.jsx(ui.DashboardHero, { user: { name: 'User', email: 'user@example.com' }, data }),
    jsxRuntime.jsx(ui.DashboardAnalytics, { data }), jsxRuntime.jsx(ui.DashboardContext, { data }),
  ] }));
  for (const expected of ['Data Engineer', 'JLPT N4', 'resume.pdf', 'Kinh nghiệm từ CV đã xác nhận.', 'JD riêng của tài khoản', 'SQL', 'TypeScript', '0%', '0/100']) assert.ok(html.includes(expected), expected);
  assert.ok(!html.includes('Bắt đầu hành trình theo dõi tiến bộ'));
  assert.ok(!html.includes('Khám phá điểm mạnh và mục tiêu cải thiện'));
});

test('dashboard page wires real data and preserves history pagination links and cancelled states', async () => {
  const data = build({ sessions: Array.from({ length: 7 }, (_, i) => session(`session-${i}`, { status: i === 1 ? 'cancelled' : 'completed' })) });
  const partial = data.sessions.find(item => item.id === 'session-0');
  partial.score = null;
  partial.summary_json = { provisional: true, totalScore: 60 };
  data.sessions = data.sessions.slice(5);
  data.history = { page: 2, pageSize: 5, totalCount: 7 };
  const { default: Page } = load('src/app/dashboard/page.tsx', {
    'react/jsx-runtime': jsxRuntime, 'next/link': { __esModule: true, default: () => null },
    'next/navigation': { redirect: () => { throw new Error('Unexpected redirect'); } },
    '@/lib/auth': { getUser: async () => ({ id: userId, name: 'User' }) },
    '@/lib/supabase/server': { createClient: async () => ({}) },
    '@/lib/dashboard-data': { loadDashboardData: async (_client, owner, page) => { assert.equal(owner, userId); assert.equal(page, '2'); return data; } },
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
