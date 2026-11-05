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

const personalInfoRule = load('src/lib/cv-checker/rule-engine/rules/personal-info.rule.ts');
const educationWorkRule = load('src/lib/cv-checker/rule-engine/rules/education-work.rule.ts');
const certificateRule = load('src/lib/cv-checker/rule-engine/rules/certificate.rule.ts');
const skillsRule = load('src/lib/cv-checker/rule-engine/rules/skills.rule.ts');
const formattingRule = load('src/lib/cv-checker/rule-engine/rules/formatting.rule.ts');

const ruleEngine = load('src/lib/cv-checker/rule-engine/index.ts', {
  './rules/personal-info.rule': personalInfoRule,
  './rules/education-work.rule': educationWorkRule,
  './rules/certificate.rule': certificateRule,
  './rules/skills.rule': skillsRule,
  './rules/formatting.rule': formattingRule,
});

test('Rule Engine: flags Credly as critical error', () => {
  const sample = {
    rawText: '免許・資格: 2025年05月 Credly バッジ AWS Certified Cloud Practitioner 取得',
    fileName: 'NguyenVanA_CV_Rakuten.pdf',
    fileType: 'pdf',
    personalInfoText: '氏名: グエン・ヴァン・アー\n2026年03月03日現在',
    educationWorkText: 'フォンドン大学／ソフトウェアサイエンス学部\n以上',
    certificatesText: '2025年05月 Credly バッジ AWS Certified Cloud Practitioner 取得',
    skillsHobbiesText: '【バックエンド】：Java\n【フロントエンド】：React',
    jikoPrText: '私の強みは粘り強さです。',
    shibouDoukiText: '貴社のEC事業に貢献したいと考え志望しました。',
    otherText: '',
    detectedHeadings: ['学歴・職歴', '免許・資格', '自己PR', '志望動機'],
    missingHeadings: [],
  };

  const issues = ruleEngine.runRuleEngine(sample);
  const credlyIssue = issues.find((i) => i.ruleCode === 'RULE_CREDLY_BANNED');
  assert.ok(credlyIssue, 'Should flag RULE_CREDLY_BANNED');
  assert.equal(credlyIssue.severity, 'critical');
});

test('Rule Engine: flags missing dot in Katakana name', () => {
  const sample = {
    rawText: 'フリガナ: レバオフック\n氏名: Lê Bảo Phúc',
    fileName: 'LeBaoPhuc_CV_Line.pdf',
    fileType: 'pdf',
    personalInfoText: 'フリガナ: レバオフック\n氏名: Lê Bảo Phúc\n2026年03月03日現在',
    educationWorkText: '以上',
    certificatesText: '特になし',
    skillsHobbiesText: '【バックエンド】：Python',
    jikoPrText: '強みは...',
    shibouDoukiText: '志望理由は...',
    otherText: '',
    detectedHeadings: [],
    missingHeadings: [],
  };

  const issues = ruleEngine.runRuleEngine(sample);
  const dotIssue = issues.find((i) => i.ruleCode === 'RULE_KATAKANA_DOT_MISSING');
  assert.ok(dotIssue, 'Should flag RULE_KATAKANA_DOT_MISSING');
  assert.equal(dotIssue.severity, 'critical');
});

test('Rule Engine: flags VKU typo (越間)', () => {
  const sample = {
    rawText: '学歴: 2022年09月 越間情報通信技術大学 入学',
    fileName: 'TranVanB_CV_Toyota.pdf',
    fileType: 'pdf',
    personalInfoText: 'フリガナ: チャン・ヴァン・ビー\n2026年03月03日現在',
    educationWorkText: '2022年09月 越間情報通信技術大学 入学\n以上',
    certificatesText: '特になし',
    skillsHobbiesText: '【Backend】Node.js',
    jikoPrText: '強み',
    shibouDoukiText: '志望',
    otherText: '',
    detectedHeadings: [],
    missingHeadings: [],
  };

  const issues = ruleEngine.runRuleEngine(sample);
  const typoIssue = issues.find((i) => i.ruleCode === 'RULE_VKU_TYPO');
  assert.ok(typoIssue, 'Should flag RULE_VKU_TYPO');
  assert.equal(typoIssue.severity, 'critical');
});

