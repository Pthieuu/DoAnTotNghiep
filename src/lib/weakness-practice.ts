import { CRITERIA, RUBRIC_VERSION, type CriterionId } from "./interview-rubric";

export const WEAKNESS_MAX_LEVEL = 2;

export type WeaknessLevel = 0 | 1 | 2;

export type WeaknessPracticeAnswer = {
  questionIndex: number;
  question: string;
  answer: string;
  rubric?: unknown;
};

export type WeaknessPracticeSource = {
  questionIndex: number;
  question: string;
  level: WeaknessLevel;
  evidence: string;
  reason: string;
  practice: string;
  rubricVersion: string;
};

export type WeaknessPracticeTarget = {
  criterionId: CriterionId;
  name: string;
  suggestion: string;
  sources: WeaknessPracticeSource[];
};

export type WeaknessPracticeContext = {
  rubricVersion: string;
  targets: WeaknessPracticeTarget[];
  previousAnswers: { questionIndex: number; question: string; answer: string }[];
};

export type WeaknessPracticeSession = {
  sourceSessionId: string;
  selectedCriteria: CriterionId[];
};

export function getWeaknessPracticeSession(sourceSessionId: unknown, selectedCriteria: unknown): WeaknessPracticeSession | null {
  if (typeof sourceSessionId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sourceSessionId)
    || !Array.isArray(selectedCriteria) || !selectedCriteria.length || selectedCriteria.length > CRITERIA.length
    || new Set(selectedCriteria).size !== selectedCriteria.length
    || selectedCriteria.some(id => !CRITERIA.some(criterion => criterion.id === id))) return null;
  return {
    sourceSessionId,
    selectedCriteria: CRITERIA.filter(criterion => selectedCriteria.includes(criterion.id)).map(criterion => criterion.id),
  };
}

const SUGGESTIONS: Record<CriterionId, string> = {
  C01: "Trả lời trực tiếp ý chính của câu hỏi trước khi giải thích thêm.",
  C02: "Bổ sung một ví dụ thật, nêu rõ việc bạn đã làm và kết quả hoặc bài học.",
  C03: "Sắp xếp câu trả lời đủ bốn bước PREP hoặc STAR theo đúng thứ tự.",
  C04: "Liên hệ kinh nghiệm hoặc động lực của bạn với yêu cầu vị trí ứng tuyển.",
  C05: "Diễn đạt lại ý chính bằng các câu tiếng Nhật ngắn, rõ nghĩa.",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function identifyWeaknesses(answers: readonly WeaknessPracticeAnswer[]): WeaknessPracticeTarget[] {
  const targets = new Map<CriterionId, WeaknessPracticeTarget>();
  const indexCounts = new Map<number, number>();
  for (const { questionIndex } of answers) {
    indexCounts.set(questionIndex, (indexCounts.get(questionIndex) ?? 0) + 1);
  }

  for (const answer of answers) {
    const { questionIndex, rubric } = answer;
    if (!Number.isInteger(questionIndex) || questionIndex < 0 || indexCounts.get(questionIndex) !== 1) continue;
    if (!answer.question.trim() || !answer.answer.trim()) continue;
    if (!isRecord(rubric) || rubric.version !== RUBRIC_VERSION || !Array.isArray(rubric.criteria)) continue;

    const criteria = rubric.criteria.filter(isRecord);
    for (const definition of CRITERIA) {
      const matches = criteria.filter(criterion => criterion.id === definition.id);
      if (matches.length !== 1) continue;
      const criterion = matches[0];
      const { level, evidence, reason } = criterion;
      if (criterion.status !== "scored" || typeof level !== "number" || !Number.isInteger(level) || level < 0 || level > WEAKNESS_MAX_LEVEL) continue;
      if (typeof evidence !== "string" || typeof reason !== "string" || !reason.trim()) continue;
      if ((level > 0 && !evidence.trim()) || (evidence && !answer.answer.includes(evidence))) continue;

      let target = targets.get(definition.id);
      if (!target) {
        target = { criterionId: definition.id, name: definition.name, suggestion: SUGGESTIONS[definition.id], sources: [] };
        targets.set(definition.id, target);
      }
      target.sources.push({
        questionIndex,
        question: answer.question.trim(),
        level: level as WeaknessLevel,
        evidence,
        reason: reason.trim(),
        practice: typeof rubric.practice === "string" ? rubric.practice.trim() : "",
        rubricVersion: rubric.version,
      });
    }
  }

  return CRITERIA.flatMap(({ id }) => {
    const target = targets.get(id);
    if (!target) return [];
    target.sources.sort((a, b) => a.questionIndex - b.questionIndex);
    return [target];
  });
}
