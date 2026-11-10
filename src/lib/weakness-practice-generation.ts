import "server-only";
import { validateCv, type CvData } from "./cv-schema";
import { generateInterviewQuestions, type InterviewQuestion } from "./interview-generation";
import { CRITERIA, RUBRIC_VERSION, type CriterionId } from "./interview-rubric";
import { identifyWeaknesses, type WeaknessPracticeAnswer, type WeaknessPracticeContext } from "./weakness-practice";

export const WEAKNESS_PRACTICE_QUESTION_COUNT = 4;

export type WeaknessPracticeGenerationInput = {
  cv: CvData;
  role: string;
  company: string | null;
  jobDescription: string | null;
  level: string;
  interviewType: string;
  interviewLanguage: string;
  selectedCriteria: readonly CriterionId[];
  answers: readonly WeaknessPracticeAnswer[];
};

export function buildWeaknessPracticeContext(
  selectedCriteria: readonly CriterionId[],
  answers: readonly WeaknessPracticeAnswer[],
): WeaknessPracticeContext {
  const selected = new Set(selectedCriteria);
  if (!selected.size || selected.size !== selectedCriteria.length || selected.size > CRITERIA.length
    || selectedCriteria.some(id => !CRITERIA.some(criterion => criterion.id === id))) {
    throw new Error("Danh sách tiêu chí luyện tập không hợp lệ.");
  }
  const targets = identifyWeaknesses(answers).filter(target => selected.has(target.criterionId));
  if (targets.length !== selected.size) throw new Error("Tiêu chí đã chọn không thuộc các điểm yếu được đánh giá của phiên nguồn.");
  const indices = new Set(targets.flatMap(target => target.sources.map(source => source.questionIndex)));
  const previousAnswers = answers.filter(answer => indices.has(answer.questionIndex))
    .map(({ questionIndex, question, answer }) => ({ questionIndex, question, answer }))
    .sort((a, b) => a.questionIndex - b.questionIndex);
  return { rubricVersion: RUBRIC_VERSION, targets, previousAnswers };
}

export async function generateWeaknessPracticeQuestions(input: WeaknessPracticeGenerationInput): Promise<{
  questions: InterviewQuestion[];
  context: WeaknessPracticeContext;
}> {
  if (!validateCv(input.cv) || !input.role.trim() || input.role.length > 160
    || !["N5", "N4", "N3", "N2", "N1"].includes(input.level)
    || !["ja", "vi"].includes(input.interviewLanguage)
    || !["technical", "behavioral", "mixed"].includes(input.interviewType)) {
    throw new Error("Cấu hình phiên nguồn không hợp lệ để tạo bài luyện tập.");
  }
  const context = buildWeaknessPracticeContext(input.selectedCriteria, input.answers);
  const questions = await generateInterviewQuestions({
    cv: input.cv,
    role: input.role,
    company: input.company,
    jobDescription: input.jobDescription,
    level: input.level,
    interviewType: input.interviewType,
    interviewLanguage: input.interviewLanguage,
    count: WEAKNESS_PRACTICE_QUESTION_COUNT,
    weaknessPractice: context,
  });
  return { questions, context };
}
