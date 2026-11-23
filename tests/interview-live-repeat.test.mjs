import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers/weakness-practice-fixtures.mjs';
import { componentHarness } from './helpers/component-harness.mjs';

async function fixture() {
  const harness = componentHarness();
  const timers = new Map();
  const sockets = [];
  class Socket {
    static OPEN = 1;
    readyState = 1;
    sent = [];
    constructor() { sockets.push(this); }
    send(value) { this.sent.push(JSON.parse(value)); }
    close() {}
  }
  class AudioContext {
    currentTime = 0;
    async resume() {}
    async close() {}
  }
  const api = load('src/hooks/useGeminiLiveInterview.ts', {
    react: { ...harness.hooks, useCallback: (cb, deps) => {
      const ref = harness.hooks.useRef(null);
      if (!ref.current || deps.some((v, i) => v !== ref.current.deps[i])) ref.current = { cb, deps };
      return ref.current.cb;
    } },
  }, {
    AbortController, AudioContext, WebSocket: Socket,
    navigator: { mediaDevices: { getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }) } },
    fetch: async () => Response.json({ questionIndex: 0, questionText: 'Question', token: 'test' }),
    setTimeout: cb => { const id = {}; timers.set(id, cb); return id; },
    clearTimeout: id => timers.delete(id),
  });
  harness.mount(() => api.useGeminiLiveInterview('session', 0, 'Question'));
  await harness.tree.start();
  const socket = sockets[0];
  const message = async serverContent => {
    await socket.onmessage({ data: JSON.stringify({ serverContent }) });
    harness.render();
  };
  return { harness, timers, socket, message };
}

test('repeat is ignored during startup and duplicate clicks send only one request', async () => {
  const f = await fixture();
  try {
    f.harness.tree.repeatQuestion();
    assert.equal(f.socket.sent.length, 0, 'initial question is still pending');
    await f.message({ turnComplete: true });
    const repeat = f.harness.tree.repeatQuestion;
    repeat();
    repeat();
    assert.equal(f.socket.sent.length, 1);
    await f.message({ turnComplete: true });
    f.harness.tree.repeatQuestion();
    assert.equal(f.socket.sent.length, 2, 'next repeat is allowed after completion');
  } finally { f.harness.unmount(); }
});

test('elapsed time alone cannot end clarification or admit answer transcription', async () => {
  const f = await fixture();
  try {
    await f.message({ turnComplete: true });
    f.harness.tree.repeatQuestion();
    for (const callback of [...f.timers.values()]) callback();
    await f.message({ inputTranscription: { text: 'Do not grade this' } });
    assert.equal(f.harness.tree.clarifying, true);
    assert.equal(f.harness.tree.candidateTranscript, '');
    await f.message({ turnComplete: true });
    assert.equal(f.harness.tree.clarifying, false);
    await f.message({ inputTranscription: { text: 'My answer' } });
    assert.equal(f.harness.tree.candidateTranscript, 'My answer');
  } finally { f.harness.unmount(); }
});
