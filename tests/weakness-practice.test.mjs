import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(file, dependencies = {}) {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, require: name => {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
    return dependencies[name];
  } });
  return exports;
}

const rubric = load('src/lib/interview-rubric.ts');
const { identifyWeaknesses, WEAKNESS_MAX_LEVEL } = load('src/lib/weakness-practice.ts', {
  './interview-rubric': rubric,
});
const identify = answers => JSON.parse(JSON.stringify(identifyWeaknesses(answers)));

function criterion(id = 'C01', level = 2, overrides = {}) {
  return { id, status: 'scored', level, evidence: 'チームで開発しました。', reason: '説明が不足しています。', ...overrides };
}

function answer(criteria = [criterion()], questionIndex = 0) {
  return {
    questionIndex,
    question: '経験を教えてください。',
    answer: 'チームで開発しました。結果を確認しました。',
    rubric: { version: rubric.RUBRIC_VERSION, criteria, practice: 'Hãy nêu rõ hành động của bạn.' },
  };
}

test('selects scored levels 0–2 and excludes levels 3–4', () => {
  assert.equal(WEAKNESS_MAX_LEVEL, 2);
  const result = identify([answer(rubric.CRITERIA.map(({ id }, level) => criterion(id, level)))]);
  assert.deepEqual(result.map(target => target.criterionId), ['C01', 'C02', 'C03']);
  assert.deepEqual(result.map(target => target.sources[0].level), [0, 1, 2]);
});

test('groups repeated criteria across questions and preserves source details in question order', () => {
  const later = answer([criterion('C02', 1), criterion('C01', 2)], 3);
  const earlier = answer([criterion('C02', 0, { evidence: '' })], 0);
  const before = JSON.stringify([later, earlier]);
  const result = identify([later, earlier]);
  assert.deepEqual(result.map(target => target.criterionId), ['C01', 'C02']);
  assert.deepEqual(result[1].sources.map(source => source.questionIndex), [0, 3]);
  assert.deepEqual(result[1].sources[1], {
    questionIndex: 3, question: later.question, level: 1,
    evidence: later.rubric.criteria[0].evidence, reason: later.rubric.criteria[0].reason,
    practice: later.rubric.practice, rubricVersion: rubric.RUBRIC_VERSION,
  });
  assert.equal(result[1].name, rubric.CRITERIA[1].name);
  assert.ok(result[1].suggestion.length > 0);
  assert.equal(JSON.stringify([later, earlier]), before);
});

test('excludes unassessed criteria even when they contain a low numeric level', () => {
  for (const status of ['insufficient_data', 'not_applicable', 'unknown']) {
    for (const level of [null, 0, 2]) {
      assert.deepEqual(identify([answer([criterion('C01', level, { status })])]), []);
    }
  }
});

test('handles empty, legacy, missing and unsupported rubric data without inferring from comments', () => {
  assert.deepEqual(identify([]), []);
  for (const value of [undefined, null, {}, [], 'invalid', { criteria: [] },
    { version: 'old', criteria: [criterion()] },
    { version: rubric.RUBRIC_VERSION, criteria: null, weaknesses: ['C01 yếu'], practice: 'Luyện C01' }]) {
    assert.deepEqual(identify([{ ...answer(), rubric: value }]), []);
  }
  assert.deepEqual(identify([answer([criterion('C01', 4)])]), []);
});

test('rejects invalid levels and unknown or duplicate criterion IDs', () => {
  for (const level of [null, undefined, '1', -1, 1.5, NaN, Infinity]) {
    assert.deepEqual(identify([answer([criterion('C01', 2, { level })])]), []);
  }
  assert.deepEqual(identify([answer([criterion('C99')])]), []);
  const result = identify([answer([criterion(), criterion(), criterion('C02'), null, []])]);
  assert.deepEqual(result.map(target => target.criterionId), ['C02']);
});

test('requires a reason and verbatim evidence for positive levels; zero allows empty evidence', () => {
  for (const overrides of [{ reason: '' }, { reason: '  ' }, { reason: null },
    { evidence: '' }, { evidence: '   ' }, { evidence: null }, { evidence: '架空の引用' }]) {
    assert.deepEqual(identify([answer([criterion('C01', 1, overrides)])]), []);
  }
  assert.equal(identify([answer([criterion('C01', 0, { evidence: '' })])]).length, 1);
  assert.deepEqual(identify([answer([criterion('C01', 0, { evidence: '架空の引用' })])]), []);
});

test('requires unambiguous question indices and nonempty question and answer', () => {
  for (const index of [-1, 0.5, NaN, Infinity]) {
    assert.deepEqual(identify([answer([criterion()], index)]), []);
  }
  assert.deepEqual(identify([answer(), answer()]), []);
  for (const field of ['question', 'answer']) {
    assert.deepEqual(identify([{ ...answer(), [field]: '   ' }]), []);
  }
});

test('provides a criterion-specific suggestion even without a general practice comment', () => {
  const input = answer(rubric.CRITERIA.map(({ id }) => criterion(id)));
  input.rubric.practice = null;
  const result = identify([input]);
  assert.equal(result.length, 5);
  assert.equal(new Set(result.map(target => target.suggestion)).size, 5);
  assert.ok(result.every(target => target.sources[0].practice === ''));
});
