import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import * as jsxRuntime from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import { load, plain, rubric, practice, cvSchema, sourceId, userId, sourceSession, questions, sessionQuery } from './helpers/weakness-practice-fixtures.mjs';
import { componentHarness, nodes, content } from './helpers/component-harness.mjs';

const answerText = '意見。理由。具体例。結論。';
const Link = { __esModule: true, default: props => jsxRuntime.jsx('a', props) };

function evaluationDraft(firstLevel = 2, secondLevel = 3) {
  return {
    criteria: rubric.CRITERIA.map(({ id }, index) => ({
      id, status: 'scored', level: index === 0 ? firstLevel : index === 1 ? secondLevel : 4,
      evidence: '意見。', reason: 'Nội dung thể hiện trong câu trả lời.',
    })),
    structure: { method: 'PREP', ordered: true, steps: ['意見。', '理由。', '具体例。', '結論。'].map(evidence => ({ present: true, evidence })) },
    strengths: ['Có ví dụ: 具体例。'], weaknesses: ['Cần làm rõ ý chính.'], practice: 'Trình bày ý chính trước ví dụ.',
  };
}

function journeyFixture({ dropCreatedResponse = false } = {}) {
  const state = { ai: { generation: 0, evaluation: 0, summary: 0 }, requests: [], navigation: [], dropped: false };
  const sourceRubric = rubric.parseRubric(evaluationDraft(1, 1), { answer: answerText, language: 'ja', targetRole: 'Backend Engineer' });
  const initialSummary = {
    ...rubric.summarizeScores([{ score: sourceRubric.totalScore / 10, rubric: sourceRubric }], 1),
    strengths: ['Có căn cứ.'], weaknesses: ['Cần làm rõ ý chính.'], improvementTips: ['Nêu ví dụ cụ thể.'],
  };
  const sessions = new Map([[sourceId, sourceSession({
    questions: [{ text: '経験を教えてください。', translation: 'Hãy kể về kinh nghiệm.', focus: 'behavioral' }],
    question_count: 1, summary_json: initialSummary,
  })]]);
  const storedAnswers = [{ session_id: sourceId, question_index: 0, answer: answerText,
    rubric_json: plain(sourceRubric), score: sourceRubric.totalScore / 10, feedback: 'Feedback' }];

  function query(table) {
    const filters = {};
    let insert;
    let update;
    function execute() {
      const list = table === 'interview_sessions' ? [...sessions.values()] : storedAnswers;
      if (insert) {
        if (table === 'interview_sessions') {
          if ([...sessions.values()].some(session => session.user_id === insert.user_id
            && session.practice_idempotency_key === insert.practice_idempotency_key)) return { data: null, error: { code: '23505' } };
          assert.equal(sessions.get(insert.source_session_id).user_id, insert.user_id);
          const session = { id: randomUUID(), summary_json: null, ...plain(insert) };
          sessions.set(session.id, session);
          return { data: [session], error: null };
        }
        assert.ok(!storedAnswers.some(row => row.session_id === insert.session_id && row.question_index === insert.question_index));
        storedAnswers.push(plain(insert));
        return { data: [insert], error: null };
      }
      const found = list.filter(row => Object.entries(filters).every(([key, value]) => row[key] === value));
      if (update) found.forEach(row => Object.assign(row, plain(update)));
      return { data: found, error: null };
    }
    const builder = {
      select: () => builder,
      eq: (key, value) => { filters[key] = value; return builder; },
      insert: value => { insert = value; return builder; },
      update: value => { update = value; return builder; },
      maybeSingle: async () => { const result = execute(); return { ...result, data: result.data?.[0] ?? null }; },
      single: async () => { const result = execute(); return { ...result, data: result.data?.[0] ?? null }; },
      order: async key => { const result = execute(); result.data?.sort((a, b) => a[key] - b[key]); return result; },
      then: (resolve, reject) => Promise.resolve(execute()).then(resolve, reject),
    };
    return builder;
  }
  const supabase = { from: query, auth: { getUser: async () => ({ data: { user: { id: userId } }, error: null }) } };
  const aiConfig = { getAiConfig: () => ({ provider: 'gemini', geminiApiKey: 'test', geminiModel: 'test' }) };
  const fakeAi = async (_url, init) => {
    const prompt = JSON.parse(init.body).contents[0].parts[0].text;
    let output;
    if (prompt.includes('You create practical spoken interview questions')) {
      state.ai.generation++;
      output = { questions: questions().map((question, index) => ({ ...question, text: `考え${index + 1}をどのように説明しますか？` })) };
    } else if (prompt.includes('Chỉ trả JSON gồm đúng 3 trường')) {
      state.ai.summary++;
      output = { strengths: ['Có ví dụ cụ thể.'], weaknesses: ['Cần làm rõ ý chính.'], improvementTips: ['Luyện nêu ý chính ngắn gọn.'] };
    } else {
      state.ai.evaluation++;
      output = evaluationDraft();
    }
    return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify(output) }] } }] });
  };
  const aiDependencies = { 'server-only': {}, './ai-config': aiConfig, './interview-rubric': rubric };
  const generator = load('src/lib/interview-generation.ts', aiDependencies, { fetch: fakeAi });
  const retry = load('src/lib/gemini-retry.ts', {}, { fetch: fakeAi });
  const evaluation = load('src/lib/interview-evaluation.ts', { ...aiDependencies, './gemini-retry': retry }, { fetch: fakeAi });
  const summary = load('src/lib/interview-summary.ts', aiDependencies, { fetch: fakeAi });
  const generation = load('src/lib/weakness-practice-generation.ts', {
    'server-only': {}, './cv-schema': cvSchema, './interview-rubric': rubric, './weakness-practice': practice, './interview-generation': generator,
  });
  const progress = load('src/lib/weakness-practice-progress.ts', { './interview-rubric': rubric });
  const common = {
    '@/lib/supabase/server': { createClient: async () => supabase },
    '@/lib/auth-http': {
      json: (body, status = 200) => Response.json(body, { status }),
      checkRequest: request => request.headers.get('origin') === 'http://localhost' ? null : Response.json({ error: 'origin' }, { status: 403 }),
    },
    '@/lib/weakness-practice': practice, '@/lib/interview-rubric': rubric,
    '@/lib/interview-session-query': sessionQuery,
    '@/lib/cv-schema': cvSchema, '@/lib/weakness-practice-generation': generation,
    '@/lib/interview-evaluation': evaluation, '@/lib/gemini-retry': retry,
    '@/lib/interview-summary': summary, '@/lib/weakness-practice-progress': progress,
  };
  const routes = Object.fromEntries(['weaknesses', 'practice', 'answers', 'summary'].map(name => [
    name, load(`src/app/api/interviews/[id]/${name}/route.ts`, common, { console: { error() {} } }),
  ]));
  async function browserFetch(url, init = {}) {
    const [, id, action] = new URL(url, 'http://localhost').pathname.match(/\/interviews\/([^/]+)\/(\w+)$/);
    const method = init.method ?? 'GET';
    state.requests.push({ id, action, method, body: init.body ? JSON.parse(init.body) : null });
    const response = await routes[action][method](new Request(new URL(url, 'http://localhost'), {
      ...init, headers: { ...init.headers, origin: 'http://localhost' },
    }), { params: Promise.resolve({ id }) });
    if (dropCreatedResponse && !state.dropped && action === 'practice' && response.status === 201) {
      state.dropped = true;
      throw new Error('Lost response after session was saved');
    }
    return response;
  }
  const harnesses = [];
  function mountPanel(sessionId, continuePractice = false) {
    const harness = componentHarness();
    harnesses.push(harness);
    const { default: Panel } = load('src/components/weakness-practice-panel.tsx', {
      react: harness.hooks, 'react/jsx-runtime': jsxRuntime, 'next/link': Link,
      'next/navigation': { useRouter: () => ({ push: url => state.navigation.push(url) }) },
    }, { fetch: browserFetch, AbortController, crypto: { randomUUID } });
    harness.mount(Panel, { sessionId, continuePractice });
    return harness;
  }
  const { default: Report } = load('src/components/weakness-practice-progress.tsx', { 'react/jsx-runtime': jsxRuntime, 'next/link': Link });
  async function openSummary(sessionId) {
    const { default: Page } = load('src/app/summary/page.tsx', {
      'react/jsx-runtime': jsxRuntime, 'next/navigation': { redirect: () => { throw new Error('Unexpected redirect'); } },
      '@/lib/auth': { getUser: async () => ({ id: userId }) }, '@/lib/supabase/server': common['@/lib/supabase/server'],
      '@/lib/weakness-practice': practice,
      '@/lib/interview-session-query': sessionQuery,
      '@/components/dashboard-shell': { default: () => null }, './client-page': { default: () => null },
    });
    const page = await Page({ searchParams: Promise.resolve({ sessionId }) });
    const harness = componentHarness();
    harnesses.push(harness);
    const { default: Client } = load('src/app/summary/client-page.tsx', {
      react: harness.hooks, 'react/jsx-runtime': jsxRuntime, 'next/link': Link,
      '@/components/icon': { __esModule: true, default: () => null },
      '@/components/weakness-practice-panel': { __esModule: true, default: props => jsxRuntime.jsx('div', { children: props.continuePractice ? 'Luyện tiếp điểm yếu' : 'Luyện tập điểm yếu' }) },
      '@/components/weakness-practice-progress': { __esModule: true, default: Report },
    }, { fetch: browserFetch, AbortController });
    harness.mount(Client, page.props.children.props);
    await harness.settle();
    return { html: renderToStaticMarkup(harness.tree), props: page.props.children.props };
  }
  return { state, sessions, storedAnswers, browserFetch, mountPanel, openSummary,
    cleanup: () => harnesses.forEach(harness => harness.unmount()) };
}

