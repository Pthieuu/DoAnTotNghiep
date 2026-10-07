import "server-only";

type SummaryInput = {
  sessionTitle: string;
  interviewType: string;
  totalQuestions: number;
  answers: Array<{
    question: string;
    answer: string;
    score: number;
    feedback: string;
    question_type: string;
  }>;
};

export type SummaryResult = {
  totalScore: number;
  grade: string;
  strengths: string[];
  weaknesses: string[];
  improvementTips: string[];
};

const summarySchema = {
  type: "object",
  additionalProperties: false,
  required: ["totalScore", "grade", "strengths", "weaknesses", "improvementTips"],
  properties: {
    totalScore: { type: "number" },
    grade: { type: "string" },
    strengths: { type: "array", items: { type: "string" } },
    weaknesses: { type: "array", items: { type: "string" } },
    improvementTips: { type: "array", items: { type: "string" } },
  },
};

export async function generateSummary(input: SummaryInput): Promise<SummaryResult> {
  const provider = (process.env.CV_AI_PROVIDER || "ollama").toLowerCase();
  const model = provider === "ollama"
    ? process.env.OLLAMA_MODEL || "qwen3:4b"
    : provider === "gemini"
      ? process.env.GEMINI_MODEL || "gemini-3.8-flash"
      : provider === "groq"
        ? process.env.GROQ_MODEL || "llama-3.1-70b-versatile"
        : process.env.OPENAI_INTERVIEW_MODEL || process.env.OPENAI_CV_MODEL || "gpt-4o-mini";

  const answersText = input.answers.map((a, i) => `Câu ${i + 1} (${a.question_type}) [Điểm: ${a.score}/10]:
Hỏi: ${a.question}
Đáp: ${a.answer}
Phản hồi: ${a.feedback}
`).join("\n");

  const messages = [
    {
      role: "system",
      content: `Bạn là một AI Interviewer chuyên nghiệp đang tổng kết kết quả của một buổi phỏng vấn.

THÔNG TIN BUỔI PHỎNG VẤN:
Tiêu đề: ${input.sessionTitle}
Loại phỏng vấn: ${input.interviewType}
Tổng số câu: ${input.totalQuestions}

NHIỆM VỤ:
Dựa trên lịch sử trả lời và điểm số của từng câu hỏi dưới đây, hãy tổng kết lại:
1. Tính điểm tổng (totalScore) trên thang 100.
2. Xếp loại (grade): A (>= 80), B (65-79), C (50-64), D (< 50).
3. Đưa ra 2-3 điểm mạnh (strengths).
4. Đưa ra 2-3 điểm yếu (weaknesses).
5. Gợi ý 2-3 cách cải thiện (improvementTips).

LỊCH SỬ TRẢ LỜI:
${answersText}

NGÔN NGỮ: Tiếng Việt.
Return JSON only.`,
    },
  ];

  let response: Response;
  if (provider === "ollama") {
    const baseUrl = (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/$/, "");
    try {
      response = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        signal: AbortSignal.timeout(80000),
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          stream: false,
          think: false,
          keep_alive: "30s",
          format: summarySchema,
          options: { temperature: 0.3, num_ctx: 8192, num_predict: 2048 },
          messages,
        }),
      });
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError")
        throw new Error("AI mất quá lâu để tổng kết. Hãy thử lại.");
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
          signal: AbortSignal.timeout(80000),
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              { role: "user", parts: [{ text: messages[0].content + `\n\nFormat required: JSON matching this schema:\n${JSON.stringify(summarySchema)}` }] },
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
        throw new Error("AI mất quá lâu để tổng kết. Hãy thử lại.");
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
        signal: AbortSignal.timeout(60000),
        cache: "no-store",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          temperature: 0.3,
          response_format: {
            type: "json_schema",
            json_schema: { name: "summary_result", strict: true, schema: summarySchema },
          },
          messages,
        }),
      });
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError")
        throw new Error("AI mất quá lâu để tổng kết. Hãy thử lại sau.");
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
        signal: AbortSignal.timeout(60000),
        cache: "no-store",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          temperature: 0.3,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: messages[0].content + `\n\nReturn ONLY a JSON object matching this schema:\n${JSON.stringify(summarySchema)}` },
          ],
        }),
      });
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError")
        throw new Error("AI mất quá lâu để tổng kết. Hãy thử lại sau.");
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
    throw new Error("AI trả về kết quả tổng kết không đọc được. Hãy thử lại.");
  }

  return result as SummaryResult;
}
