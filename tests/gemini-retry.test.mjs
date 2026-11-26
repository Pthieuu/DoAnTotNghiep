import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(fetch) {
  const source = ts.transpileModule(fs.readFileSync('src/lib/gemini-retry.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  const warnings = [];
  vm.runInNewContext(source, { exports, fetch, Date, AbortSignal, console: { warn: detail => warnings.push(detail) },
    setTimeout: callback => { callback(); return 0; } });
  return { retry: exports.fetchGeminiWithRetry, warnings };
}

test('retry failure reports upstream status and actual attempt count without request contents', async () => {
  const { retry, warnings } = load(async () => new Response('', { status: 503 }));
  await assert.rejects(retry('https://example.test', { method: 'POST', body: 'private answer' }), error => {
    assert.equal(error.lastStatus, 503);
    assert.equal(error.attempts, 3);
    assert.doesNotMatch(error.message, /private answer/);
    return true;
  });
  assert.equal(warnings.length, 3);
});
