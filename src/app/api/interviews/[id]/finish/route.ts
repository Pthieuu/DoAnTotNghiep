import { createClient } from "@/lib/supabase/server";
import { checkRequest, json } from "@/lib/auth-http";

type AnswerRow = { question_index: number; answer: string };

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const failure = checkRequest(request);
  if (failure) return failure;

  try {
    const { id } = await context.params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return json({ error: "Mã phiên phỏng vấn không hợp lệ." }, 400);
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "Vui lòng đăng nhập để kết thúc phiên phỏng vấn." }, 401);

    const findSession = () => supabase.from("interview_sessions").select("id,status,questions")
      .eq("id", id).eq("user_id", user.id).maybeSingle();
    const { data: session, error: sessionError } = await findSession();
    if (sessionError) return json({ error: "Không thể tải phiên phỏng vấn." }, 500);
    if (!session) return json({ error: "Không tìm thấy phiên phỏng vấn." }, 404);
    if (!["in_progress", "completed"].includes(session.status)) return json({ error: "Phiên phỏng vấn này không thể kết thúc." }, 409);
    if (!Array.isArray(session.questions) || !session.questions.length) return json({ error: "Dữ liệu câu hỏi không hợp lệ." }, 409);

    const { data: rows, error: answersError } = await supabase.from("interview_answers")
      .select("question_index,answer").eq("session_id", id).order("question_index", { ascending: true });
    if (answersError) return json({ error: "Không thể tải các câu trả lời đã lưu." }, 500);
    const answers = (rows ?? []) as AnswerRow[];
    if (!answers.length) return json({ error: "Bạn cần gửi ít nhất một câu trả lời trước khi xem kết quả." }, 409);
    if (new Set(answers.map(answer => answer.question_index)).size !== answers.length
      || answers.some(answer => !Number.isInteger(answer.question_index) || answer.question_index < 0
        || answer.question_index >= session.questions.length || typeof answer.answer !== "string" || !answer.answer.trim())) {
      return json({ error: "Dữ liệu câu trả lời không hợp lệ để kết thúc phiên." }, 409);
    }

    if (session.status === "in_progress") {
      const now = new Date().toISOString();
      const { data: updated, error: updateError } = await supabase.from("interview_sessions")
        .update({ status: "completed", completed_at: now, updated_at: now, summary_json: null, score: null })
        .eq("id", id).eq("user_id", user.id).eq("status", "in_progress").select("id").maybeSingle();
      if (updateError) return json({ error: "Không thể kết thúc phiên phỏng vấn. Vui lòng thử lại." }, 500);
      if (!updated) {
        const current = await findSession();
        if (current.error) return json({ error: "Không thể xác nhận trạng thái phiên phỏng vấn." }, 500);
        if (current.data?.status !== "completed") return json({ error: "Trạng thái phiên đã thay đổi. Vui lòng tải lại trang." }, 409);
      }
    }

    return json({ completed: true, sessionId: session.id, answeredCount: answers.length, plannedCount: session.questions.length });
  } catch (error) {
    console.error("Interview finish failed", error);
    return json({ error: "Dịch vụ kết thúc phiên tạm thời không khả dụng." }, 503);
  }
}
