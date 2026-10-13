import "server-only";
import { parseRubric, rubricSchema, RUBRIC_PROMPT, LOCAL_RUBRIC_PROMPT, localRubricSchema, type RubricResult } from "./interview-rubric";

import { getAiConfig } from "./ai-config";

type EvaluationInput = {
  cvText: string;
  targetRole?: string | null;
  jobDescription?: string | null;
  language: string;
  interviewType: string;
  question: string;
  questionType: string;
  userAnswer: string;
  questionIndex: number;
  totalQuestions: number;
};

export type EvaluationResult = {
  score: number | null;
  rubric: RubricResult;
  feedback: string;
  suggestion: string | null;
};

const evaluationSchema = rubricSchema;

export async function evaluateAnswer(input: EvaluationInput): Promise<EvaluationResult> {
  const aiConfig = getAiConfig();
  const provider = aiConfig.provider;
  const model = provider === "ollama"
    ? aiConfig.ollamaModel
    : provider === "gemini"
      ? aiConfig.geminiModel
      : provider === "groq"
        ? aiConfig.groqModel
        : process.env.OPENAI_INTERVIEW_MODEL || process.env.OPENAI_CV_MODEL || "gpt-4o-mini";

  const localSchema = provider === "ollama" ? localRubricSchema(input.userAnswer) : evaluationSchema;
  const messages = [
    { role: "system", content: provider === "ollama" ? LOCAL_RUBRIC_PROMPT : `${RUBRIC_PROMPT}\n\nJSON schema bắt buộc:\n${JSON.stringify(evaluationSchema)}` },
    { role: "user", content: JSON.stringify({
      cv: input.cvText, targetRole: input.targetRole, jobDescription: input.jobDescription,
      responseLanguage: "Vietnamese (vi): reason, strengths, weaknesses, practice. Only evidence is quoted in original Japanese.",
      language: input.language, interviewType: input.interviewType,
      question: input.question, questionType: input.questionType, answer: input.userAnswer,
      questionIndex: input.questionIndex, totalQuestions: input.totalQuestions,
    }) },
  ];

  let response: Response;
  if (provider === "ollama") {
    const baseUrl = (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/$/, "");
    try {
      response = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        signal: AbortSignal.timeout(120000),
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          stream: false,
          think: false,
          keep_alive: "5m",
          format: localSchema,
          options: { temperature: 0.3, num_ctx: 8192, num_predict: 4096 },
          messages,
        }),
      });
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError")
        throw new Error("AI mất quá lâu để chấm điểm. Hãy thử lại.");
      throw new Error(`Không kết nối được Ollama. Mở Ollama rồi thử lại.`);
    }
    if (!response.ok) throw new Error(`Ollama trả lỗi HTTP ${response.status}.`);
  } else if (provider === "gemini") {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error("Chưa cấu hình GOOGLE_API_KEY.");
    const geminiModel = model;
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          signal: AbortSignal.timeout(60000),
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              { role: "user", parts: [{ text: messages.map((m) => `[${m.role}]\n${m.content}`).join("\n\n") + `\n\nFormat required: JSON matching this schema:\n${JSON.stringify(evaluationSchema)}` }] },
            ],
            generationConfig: {
              temperature: 0.3,
              responseMimeType: "application/json",
            },
          }),
        },
      );
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError")
        throw new Error("AI mất quá lâu để chấm điểm. Hãy thử lại.");
      throw new Error("Không kết nối được Gemini API.");
    }
    if (!response.ok) {
      if (response.status === 429) throw new Error("AI đang giới hạn yêu cầu. Đợi một chút rồi thử lại.");
      throw new Error(`Gemini trả lỗi HTTP ${response.status}.`);
    }
  } else if (provider === "openai") {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("Chưa cấu hình OPENAI_API_KEY.");
    try {
      response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        signal: AbortSignal.timeout(45000),
        cache: "no-store",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          temperature: 0.3,
          response_format: {
            type: "json_schema",
            json_schema: { name: "evaluation_result", strict: true, schema: evaluationSchema },
          },
          messages,
        }),
      });
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError")
        throw new Error("AI mất quá lâu để chấm điểm. Hãy thử lại sau.");
      throw new Error("Không kết nối được dịch vụ AI.");
    }
    if (!response.ok) {
      if (response.status === 429) throw new Error("AI đang giới hạn yêu cầu. Đợi một chút rồi thử lại.");
      throw new Error(`OpenAI trả lỗi HTTP ${response.status}.`);
    }
  } else if (provider === "groq") {
    const apiKey = aiConfig.groqApiKey || process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("Chưa cấu hình GROQ_API_KEY.");
    try {
      response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        signal: AbortSignal.timeout(45000),
        cache: "no-store",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          temperature: 0.3,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: messages[0].content + `\n\nReturn ONLY a JSON object matching this schema:\n${JSON.stringify(evaluationSchema)}` },
            messages[1],
          ],
        }),
      });
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError")
        throw new Error("AI mất quá lâu để chấm điểm. Hãy thử lại sau.");
      throw new Error("Không kết nối được dịch vụ AI.");
    }
    if (!response.ok) {
      if (response.status === 429) throw new Error("AI đang giới hạn yêu cầu. Đợi một chút rồi thử lại.");
      throw new Error(`Groq trả lỗi HTTP ${response.status}.`);
    }
  } else {
    throw new Error("CV_AI_PROVIDER chỉ nhận giá trị `ollama`, `openai`, `gemini`, hoặc `groq`.");
  }

  let text: string | undefined;
  if (provider === "gemini") {
    const payload = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  } else if (provider === "ollama") {
    const payload = (await response.json()) as {
      message?: { content?: string }; done_reason?: string;
      total_duration?: number; load_duration?: number; prompt_eval_count?: number; eval_count?: number;
    };
    // Log performance only, never CVs, answers, or model feedback.
    console.info("Ollama evaluation timing", {
      model, totalMs: typeof payload.total_duration === "number" ? Math.round(payload.total_duration / 1e6) : undefined,
      loadMs: typeof payload.load_duration === "number" ? Math.round(payload.load_duration / 1e6) : undefined,
      inputTokens: payload.prompt_eval_count, outputTokens: payload.eval_count, doneReason: payload.done_reason,
    });
    if (payload.done_reason === "length") throw new Error("AI chưa hoàn thành bảng chấm trong giới hạn đầu ra. Hãy thử lại.");
    text = payload.message?.content;
  } else if (provider === "groq") {
    const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    text = payload.choices?.[0]?.message?.content;
  } else {
    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    text = payload.choices?.[0]?.message?.content;
  }

  let result: unknown;
  try {
    result = JSON.parse(text || "");
  } catch {
    throw new Error("AI trả về kết quả chấm điểm không đọc được. Hãy thử lại.");
  }

  const rubric = parseRubric(result, { answer: input.userAnswer, language: input.language, targetRole: input.targetRole });
  const structureLabel = rubric.structure.status === "passed" ? "Đạt chuẩn cấu trúc" : rubric.structure.status === "failed" ? "Chưa đạt chuẩn cấu trúc" : "Chưa đủ dữ liệu cấu trúc";
  return {
    score: rubric.totalScore === null ? null : rubric.totalScore / 10,
    rubric,
    feedback: [
      `${rubric.provisional ? "Điểm tạm tính" : "Điểm checklist"}: ${rubric.totalScore ?? "Chưa đủ dữ liệu"}${rubric.totalScore === null ? "" : "/100"} (${rubric.assessedCount}/5 tiêu chí).`,
      `${rubric.structure.method}: ${structureLabel}.`,
      ...rubric.strengths.map(s => `Làm tốt: ${s}`),
      ...rubric.weaknesses.map(s => `Cần cải thiện: ${s}`),
    ].join("\n"),
    suggestion: rubric.practice,
  };
}
