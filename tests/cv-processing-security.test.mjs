import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(file, dependencies = {}, globals = {}) {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, require(name) {
    if (name === 'server-only') return {};
    if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
    return dependencies[name];
  }, ...globals });
  return exports;
}
const schema = load('src/lib/cv-schema.ts');
const gemini = load('src/lib/gemini-cv-response.ts');
const cvText = 'Candidate Nguyen Van A. Software engineer experienced in TypeScript and React.';
const env = {
  OPENAI_API_KEY: 'openai-secret', GEMINI_API_KEY: 'gemini-secret',
  GROQ_API_KEY: 'groq-secret', GOOGLE_CLOUD_VISION_API_KEY: 'vision-secret',
  DATABASE_URL: 'private-database-canary', SUPABASE_SERVICE_ROLE_KEY: 'private-service-canary',
};
function setup(provider, { scan = false, failure = false } = {}) {
  const calls = [];
  const config = { provider, geminiApiKey: env.GEMINI_API_KEY, groqApiKey: env.GROQ_API_KEY,
    geminiModel: 'gemini-2.5-flash', groqModel: 'test-model', ollamaModel: 'test-model' };
  const cvProcessor = load('src/lib/cv-processing.ts', {
    '@/lib/cv-schema': schema, './ai-config': { getAiConfig: () => config },
    './gemini-cv-response': gemini,
    mammoth: { extractRawText: async () => ({ value: cvText, messages: [] }) },
    'pdf-parse/worker': { getPath: () => 'mock-worker' },
    'pdf-parse': { PDFParse: class { static setWorker() {} async getText() { return { text: '' }; } async destroy() {} } },
  }, { Buffer, AbortSignal, process: { env }, setTimeout,
    fetch: async (url, options) => {
      calls.push({ url, options });
      if (url.includes('vision.googleapis.com')) return Response.json({ responses: [{ fullTextAnnotation: { text: cvText } }] });
      if (url.endsWith('/api/tags')) return Response.json({ models: [{ name: 'test-model' }] });
      if (failure) return Response.json({ error: { message: Object.values(env).join(' ') } }, { status: 400 });
      const content = JSON.stringify(schema.emptyCv);
      return Response.json({ message: { content }, choices: [{ message: { content } }],
        candidates: [{ finishReason: 'STOP', content: { parts: [{ text: content }] } }] });
    },
  });
  const file = new File([scan ? '%PDF-fake-scan' : Buffer.from([0x50, 0x4b, 0x03, 0x04])], scan ? 'cv.pdf' : 'cv.docx');
  return { calls, run: () => cvProcessor.processCv(file) };
}
for (const provider of ['openai', 'gemini', 'groq', 'ollama']) {
  test(`${provider}: CV still parses, only intended credentials leave in headers, redirects disabled`, async () => {
    const { run, calls } = setup(provider);
    assert.equal(JSON.stringify((await run()).data), JSON.stringify(schema.emptyCv));
    const hosts = { openai: 'api.openai.com', gemini: 'generativelanguage.googleapis.com', groq: 'api.groq.com', ollama: '127.0.0.1' };
    for (const { url, options } of calls) {
      assert.equal(new URL(url).hostname, hosts[provider]);
      assert.equal(options.redirect, 'error');
      for (const secret of Object.values(env)) {
        assert.ok(!url.includes(secret));
        assert.ok(!(options.body || '').includes(secret));
      }
      const headers = new Headers(options.headers);
      assert.equal(headers.get('authorization'), ['openai', 'groq'].includes(provider) ? `Bearer ${env[`${provider.toUpperCase()}_API_KEY`]}` : null);
      assert.equal(headers.get('x-goog-api-key'), provider === 'gemini' ? env.GEMINI_API_KEY : null);
      assert.ok(!JSON.stringify(options).includes(env.DATABASE_URL));
      assert.ok(!JSON.stringify(options).includes(env.SUPABASE_SERVICE_ROLE_KEY));
    }
    assert.ok(calls.at(-1).options.body.includes(cvText));
  });
}
test('OCR sends only the uploaded PDF and authenticates outside the URL', async () => {
  const { run, calls } = setup('gemini', { scan: true });
  await run();
  const { url, options } = calls[0];
  assert.equal(url, 'https://vision.googleapis.com/v1/files:annotate');
  assert.equal(new Headers(options.headers).get('x-goog-api-key'), env.GOOGLE_CLOUD_VISION_API_KEY);
  assert.equal(options.redirect, 'error');
  assert.equal(JSON.parse(options.body).requests[0].inputConfig.content, Buffer.from('%PDF-fake-scan').toString('base64'));
});
for (const provider of ['gemini', 'groq']) {
  test(`${provider}: upstream errors cannot echo credentials to the caller`, async () => {
    const { run } = setup(provider, { failure: true });
    await assert.rejects(run(), error => {
      for (const secret of Object.values(env)) assert.ok(!error.message.includes(secret));
      return true;
    });
  });
}

