import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import ts from 'typescript';

function load(filePath, dependencies = {}, globals = {}) {
  const source = ts.transpileModule(fs.readFileSync(filePath, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  const require = (name) => {
    if (name === 'server-only') return {};
    if (dependencies[name]) return dependencies[name];
    if (name.endsWith('.json')) {
      const resolved = path.resolve(path.dirname(filePath), name);
      return JSON.parse(fs.readFileSync(resolved, 'utf8'));
    }
    return {};
  };
  vm.runInNewContext(source, { exports, require, console, ...globals });
  return exports;
}

const cvSchema = load('src/lib/cv-schema.ts');

// Create mock sessionStorage
class MockSessionStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

test('estimateInterviewDuration: maps question counts to user-friendly estimated durations', () => {
  const mockStorage = new MockSessionStorage();
  const contextModule = load('src/lib/interview-session-context.ts', {
    '@/lib/cv-schema': cvSchema,
  }, {
    window: { sessionStorage: mockStorage },
    sessionStorage: mockStorage,
  });

  assert.equal(contextModule.estimateInterviewDuration(4), '~7–10 phút');
  assert.equal(contextModule.estimateInterviewDuration(5), '~8–12 phút');
  assert.equal(contextModule.estimateInterviewDuration(6), '~10–15 phút');
  assert.equal(contextModule.estimateInterviewDuration(8), '~15–20 phút');
  assert.equal(contextModule.estimateInterviewDuration(10), '~20–25 phút');
  assert.equal(contextModule.estimateInterviewDuration(15), '~30–40 phút');
});

test('Session context: read/write/clear lifecycle with mock sessionStorage', () => {
  const mockStorage = new MockSessionStorage();
  const contextModule = load('src/lib/interview-session-context.ts', {
    '@/lib/cv-schema': cvSchema,
  }, {
    window: { sessionStorage: mockStorage },
    sessionStorage: mockStorage,
  });

  // State when no context exists
  assert.equal(contextModule.getInterviewSessionContext(), null);

  const sampleContext = {
    cvFileName: 'NguyenVanA_Resume.pdf',
    companyName: 'Hokkaido Electronics',
    jobPosition: 'Web Application Engineer',
    jlptTarget: 'N2',
    companyUrl: 'https://hokkaido-electronics.co.jp',
    jobDescription: 'Backend Go/PostgreSQL development for IoT platforms',
    cvAnalysisId: '2026-11-10T09:00:00.000Z',
    checkedAt: '2026-11-10T09:00:00.000Z',
    hasCriticalIssues: false,
    cvData: null,
  };

  // Save context
  const saved = contextModule.saveInterviewSessionContext(sampleContext);
  assert.equal(saved, true);

  // Read back context
  const retrieved = contextModule.getInterviewSessionContext();
  assert.ok(retrieved);
  assert.equal(retrieved.cvFileName, 'NguyenVanA_Resume.pdf');
  assert.equal(retrieved.companyName, 'Hokkaido Electronics');
  assert.equal(retrieved.jobPosition, 'Web Application Engineer');
  assert.equal(retrieved.jlptTarget, 'N2');
  assert.equal(retrieved.hasCriticalIssues, false);

  // Clear context
  contextModule.clearInterviewSessionContext();
  assert.equal(contextModule.getInterviewSessionContext(), null);
});

test('Session context: handles corrupted or invalid storage data gracefully', () => {
  const mockStorage = new MockSessionStorage();
  const contextModule = load('src/lib/interview-session-context.ts', {
    '@/lib/cv-schema': cvSchema,
  }, {
    window: { sessionStorage: mockStorage },
    sessionStorage: mockStorage,
  });

  // Put invalid JSON
  mockStorage.setItem(contextModule.INTERVIEW_SESSION_STORAGE_KEY, 'not-a-json-string');
  assert.equal(contextModule.getInterviewSessionContext(), null);

  // Put JSON object without required cvFileName
  mockStorage.setItem(contextModule.INTERVIEW_SESSION_STORAGE_KEY, JSON.stringify({ somethingElse: true }));
  assert.equal(contextModule.getInterviewSessionContext(), null);
});

test('Quick Preferences: remembers and reads back user choices', () => {
  const mockStorage = new MockSessionStorage();
  const contextModule = load('src/lib/interview-session-context.ts', {
    '@/lib/cv-schema': cvSchema,
  }, {
    window: { sessionStorage: mockStorage },
    sessionStorage: mockStorage,
  });

  assert.equal(contextModule.getInterviewQuickPrefs(), null);

  contextModule.saveInterviewQuickPrefs({
    interviewType: 'technical',
    interviewLanguage: 'ja',
    questionCount: 8,
  });

  const prefs = contextModule.getInterviewQuickPrefs();
  assert.ok(prefs);
  assert.equal(prefs.interviewType, 'technical');
  assert.equal(prefs.interviewLanguage, 'ja');
  assert.equal(prefs.questionCount, 8);
});

test('convertParsedSectionsToCvData: outputs valid schema that passes validateCv', () => {
  const mockStorage = new MockSessionStorage();
  const contextModule = load('src/lib/interview-session-context.ts', {
    '@/lib/cv-schema': cvSchema,
  }, {
    window: { sessionStorage: mockStorage },
    sessionStorage: mockStorage,
  });

  const parsedSections = {
    fileName: 'NguyenVanA.pdf',
    fileType: 'pdf',
    rawText: 'Full raw resume content',
    personalInfoText: 'Nguyen Van A\nDa Nang, Vietnam',
    educationWorkText: '2020-2024: Danang University of Technology - Computer Science\n2023-2024: Backend Intern at Tech Co.',
    certificatesText: 'JLPT N2 (2024)\nTOEIC 850',
    skillsHobbiesText: 'Node.js, TypeScript, Docker, PostgreSQL',
    jikoPrText: '私の強みは粘り強く課題を解決することです。大学の研究やチーム開発で...',
    shibouDoukiText: '貴社の先進的なIoTソリューションと技術力に強く共感し、応募いたしました。',
    otherText: '',
    detectedHeadings: ['学歴・職歴', '免許・資格', '自己PR', '志望動機'],
    missingHeadings: [],
  };

  const cvData = contextModule.convertParsedSectionsToCvData(parsedSections);

  assert.ok(cvData);
  assert.equal(cvData.fullName, 'Nguyen Van A');
  assert.ok(cvData.summary.includes('私の強み'));
  assert.ok(cvData.motivation.includes('貴社の先進的'));
  assert.ok(cvData.education.length > 0);
  assert.ok(cvData.certificates.length > 0);
  assert.ok(cvData.skills.length > 0);

  // Validate using strict schema
  const isValid = cvSchema.validateCv(cvData);
  assert.equal(isValid, true, 'Resulting CvData must strictly pass validateCv');
});

