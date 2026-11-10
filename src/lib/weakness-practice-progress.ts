import { CRITERIA, RUBRIC_VERSION, type CriterionId } from "./interview-rubric";

export type PracticeProgressAnswer = { questionIndex: number; answer: string; rubric?: unknown };
export type PracticeProgressSample = { averageLevel: number | null; assessedAnswers: number; excludedAnswers: number };
export type PracticeCriterionProgress = {
  criterionId: CriterionId;
  name: string;
  source: PracticeProgressSample;
  practice: PracticeProgressSample;
  delta: number | null;
  trend: "improved" | "declined" | "unchanged" | "not_comparable";
  reason: "insufficient_data" | "rubric_version_mismatch" | "scope_mismatch" | null;
};
export type WeaknessPracticeProgress = {
  sourceSessionId: string;
  rubricVersion: string;
  comparisonNote: string;
  criteria: PracticeCriterionProgress[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function collectLevels(answers: readonly PracticeProgressAnswer[], criterionId: CriterionId) {
  const counts = new Map<number, number>();
  for (const { questionIndex } of answers) counts.set(questionIndex, (counts.get(questionIndex) ?? 0) + 1);
  const levels: number[] = [];
  let versionMismatch = false;
  for (const answer of answers) {
    const { rubric, questionIndex } = answer;
    if (!Number.isInteger(questionIndex) || questionIndex < 0 || counts.get(questionIndex) !== 1 || !answer.answer.trim()) continue;
    if (!isRecord(rubric)) continue;
    if (typeof rubric.version === "string" && rubric.version !== RUBRIC_VERSION) versionMismatch = true;
    if (rubric.version !== RUBRIC_VERSION || !Array.isArray(rubric.criteria)) continue;
    const matches = rubric.criteria.filter(isRecord).filter(criterion => criterion.id === criterionId);
    if (matches.length !== 1) continue;
    const { status, level, evidence, reason } = matches[0];
    if (status !== "scored" || typeof level !== "number" || !Number.isInteger(level) || level < 0 || level > 4
      || typeof reason !== "string" || !reason.trim() || typeof evidence !== "string"
      || (level > 0 && !evidence.trim()) || (evidence && !answer.answer.includes(evidence))) continue;
    levels.push(level);
  }
  return {
    versionMismatch,
    average: levels.length ? levels.reduce((sum, level) => sum + level, 0) / levels.length : null,
    assessedAnswers: levels.length,
    excludedAnswers: answers.length - levels.length,
  };
}

const round = (value: number) => Math.round(value * 100) / 100;

export function calculateWeaknessPracticeProgress(input: {
  sourceSessionId: string;
  selectedCriteria: readonly CriterionId[];
  sourceAnswers: readonly PracticeProgressAnswer[];
  practiceAnswers: readonly PracticeProgressAnswer[];
  scopeMatches: boolean;
}): WeaknessPracticeProgress {
  const criteria = CRITERIA.filter(criterion => input.selectedCriteria.includes(criterion.id)).map(({ id, name }): PracticeCriterionProgress => {
    const before = collectLevels(input.sourceAnswers, id);
    const after = collectLevels(input.practiceAnswers, id);
    const reason = !input.scopeMatches ? "scope_mismatch"
      : before.versionMismatch || after.versionMismatch ? "rubric_version_mismatch"
      : before.average === null || after.average === null ? "insufficient_data" : null;
    const delta = reason === null && after.average !== null && before.average !== null ? round(after.average - before.average) : null;
    const sample = (value: typeof before): PracticeProgressSample => ({
      averageLevel: value.average === null ? null : round(value.average),
      assessedAnswers: value.assessedAnswers,
      excludedAnswers: value.excludedAnswers,
    });
    return {
      criterionId: id, name, source: sample(before), practice: sample(after), delta,
      trend: delta === null ? "not_comparable" : delta > 0 ? "improved" : delta < 0 ? "declined" : "unchanged",
      reason,
    };
  });
  return {
    sourceSessionId: input.sourceSessionId,
    rubricVersion: RUBRIC_VERSION,
    comparisonNote: "So sánh mức điểm trung bình 0–4 của từng tiêu chí đã được chấm hợp lệ trên hai bộ câu hỏi khác nhau. Mẫu có thể khác về số lượng và độ khó; chênh lệch chỉ mang tính tham khảo, không chứng minh mức tăng năng lực tương đương.",
    criteria,
  };
}
