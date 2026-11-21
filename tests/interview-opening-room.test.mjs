import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as jsxRuntime from 'react/jsx-runtime';
import { load } from './helpers/weakness-practice-fixtures.mjs';
import { componentHarness, nodes, content } from './helpers/component-harness.mjs';

function room(responder, transcript = '') {
  const harness = componentHarness();
  const calls = [];
  let refreshes = 0;
  const api = load('src/app/interview-room/client-page.tsx', {
    react: { ...harness.hooks, useCallback: cb => cb }, 'react/jsx-runtime': jsxRuntime,
    'next/navigation': { useRouter: () => ({ refresh() { refreshes++; }, push() {} }) },
    'next/link': { default: () => null },
    ...Object.fromEntries(['icon', 'vrm-avatar', 'rubric-details', 'weakness-practice-goals'].map(name => [`@/components/${name}`, { default: () => null }])),
    '@/hooks/useGeminiLiveInterview': { useGeminiLiveInterview: () => ({ state: 'listening', candidateTranscript: transcript, stop() {}, start() {}, clarifying: false }) },
  }, { fetch: async (url, init) => { calls.push({ url, body: JSON.parse(init.body) }); return responder(); }, setTimeout, clearTimeout, console: { error() {} } });
  harness.mount(api.InterviewRoomTurn, { session: { id: 'session', opening: true, total: 5, turns: [], completed: false, currentQuestion: { text: 'Introduce yourself', translation: '' } } });
  return { harness, calls, refreshes: () => refreshes, controls: () => nodes(harness.tree, node => typeof node.props?.onSubmit === 'function')[0] };
}
test('opening waits through silence, has no skip and saves typed intro before refreshing', async () => {
  let resolve;
  const pending = new Promise(done => { resolve = done; });
  const f = room(() => pending);
  try {
    await f.harness.settle();
    assert.equal(f.calls.length, 0);
    assert.equal(f.controls().props.onSkip, undefined);
    nodes(f.harness.tree, n => n.type === 'input' && n.props.type === 'checkbox')[0].props.onChange({ target: { checked: true } });
    f.harness.render();
    nodes(f.harness.tree, n => n.type === 'textarea')[0].props.onChange({ target: { value: 'My introduction' } });
    f.harness.render();
    f.controls().props.onSubmit();
    f.controls().props.onSubmit();
    assert.equal(f.calls.length, 1);
    assert.equal(f.calls[0].url, '/api/interviews/session/introduction');
    assert.equal(f.calls[0].body.answer, 'My introduction');
    assert.equal(f.refreshes(), 0);
    resolve(Response.json({ saved: true }));
    await f.harness.settle();
    assert.equal(f.refreshes(), 1);
  } finally { f.harness.unmount(); }
});
test('failed spoken introduction is preserved for retry without advancing', async () => {
  const f = room(() => Response.json({ error: 'Save failed' }, { status: 500 }), 'I am Nguyen');
  try {
    f.controls().props.onSubmit();
    await f.harness.settle();
    assert.equal(f.refreshes(), 0);
    assert.match(content(f.harness.tree), /I am Nguyen/);
    assert.match(content(f.harness.tree), /Save failed/);
    assert.equal(f.controls().props.isSubmitting, false);
  } finally { f.harness.unmount(); }
});

test('input preference survives introduction and question remounts while turn keys change', () => {
  const harness = componentHarness();
  const api = load('src/app/interview-room/client-page.tsx', {
    react: harness.hooks, 'react/jsx-runtime': jsxRuntime,
    'next/navigation': {}, 'next/link': {},
    ...Object.fromEntries(['icon', 'vrm-avatar', 'rubric-details', 'weakness-practice-goals'].map(name => [`@/components/${name}`, {}])),
    '@/hooks/useGeminiLiveInterview': {},
  });
  const session = { id: 'session', opening: true, turns: [], completed: false };
  harness.mount(api.default, { session });
  const originalKey = harness.tree.key;
  harness.tree.props.onTextModeChange(true);
  session.opening = false;
  harness.render();
  assert.equal(harness.tree.props.initialTextMode, true);
  assert.notEqual(harness.tree.key, originalKey);
  const firstQuestionKey = harness.tree.key;
  session.turns.push({ answer: 'Saved' });
  harness.render();
  assert.equal(harness.tree.props.initialTextMode, true);
  assert.notEqual(harness.tree.key, firstQuestionKey);
});
