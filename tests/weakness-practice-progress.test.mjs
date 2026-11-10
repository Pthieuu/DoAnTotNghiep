import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load, plain, rubric, sourceId, answers } from './helpers/weakness-practice-fixtures.mjs';

const { calculateWeaknessPracticeProgress } = load('src/lib/weakness-practice-progress.ts', { './interview-rubric': rubric });

function answer(levels, questionIndex = 0) {
  const result = answers()[0];
  return { ...result, questionIndex, rubric: { ...result.rubric,
    criteria: rubric.CRITERIA.map(({ id }, index) => ({ ...result.rubric.criteria[index], id, level: levels[index] ?? 4 })),
  } };
}

function progress(sourceAnswers, practiceAnswers, overrides = {}) {
  return plain(calculateWeaknessPracticeProgress({
    sourceSessionId: sourceId, selectedCriteria: ['C01', 'C02', 'C03'], sourceAnswers, practiceAnswers, scopeMatches: true, ...overrides,
  }));
}

test('compares selected criterion levels and reports improvement, decline and no change', () => {
  const result = progress([answer([1, 3, 2])], [answer([3, 1, 2])]);
  assert.deepEqual(result.criteria.map(item => [item.delta, item.trend]), [[2, 'improved'], [-2, 'declined'], [0, 'unchanged']]);
  assert.equal(result.sourceSessionId, sourceId);
  assert.equal(result.rubricVersion, rubric.RUBRIC_VERSION);
  assert.match(result.comparisonNote, /hai bộ câu hỏi khác nhau/);
  assert.match(result.comparisonNote, /tham khảo/);
});

test('averages all valid source scores, including high scores, instead of only weak examples', () => {
  const result = progress([answer([0], 0), answer([4], 1)], [answer([3], 0)], { selectedCriteria: ['C01'] }).criteria[0];
  assert.equal(result.source.averageLevel, 2);
  assert.equal(result.source.assessedAnswers, 2);
  assert.equal(result.practice.averageLevel, 3);
  assert.equal(result.delta, 1);
});

test('missing or unassessed data stays null and is never treated as zero', () => {
  for (const invalid of [null, {}, { ...answer([1]).rubric, criteria: [] }]) {
    const result = progress([{ ...answer([1]), rubric: invalid }], [answer([3])]).criteria[0];
    assert.equal(result.source.averageLevel, null);
    assert.equal(result.delta, null);
    assert.equal(result.reason, 'insufficient_data');
  }
  for (const status of ['insufficient_data', 'not_applicable']) {
    const missing = answer([0]);
    missing.rubric.criteria[0] = { ...missing.rubric.criteria[0], status, level: null };
    const result = progress([answer([1])], [missing]).criteria[0];
    assert.equal(result.practice.averageLevel, null);
    assert.equal(result.trend, 'not_comparable');
  }
});

test('blocks differences for unsupported or mixed rubric versions, including matching legacy versions', () => {
  const old = { ...answer([1]), rubric: { ...answer([1]).rubric, version: '1.0' } };
  for (const [source, practice] of [[[old], [answer([3])]], [[answer([1])], [old]], [[old], [old]], [[answer([1]), { ...old, questionIndex: 1 }], [answer([3])]]]) {
    const result = progress(source, practice).criteria[0];
    assert.equal(result.delta, null);
    assert.equal(result.reason, 'rubric_version_mismatch');
  }
});

test('excludes invalid numeric levels, duplicate criteria and unsupported evidence', () => {
  for (const change of [
    criterion => { criterion.level = null; }, criterion => { criterion.level = '1'; },
    criterion => { criterion.level = 1.5; }, criterion => { criterion.level = -1; },
    criterion => { criterion.level = 5; }, criterion => { criterion.level = NaN; },
    criterion => { criterion.evidence = ''; }, criterion => { criterion.evidence = 'invented'; },
    criterion => { criterion.reason = ' '; },
  ]) {
    const invalid = answer([1]);
    change(invalid.rubric.criteria[0]);
    const result = progress([invalid], [answer([3])]).criteria[0];
    assert.equal(result.source.assessedAnswers, 0);
    assert.equal(result.delta, null);
  }
  const duplicate = answer([1]);
  duplicate.rubric.criteria.push({ ...duplicate.rubric.criteria[0] });
  assert.equal(progress([duplicate], [answer([3])]).criteria[0].delta, null);
});

test('keeps zero scores without evidence and reports excluded counts for partial samples', () => {
  const zero = answer([0]);
  zero.rubric.criteria[0].evidence = '';
  const missing = { ...answer([1], 1), rubric: null };
  const result = progress([zero, missing], [answer([1])]).criteria[0];
  assert.equal(result.source.averageLevel, 0);
  assert.equal(result.source.excludedAnswers, 1);
  assert.equal(result.delta, 1);
});

test('rejects ambiguous indices and empty answers while preserving independent criteria', () => {
  const duplicate = answer([1]);
  assert.equal(progress([duplicate, duplicate], [answer([3])]).criteria[0].delta, null);
  for (const invalid of [{ ...answer([1]), questionIndex: -1 }, { ...answer([1]), answer: ' ' }]) {
    assert.equal(progress([invalid], [answer([3])]).criteria[0].delta, null);
  }
  const partial = answer([1, 1]);
  partial.rubric.criteria[0].status = 'insufficient_data';
  const result = progress([partial], [answer([3, 3])]);
  assert.equal(result.criteria[0].delta, null);
  assert.equal(result.criteria[1].delta, 2);
});

test('scope mismatch prevents comparison even with matching rubric versions', () => {
  const result = progress([answer([1])], [answer([3])], { scopeMatches: false }).criteria[0];
  assert.equal(result.delta, null);
  assert.equal(result.reason, 'scope_mismatch');
});

test('rounds reported means and deltas, keeps criterion order and does not mutate inputs', () => {
  const source = [answer([0], 0), answer([0], 1), answer([1], 2)];
  const before = JSON.stringify(source);
  const result = progress(source, [answer([1])], { selectedCriteria: ['C02', 'C01'] });
  assert.deepEqual(result.criteria.map(item => item.criterionId), ['C01', 'C02']);
  assert.equal(result.criteria[0].source.averageLevel, 0.33);
  assert.equal(result.criteria[0].delta, 0.67);
  assert.equal(JSON.stringify(source), before);
});
