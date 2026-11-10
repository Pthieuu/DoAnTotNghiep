import { createClient } from "@/lib/supabase/server";
import { json } from "@/lib/auth-http";
import { identifyWeaknesses, type WeaknessPracticeAnswer } from "@/lib/weakness-practice";

type AnswerRow = { question_index: number; answer: string | null; rubric_json: unknown };

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "Vui lòng đăng nhập để xem điểm cần luyện tập." }, 401);

    const { id } = await context.params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return json({ error: "Mã buổi phỏng vấn không hợp lệ." }, 400);
    }

    const { data: session, error: sessionError } = await supabase.from("interview_sessions")
      .select("id,status,questions")
      .eq("id", id).eq("user_id", user.id).maybeSingle();
    if (sessionError) return json({ error: "Không thể tải buổi phỏng vấn." }, 500);
    if (!session) return json({ error: "Không tìm thấy buổi phỏng vấn." }, 404);
    if (session.status !== "completed") return json({ error: "Buổi phỏng vấn chưa hoàn thành." }, 409);

    const { data: rows, error: answersError } = await supabase.from("interview_answers")
      .select("question_index,answer,rubric_json")
      .eq("session_id", id)
      .order("question_index", { ascending: true });
    if (answersError) return json({ error: "Không thể tải dữ liệu câu trả lời." }, 500);

    const questions: unknown[] = Array.isArray(session.questions) ? session.questions : [];
    const answers: WeaknessPracticeAnswer[] = (rows ?? []).map((row: AnswerRow) => {
      const question = questions[row.question_index];
      return {
        questionIndex: row.question_index,
        question: question && typeof question === "object" && "text" in question && typeof question.text === "string" ? question.text : "",
        answer: typeof row.answer === "string" ? row.answer : "",
        rubric: row.rubric_json,
      };
    });

    return json({ sessionId: session.id, weaknesses: identifyWeaknesses(answers) });
  } catch (error) {
    console.error("Interview weaknesses load failed", error);
    return json({ error: "Dịch vụ luyện tập tạm thời không khả dụng." }, 503);
  }
}
