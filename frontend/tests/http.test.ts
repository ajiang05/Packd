import { describe, expect, test } from "vitest";
import { readJson } from "../lib/server/http";

describe("bounded JSON reader", () => {
  test("accepts a valid JSON body and rejects invalid syntax", async () => {
    expect(
      await readJson(
        new Request("http://localhost", {
          method: "POST",
          body: '{"title":"Passport"}',
        }),
      ),
    ).toEqual({ title: "Passport" });
    await expect(
      readJson(new Request("http://localhost", { method: "POST", body: "{" })),
    ).rejects.toMatchObject({ status: 400 });
  });
  test("counts bytes, including multibyte text, before parsing", async () => {
    await expect(
      readJson(
        new Request("http://localhost", {
          method: "POST",
          body: JSON.stringify({ value: "旅".repeat(6000) }),
        }),
      ),
    ).rejects.toMatchObject({ status: 413 });
  });
});
