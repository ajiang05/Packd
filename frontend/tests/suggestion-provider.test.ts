import { afterEach, expect, test, vi } from "vitest";
import { generateSuggestions } from "../lib/server/suggestion-provider";
const context = {
  destination: "Boston",
  startDate: "2026-12-20",
  endDate: "2026-12-22",
  timezone: "America/New_York",
  budgetMinor: 10000,
  budgetType: "TOTAL",
  currency: "USD",
  memberCount: 2,
  existingActivities: [],
};
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
test("actual LangChain adapter sends bounded search and structured model requests", async () => {
  vi.stubEnv("GEMINI_API_KEY", "test-key");
  vi.stubEnv("TAVILY_API_KEY", "test-search-key");
  const calls: { url: string; body: Record<string, unknown> }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const req = url instanceof Request ? url : new Request(url, init);
      const body = await req.json();
      calls.push({ url: req.url, body });
      if (req.url.includes("tavily.com"))
        return Response.json({
          results: [
            {
              title: "Museum",
              url: "https://example.org/museum",
              content: "Museum activities",
            },
          ],
        });
      expect(req.url).toContain("generativelanguage.googleapis.com");
      return Response.json({
        candidates: [
          {
            content: {
              role: "model",
              parts: [
                {
                  functionCall: {
                    name: "activity_suggestions",
                    args: { suggestions: [] },
                  },
                },
              ],
            },
            finishReason: "STOP",
          },
        ],
        usageMetadata: { promptTokenCount: 50, candidatesTokenCount: 20 },
      });
    }),
  );
  const result = await generateSuggestions(
    context,
    { preferences: "Museums", maxCostMinor: null },
    AbortSignal.timeout(3000),
  );
  expect(result.output).toEqual({ suggestions: [] });
  expect(result.sources).toHaveLength(1);
  expect(calls).toHaveLength(2);
  expect(calls[0].body).toMatchObject({
    query: "Boston travel activities Museums",
    search_depth: "basic",
    max_results: 8,
  });
  expect(calls[1].body).toMatchObject({
    generationConfig: { maxOutputTokens: 2500 },
  });
  expect(calls[1].body.tools).toBeDefined();
});
test("empty search avoids the model and search errors do not retry", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ results: [] }))
    .mockResolvedValueOnce(new Response("Unavailable", { status: 503 }));
  vi.stubGlobal("fetch", fetcher);
  expect(
    (
      await generateSuggestions(
        context,
        { preferences: "", maxCostMinor: null },
        AbortSignal.timeout(3000),
      )
    ).output,
  ).toEqual({ suggestions: [] });
  await expect(
    generateSuggestions(
      context,
      { preferences: "", maxCostMinor: null },
      AbortSignal.timeout(3000),
    ),
  ).rejects.toThrow();
  expect(fetcher).toHaveBeenCalledTimes(2);
});