for (const feature of ['questions', 'summary', 'checker']) {
  test(`${feature}: Gemini credentials stay in headers and redirects are blocked`, async () => {
    const calls = [];
    const logs = [];
    const dependencies = { './ai-config': { getAiConfig: () => ({ provider: 'gemini', geminiModel: 'test-model', geminiApiKey: 'gemini-secret' }) } };
    const globals = { AbortSignal, process: { env }, console: { error: (...args) => logs.push(args) },
      fetch: async (url, options) => {
        calls.push({ url, options });
        return Response.json({ error: { message: 'private-database-canary' } }, { status: 400 });
      } };
    let run;
    if (feature === 'questions') {
      const api = load('src/lib/interview-generation.ts', dependencies, globals);
      run = () => api.generateInterviewQuestions({ cv: schema.emptyCv, role: 'Engineer', company: null, jobDescription: null, level: 'N3', count: 1 });
    } else if (feature === 'summary') {
      dependencies['./interview-rubric'] = load('src/lib/interview-rubric.ts');
      const api = load('src/lib/interview-summary.ts', dependencies, globals);
      run = () => api.generateSummary({ sessionTitle: 'Test', totalQuestions: 1, answers: [] });
    } else {
      dependencies['../../ai-config'] = dependencies['./ai-config'];
      for (const [file, name] of [['jiko-pr', 'JIKO_PR'], ['shibou-douki', 'SHIBOU_DOUKI'], ['work-experience', 'WORK_EXPERIENCE']]) {
        dependencies[`./prompts/${file}.prompt`] = load(`src/lib/cv-checker/llm-analyzers/prompts/${file}.prompt.ts`);
        assert.ok(dependencies[`./prompts/${file}.prompt`][`${name}_ANALYZER_PROMPT`]);
      }
      const api = load('src/lib/cv-checker/llm-analyzers/index.ts', dependencies, globals);
      run = () => api.runLlmAnalyzers({ jikoPrText: cvText });
    }
    await run().catch(() => {});
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://generativelanguage.googleapis.com/v1beta/models/test-model:generateContent');
    assert.equal(new Headers(calls[0].options.headers).get('x-goog-api-key'), 'gemini-secret');
    assert.equal(calls[0].options.redirect, 'error');
    assert.ok(!JSON.stringify(logs).includes('private-database-canary'));
  });
}

test('question generation does not return raw Groq error details', async () => {
  const api = load('src/lib/interview-generation.ts', {
    './ai-config': { getAiConfig: () => ({ provider: 'groq', groqModel: 'test', groqApiKey: 'groq-secret' }) },
  }, { AbortSignal, process: { env }, fetch: async () => new Response('groq-secret', { status: 400 }) });
  await assert.rejects(api.generateInterviewQuestions({ cv: schema.emptyCv, role: 'Engineer', company: null, jobDescription: null, level: 'N3', count: 1 }), error => {
    assert.ok(!error.message.includes('groq-secret'));
    return true;
  });
});
