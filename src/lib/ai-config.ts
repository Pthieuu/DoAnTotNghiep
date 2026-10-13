import fs from "fs";
import path from "path";

export function getAiConfig() {
  const env: Record<string, string> = {};

  try {
    const envPath = path.join(process.cwd(), ".env.local");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
          env[key] = value;
        }
      }
    }
  } catch {
    // fallback to process.env
  }

  const groqApiKey = env.GROQ_API_KEY || process.env.GROQ_API_KEY || "";
  const rawProvider = env.CV_AI_PROVIDER || process.env.CV_AI_PROVIDER;
  const provider = (rawProvider || (groqApiKey ? "groq" : "ollama")).toLowerCase();
  const groqModel = env.GROQ_MODEL || process.env.GROQ_MODEL || "qwen/qwen3.8-27b";
  const ollamaBaseUrl = env.OLLAMA_BASE_URL || process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
  const ollamaModel = env.OLLAMA_MODEL || process.env.OLLAMA_MODEL || "qwen3:4b";
  const geminiApiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || "";
  const geminiModel = env.GEMINI_MODEL || process.env.GEMINI_MODEL || "gemini-3.8-flash";

  return {
    provider,
    groqApiKey,
    groqModel,
    ollamaBaseUrl,
    ollamaModel,
    geminiApiKey,
    geminiModel,
  };
}
