import "server-only";

type EvaluationInput = {
  cvText: string;
  interviewType: string;
  question: string;
  questionType: string;
  userAnswer: string;
  questionIndex: number;
  totalQuestions: number;
};

export type EvaluationResult = {
  score: number;
  feedback: string;
  suggestion: string | null;
};

const evaluationSchema = {
  type: "object",
  additionalProperties: false,
  required: ["score", "feedback", "suggestion"],
  properties: {
    score: { type: "number" },
    feedback: { type: "string" },
    suggestion: { type: ["string", "null"] },
  },
};

export async function evaluateAnswer(input: EvaluationInput): Promise<EvaluationResult> {
  const provider = (process.env.CV_AI_PROVIDER || "ollama").toLowerCase();
  const model = provider === "ollama"
    ? process.env.OLLAMA_MODEL || "qwen3:4b"
    : provider === "gemini"
      ? process.env.GEMINI_MODEL || "gemini-3.8-flash"
      : provider === "groq"
        ? process.env.GROQ_MODEL || "llama-3.1-70b-versatile"
        : process.env.OPENAI_INTERVIEW_MODEL || process.env.OPENAI_CV_MODEL || "gpt-4o-mini";

  const messages = [
    {
      role: "system",
      content: `Bạn là một AI Interviewer chuyên nghiệp đang chấm điểm câu trả lời phỏng vấn.

THÔNG TIN CV CỦA ỨNG VIÊN:
${input.cvText}

LOẠI PHỎNG VẤN: ${input.interviewType}

QUY TẮC CHẤM ĐIỂM:
1. Chấm điểm 0–10 dựa trên: độ chính xác, độ sâu, ví dụ cụ thể, cấu trúc câu trả lời.
2. Câu hỏi technical: Đánh giá kiến thức kỹ thuật, khả năng giải thích, và ví dụ thực tế.
3. Câu hỏi behavioral: Đánh giá phương pháp STAR (Situation, Task, Action, Result).
4. Phản hồi mang tính xây dựng, thân thiện và chuyên nghiệp.
5. Nếu câu trả lời dưới 7/10, BẮT BUỘC phải đưa ra gợi ý cải thiện (suggestion).
6. Nếu câu trả lời từ 7/10 trở lên, suggestion = null.

NGÔN NGỮ: Trả lời bằng tiếng Việt.
Return JSON only.`,
    },
    {
      role: "user",
      content: `CÂU HỎI (${input.questionType}, câu ${input.questionIndex + 1}/${input.totalQuestions}):
${input.question}

CÂU TRẢ LỜI CỦA ỨNG VIÊN:
${input.userAnswer}

Hãy chấm điểm và phản hồi.`,
    },
  ];

  let response: Response;
  if (provider === "ollama") {
    const baseUrl = (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/$/, "");
    try {
      response = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        signal: AbortSignal.timeout(60000),
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          stream: false,
          think: false,
          keep_alive: "30s",
          format: evaluationSchema,
          options: { temperature: 0.3, num_ctx: 8192, num_predict: 1024 },
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
    const apiKey = process.env.GROQ_API_KEY;
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
    const payload = (await response.json()) as { message?: { content?: string } };
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

  const data = result as Record<string, unknown>;
  const score = Number(data.score);
  if (isNaN(score) || score < 0 || score > 10)
    throw new Error("AI trả về điểm số không hợp lệ.");

  return {
    score: Math.round(score * 10) / 10,
    feedback: typeof data.feedback === "string" ? data.feedback : "Không có phản hồi.",
    suggestion: typeof data.suggestion === "string" ? data.suggestion : null,
  };
}
