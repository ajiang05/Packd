import { describe, expect, test } from "vitest";
import { toInstant, toLocal } from "../lib/dates";
describe("trip-local time conversion", () => {
  test("round trips times independently of browser timezone", () => {
    expect(toInstant("2026-12-21T09:00", "America/Puerto_Rico")).toBe(
      "2026-12-21T13:00:00Z",
    );
    expect(toLocal("2026-12-21T13:00:00Z", "America/Puerto_Rico")).toBe(
      "2026-12-21T09:00",
    );
  });
  test("rejects ambiguous and nonexistent daylight-saving times", () => {
    expect(() => toInstant("2026-03-08T02:30", "America/New_York")).toThrow();
    expect(() => toInstant("2026-11-01T01:30", "America/New_York")).toThrow();
  });
});
