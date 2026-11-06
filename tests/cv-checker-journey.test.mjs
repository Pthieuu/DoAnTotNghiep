import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function load(path, dependencies = {}) {
  const source = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, require: name => dependencies[name] });
  return exports;
}
const schema = load('src/lib/cv-schema.ts');
const lib = load('src/lib/cv-checker/virtual-cv.ts', { '../cv-schema': schema });
const original = { originalText: 'Full CV including projects and dates', sections: Object.fromEntries(lib.SECTION_KEYS.map(key => [key, key === 'jiko_pr' ? 'Original PR. Other evidence.' : key === 'shibou_douki' ? 'Original motivation.' : 'Other section'])) };
const report = { sections: Object.fromEntries(lib.SECTION_KEYS.map(key => [key, { key, weight: 1 / 7, score: 70, ruleScoreWeight: key === 'jiko_pr' ? 0.4 : 1, issues: [{ id: 'same-rule', severity: 'major' }, { id: 'same-rule', severity: 'minor' }] }])) };
test('corrections preserve complete source, unrelated evidence, duplicate issue IDs and undo', () => {
  const corrections = {
    'jiko_pr-same-rule-0': { section: 'jiko_pr', text: 'Revised PR.', sourceQuote: 'Original PR.' },
    'shibou_douki-same-rule-0': { section: 'shibou_douki', text: 'Revised motivation.', sourceQuote: 'Original motivation.' },
  };
  const revised = lib.applyCorrections(original, corrections);
  assert.equal(revised.sections.jiko_pr, 'Revised PR. Other evidence.');
  assert.equal(revised.originalText, original.originalText);
  assert.equal(original.sections.jiko_pr, 'Original PR. Other evidence.');
  delete corrections['jiko_pr-same-rule-0'];
  const undone = lib.applyCorrections(original, corrections);
  assert.equal(undone.sections.jiko_pr, original.sections.jiko_pr);
  assert.equal(undone.sections.shibou_douki, 'Revised motivation.');
});
test('rescore uses weights, does not double count and restores on undo', () => {
  const corrections = { 'jiko_pr-same-rule-0': { section: 'jiko_pr', text: 'Revised' } };
  const score = lib.rescoreCv(report, corrections);
  assert.equal(score.sections.jiko_pr.score, 75);
  assert.equal(score.sections.shibou_douki.score, 70);
  assert.equal(score.overallScore, 71);
  assert.equal(lib.rescoreCv(report, corrections).overallScore, 71);
  assert.equal(lib.rescoreCv(report, {}).overallScore, 70);
  assert.equal(report.sections.jiko_pr.score, 70);
});
test('score respects zero floor, manual checks and maximum', () => {
  const zero = structuredClone(report);
  zero.sections.jiko_pr.score = 0;
  zero.sections.jiko_pr.issues = Array.from({ length: 6 }, (_, i) => ({ id: String(i), severity: 'critical' }));
  assert.equal(lib.rescoreCv(zero, { 'jiko_pr-0-0': {} }).sections.jiko_pr.score, 0);
  const max = structuredClone(report);
  max.sections.jiko_pr.score = 99;
  assert.equal(lib.rescoreCv(max, { 'jiko_pr-same-rule-0': {} }).sections.jiko_pr.score, 100);
  max.sections.jiko_pr.issues = [{ id: 'manual', severity: 'manual_check' }];
  assert.equal(lib.rescoreCv(max, { 'jiko_pr-manual-0': {} }).sections.jiko_pr.score, 99);
});
test('handoff validates every section and preserves revised PR/motivation in interview snapshot', () => {
  const data = { version: 1, fileName: 'cv.pdf', role: 'Engineer', company: 'Company', cv: original };
  const parsed = lib.parseHandoff(JSON.parse(JSON.stringify(data)));
  assert.ok(parsed);
  const cv = lib.toInterviewCv(parsed);
  assert.equal(schema.validateCv(cv), true);
  assert.equal(cv.summary, original.sections.jiko_pr);
  assert.equal(cv.motivation, original.sections.shibou_douki);
  assert.equal(cv.checkerContext.originalText, original.originalText);
  assert.equal(lib.parseHandoff({ ...data, cv: { originalText: 'x', sections: {} } }), null);
  assert.equal(lib.parseHandoff({ ...data, cv: { ...original, originalText: '' } }), null);
  assert.equal(lib.parseHandoff({ ...data, role: 'a'.repeat(161) }), null);
});

function apiFixture({ user = { id: 'user-1' } } = {}) {
  let snapshot;
  let generated;
  let databaseCvReads = 0;
  const supabase = {
    auth: { getUser: async () => ({ data: { user } }) },
    from(table) {
      if (table === 'candidate_cvs') { databaseCvReads++; throw new Error('Must not read saved CV for checker handoff'); }
      assert.equal(table, 'interview_sessions');
      return { insert(value) { snapshot = value; return { select() { return { single: async () => ({ data: { id: 'session-1' }, error: null }) }; } }; } };
    },
  };
  const api = load('src/app/api/interviews/route.ts', {
    '@/lib/supabase/server': { createClient: async () => supabase },
    '@/lib/auth-http': { checkRequest: () => null, json: (body, status) => ({ body, status }) },
    '@/lib/cv-schema': schema,
    '@/lib/cv-checker/virtual-cv': lib,
    '@/lib/interview-generation': { generateInterviewQuestions: async (input) => { generated = input; return [{ text: 'Question' }]; } },
  });
  return { api, result: () => ({ snapshot, generated, databaseCvReads }) };
}
const body = { role: 'Engineer', company: '', jobDescription: '', level: 'N3', questionCount: 6, checkerCv: { version: 1, fileName: 'cv.pdf', role: 'Engineer', company: '', cv: original } };
test('interview API uses handoff without a saved CV and persists the full context', async () => {
  const fixture = apiFixture();
  const response = await fixture.api.POST({ json: async () => body });
  assert.equal(response.status, 201);
  const { snapshot, generated, databaseCvReads } = fixture.result();
  assert.equal(databaseCvReads, 0);
  assert.equal(snapshot.cv_id, null);
  assert.equal(snapshot.user_id, 'user-1');
  assert.equal(snapshot.cv_snapshot, generated.cv);
  assert.equal(generated.cv.summary, original.sections.jiko_pr);
  assert.equal(generated.cv.motivation, original.sections.shibou_douki);
  assert.equal(snapshot.cv_snapshot.checkerContext.originalText, original.originalText);
});
test('interview API rejects malformed handoffs without falling back to another CV', async () => {
  const fixture = apiFixture();
  const response = await fixture.api.POST({ json: async () => ({ ...body, checkerCv: {} }) });
  assert.equal(response.status, 400);
  assert.equal(fixture.result().snapshot, undefined);
  assert.equal(fixture.result().generated, undefined);
});
test('interview API requires authentication for virtual CVs', async () => {
  const fixture = apiFixture({ user: null });
  const response = await fixture.api.POST({ json: async () => body });
  assert.equal(response.status, 401);
  assert.equal(fixture.result().snapshot, undefined);
});
test('full narrative rewrite replaces superseded narrative while original CV is retained', () => {
  const revised = lib.applyCorrections(original, { pr: { section: 'jiko_pr', text: 'Complete revised PR' }, motivation: { section: 'shibou_douki', text: 'Complete revised motivation' } });
  assert.equal(revised.sections.jiko_pr, 'Complete revised PR');
  assert.equal(revised.sections.shibou_douki, 'Complete revised motivation');
  assert.equal(revised.originalText, original.originalText);
  assert.equal(revised.sections.education_work, original.sections.education_work);
});
