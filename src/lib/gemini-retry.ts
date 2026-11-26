export class GeminiUnavailableError extends Error {
  constructor(message: string, public readonly attempts: number, public readonly lastStatus: number | null, public readonly lastFailure: string) {
    super(message);
  }
}

export async function fetchGeminiWithRetry(url: string, init: RequestInit): Promise<Response> {
  const deadline = Date.now() + 50000;
  let attempts = 0;
  let lastStatus: number | null = null;
  let lastFailure = "unknown";
  for (let attempt = 0; attempt < 3; attempt++) {
    const remaining = deadline - Date.now();
    if (remaining < 1000) break;
    attempts++;
    const started = Date.now();
    try {
      const response = await fetch(url, { ...init, signal: AbortSignal.timeout(Math.min(35000, remaining)) });
      if (![502, 503, 504].includes(response.status)) return response;
      lastStatus = response.status;
      lastFailure = "upstream_http";
      console.warn("Gemini retryable response", { attempt: attempts, status: response.status, elapsedMs: Date.now() - started });
      await response.body?.cancel();
    } catch (error) {
      if (!(error instanceof TypeError) && !(error instanceof Error && error.name === "TimeoutError")) throw error;
      lastStatus = null;
      lastFailure = error instanceof Error && error.name === "TimeoutError" ? "timeout" : "network";
      console.warn("Gemini retryable request failure", { attempt: attempts, failure: lastFailure, elapsedMs: Date.now() - started });
    }
    if (attempt < 2 && deadline - Date.now() > 5000) await new Promise((resolve) => setTimeout(resolve, 2000 * 2 ** attempt));
  }
  throw new GeminiUnavailableError(`Gemini chưa phản hồi thành công sau ${attempts} lần thử (${lastStatus ? `HTTP ${lastStatus}` : lastFailure}). Hãy thử lại sau.`, attempts, lastStatus, lastFailure);
}
