import { expect, test, vi } from "vitest";
import { withGeminiRetry } from "../lib/server/ai-provider-error";
test("retries a temporary Gemini failure once", async () => {
  const call = vi
    .fn()
    .mockRejectedValueOnce({ status: 503 })
    .mockResolvedValue("ok");
  expect(await withGeminiRetry(call, new AbortController().signal)).toBe("ok");
  expect(call).toHaveBeenCalledTimes(2);
});
test("bounds retries and strips sensitive error contents", async () => {
  const call = vi.fn().mockRejectedValue({ status: 503, message: "secret" });
  await expect(
    withGeminiRetry(call, new AbortController().signal),
  ).rejects.toMatchObject({
    provider: "gemini",
    status: 503,
    message: "AI provider request failed",
  });
  expect(call).toHaveBeenCalledTimes(2);
});
test.each([400, 401, 403, 429])("does not retry status %s", async (status) => {
  const call = vi.fn().mockRejectedValue({ status });
  await expect(
    withGeminiRetry(call, new AbortController().signal),
  ).rejects.toMatchObject({ status });
  expect(call).toHaveBeenCalledTimes(1);
});
test("does not start work after abort", async () => {
  const call = vi.fn();
  await expect(withGeminiRetry(call, AbortSignal.abort())).rejects.toThrow();
  expect(call).not.toHaveBeenCalled();
});
