import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as jsx from 'react/jsx-runtime';
import { load, plain } from './helpers/weakness-practice-fixtures.mjs';
import { componentHarness, nodes, content } from './helpers/component-harness.mjs';
const schema = load('src/lib/user-settings.ts');
const icons = Object.fromEntries(['Mic', 'Square', 'Play', 'CheckCircle2', 'LoaderCircle', 'Save', 'RotateCcw'].map(key => [key, () => null]));
const buttons = h => nodes(h.tree, n => n.type === 'button');

function microphone(getUserMedia) {
  const h = componentHarness();
  let closed = 0;
  const media = { getUserMedia, enumerateDevices: async () => [], addEventListener() {}, removeEventListener() {} };
  class Context {
    state = 'running'; resume() { return Promise.resolve(); }
    close() { closed++; this.state = 'closed'; return Promise.resolve(); }
    createMediaStreamSource() { return { connect() {}, disconnect() {} }; }
    createAnalyser() { return { frequencyBinCount: 128, getByteFrequencyData() {}, disconnect() {} }; }
  }
  const { default: Component } = load('src/components/settings/mic-tester.tsx', {
    react: h.hooks, 'react/jsx-runtime': jsx, 'lucide-react': icons,
  }, { navigator: { mediaDevices: media }, window: { AudioContext: Context }, AudioContext: Context,
    requestAnimationFrame: () => 1, cancelAnimationFrame() {} });
  h.mount(Component);
  return { h, closed: () => closed };
}

test('microphone denial shows recovery instructions and closes audio context', async () => {
  const { h, closed } = microphone(async () => { throw { name: 'NotAllowedError' }; });
  await buttons(h)[0].props.onClick(); await h.settle();
  assert.match(content(h.tree), /Quyền micro bị từ chối/);
  assert.equal(closed(), 1);
});

test('late permission grant after leaving tab stops all tracks', async () => {
  let grant;
  let stopped = 0;
  const { h } = microphone(() => new Promise(resolve => { grant = resolve; }));
  const pending = buttons(h)[0].props.onClick();
  h.unmount();
  grant({ getTracks: () => [{ stop() { stopped++; } }] });
  await pending;
  assert.equal(stopped, 1);
});

test('active microphone stops on unmount', async () => {
  let stopped = 0;
  const track = { stop() { stopped++; } };
  const { h, closed } = microphone(async () => ({ getTracks: () => [track], getAudioTracks: () => [track] }));
  await buttons(h)[0].props.onClick(); await h.settle();
  assert.match(content(h.tree), /Micro đang hoạt động/);
  h.unmount();
  assert.equal(stopped, 1); assert.equal(closed(), 1);
});

test('speech preview filters Japanese voices, uses rate, and cancels on unmount', async () => {
  const h = componentHarness();
  let spoken; let cancelled = 0; let refresh;
  const synth = { getVoices: () => [{ voiceURI: 'ja', name: 'Japanese', lang: 'ja-JP' }, { voiceURI: 'en', lang: 'en-US' }],
    addEventListener: (_, fn) => { refresh = fn; }, removeEventListener() {},
    speak: value => { spoken = value; }, cancel: () => { cancelled++; } };
  class Utterance { constructor(text) { this.text = text; } }
  const { default: Component } = load('src/components/settings/speech-preview.tsx', {
    react: h.hooks, 'react/jsx-runtime': jsx, 'lucide-react': icons,
  }, { window: { speechSynthesis: synth, SpeechSynthesisUtterance: Utterance }, SpeechSynthesisUtterance: Utterance, queueMicrotask });
  h.mount(Component, { voiceUri: 'ja', rate: 0.75, disabled: false, onVoiceChange() {} });
  await h.settle(); refresh(); await h.settle();
  assert.equal(nodes(h.tree, n => n.type === 'option').length, 2);
  buttons(h)[0].props.onClick(); await h.settle();
  assert.equal(spoken.voice.voiceURI, 'ja'); assert.equal(spoken.rate, 0.75); assert.equal(spoken.lang, 'ja-JP');
  h.unmount(); assert.equal(cancelled, 1); assert.equal(spoken.onend, null);
});

test('live form saves boolean false and speech preferences without overwriting interview fields', async () => {
  const h = componentHarness();
  const calls = [];
  const { default: Form } = load('src/components/settings/live-audio-settings.tsx', {
    react: h.hooks, 'react/jsx-runtime': jsx, 'lucide-react': icons,
    '@/lib/user-settings': schema,
    '@/lib/user-settings-client': { getUserSettings: async () => schema.defaultUserSettings, updateUserSettings: async patch => {
      calls.push(plain(patch)); return { ...schema.defaultUserSettings, ...patch };
    } },
    './settings-toast': { default: () => null },
    './settings-skeleton': { default: () => null }, './mic-tester': { default: () => null }, './speech-preview': { default: () => null },
  });
  h.mount(Form, { active: true }); await h.settle();
  nodes(h.tree, n => n.props.id === 'live_transcript')[0].props.onClick(); h.render();
  nodes(h.tree, n => n.props.id === 'speech-rate')[0].props.onChange({ target: { value: '0.75' } }); h.render();
  await nodes(h.tree, n => n.type === 'form')[0].props.onSubmit({ preventDefault() {} }); await h.settle();
  assert.deepEqual(calls, [{ speech_rate: 0.75, live_transcript: false }]);
  assert.match(content(h.tree), /Đã lưu cài đặt/);
});

test('audio settings reject malformed values', () => {
  for (const patch of [{ speech_rate: 0 }, { speech_rate: '1' }, { speech_rate: 10 }, { live_transcript: 'false' }, { vocabulary_hints: null }, { speech_voice_uri: 'x'.repeat(513) }]) {
    assert.equal(schema.isUserSettingsUpdate(patch), false);
  }
  assert.equal(schema.isUserSettingsUpdate({ speech_voice_uri: '', live_transcript: false, speech_rate: 1.25 }), true);
});
