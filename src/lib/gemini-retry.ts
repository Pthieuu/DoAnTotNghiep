export class GeminiUnavailableError extends Error {}

export async function fetchGeminiWithRetry(url: string, init: RequestInit): Promise<Response> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, { ...init, signal: AbortSignal.timeout(35000) });
      if (![502, 503, 504].includes(response.status)) return response;
      await response.body?.cancel();
    } catch (error) {
      if (!(error instanceof TypeError) && !(error instanceof Error && error.name === "TimeoutError")) throw error;
    }
    if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 2000 * 2 ** attempt));
  }
  throw new GeminiUnavailableError("Gemini tạm thời không chấm điểm được sau 3 lần thử. Hãy đợi một chút rồi gửi lại câu trả lời.");
}