for (const dropCreatedResponse of [false, true]) {
  test(`journey: source results → selected practice → full rubric → progress → reload → practice again${dropCreatedResponse ? ' with lost creation response' : ''}`, async () => {
    const fixture = journeyFixture({ dropCreatedResponse });
    try {
      const oldSummary = await fixture.openSummary(sourceId);
      assert.ok(oldSummary.html.includes('Kết quả phỏng vấn'));
      assert.equal(oldSummary.props.practice, null);
      const panel = fixture.mountPanel(sourceId);
      await panel.settle();
      const selected = nodes(panel.tree, node => node.type === 'input');
      assert.equal(selected.length, 2);
      selected.forEach(checkbox => checkbox.props.onChange());
      panel.render();
      const create = () => nodes(panel.tree, node => node.type === 'button' && /Luyện tập điểm yếu|Thử lại tạo/.test(content(node)))[0];
      create().props.onClick();
      await panel.settle();
      if (dropCreatedResponse) {
        assert.match(content(panel.tree), /Lost response/);
        assert.equal(fixture.sessions.size, 2);
        create().props.onClick();
        await panel.settle();
        const creates = fixture.state.requests.filter(request => request.action === 'practice');
        assert.deepEqual(creates[0].body, creates[1].body);
      }
      const practiceId = new URL(fixture.state.navigation[0], 'http://localhost').searchParams.get('sessionId');
      const created = fixture.sessions.get(practiceId);
      assert.equal(created.source_session_id, sourceId);
      assert.deepEqual(created.selected_criteria, ['C01', 'C02']);
      assert.equal(created.questions.length, 4);
      assert.equal(created.practice_context.previousAnswers[0].answer, answerText);
      assert.equal(fixture.state.ai.generation, 1);

      for (let index = 0; index < 4; index++) {
        const response = await fixture.browserFetch(`/api/interviews/${practiceId}/answers`, {
          method: 'POST', body: JSON.stringify({ questionIndex: index, answer: answerText }),
        });
        assert.equal(response.status, 200);
        assert.equal((await response.json()).completed, index === 3);
      }
      assert.equal(fixture.sessions.get(practiceId).status, 'completed');
      assert.equal(fixture.state.ai.evaluation, 4);
      assert.ok(fixture.storedAnswers.filter(row => row.session_id === practiceId).every(row => row.rubric_json.criteria.length === 5));

      const newSummary = await fixture.openSummary(practiceId);
      assert.ok(newSummary.html.includes('Kết quả luyện tập điểm yếu'));
      assert.ok(newSummary.html.includes('Tăng +1'));
      assert.ok(newSummary.html.includes('Tăng +2'));
      assert.ok(newSummary.html.includes(`/summary?sessionId=${sourceId}`));
      assert.ok(newSummary.html.includes('hai bộ câu hỏi khác nhau'));
      assert.ok(newSummary.html.includes('Luyện tiếp điểm yếu'));
      assert.equal(fixture.state.ai.summary, 1);

      const reloaded = await fixture.openSummary(practiceId);
      assert.equal(reloaded.props.practice.sourceSessionId, sourceId);
      assert.ok(reloaded.html.includes('Tăng +1'));
      assert.equal(fixture.state.ai.summary, 1);
      const next = fixture.mountPanel(practiceId, true);
      await next.settle();
      const remaining = nodes(next.tree, node => node.type === 'input');
      assert.equal(remaining.length, 1);
      assert.equal(remaining[0].props.value, 'C01');
      remaining[0].props.onChange();
      next.render();
      nodes(next.tree, node => node.type === 'button' && content(node) === 'Luyện tiếp điểm yếu')[0].props.onClick();
      await next.settle();
      const nextId = new URL(fixture.state.navigation[1], 'http://localhost').searchParams.get('sessionId');
      assert.equal(fixture.sessions.get(nextId).source_session_id, practiceId);
      assert.equal(fixture.sessions.size, 3);
    } finally {
      fixture.cleanup();
    }
  });
}
