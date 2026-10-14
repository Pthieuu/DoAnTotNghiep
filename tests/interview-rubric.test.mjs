import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function load(path, dependencies = {}, globals = {}) {
  const source = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, require: name => name === 'server-only' ? {} : name === './ai-config' ? { getAiConfig: () => ({ provider: globals.process?.env?.CV_AI_PROVIDER || 'ollama', ollamaModel: 'qwen3:4b', geminiModel: 'test', groqModel: 'test' }) } : dependencies[name], ...globals });
  return exports;
}
const rubric = load('src/lib/interview-rubric.ts');
const context = { answer: '意見。理由。具体例。結論。', language: 'ja', targetRole: 'Engineer' };
function fixture() {
  return {
    criteria: rubric.CRITERIA.map(c => ({ id: c.id, status: 'scored', level: 4, evidence: '意見。', reason: 'Có bằng chứng phù hợp.' })),
    structure: { method: 'PREP', steps: ['意見。', '理由。', '具体例。', '結論。'].map(evidence => ({ present: true, evidence })), ordered: true },
    strengths: ['Nêu ý chính: 意見。'], weaknesses: [], practice: 'Luyện trình bày lại ví dụ cụ thể.',
  };
}
test('weights, levels and normalized partial scores', () => {
  const input = fixture(); input.criteria[0].level = 2;
  assert.equal(rubric.parseRubric(input, context).totalScore, 85);
  const vi = rubric.parseRubric(input, { ...context, language: 'vi' });
  assert.equal(vi.criteria[4].level, null); assert.equal(vi.assessedCount, 4);
  assert.equal(vi.totalScore, 83.3); assert.equal(vi.provisional, true);
  const missingRole = rubric.parseRubric(fixture(), { ...context, targetRole: null });
  assert.equal(missingRole.criteria[3].status, 'insufficient_data');
});
test('missing/out-of-order structure cannot receive full credit', () => {
  for (let count = 0; count <= 4; count++) {
    const input = fixture(); input.structure.steps.forEach((s, i) => { if (i >= count) { s.present = false; s.evidence = ''; } });
    const result = rubric.parseRubric(input, context);
    assert.equal(result.criteria[2].level, [0, 1, 1, 2, 4][count]);
    assert.equal(result.structure.status, count === 4 ? 'passed' : 'failed');
  }
  const input = fixture(); input.structure.ordered = false;
  assert.equal(rubric.parseRubric(input, context).criteria[2].level, 2);
});
test('no data is null rather than zero', () => {
  const input = fixture(); input.criteria.forEach(c => { c.status = 'insufficient_data'; c.level = null; c.evidence = ''; }); input.structure.ordered = null;
  const result = rubric.parseRubric(input, context);
  assert.equal(result.totalScore, null); assert.equal(result.assessedCount, 0);
  assert.equal(result.structure.status, 'insufficient_data');
});
test('rejects malformed output, duplicate criteria and invented evidence', () => {
  for (const bad of [null, [], {}, 'text']) assert.throws(() => rubric.parseRubric(bad, context));
  const changes = [
    d => { d.criteria[1].id = 'C01'; },
    d => { d.criteria[0].level = 4.5; },
    d => { d.criteria[0].level = '4'; },
    d => { d.criteria[0].evidence = 'invented'; },
    d => { d.criteria[0].status = 'insufficient_data'; },
    d => { d.structure.steps.pop(); },
    d => { d.practice = ''; },
  ];
  for (const change of changes) { const input = fixture(); change(input); assert.throws(() => rubric.parseRubric(input, context)); }
});
test('summary computes legacy and rubric scores; excludes incomparable scopes', () => {
  assert.equal(rubric.summarizeScores([{ score: 8 }, { score: 6 }], 2).totalScore, 70);
  assert.equal(rubric.summarizeScores([{ score: null }], 1).totalScore, null);
  const full = rubric.parseRubric(fixture(), context);
  const partial = rubric.parseRubric(fixture(), { ...context, language: 'vi' });
  assert.equal(rubric.summarizeScores([{ score: 0, rubric: full }], 1).totalScore, 100);
  assert.equal(rubric.summarizeScores([{ score: 10, rubric: partial }], 1).grade, 'Chưa xếp loại');
  assert.equal(rubric.summarizeScores([{ score: 10, rubric: full }, { score: 10, rubric: partial }], 2).totalScore, null);
  assert.equal(rubric.summarizeScores([{ score: 10, rubric: full }, { score: 10 }], 2).totalScore, null);
  assert.equal(rubric.summarizeScores([{ score: 8 }], 2).provisional, true);
});
for (const provider of ['ollama', 'openai', 'gemini', 'groq']) {
  test(`${provider}: evaluation and summary keep provider contracts and server scores`, async () => {
    let output = fixture();
    const fetch = async (_url, options) => {
      const body = JSON.parse(options.body);
      const prompt = JSON.stringify(body);
      assert.ok(prompt.includes('C01')); assert.ok(prompt.includes('意見。'));
      const text = JSON.stringify(output);
      return new Response(JSON.stringify(provider === 'ollama' ? { message: { content: text } } : provider === 'gemini' ? { candidates: [{ content: { parts: [{ text }] } }] } : { choices: [{ message: { content: text } }] }));
    };
    const globals = { fetch, Response, AbortSignal, console: { info() {} }, process: { env: { CV_AI_PROVIDER: provider, OPENAI_API_KEY: 'test', GOOGLE_API_KEY: 'test', GROQ_API_KEY: 'test' } } };
    const evaluation = load('src/lib/interview-evaluation.ts', { './interview-rubric': rubric }, globals);
    const result = await evaluation.evaluateAnswer({ cvText: '', language: 'ja', targetRole: 'Engineer', question: '?', userAnswer: context.answer, interviewType: 'mixed', questionType: 'behavioral', questionIndex: 0, totalQuestions: 1 });
    assert.equal(result.score, 10); assert.equal(result.rubric.totalScore, 100); assert.ok(result.suggestion);
    output = { strengths: ['Câu 1: 意見。'], weaknesses: [], improvementTips: ['Luyện ví dụ.'], totalScore: 1, grade: 'D' };
    const summary = load('src/lib/interview-summary.ts', { './interview-rubric': rubric }, globals);
    const final = await summary.generateSummary({ sessionTitle: 'test', interviewType: 'mixed', totalQuestions: 1, answers: [{ question: '?', answer: context.answer, score: result.score, rubric: result.rubric, feedback: result.feedback, question_type: 'behavioral' }] });
    assert.equal(final.totalScore, 100); assert.equal(final.grade, 'A');
  });
}
test('server verifies quoted step order and Japanese data availability', () => {
  const input = fixture();
  [input.structure.steps[0], input.structure.steps[1]] = [input.structure.steps[1], input.structure.steps[0]];
  const result = rubric.parseRubric(input, context);
  assert.equal(result.structure.ordered, false);
  assert.equal(result.criteria[2].level, 2);
  const noJapanese = fixture();
  noJapanese.criteria.forEach(c => { c.evidence = 'Hello'; });
  noJapanese.structure.steps.forEach(s => { s.present = false; s.evidence = ''; });
  assert.equal(rubric.parseRubric(noJapanese, { ...context, answer: 'Hello' }).criteria[4].status, 'insufficient_data');
});
test('generation schema requires five criteria and four structure steps', () => {
  const fields = rubric.rubricSchema.properties;
  assert.equal(fields.criteria.minItems, 5);
  assert.equal(fields.criteria.maxItems, 5);
  assert.equal(fields.structure.properties.steps.minItems, 4);
  assert.equal(fields.structure.properties.steps.maxItems, 4);
  const missing = fixture(); missing.criteria.pop();
  assert.throws(() => rubric.parseRubric(missing, context), /năm tiêu chí/);
  const extra = fixture(); extra.criteria.push({ ...extra.criteria[0] });
  assert.throws(() => rubric.parseRubric(extra, context), /năm tiêu chí/);
  const wrongShape = fixture(); wrongShape.criteria = Object.fromEntries(wrongShape.criteria.map(c => [c.id, c]));
  assert.throws(() => rubric.parseRubric(wrongShape, context), /năm tiêu chí/);
});
test('local evaluation uses compact prompt, warm model and a bounded longer timeout', async () => {
  let timeoutMs;
  const evaluation = load('src/lib/interview-evaluation.ts', { './interview-rubric': rubric }, {
    process: { env: { CV_AI_PROVIDER: 'ollama' } }, console: { info() {} },
    AbortSignal: { timeout(ms) { timeoutMs = ms; return undefined; } },
    fetch: async (_url, options) => {
      const body = JSON.parse(options.body);
      assert.equal(body.keep_alive, '5m');
      assert.equal(body.messages[0].content, rubric.LOCAL_RUBRIC_PROMPT);
      assert.ok(!body.messages[0].content.includes('"additionalProperties"'));
      assert.equal(body.format.properties.criteria.minItems, 5);
      return new Response(JSON.stringify({ message: { content: JSON.stringify(fixture()) }, done_reason: 'stop' }));
    },
  });
  await evaluation.evaluateAnswer({ cvText: '', language: 'ja', targetRole: 'Engineer', question: '?', userAnswer: context.answer, interviewType: 'mixed', questionType: 'behavioral', questionIndex: 0, totalQuestions: 1 });
  assert.equal(timeoutMs, 120000);
});
test('truncated local output is rejected rather than scored', async () => {
  const evaluation = load('src/lib/interview-evaluation.ts', { './interview-rubric': rubric }, {
    process: { env: {} }, console: { info() {} }, AbortSignal,
    fetch: async () => new Response(JSON.stringify({ message: { content: '{}' }, done_reason: 'length' })),
  });
  await assert.rejects(evaluation.evaluateAnswer({ userAnswer: context.answer }), /giới hạn đầu ra/);
});
test('local schema restricts evidence to supplied answer sentences', () => {
  const schema = rubric.localRubricSchema(context.answer);
  const evidence = schema.properties.criteria.items.properties.evidence.enum;
  assert.ok(evidence.includes('意見。'));
  assert.ok(!evidence.includes('Engineer'));
  assert.ok(!evidence.includes('invented'));
  assert.ok(evidence.includes(''));
  assert.equal(schema.properties.structure.properties.steps.items.properties.evidence, schema.properties.criteria.items.properties.evidence);
});
test('unpunctuated answers cannot force a full long answer into each evidence field', () => {
  const answer = 'あ'.repeat(2000);
  const evidence = rubric.localRubricSchema(answer).properties.criteria.items.properties.evidence.enum;
  assert.ok(evidence.every(quote => quote.length <= 160));
  assert.ok(evidence.every(quote => answer.includes(quote)));
});
test('summary normalizes surplus, blank and duplicate comments without changing scores', () => {
  const summary = load('src/lib/interview-summary.ts', { './interview-rubric': rubric });
  const parsed = summary.parseSummaryComments({ strengths: [' A ', '', 'A', 'B', 'C'], weaknesses: [' ', 'W'], improvementTips: [' ', 'Practice', 'Extra'] });
  assert.equal(JSON.stringify(parsed), JSON.stringify({ strengths: ['A', 'B'], weaknesses: ['W'], improvementTips: ['Practice'] }));
  for (const strengths of [undefined, null, 'text', [{ text: 'Not a string' }], [null]]) {
    assert.throws(() => summary.parseSummaryComments({ strengths, weaknesses: [], improvementTips: ['Practice'] }), /strengths/);
  }
  assert.throws(() => summary.parseSummaryComments({ strengths: [], weaknesses: [], improvementTips: [' '] }), /Thiếu việc luyện lại/);
});
test('summary prompt and schema request only summary fields, not answer evaluation', async () => {
  const summary = load('src/lib/interview-summary.ts', { './interview-rubric': rubric }, {
    process: { env: { CV_AI_PROVIDER: 'ollama' } }, AbortSignal,
    fetch: async (_url, options) => {
      const body = JSON.parse(options.body);
      assert.equal(body.format.properties.strengths.maxItems, 2);
      assert.equal(body.format.properties.weaknesses.maxItems, 2);
      assert.equal(body.format.properties.improvementTips.minItems, 1);
      assert.equal(body.format.properties.improvementTips.maxItems, 1);
      assert.ok(!body.messages[0].content.includes('Chấm đúng 5 tiêu chí'));
      return new Response(JSON.stringify({ message: { content: JSON.stringify({ strengths: ['A', 'B', 'C'], weaknesses: [], improvementTips: ['Practice'] }) } }));
    },
  });
  const result = await summary.generateSummary({ sessionTitle: 'test', interviewType: 'mixed', totalQuestions: 1, answers: [{ question: '?', answer: 'text', score: 8, feedback: '', question_type: 'behavioral' }] });
  assert.equal(result.strengths.length, 2); assert.equal(result.totalScore, 80);
});

