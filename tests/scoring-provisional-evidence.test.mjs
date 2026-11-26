import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers/weakness-practice-fixtures.mjs';

const rubric = load('src/lib/interview-rubric.ts');

test('findVerbatimEvidenceSpan matches whitespace and bracket variants to verbatim answer span', () => {
  const answer = 'はい、Web開発で培った『新しい技術を素早く学ぶ力』と\n「設計視点」を活かしたいです。';
  // AI replaced 『』 with 「」 and collapsed newline
  const aiQuote = '「新しい技術を素早く学ぶ力」と「設計視点」を活かしたいです。';
  const matched = rubric.findVerbatimEvidenceSpan(answer, aiQuote);
  assert.ok(matched);
  assert.equal(answer.includes(matched), true);

  // Fabricated quote must still return null
  assert.equal(rubric.findVerbatimEvidenceSpan(answer, '東京の会社で10年働きました'), null);
});

test('computeProvisionalAverage averages valid scores even when some answers are null', () => {
  const avg = rubric.computeProvisionalAverage([
    { score: 3.59 },
    { score: 5 },
    { score: null },
    { score: null },
  ]);
  assert.equal(avg, 43);
});

test('evaluateAnswer retries once on evidence mismatch for cloud providers', async () => {
  const answer = 'はい、Next.jsで決済機能を実装しました。';
  const base = {
    criteria: [
      { id: 'C01', status: 'scored', level: 3, evidence: 'Next.jsで決済機能を実装しました', reason: 'Đúng trọng tâm.' },
      { id: 'C02', status: 'scored', level: 3, evidence: 'Next.jsで決済機能を実装しました', reason: 'Có ví dụ.' },
      { id: 'C03', status: 'scored', level: 1, evidence: 'はい、Next.jsで決済機能を実装しました。', reason: 'Thiếu Reason/Example.' },
      { id: 'C04', status: 'scored', level: 3, evidence: '決済機能を実装しました', reason: 'Phù hợp.' },
      { id: 'C05', status: 'scored', level: 4, evidence: 'はい、Next.jsで決済機能を実装しました。', reason: 'Rõ ràng.' },
    ],
    structure: {
      method: 'PREP',
      steps: [
        { present: true, evidence: 'はい、Next.jsで決済機能を実装しました。' },
        { present: false, evidence: '' },
        { present: false, evidence: '' },
        { present: false, evidence: '' },
      ],
      ordered: false,
    },
    strengths: ['Nêu được công nghệ: Next.jsで決済機能を実装しました'],
    weaknesses: ['Thiếu phần lý do và ví dụ chi tiết'],
    practice: 'Bổ sung Reason và Example theo PREP.',
  };

  const badFirst = JSON.parse(JSON.stringify(base));
  badFirst.criteria[0].evidence = 'fabricated quote not in answer';

  let calls = 0;
  const fetch = async () => {
    calls++;
    const payload = calls === 1 ? badFirst : base;
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }] }));
  };

  const evaluation = load(
    'src/lib/interview-evaluation.ts',
    {
      'server-only': {},
      './interview-rubric': rubric,
      './ai-config': { getAiConfig: () => ({ provider: 'gemini', geminiModel: 'gemini-2.5-flash', geminiApiKey: 'test' }) },
      './gemini-retry': { fetchGeminiWithRetry: fetch, GeminiUnavailableError: Error },
    },
    { fetch, Response, AbortSignal, console: { info() {} }, process: { env: {} } },
  );

  const result = await evaluation.evaluateAnswer({
    cvText: '', language: 'ja', targetRole: 'Engineer',
    question: '?', userAnswer: answer,
    interviewType: 'mixed', questionType: 'behavioral', questionIndex: 0, totalQuestions: 1,
  });

  assert.equal(calls, 2);
  assert.ok(result.score !== null && result.score > 0);
});
