import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

export function load(file, dependencies = {}, globals = {}) {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, Error, Response, AbortSignal, ...globals, require: name => {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
    return dependencies[name];
  } });
  return exports;
}

export const plain = value => JSON.parse(JSON.stringify(value));
export const rubric = load('src/lib/interview-rubric.ts');
export const cvSchema = load('src/lib/cv-schema.ts');
export const practice = load('src/lib/weakness-practice.ts', { './interview-rubric': rubric });
export const sessionQuery = load('src/lib/interview-session-query.ts');
export const sourceId = '11111111-1111-4111-8111-111111111111';
export const userId = 'user-1';
export const question = '経験を教えてください。';
export const answerText = 'チームで開発しました。';

export function answers() {
  return [{ questionIndex: 0, question, answer: answerText, rubric: {
    version: rubric.RUBRIC_VERSION,
    criteria: rubric.CRITERIA.map(({ id }, index) => ({
      id, status: 'scored', level: index < 2 ? 1 : 4, evidence: answerText, reason: 'Cần cải thiện nội dung.',
    })),
    practice: 'Nêu rõ một ví dụ thực tế.',
  } }];
}

export function questions() {
  return Array.from({ length: 4 }, (_, index) => ({
    text: `Bạn sẽ giải thích ý ${index + 1} như thế nào?`, translation: `考え${index + 1}をどのように説明しますか？`,
    focus: 'behavioral', cvEvidence: null,
  }));
}

export function sourceSession(overrides = {}) {
  return {
    id: sourceId, user_id: userId, title: 'Engineer', target_role: 'Backend Engineer', company: 'Company',
    status: 'completed', questions: [{ text: question }], cv_id: null, cv_snapshot: { ...cvSchema.emptyCv, skills: ['TypeScript'] },
    job_description: 'Build APIs', level: 'N3', interview_type: 'mixed', interview_language: 'ja', ...overrides,
  };
}

export function generationInput(overrides = {}) {
  const source = sourceSession();
  return {
    cv: source.cv_snapshot, role: source.target_role, company: source.company,
    jobDescription: source.job_description, level: source.level,
    interviewType: source.interview_type, interviewLanguage: source.interview_language,
    selectedCriteria: ['C01', 'C02'], answers: answers(), ...overrides,
  };
}

export function loadGeneration(generator) {
  return load('src/lib/weakness-practice-generation.ts', {
    'server-only': {}, './cv-schema': cvSchema, './interview-rubric': rubric,
    './weakness-practice': practice, './interview-generation': { generateInterviewQuestions: generator },
  });
}
