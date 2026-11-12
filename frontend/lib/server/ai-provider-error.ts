export class AIProviderError extends Error {
  constructor(
    readonly provider: "tavily" | "gemini",
    readonly status: number | null,
  ) {
    super("AI provider request failed");
  }
}

export function providerStatus(error: unknown): number | null {
  if (!error || typeof error !== "object" || !("status" in error)) return null;
  const status = error.status;
  return typeof status === "number" &&
    Number.isInteger(status) &&
    status >= 400 &&
    status <= 599
    ? status
    : null;
}

// Retry only temporary server errors, once, within the caller's existing deadline.
export async function withGeminiRetry<T>(
  operation: () => Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    signal.throwIfAborted();
    try {
      return await operation();
    } catch (error) {
      signal.throwIfAborted();
      const status = providerStatus(error);
      if (
        attempt === 0 &&
        status !== null &&
        [500, 502, 503, 504].includes(status)
      )
        continue;
      throw new AIProviderError("gemini", status);
    }
  }
}