test('missing positive-score evidence excludes only that criterion from provisional scores', () => {
  const input = fixture();
  input.criteria[0].evidence = '   ';
  const result = rubric.parseRubric(input, context);
  assert.equal(result.criteria[0].status, 'insufficient_data');
  assert.equal(result.criteria[0].level, null);
  assert.match(result.criteria[0].reason, /AI chưa cung cấp/);
  assert.equal(result.assessedCount, 4);
  assert.equal(result.provisional, true);
  assert.equal(result.totalScore, 100);
  assert.equal(rubric.summarizeScores([{ rubric: result }], 1).grade, 'Chưa xếp loại');
});
test('context exclusions and zero scores allow empty evidence', () => {
  const input = fixture();
  input.criteria[0].level = 0;
  input.criteria[0].evidence = '';
  input.criteria[3].evidence = '';
  input.criteria[4].evidence = '';
  const result = rubric.parseRubric(input, { ...context, language: 'vi', targetRole: null });
  assert.equal(result.criteria[0].status, 'scored');
  assert.equal(result.criteria[0].level, 0);
  assert.equal(result.criteria[3].status, 'insufficient_data');
  assert.equal(result.criteria[4].status, 'not_applicable');
});
test('derived positive C03 score also requires evidence', () => {
  const input = fixture();
  input.criteria[2].level = 0;
  input.criteria[2].evidence = '';
  const result = rubric.parseRubric(input, context);
  assert.equal(result.criteria[2].level, null);
  assert.equal(result.structure.status, 'insufficient_data');
  assert.equal(result.structure.ordered, null);
});
