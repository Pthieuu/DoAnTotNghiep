import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as jsxRuntime from 'react/jsx-runtime';
import { load, plain } from './helpers/weakness-practice-fixtures.mjs';
import { componentHarness, nodes, content } from './helpers/component-harness.mjs';

const Icon = { __esModule: true, default: () => null };
const stored = {
  full_name: 'Nguyễn An', katakana: 'グエン・アン', phone: '0901234567', summary: 'Giới thiệu đã lưu.',
  target: 'Backend Engineer', motivation: 'Phát triển sản phẩm.', jlpt_level: 'N3', employment_status: 'working',
  industries: ['Web'], languages: [{ name: 'Tiếng Nhật', level: 'JLPT N3', details: 'Chứng chỉ đã lưu.' }],
  education_experience: [{ type: 'Học vấn', title: 'Kỹ sư', organization: 'Trường đại học', period: '2020–2024', details: 'Mô tả đã lưu.' }],
  technical_skills: [{ name: 'TypeScript', details: '2 năm' }],
};

function editor(options = {}) {
  const harness = componentHarness();
  const state = { requests: [], failSave: false };
  const Cards = () => null;
  const { default: Editor } = load('src/components/profile-editor.tsx', {
    react: harness.hooks, 'react/jsx-runtime': jsxRuntime, '@/components/icon': Icon,
    'next/link': { __esModule: true, default: () => null },
    '@/components/dashboard-shell': { __esModule: true, default: () => null },
    '@/components/profile-list-cards': { __esModule: true, default: Cards },
  }, { fetch: async (_url, init) => {
    if (!init) return options.loadError ? Response.json({ error: 'Load failed' }, { status: 500 }) : Response.json({ profile: options.empty ? null : stored });
    const body = JSON.parse(init.body);
    state.requests.push(body);
    if (state.failSave) return Response.json({ error: 'Save failed' }, { status: 500 });
    return Response.json({ profile: {
      full_name: body.fullName.trim(), katakana: body.katakana, phone: body.phone,
      summary: body.summary, target: body.target, motivation: body.motivation,
      jlpt_level: body.jlptLevel, employment_status: body.employmentStatus,
      industries: body.industries, languages: body.languages,
      education_experience: body.educationExperience, technical_skills: body.technicalSkills,
    } });
  } });
  harness.mount(Editor, { user: { id: 'user-1', name: 'Account Name', email: 'an@example.com' } });
  return {
    harness, state,
    field: label => nodes(harness.tree, node => node.props?.label === label)[0],
    list: kind => nodes(harness.tree, node => node.type === Cards && node.props.kind === kind)[0],
    button: label => nodes(harness.tree, node => node.type === 'button' && content(node).trim() === label)[0],
    progress: () => nodes(harness.tree, node => node.props?.role === 'progressbar')[0].props['aria-valuenow'],
  };
}

test('loads saved profile data into a two-column layout and computes completion from actual content', async () => {
  const instance = editor();
  assert.equal(instance.button('Lưu thay đổi').props.disabled, true);
  await instance.harness.settle();
  assert.equal(instance.field('Họ và tên').props.value, stored.full_name);
  assert.equal(instance.field('Email tài khoản').props.value, 'an@example.com');
  assert.equal(instance.progress(), 100);
  assert.ok(nodes(instance.harness.tree, node => node.props?.className?.includes('lg:grid-cols-2')).length);
  assert.deepEqual(plain(instance.list('language').props.rows), stored.languages);
  assert.deepEqual(plain(instance.list('experience').props.rows), stored.education_experience);
});

test('adding, editing and deleting list entries can all be undone along with preferences', async () => {
  const instance = editor();
  await instance.harness.settle();
  instance.list('language').props.onRemove(0);
  instance.field('Số điện thoại').props.onChange('0999999999');
  nodes(instance.harness.tree, node => node.type === 'select')[0].props.onChange({ target: { value: 'N1' } });
  instance.button('Sinh viên').props.onClick();
  instance.harness.render();
  assert.ok(instance.progress() < 100);
  instance.list('skill').props.onAdd();
  instance.harness.render();
  instance.list('skill').props.onChange(1, 'name', 'Docker');
  instance.harness.render();
  assert.equal(instance.list('skill').props.rows[1].name, 'Docker');
  instance.button('Hoàn tác').props.onClick();
  instance.harness.render();
  assert.equal(instance.field('Số điện thoại').props.value, stored.phone);
  assert.equal(instance.progress(), 100);
  assert.deepEqual(plain(instance.list('language').props.rows), stored.languages);
  assert.deepEqual(plain(instance.list('skill').props.rows), stored.technical_skills);
  assert.equal(nodes(instance.harness.tree, node => node.type === 'select')[0].props.value, 'N3');
  assert.equal(instance.button('Đã đi làm').props['aria-pressed'], true);
});