test('Rule Engine: flags missing 以上 in education section', () => {
  const sample = {
    rawText: '学歴・職歴\n2022年09月 フォンドン大学／ソフトウェアサイエンス学部 入学',
    fileName: 'Test_CV_Rakuten.pdf',
    fileType: 'pdf',
    personalInfoText: 'フリガナ: グエン・ヴァン・アー\n2026年03月03日現在',
    educationWorkText: '2022年09月 フォンドン大学／ソフトウェアサイエンス学部 入学',
    certificatesText: '特になし',
    skillsHobbiesText: '【Backend】Go',
    jikoPrText: '強み',
    shibouDoukiText: '志望',
    otherText: '',
    detectedHeadings: [],
    missingHeadings: [],
  };

  const issues = ruleEngine.runRuleEngine(sample);
  const ijyouIssue = issues.find((i) => i.ruleCode === 'RULE_MISSING_IJYOU');
  assert.ok(ijyouIssue, 'Should flag RULE_MISSING_IJYOU');
});

test('Rule Engine: flags uncategorized skills', () => {
  const sample = {
    rawText: '趣味・得意科目: 私はプログラミングが好きでJavaとReactを勉強しています。色々なウェブサイトを作ったことがあります。',
    fileName: 'Test_CV_Rakuten.pdf',
    fileType: 'pdf',
    personalInfoText: 'フリガナ: グエン・ヴァン・アー\n2026年03月03日現在',
    educationWorkText: '以上',
    certificatesText: '特になし',
    skillsHobbiesText: '私はプログラミングが好きでJavaとReactを勉強しています。色々なウェブサイトを作ったことがあります。',
    jikoPrText: '強み',
    shibouDoukiText: '志望',
    otherText: '',
    detectedHeadings: [],
    missingHeadings: [],
  };

  const issues = ruleEngine.runRuleEngine(sample);
  const skillIssue = issues.find((i) => i.ruleCode === 'RULE_SKILLS_UNCATEGORIZED');
  assert.ok(skillIssue, 'Should flag RULE_SKILLS_UNCATEGORIZED');
  assert.equal(skillIssue.severity, 'major');
});

test('Rule Engine: flags outdated CV date', () => {
  const sample = {
    rawText: '2024年01月01日現在',
    fileName: 'Test_CV_Rakuten.pdf',
    fileType: 'pdf',
    personalInfoText: 'フリガナ: グエン・ヴァン・アー\n2024年01月01日現在',
    educationWorkText: '以上',
    certificatesText: '特になし',
    skillsHobbiesText: '【バックエンド】：Java',
    jikoPrText: '強み',
    shibouDoukiText: '志望',
    otherText: '',
    detectedHeadings: [],
    missingHeadings: [],
  };

  const issues = ruleEngine.runRuleEngine(sample);
  const dateIssue = issues.find((i) => i.ruleCode === 'RULE_OUTDATED_DATE');
  assert.ok(dateIssue, 'Should flag RULE_OUTDATED_DATE');
  assert.equal(dateIssue.severity, 'major');
});

test('Output strings: do not leak rubric / checklist / cẩm nang / NiX / criteria terms to users', () => {
  const sample = {
    rawText: '免許・資格: 2025年05月 Credly バッジ AWS Certified Cloud Practitioner 取得\n学歴: 2022年09月 越間情報通信技術大学 入学\nフリガナ: レバオフック',
    fileName: 'NguyenVanA_CV_Rakuten.pdf',
    fileType: 'pdf',
    personalInfoText: 'フリガナ: レバオフック\n氏名: Lê Bảo Phúc\n2024年01月01日現在',
    educationWorkText: '2022年09月 越間情報通信技術大学 入学',
    certificatesText: '2025年05月 Credly バッジ AWS Certified Cloud Practitioner 取得',
    skillsHobbiesText: 'JavaとReactを勉強しています。',
    jikoPrText: '私の強みは粘り強さです。',
    shibouDoukiText: '貴社を志望しました。',
    otherText: '',
    detectedHeadings: ['学歴・職歴', '免許・資格', '自己PR', '志望動機'],
    missingHeadings: [],
  };

  const issues = ruleEngine.runRuleEngine(sample);
  assert.ok(issues.length > 0, 'Should find issues');

  const bannedPhrases = ['tiêu chí', 'checklist', 'rubric', 'cẩm nang', 'nix', 'bị cấm'];

  for (const issue of issues) {
    for (const phrase of bannedPhrases) {
      assert.ok(
        !issue.title.toLowerCase().includes(phrase),
        `Issue title '${issue.title}' should not contain '${phrase}'`
      );
      assert.ok(
        !issue.problemVi.toLowerCase().includes(phrase),
        `Issue problemVi '${issue.problemVi}' should not contain '${phrase}'`
      );
      assert.ok(
        !issue.whyWrongVi.toLowerCase().includes(phrase),
        `Issue whyWrongVi '${issue.whyWrongVi}' should not contain '${phrase}'`
      );
      assert.ok(
        !issue.solutionVi.toLowerCase().includes(phrase),
        `Issue solutionVi '${issue.solutionVi}' should not contain '${phrase}'`
      );
    }
  }
});

