import { AIProviderError } from "./ai-provider-error";
import { createHash } from "node:crypto";
import { z } from "zod";
import { db } from "./db";
import { ApiError } from "./domain";
import {
  generatedSuggestions,
  suggestionInput,
  type SuggestionResponse,
} from "../suggestions";

export type Source = { title: string; url: string; content: string };
export type PlannerContext = {
  destination: string;
  startDate: string;
  endDate: string;
  timezone: string;
  budgetMinor: number | null;
  budgetType: string | null;
  currency: string;
  memberCount: number;
  existingActivities: string[];
};
export type Planner = (
  context: PlannerContext,
  input: z.infer<typeof suggestionInput>,
  signal: AbortSignal,
) => Promise<{ output: unknown; sources: Source[] }>;

const normalize = (name: string) =>
  name.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
export function validateSuggestions(
  output: unknown,
  sources: Source[],
  existing: string[],
  maxCost: number | null,
): SuggestionResponse {
  const parsed = generatedSuggestions.parse(output);
  const names = new Set(existing.map(normalize));
  const suggestions = parsed.suggestions.flatMap(({ sourceIndex, ...item }) => {
    const source = sources[sourceIndex];
    if (!source) throw new Error("Unknown source");
    const url = new URL(source.url);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      source.url.length > 500
    )
      throw new Error("Invalid source URL");
    const name = normalize(item.name);
    if (
      names.has(name) ||
      (maxCost !== null &&
        (item.estimatedCostMinor === null || item.estimatedCostMinor > maxCost))
    )
      return [];
    names.add(name);
    return [{ ...item, sourceUrl: source.url, sourceTitle: source.title }];
  });
  return { suggestions };
}

// Both counters are reserved atomically across instances. Failures consume a slot.
// Stable keys avoid creating a new row every minute/day.
export async function reserveSuggestionQuota(userId: string) {
  const dailyLimit = z.coerce
    .number()
    .int()
    .min(1)
    .max(10000)
    .parse(process.env.AI_DAILY_REQUEST_LIMIT ?? "100");
  await db.$transaction(async (tx) => {
    for (const [key, seconds, limit] of [
      ["ai:global", 86400, dailyLimit],
      [`ai:user:${createHash("sha256").update(userId).digest("hex")}`, 60, 5],
    ] as const) {
      const rows = await tx.$queryRaw<{ count: number }[]>`
        INSERT INTO "RequestLimit" ("key", "startedAt", "count") VALUES (${key}, NOW(), 1)
        ON CONFLICT ("key") DO UPDATE SET
          "count" = CASE WHEN "RequestLimit"."startedAt" < NOW() - ${seconds} * INTERVAL '1 second' THEN 1 ELSE "RequestLimit"."count" + 1 END,
          "startedAt" = CASE WHEN "RequestLimit"."startedAt" < NOW() - ${seconds} * INTERVAL '1 second' THEN NOW() ELSE "RequestLimit"."startedAt" END
        WHERE "RequestLimit"."startedAt" < NOW() - ${seconds} * INTERVAL '1 second' OR "RequestLimit"."count" < ${limit}
        RETURNING "count"`;
      if (!rows.length)
        throw new ApiError(
          429,
          "AI_RATE_LIMITED",
          key === "ai:global"
            ? "Activity suggestions have reached the daily limit. Try again later or propose an activity manually."
            : "Too many suggestion requests. Wait a minute and try again.",
        );
    }
  });
}

export async function suggestActivities(
  userId: string,
  tripId: string,
  body: unknown,
  signal?: AbortSignal,
  planner?: Planner,
) {
  const input = suggestionInput.parse(body);
  const trip = await db.trip.findFirst({
    where: { id: tripId, members: { some: { userId } } },
    select: {
      destination: true,
      startDate: true,
      endDate: true,
      timezone: true,
      budgetMinor: true,
      budgetType: true,
      currency: true,
      _count: { select: { members: true } },
      activities: {
        select: { name: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      },
    },
  });
  if (!trip)
    throw new ApiError(404, "NOT_FOUND", "This resource is unavailable.");
  if (!trip.destination)
    throw new ApiError(
      409,
      "DESTINATION_REQUIRED",
      "Ask the organizer to set a destination before finding ideas.",
    );
  if (
    !planner &&
    (!process.env.GEMINI_API_KEY?.trim() || !process.env.TAVILY_API_KEY?.trim())
  )
    throw new ApiError(
      503,
      "AI_NOT_CONFIGURED",
      "Activity suggestions are not configured yet. You can still propose activities manually.",
    );
  await reserveSuggestionQuota(userId);
  const deadline = AbortSignal.timeout(45000);
  const combined = signal ? AbortSignal.any([signal, deadline]) : deadline;
  const context: PlannerContext = {
    destination: trip.destination,
    startDate: trip.startDate.toISOString().slice(0, 10),
    endDate: trip.endDate.toISOString().slice(0, 10),
    timezone: trip.timezone,
    budgetMinor: trip.budgetMinor,
    budgetType: trip.budgetType,
    currency: trip.currency,
    memberCount: trip._count.members,
    existingActivities: trip.activities.map((a) => a.name),
  };
  let result: SuggestionResponse;
  try {
    const generate =
      planner ?? (await import("./suggestion-provider")).generateSuggestions;
    const { output, sources } = await generate(context, input, combined);
    combined.throwIfAborted();
    result = validateSuggestions(
      output,
      sources,
      context.existingActivities,
      input.maxCostMinor,
    );
  } catch (error) {
    console.warn(
      JSON.stringify({
        event: "ai_suggestion_failed",
        provider:
          error instanceof AIProviderError ? error.provider : "pipeline",
        status: error instanceof AIProviderError ? error.status : null,
        category: combined.aborted
          ? "timeout"
          : error instanceof z.ZodError
            ? "invalid_response"
            : "provider_error",
      }),
    );
    if (combined.aborted)
      throw new ApiError(
        504,
        "AI_TIMEOUT",
        "Suggestions took too long. Please try again.",
      );
    throw new ApiError(
      502,
      "AI_PROVIDER_ERROR",
      "Suggestions are unavailable right now. Please try again or propose an activity manually.",
    );
  }
  // External calls do not hold a database transaction or trip lock. Recheck access
  // before returning; adding a proposal separately checks membership again.
  if (
    !(await db.tripMember.findUnique({
      where: { tripId_userId: { tripId, userId } },
      select: { id: true },
    }))
  )
    throw new ApiError(404, "NOT_FOUND", "This resource is unavailable.");
  return result;
}
