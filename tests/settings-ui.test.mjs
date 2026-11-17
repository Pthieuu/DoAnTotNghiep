import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as jsx from 'react/jsx-runtime';
import { load, plain } from './helpers/weakness-practice-fixtures.mjs';
import { componentHarness, nodes, content } from './helpers/component-harness.mjs';

const schema = load('src/lib/user-settings.ts');
const icons = Object.fromEntries(['CheckCircle2', 'LoaderCircle', 'Save', 'RotateCcw', 'BookOpen', 'Mic', 'ShieldCheck'].map(name => [name, () => null]));
function mountForm(client) {
  const harness = componentHarness();
  const { default: Form } = load('src/components/settings/interview-preferences-form.tsx', {
    react: harness.hooks, 'react/jsx-runtime': jsx, 'lucide-react': icons,
    '@/lib/user-settings': schema, '@/lib/user-settings-client': client,
    './settings-skeleton': { default: () => null },
  });
  harness.mount(Form);
  return harness;
}
const byId = (h, id) => nodes(h.tree, node => node.props.id === id)[0];
const button = (h, text) => nodes(h.tree, node => node.type === 'button' && content(node).includes(text))[0];

test('question count accepts supported numbers only', () => {
  for (const count of [4, 6, 8, 10]) assert.equal(schema.isUserSettingsUpdate({ question_count: count }), true);
  for (const count of ['6', 0, 5, 20, null, 6.5]) assert.equal(schema.isUserSettingsUpdate({ question_count: count }), false);
});

test('form loads values, preserves failed edits, retries save, and resets to saved values', async () => {
  const calls = [];
  let fail = true;
  const initial = { ...schema.defaultUserSettings, default_jlpt: 'N2' };
  const h = mountForm({ getUserSettings: async () => initial, updateUserSettings: async patch => {
    calls.push(plain(patch));
    if (fail) throw new Error('Không thể lưu');
    return { ...initial, ...patch };
  } });
  await h.settle();
  assert.equal(byId(h, 'settings-jlpt').props.value, 'N2');
  assert.equal(button(h, 'Lưu thay đổi').props.disabled, true);
  byId(h, 'settings-count').props.onChange({ target: { value: '10' } });
  h.render();
  const submit = () => nodes(h.tree, n => n.type === 'form')[0].props.onSubmit({ preventDefault() {} });
  await submit(); await h.settle();
  assert.match(content(h.tree), /Không thể lưu/);
  assert.equal(byId(h, 'settings-count').props.value, 10);
  fail = false;
  await submit(); await h.settle();
  assert.deepEqual(calls, [{ question_count: 10 }, { question_count: 10 }]);
  assert.match(content(h.tree), /Đã lưu cài đặt/);
  byId(h, 'settings-count').props.onChange({ target: { value: '4' } }); h.render();
  button(h, 'Hủy thay đổi').props.onClick(); await h.settle();
  assert.equal(byId(h, 'settings-count').props.value, 10);
});

test('load errors offer retry without exposing an editable default form', async () => {
  let fail = true;
  const h = mountForm({ getUserSettings: async () => {
    if (fail) throw new Error('Mất kết nối');
    return schema.defaultUserSettings;
  } });
  await h.settle();
  assert.match(content(h.tree), /Mất kết nối/);
  assert.equal(byId(h, 'settings-jlpt'), undefined);
  fail = false;
  button(h, 'Thử lại').props.onClick(); h.render(); await h.settle();
  assert.equal(byId(h, 'settings-jlpt').props.value, 'N3');
});

test('tabs support arrow keys and keep practice panel mounted', () => {
  const h = componentHarness();
  const { default: Tabs } = load('src/components/settings/settings-tabs.tsx', {
    react: h.hooks, 'react/jsx-runtime': jsx, 'lucide-react': icons,
    './interview-preferences-form': { default: () => null },
    './live-audio-settings': { default: () => null },
  });
  h.mount(Tabs);
  const tabs = () => nodes(h.tree, n => n.props.role === 'tab');
  tabs()[0].props.onKeyDown({ key: 'ArrowRight', preventDefault() {} }); h.render();
  assert.equal(tabs()[1].props['aria-selected'], true);
  const panels = nodes(h.tree, n => n.props.role === 'tabpanel');
  assert.equal(panels.length, 3);
  assert.equal(panels[0].props.hidden, true);
  assert.ok(panels[0].props.children);
  tabs()[1].props.onKeyDown({ key: 'End', preventDefault() {} }); h.render();
  assert.equal(tabs()[2].props.tabIndex, 0);
});
