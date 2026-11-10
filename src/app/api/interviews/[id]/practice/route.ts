import { createClient } from "@/lib/supabase/server";
import { checkRequest, json } from "@/lib/auth-http";
import { emptyCv, validateCv } from "@/lib/cv-schema";
import { CRITERIA, type CriterionId } from "@/lib/interview-rubric";
import { type WeaknessPracticeAnswer } from "@/lib/weakness-practice";
import { buildWeaknessPracticeContext, generateWeaknessPracticeQuestions, WEAKNESS_PRACTICE_QUESTION_COUNT } from "@/lib/weakness-practice-generation";

export const maxDuration = 300;

const SESSION_FIELDS = "id,title,status,source_session_id,selected_criteria";
type PracticeSession = { id: string; title: string; status: string; source_session_id: string; selected_criteria: string[] };
type AnswerRow = { question_index: number; answer: string | null; rubric_json: unknown };

function replay(session: PracticeSession, sourceId: string, criteria: CriterionId[]) {
  if (session.source_session_id !== sourceId || session.selected_criteria.length !== criteria.length
    || !criteria.every(id => session.selected_criteria.includes(id))) {
    return json({ error: "Khóa chống trùng đã được dùng cho yêu cầu luyện tập khác." }, 409);
  }
  return json({ session, sessionId: session.id, reused: true });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const failure = checkRequest(request);
  if (failure) return failure;

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "Vui lòng đăng nhập để tạo bài luyện tập." }, 401);

    const { id: rawId } = await context.params;
    const id = rawId.toLowerCase();
    const body: unknown = await request.json().catch(() => null);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
      || !body || typeof body !== "object" || Array.isArray(body)) {
      return json({ error: "Yêu cầu luyện tập không hợp lệ." }, 400);
    }
    const { selectedCriteria, idempotencyKey } = body as Record<string, unknown>;
    if (!Array.isArray(selectedCriteria) || selectedCriteria.length < 1 || selectedCriteria.length > 5
      || new Set(selectedCriteria).size !== selectedCriteria.length
      || selectedCriteria.some(value => !CRITERIA.some(criterion => criterion.id === value))
      || typeof idempotencyKey !== "string" || !/^[A-Za-z0-9_-]{8,128}$/.test(idempotencyKey)) {
      return json({ error: "Chọn tiêu chí hợp lệ và cung cấp khóa chống trùng từ 8–128 ký tự chữ, số, gạch ngang hoặc gạch dưới." }, 400);
    }
    const criteria = CRITERIA.filter(criterion => selectedCriteria.includes(criterion.id)).map(criterion => criterion.id);

    const { data: source, error: sourceError } = await supabase.from("interview_sessions")
      .select("id,title,status,questions,cv_id,cv_snapshot,target_role,company,job_description,level,interview_type,interview_language")
      .eq("id", id).eq("user_id", user.id).maybeSingle();
    if (sourceError) return json({ error: "Không thể tải phiên phỏng vấn nguồn." }, 500);
    if (!source) return json({ error: "Không tìm thấy phiên phỏng vấn nguồn." }, 404);
    if (source.status !== "completed") return json({ error: "Phiên nguồn chưa hoàn thành." }, 409);

    const findExisting = () => supabase.from("interview_sessions").select(SESSION_FIELDS)
      .eq("user_id", user.id).eq("practice_idempotency_key", idempotencyKey).maybeSingle();
    const existing = await findExisting();
    if (existing.error) return json({ error: "Không thể kiểm tra yêu cầu luyện tập đã tạo." }, 500);
    if (existing.data) return replay(existing.data as PracticeSession, id, criteria);

    const { data: rows, error: answersError } = await supabase.from("interview_answers")
      .select("question_index,answer,rubric_json").eq("session_id", id)
      .order("question_index", { ascending: true });
    if (answersError) return json({ error: "Không thể tải câu trả lời của phiên nguồn." }, 500);
    const questions: unknown[] = Array.isArray(source.questions) ? source.questions : [];
    const answers: WeaknessPracticeAnswer[] = (rows ?? []).map((row: AnswerRow) => {
      const question = questions[row.question_index];
      return {
        questionIndex: row.question_index,
        question: question && typeof question === "object" && "text" in question && typeof question.text === "string" ? question.text : "",
        answer: typeof row.answer === "string" ? row.answer : "",
        rubric: row.rubric_json,
      };
    });
    try {
      buildWeaknessPracticeContext(criteria, answers);
    } catch {
      return json({ error: "Tiêu chí đã chọn không thuộc điểm yếu hợp lệ của phiên nguồn." }, 400);
    }
    if ((source.cv_snapshot !== null && !validateCv(source.cv_snapshot))
      || !["N5", "N4", "N3", "N2", "N1"].includes(source.level)
      || !["technical", "behavioral", "mixed"].includes(source.interview_type)
      || !["ja", "vi"].includes(source.interview_language)) {
      return json({ error: "Cấu hình phiên nguồn không đủ hợp lệ để luyện tập." }, 409);
    }

    const role = source.target_role || source.title;
    const generated = await generateWeaknessPracticeQuestions({
      cv: source.cv_snapshot ?? emptyCv,
      role,
      company: source.company,
      jobDescription: source.job_description,
      level: source.level,
      interviewType: source.interview_type,
      interviewLanguage: source.interview_language,
      selectedCriteria: criteria,
      answers,
    });
    const { data: session, error: insertError } = await supabase.from("interview_sessions").insert({
      user_id: user.id,
      title: source.title,
      target_role: role,
      company: source.company,
      job_description: source.job_description,
      level: source.level,
      interview_type: source.interview_type,
      interview_language: source.interview_language,
      cv_id: source.cv_id,
      cv_snapshot: source.cv_snapshot ?? emptyCv,
      question_count: WEAKNESS_PRACTICE_QUESTION_COUNT,
      questions: generated.questions,
      status: "in_progress",
      source_session_id: source.id,
      selected_criteria: criteria,
      practice_idempotency_key: idempotencyKey,
      practice_context: generated.context,
    }).select(SESSION_FIELDS).single();

    if (insertError?.code === "23505") {
      const winner = await findExisting();
      if (!winner.error && winner.data) return replay(winner.data as PracticeSession, id, criteria);
    }
    if (insertError || !session) return json({ error: "Không thể lưu phiên luyện tập. Vui lòng thử lại với cùng khóa chống trùng." }, 500);
    return json({ session, sessionId: session.id, reused: false }, 201);
  } catch (error) {
    console.error("Weakness practice creation failed", error);
    return json({ error: "Không tạo được bài luyện tập lúc này. Vui lòng thử lại với cùng khóa chống trùng." }, 503);
  }
}
