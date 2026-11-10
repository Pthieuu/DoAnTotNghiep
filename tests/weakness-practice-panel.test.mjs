import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as jsxRuntime from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import { load, rubric, practice, answers, sourceId } from './helpers/weakness-practice-fixtures.mjs';
import { componentHarness, nodes, content } from './helpers/component-harness.mjs';

const Link = { __esModule: true, default: props => jsxRuntime.jsx('a', props) };
const targets = practice.identifyWeaknesses(answers());
const button = tree => nodes(tree, node => node.type === 'button' && /Luyện tập điểm yếu|Luyện tiếp điểm yếu|Thử lại tạo|Đang tạo/.test(content(node)))[0];

function panel(fetch, extra = {}) {
  const harness = componentHarness();
  const navigation = [];
  const { default: Panel } = load('src/components/weakness-practice-panel.tsx', {
    react: harness.hooks, 'react/jsx-runtime': jsxRuntime, 'next/link': Link,
    'next/navigation': { useRouter: () => ({ push: url => navigation.push(url) }) },
  }, { fetch, AbortController, crypto: { randomUUID: () => 'test-request-key' } });
  harness.mount(Panel, { sessionId: sourceId, ...extra });
  return { harness, navigation };
}

test('loads targets, requires a selection and allows deselection through labeled checkboxes', async () => {
  const instance = panel(async () => Response.json({ weaknesses: targets }));
  assert.match(content(instance.harness.tree), /Đang tải/);
  await instance.harness.settle();
  assert.equal(button(instance.harness.tree).props.disabled, true);
  const checkbox = nodes(instance.harness.tree, node => node.type === 'input')[0];
  checkbox.props.onChange();
  instance.harness.render();
  assert.equal(button(instance.harness.tree).props.disabled, false);
  assert.equal(nodes(instance.harness.tree, node => node.type === 'input')[0].props.checked, true);
  nodes(instance.harness.tree, node => node.type === 'input')[0].props.onChange();
  instance.harness.render();
  assert.equal(button(instance.harness.tree).props.disabled, true);
});

test('retries target loading and handles empty or legacy results', async () => {
  let calls = 0;
  const instance = panel(async () => ++calls === 1 ? Response.json({ error: 'Load failed' }, { status: 500 }) : Response.json({ weaknesses: [] }));
  await instance.harness.settle();
  assert.match(content(instance.harness.tree), /Load failed/);
  nodes(instance.harness.tree, node => node.type === 'button')[0].props.onClick();
  await instance.harness.settle();
  assert.match(content(instance.harness.tree), /Chưa có tiêu chí/);
  assert.equal(button(instance.harness.tree).props.disabled, true);
});

test('keeps selection and the same key on retry, blocks rapid clicks and navigates to the created session', async () => {
  const bodies = [];
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  const instance = panel(async (_url, init) => {
    if (!init.method) return Response.json({ weaknesses: targets });
    bodies.push(JSON.parse(init.body));
    if (bodies.length === 1) { await pending; throw new Error('Connection interrupted'); }
    return Response.json({ sessionId: 'created-id' });
  });
  await instance.harness.settle();
  nodes(instance.harness.tree, node => node.type === 'input')[0].props.onChange();
  instance.harness.render();
  const start = button(instance.harness.tree);
  start.props.onClick();
  start.props.onClick();
  instance.harness.render();
  assert.equal(bodies.length, 1);
  assert.equal(button(instance.harness.tree).props.disabled, true);
  assert.equal(nodes(instance.harness.tree, node => node.type === 'fieldset')[0].props.disabled, true);
  release();
  await instance.harness.settle();
  assert.match(content(instance.harness.tree), /Connection interrupted/);
  assert.equal(nodes(instance.harness.tree, node => node.type === 'input')[0].props.checked, true);
  button(instance.harness.tree).props.onClick();
  await instance.harness.settle();
  assert.equal(bodies.length, 2);
  assert.deepEqual(bodies[0], bodies[1]);
  assert.deepEqual(instance.navigation, ['/interview-room?sessionId=created-id']);
});

test('renders source/practice samples and handles positive, negative, zero and unavailable differences', () => {
  const { default: Report } = load('src/components/weakness-practice-progress.tsx', { 'react/jsx-runtime': jsxRuntime, 'next/link': Link });
  const sample = { averageLevel: 0, assessedAnswers: 1, excludedAnswers: 1 };
  const progress = { sourceSessionId: sourceId, comparisonNote: 'Hai bộ câu hỏi khác nhau.', criteria: [2, -1, 0, null].map((delta, index) => ({
    criterionId: rubric.CRITERIA[index].id, name: rubric.CRITERIA[index].name,
    source: sample, practice: { ...sample, averageLevel: delta === null ? null : 2 }, delta,
    reason: delta === null ? 'insufficient_data' : null,
  })) };
  const html = renderToStaticMarkup(jsxRuntime.jsx(Report, { progress }));
  for (const expected of ['0/4', 'Tăng +2', 'Giảm -1', 'Không đổi', 'Chưa thể so sánh', '1 câu bị loại', 'Hai bộ câu hỏi khác nhau.']) assert.ok(html.includes(expected), expected);
  assert.ok(html.includes(`/summary?sessionId=${sourceId}`));
});

test('dashboard entry preselects its criterion and creates practice using that selection', async () => {
  let submitted;
  const instance = panel(async (_url, init) => {
    if (!init.method) return Response.json({ weaknesses: targets });
    submitted = JSON.parse(init.body);
    return Response.json({ sessionId: 'created-from-dashboard' });
  }, { initialSelectedCriteria: ['C02'] });
  await instance.harness.settle();
  assert.deepEqual(nodes(instance.harness.tree, node => node.type === 'input' && node.props.checked).map(node => node.props.value), ['C02']);
  assert.equal(button(instance.harness.tree).props.disabled, false);
  button(instance.harness.tree).props.onClick();
  await instance.harness.settle();
  assert.deepEqual(submitted.selectedCriteria, ['C02']);
  assert.deepEqual(instance.navigation, ['/interview-room?sessionId=created-from-dashboard']);
});
