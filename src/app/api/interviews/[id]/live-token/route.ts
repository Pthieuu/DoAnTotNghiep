import { createClient } from "@/lib/supabase/server";
import { checkRequest, json } from "@/lib/auth-http";

type Question = { text: string; focus?: string };

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const failure = checkRequest(_request);
  if (failure) return failure;

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return json({ error: "Thiếu GEMINI_API_KEY trong cấu hình máy chủ." }, 503);

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Vui lòng đăng nhập để bắt đầu phỏng vấn." }, 401);

    const { id } = await context.params;
    const { data: session, error } = await supabase.from("interview_sessions")
      .select("id,title,company,level,interview_type,interview_language,questions,status")
      .eq("id", id).eq("user_id", user.id).maybeSingle();
    if (error) return json({ error: "Không thể tải buổi phỏng vấn." }, 500);
    if (!session || !Array.isArray(session.questions)) return json({ error: "Không tìm thấy buổi phỏng vấn." }, 404);
    if (session.status !== "in_progress") return json({ error: "Buổi phỏng vấn này đã kết thúc." }, 409);

    const { data: answerRows, error: answerError } = await supabase.from("interview_answers")
      .select("question_index,answer").eq("session_id", id).order("question_index", { ascending: true });
    if (answerError) return json({ error: "Không thể tải tiến độ phỏng vấn." }, 500);
    const questions = session.questions as Question[];
    const index = answerRows?.length ?? 0;
    const question = questions[index];
    if (!question) return json({ error: "Không còn câu hỏi nào trong buổi phỏng vấn." }, 409);

    const language = session.interview_language === "ja" ? "Japanese" : "Vietnamese";
    const priorContext = (answerRows || []).map((row, i) => {
      const previousQuestion = questions[row.question_index];
      return previousQuestion ? `Q${i + 1}: ${previousQuestion.text}\nCandidate: ${row.answer}` : "";
    }).filter(Boolean).join("\n\n");
    const systemInstruction = [
      "You are a warm, realistic professional job interviewer conducting a spoken mock interview.",
      `Speak only in ${language}. Keep every spoken response concise and natural.`,
      `Interview: ${session.title}. Role: ${session.title}. Company: ${session.company || "unspecified"}. Level: ${session.level || "unspecified"}. Type: ${session.interview_type || "general"}.`,
      priorContext ? `Earlier interview context:\n${priorContext}` : "This is the beginning of the interview.",
      `The current planned question is: ${question.text}`,
      "Start by greeting the candidate briefly and asking the current planned question in your own natural spoken phrasing.",
      "Listen to the candidate, acknowledge what they said, and ask relevant short follow-up questions when useful. Do not reveal evaluation scores or coaching during the interview.",
      "When the candidate says they are done, thank them and close this question. Do not move to a different planned question; the app handles the next question.",
    ].join("\n");
    const liveConfig = {
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } },
      },
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      systemInstruction: { parts: [{ text: systemInstruction }] },
    };
    const now = Date.now();
    const tokenResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/auth_tokens", {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        uses: 1,
        expireTime: new Date(now + 20 * 60 * 1000).toISOString(),
        newSessionExpireTime: new Date(now + 60 * 1000).toISOString(),
        bidiGenerateContentSetup: { model: "models/gemini-3.8-live", ...liveConfig },
      }),
      cache: "no-store",
    });
    const tokenBody = await tokenResponse.json().catch(() => null) as { name?: string; error?: { message?: string } } | null;
    if (!tokenResponse.ok || !tokenBody?.name) {
      const upstreamMessage = tokenBody?.error?.message || "Google không trả về thông tin lỗi.";
      console.error("Gemini Live token request failed", { status: tokenResponse.status, message: upstreamMessage });
      return json({
        error: `Gemini không cấp token (${tokenResponse.status}): ${upstreamMessage}`,
      }, 502);
    }
    return json({
      token: tokenBody.name,
      model: "models/gemini-3.8-live",
    });
  } catch (error) {
    const networkError = error instanceof TypeError;
    console.error("Gemini Live token error", error instanceof Error ? error.message : "Unknown error");
    return json({
      error: networkError
        ? "Máy chủ không kết nối được Gemini. Kiểm tra mạng hoặc cấu hình proxy của môi trường chạy ứng dụng."
        : "Không thể khởi tạo hội thoại giọng nói.",
    }, 503);
  }
}
