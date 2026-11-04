import { readJson, rateLimit } from "@/lib/server/http";
import { z } from "zod";
import { trace } from "@opentelemetry/api";
import { randomUUID } from "node:crypto";
import { auth } from "@/auth";
import { ApiError, errorResponse, operate } from "@/lib/server/domain";
import { suggestActivities } from "@/lib/server/activity-suggestions";

export const runtime = "nodejs";
async function handle(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const requestId = randomUUID(),
    start = Date.now();
  let status = 200;
  try {
    const session = await auth();
    if (!session?.user?.id)
      throw new ApiError(401, "UNAUTHENTICATED", "Sign in to continue.");
    const userId = session.user.id;
    if (!["GET", "HEAD"].includes(request.method)) {
      if (
        request.headers.get("origin") !==
        new URL(process.env.AUTH_URL ?? request.url).origin
      )
        throw new ApiError(
          403,
          "INVALID_ORIGIN",
          "Request origin is not allowed.",
        );
      if (!request.headers.get("content-type")?.includes("application/json"))
        throw new ApiError(400, "INVALID_CONTENT_TYPE", "Send a JSON request.");
    }
    const { path } = await context.params;
    let body: unknown = {};
    if (request.method !== "GET") {
      await rateLimit(userId, path.includes("invitations"));
      body = await readJson(request);
    }
    const query = new URL(request.url).searchParams;
    const paging = z
      .object({
        cursor: z.string().min(1).max(100).optional(),
        limit: z.coerce.number().int().min(1).max(100).default(100),
      })
      .parse({
        cursor: query.get("cursor") ?? undefined,
        limit: query.get("limit") ?? undefined,
      });
    const data = await trace
      .getTracer("packd")
      .startActiveSpan("packd.domain", async (span) => {
        try {
          if (
            path.length === 3 &&
            path[0] === "trips" &&
            path[2] === "suggestions"
          ) {
            if (request.method !== "POST")
              throw new ApiError(
                405,
                "METHOD_NOT_ALLOWED",
                "This operation is not supported.",
              );
            return await suggestActivities(
              userId,
              path[1],
              body,
              request.signal,
            );
          }
          return await operate(userId, request.method, path, body, paging);
        } finally {
          span.end();
        }
      });
    status =
      data === null
        ? 204
        : request.method === "POST" &&
            path.join("/") !== "invitations/accept" &&
            path[2] !== "suggestions"
          ? 201
          : 200;
    return new Response(data === null ? null : JSON.stringify(data), {
      status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "X-Request-ID": requestId,
      },
    });
  } catch (error) {
    console.error("API error in route.ts:", error);
    const response = errorResponse(error, requestId);
    status = response.status;
    return Response.json(response.body, {
      status,
      headers: {
        "Cache-Control": "no-store",
        "X-Request-ID": requestId,
        ...(status === 429 && response.body.error.code !== "AI_RATE_LIMITED"
          ? { "Retry-After": "60" }
          : {}),
      },
    });
  } finally {
    console.info(
      JSON.stringify({
        requestId,
        method: request.method,
        status,
        durationMs: Date.now() - start,
      }),
    );
  }
}
export {
  handle as GET,
  handle as POST,
  handle as PATCH,
  handle as PUT,
  handle as DELETE,
};
