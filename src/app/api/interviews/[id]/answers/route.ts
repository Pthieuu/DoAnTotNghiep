import { createClient } from "@/lib/supabase/server";
import { checkRequest, json } from "@/lib/auth-http";

type Question = { text: string; translation: string };
type AnswerRow = { question_index: number; answer: string };

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const failure = checkRequest(request);
  if (failure) return failure;

  const { id } = await context.params;
  const body = await request.json().catch(() => null) as { questionIndex?: unknown; answer?: unknown } | null;
  const questionIndex = body?.questionIndex;
  const answer = typeof body?.answer === "string" ? body.answer.trim() : "";
  if (!body || !Number.isInteger(questionIndex) || (questionIndex as number) < 0 || !answer || answer.length > 10000) {
    return json({ error: "Câu trả lời không hợp lệ. Nội dung cần có từ 1 đến 10.000 ký tự." }, 400);
  }
  const index = questionIndex as number;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Vui lòng đăng nhập để lưu câu trả lời." }, 401);

    const { data: session, error: sessionError } = await supabase.from("interview_sessions")
      .select("id,status,questions")
      .eq("id", id).eq("user_id", user.id).maybeSingle();
    if (sessionError) return json({ error: "Không thể tải buổi phỏng vấn." }, 500);
    if (!session || !Array.isArray(session.questions)) return json({ error: "Không tìm thấy buổi phỏng vấn." }, 404);
    const questions = session.questions as Question[];
    if (index >= questions.length) return json({ error: "Câu hỏi này không tồn tại trong buổi phỏng vấn." }, 400);

    const { data: previousAnswers, error: answersError } = await supabase.from("interview_answers")
      .select("question_index,answer")
      .eq("session_id", id)
      .order("question_index", { ascending: true });
    if (answersError) {
      if (answersError.code === "42P01" || answersError.code === "PGRST205") return json({ error: "Cơ sở dữ liệu chưa được cập nhật phần câu trả lời. Hãy chạy migration 202609300004_create_interview_answers.sql." }, 503);
      return json({ error: "Không thể tải các câu trả lời đã lưu." }, 500);
    }
    const answers = (previousAnswers || []) as AnswerRow[];
    const existing = answers.find((item) => item.question_index === index);
    if (index < answers.length) {
      if (!existing || existing.answer !== answer) return json({ error: "Câu trả lời này đã được gửi. Hãy tiếp tục với câu hỏi hiện tại." }, 409);
      if (session.status === "completed") return json({ completed: true, answeredCount: questions.length });
      return json({ error: "Câu trả lời này đã được lưu. Hãy tải lại trang để tiếp tục với câu hỏi hiện tại." }, 409);
    } else if (index !== answers.length) {
      return json({ error: "Hãy trả lời các câu hỏi theo thứ tự trong buổi phỏng vấn." }, 409);
    } else {
      if (session.status !== "in_progress") return json({ error: "Buổi phỏng vấn này đã kết thúc." }, 409);
      const { error: insertError } = await supabase.from("interview_answers").insert({ session_id: id, question_index: index, answer });
      if (insertError) {
        console.error("Interview answer save failed", { code: insertError.code, message: insertError.message });
        return json({ error: "Không lưu được câu trả lời. Hãy thử gửi lại." }, 500);
      }
    }

    const nextIndex = index + 1;
    if (nextIndex >= questions.length) {
      const { error: completeError } = await supabase.from("interview_sessions")
        .update({ status: "completed", completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", id).eq("user_id", user.id).eq("status", "in_progress")
        .select("id").maybeSingle();
      if (completeError) return json({ error: "Câu trả lời đã được lưu, nhưng không thể kết thúc buổi phỏng vấn. Hãy tải lại trang." }, 500);
      if (!data) return json({ error: "Câu trả lời đã được lưu, nhưng không thể cập nhật trạng thái buổi phỏng vấn. Hãy tải lại trang." }, 409);
      return json({ completed: true, answeredCount: questions.length });
    }

    const nextQuestion = questions[nextIndex];
    return json({ completed: false, answeredCount: nextIndex, nextQuestion: { text: nextQuestion.text, translation: nextQuestion.translation } });
  } catch {
    return json({ error: "Dịch vụ câu trả lời tạm thời không khả dụng." }, 503);
  }
}
