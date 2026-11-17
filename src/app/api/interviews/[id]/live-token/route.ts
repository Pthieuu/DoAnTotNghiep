import { createClient } from "@/lib/supabase/server";
import { checkRequest, json } from "@/lib/auth-http";

type Question = { text: string; focus?: string };

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const failure = checkRequest(_request);
  if (failure) return failure;

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return json({ error: "Missing GEMINI_API_KEY in server configuration." }, 503);

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Please sign in to start interview." }, 401);

    const { id } = await context.params;
    const { data: session, error } = await supabase.from("interview_sessions")
      .select("id,title,company,level,interview_type,interview_language,questions,status")
      .eq("id", id).eq("user_id", user.id).maybeSingle();
    if (error) return json({ error: "Could not load interview session." }, 500);
    if (!session || !Array.isArray(session.questions)) return json({ error: "Interview session not found." }, 404);
    if (session.status !== "in_progress") return json({ error: "This interview session has ended." }, 409);

    const { data: answerRows, error: answerError } = await supabase.from("interview_answers")
      .select("question_index,answer").eq("session_id", id).order("question_index", { ascending: true });
    if (answerError) return json({ error: "Could not load interview progress." }, 500);
    const questions = session.questions as Question[];
    const index = answerRows?.length ?? 0;
    const question = questions[index];
    if (!question) return json({ error: "No remaining questions in this interview session." }, 409);

    const requested = await _request.json().catch(() => null) as { questionIndex?: unknown; questionText?: unknown } | null;
    if (!requested || !Number.isInteger(requested.questionIndex) || typeof requested.questionText !== "string") {
      return json({ error: "Missing current question information. Please reload the page." }, 400);
    }
    if (requested.questionIndex !== index || requested.questionText !== question.text) {
      return json({ error: "Interview progress has changed. Please reload the page to get the current question." }, 409);
    }

    const language = session.interview_language === "ja" ? "Japanese" : "Vietnamese";
    const priorContext = (answerRows || []).map((row, i) => {
      const previousQuestion = questions[row.question_index];
      return previousQuestion ? `Q${i + 1}: ${previousQuestion.text}\nCandidate: ${row.answer}` : "";
    }).filter(Boolean).join("\n\n");
    const systemInstruction = [
      "You are a warm, realistic professional job interviewer conducting a spoken mock interview.",
      `Conduct the interview in ${language}. Keep responses concise and natural. For language clarification, you may explain in Vietnamese when the candidate asks in Vietnamese or explicitly requests Vietnamese, then return to the interview language.`,
      `Interview: ${session.title}. Role: ${session.title}. Company: ${session.company || "unspecified"}. Level: ${session.level || "unspecified"}. Type: ${session.interview_type || "general"}.`,
      priorContext ? `Earlier interview context:\n${priorContext}` : "This is the beginning of the interview.",
      `The only current question (number ${index + 1}) is this exact text: ${JSON.stringify(question.text)}`,
      "Your opening response must read the current question verbatim, exactly once. Do not add a greeting, introduction, translation, paraphrase, or another question. Then wait for the candidate to answer.",
      "Keep a multi-turn conversation on the current question. The candidate may ask what a word means, how a grammar construction works, whether their understanding is correct, or ask you to repeat, slow down, or rephrase. These are clarification requests, not final interview answers. Explain the requested word or grammar in the context of the question, briefly confirm or correct their understanding, or repeat/rephrase as requested. If the requested word is unclear, ask which word they mean. Allow several clarification turns, then invite them to answer the SAME interview question and wait. Never invent their answer, provide a model interview answer, reveal scores, or move to the next question during clarification.",
      "Examples of clarification requests: 『貢献とはどういう意味ですか』『〜にあたっての文法を説明していただけますか』『つまり、前の仕事について話せばいいですか』, 'Từ này nghĩa là gì?', 'Giải thích ngữ pháp này giúp tôi', 'Nói chậm hơn được không?'. Respond helpfully to these requests instead of merely acknowledging them as answers. Briefly acknowledge actual interview answers without introducing unrelated topics.",
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
      const upstreamMessage = tokenBody?.error?.message || "Google returned no error details.";
      console.error("Gemini Live token request failed", { status: tokenResponse.status, message: upstreamMessage });
      return json({
        error: `Gemini did not grant token (${tokenResponse.status}): ${upstreamMessage}`,
      }, 502);
    }
    return json({
      token: tokenBody.name,
      questionIndex: index,
      questionText: question.text,
      model: "models/gemini-3.8-live",
    });
  } catch (error) {
    const networkError = error instanceof TypeError;
    console.error("Gemini Live token error", error instanceof Error ? error.message : "Unknown error");
    return json({
      error: networkError
        ? "Server cannot connect to Gemini. Check network or proxy configuration."
        : "Could not initialize voice conversation.",
    }, 503);
  }
}
