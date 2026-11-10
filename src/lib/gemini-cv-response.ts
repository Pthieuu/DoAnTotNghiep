type GeminiResponse = {
  promptFeedback?: { blockReason?: string };
  candidates?: {
    finishReason?: string;
    content?: { parts?: { text?: string; thought?: boolean }[] };
  }[];
};

export function readGeminiCvJson(payload: GeminiResponse): unknown {
  if (payload.promptFeedback?.blockReason) {
    throw new Error("Gemini đã chặn yêu cầu đọc CV. Bạn có thể nhập thông tin thủ công.");
  }
  const candidate = payload.candidates?.[0];
  if (candidate?.finishReason === "MAX_TOKENS") {
    throw new Error("Kết quả Gemini bị cắt do giới hạn độ dài. Hãy rút gọn CV hoặc nhập thông tin thủ công.");
  }
  if (candidate?.finishReason && candidate.finishReason !== "STOP") {
    throw new Error(`Gemini chưa hoàn tất đọc CV (${candidate.finishReason}). Hãy thử lại hoặc nhập thủ công.`);
  }
  const text = (candidate?.content?.parts || [])
    .filter((part) => !part.thought && typeof part.text === "string")
    .map((part) => part.text).join("").trim();
  if (!text) throw new Error("Gemini trả về kết quả trống. Hãy thử lại hoặc nhập thông tin thủ công.");
  // Accept a complete Markdown wrapper, but never repair truncated JSON or invent fields.
  const json = text.replace(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i, "$1").trim();
  try { return JSON.parse(json); } catch {
    throw new Error("Gemini trả về JSON không hợp lệ. Hãy thử lại hoặc nhập thông tin thủ công.");
  }
}
