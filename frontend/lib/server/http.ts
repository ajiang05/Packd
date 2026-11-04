import { createHash } from "node:crypto";
import { db } from "./db";
import { ApiError } from "./domain";

export async function readJson(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) return {};
  const decoder = new TextDecoder();
  let bytes = 0,
    text = "";
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 16384) {
        await reader.cancel();
        throw new ApiError(413, "TOO_LARGE", "Request is too large.");
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
  } finally {
    reader.releaseLock();
  }
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new ApiError(400, "INVALID_JSON", "Request must contain valid JSON.");
  }
}

export async function rateLimit(userId: string, invitation: boolean) {
  const key = createHash("sha256")
    .update(`${userId}:${invitation ? "invitation" : "mutation"}`)
    .digest("hex");
  const limit = invitation ? 20 : 120;
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "RequestLimit" ("key", "startedAt", "count") VALUES (${key}, NOW(), 1)
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RequestLimit"."startedAt" < NOW() - INTERVAL '1 minute' THEN 1 ELSE "RequestLimit"."count" + 1 END,
      "startedAt" = CASE WHEN "RequestLimit"."startedAt" < NOW() - INTERVAL '1 minute' THEN NOW() ELSE "RequestLimit"."startedAt" END
    RETURNING "count"`;
  if (rows[0].count > limit)
    throw new ApiError(
      429,
      "RATE_LIMITED",
      "Too many changes. Wait a minute and try again.",
    );
}