test('failed saves preserve edits; successful retry saves every list and establishes the undo baseline', async () => {
  const instance = editor();
  await instance.harness.settle();
  instance.field('Họ và tên').props.onChange('Tên đã đổi');
  instance.list('language').props.onChange(0, 'level', 'JLPT N2');
  instance.harness.render();
  instance.state.failSave = true;
  await instance.button('Lưu thay đổi').props.onClick();
  await instance.harness.settle();
  assert.match(content(instance.harness.tree), /Save failed/);
  assert.equal(instance.field('Họ và tên').props.value, 'Tên đã đổi');
  assert.equal(instance.list('language').props.rows[0].level, 'JLPT N2');
  instance.state.failSave = false;
  await instance.button('Lưu thay đổi').props.onClick();
  await instance.harness.settle();
  const saved = instance.state.requests[1];
  assert.equal(saved.fullName, 'Tên đã đổi');
  assert.equal(saved.languages[0].level, 'JLPT N2');
  assert.deepEqual(saved.educationExperience, stored.education_experience);
  assert.deepEqual(saved.technicalSkills, stored.technical_skills);
  assert.equal(saved.employmentStatus, 'working');
  instance.field('Họ và tên').props.onChange('Thay đổi chưa lưu');
  instance.harness.render();
  instance.button('Hoàn tác').props.onClick();
  instance.harness.render();
  assert.equal(instance.field('Họ và tên').props.value, 'Tên đã đổi');
});

test('empty profiles do not show sample achievements or count empty arrays as completed', async () => {
  const instance = editor({ empty: true });
  await instance.harness.settle();
  assert.equal(instance.progress(), 0);
  assert.equal(instance.list('language').props.rows.length, 0);
  assert.equal(instance.list('experience').props.rows.length, 0);
  assert.equal(instance.field('Họ và tên').props.value, 'Account Name');
});

test('load failures prevent overwriting an existing profile with unloaded values', async () => {
  const instance = editor({ loadError: true });
  await instance.harness.settle();
  assert.match(content(instance.harness.tree), /Load failed/);
  assert.equal(instance.button('Lưu thay đổi').props.disabled, true);
  await instance.button('Lưu thay đổi').props.onClick();
  assert.equal(instance.state.requests.length, 0);
});

test('list cards start in reading mode and preserve text when closing and reopening the editor', () => {
  const harness = componentHarness();
  let rows = plain(stored.languages);
  const { default: Cards } = load('src/components/profile-list-cards.tsx', { react: harness.hooks, 'react/jsx-runtime': jsxRuntime, '@/components/icon': Icon });
  function Wrapper() {
    return Cards({ kind: 'language', rows, fields: [{ key: 'name', label: 'Ngôn ngữ' }, { key: 'level', label: 'Chứng chỉ' }, { key: 'details', label: 'Ghi chú' }],
      onChange: (index, key, value) => { rows = rows.map((row, i) => i === index ? { ...row, [key]: value } : row); },
      onRemove: index => { rows = rows.filter((_, i) => i !== index); },
      onAdd: () => { rows = [...rows, { name: '', level: '', details: '' }]; }, addLabel: 'Thêm ngôn ngữ',
    });
  }
  harness.mount(Wrapper, {});
  assert.equal(nodes(harness.tree, node => node.type === 'input').length, 0);
  assert.match(content(harness.tree), /JLPT N3/);
  nodes(harness.tree, node => node.props?.['aria-label']?.startsWith('Chỉnh sửa'))[0].props.onClick();
  harness.render();
  nodes(harness.tree, node => node.type === 'textarea')[0].props.onChange({ target: { value: 'Ghi chú mới' } });
  harness.render();
  nodes(harness.tree, node => node.type === 'button' && content(node) === 'Xong')[0].props.onClick();
  harness.render();
  assert.equal(nodes(harness.tree, node => node.type === 'input').length, 0);
  assert.match(content(harness.tree), /Ghi chú mới/);
  nodes(harness.tree, node => node.type === 'button' && content(node).includes('Thêm ngôn ngữ'))[0].props.onClick();
  harness.render();
  assert.equal(rows.length, 2);
  assert.equal(nodes(harness.tree, node => node.type === 'input').length, 2);
});
