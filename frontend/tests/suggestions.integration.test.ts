import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";
import { db } from "../lib/server/db";
import { operate } from "../lib/server/domain";
import {
  reserveSuggestionQuota,
  suggestActivities,
  type Planner,
} from "../lib/server/activity-suggestions";
import { suggestionProposal } from "../lib/suggestions";
import type { Trip } from "@prisma/client";
const integration =
  process.env.DATABASE_URL &&
  new URL(process.env.DATABASE_URL).pathname === "/packd_test"
    ? describe
    : describe.skip;
const fixture = {
  output: {
    suggestions: [
      {
        name: "Museum",
        description: "Exhibits",
        location: "Boston",
        estimatedCostMinor: 2000,
        durationMinutes: 90,
        sourceIndex: 0,
      },
    ],
  },
  sources: [
    {
      title: "Museum source",
      url: "https://example.org/museum",
      content: "Exhibits",
    },
  ],
};
integration("suggestion authorization and PostgreSQL quotas", () => {
  let owner: string, member: string, stranger: string, trip: Trip;
  const ids: string[] = [];
  beforeAll(async () => {
    for (const name of ["Planner Owner", "Planner Member", "Planner Stranger"])
      ids.push((await db.user.create({ data: { name } })).id);
    [owner, member, stranger] = ids;
    trip = (await operate(owner, "POST", ["trips"], {
      name: "Planner trip",
      destination: "Boston",
      startDate: "2026-12-20",
      endDate: "2026-12-22",
      timezone: "America/New_York",
    })) as Trip;
    await db.checklistItem.create({
      data: { userId: owner, tripId: trip.id, title: "PRIVATE_DO_NOT_SEND" },
    });
  });
  beforeEach(async () => {
    vi.unstubAllEnvs();
    await db.requestLimit.deleteMany({ where: { key: { startsWith: "ai:" } } });
  });
  afterAll(async () => {
    vi.unstubAllEnvs();
    await db.requestLimit.deleteMany({ where: { key: { startsWith: "ai:" } } });
    await db.trip.deleteMany({ where: { id: trip.id } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
    await db.$disconnect();
  });
  test("denies strangers before provider work or quota use", async () => {
    const planner = vi.fn<Planner>().mockResolvedValue(fixture);
    await expect(
      suggestActivities(stranger, trip.id, {}, undefined, planner),
    ).rejects.toMatchObject({ status: 404 });
    expect(planner).not.toHaveBeenCalled();
    expect(await db.requestLimit.count({ where: { key: "ai:global" } })).toBe(
      0,
    );
  });
  test("sends minimal context and only persists an explicitly accepted proposal", async () => {
    const planner = vi.fn<Planner>().mockResolvedValue(fixture);
    const result = await suggestActivities(
      owner,
      trip.id,
      { preferences: "Museums" },
      undefined,
      planner,
    );
    const context = planner.mock.calls[0][0];
    expect(Object.keys(context).sort()).toEqual(
      [
        "destination",
        "startDate",
        "endDate",
        "timezone",
        "budgetMinor",
        "budgetType",
        "currency",
        "memberCount",
        "existingActivities",
      ].sort(),
    );
    expect(JSON.stringify(context)).not.toContain("PRIVATE_DO_NOT_SEND");
    expect(context.destination).toBe("Boston");
    expect(await db.activity.count({ where: { tripId: trip.id } })).toBe(0);
    await operate(
      owner,
      "POST",
      ["trips", trip.id, "activities"],
      suggestionProposal(result.suggestions[0]),
    );
    expect(
      (await db.activity.findFirstOrThrow({ where: { tripId: trip.id } }))
        .description,
    ).toContain(fixture.sources[0].url);
    expect(
      await db.vote.count({ where: { activity: { tripId: trip.id } } }),
    ).toBe(0);
    expect(await db.scheduleItem.count({ where: { tripId: trip.id } })).toBe(0);
  });
  test("handles missing keys, invalid output, provider failure, and cancellation", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("TAVILY_API_KEY", "");
    await expect(suggestActivities(owner, trip.id, {})).rejects.toMatchObject({
      status: 503,
    });
    await expect(
      suggestActivities(owner, trip.id, {}, undefined, async () => {
        throw new Error("secret upstream detail");
      }),
    ).rejects.toMatchObject({ status: 502, code: "AI_PROVIDER_ERROR" });
    await expect(
      suggestActivities(owner, trip.id, {}, undefined, async () => ({
        ...fixture,
        output: { bad: true },
      })),
    ).rejects.toMatchObject({ status: 502 });
    await expect(
      suggestActivities(
        owner,
        trip.id,
        {},
        AbortSignal.abort(),
        async () => fixture,
      ),
    ).rejects.toMatchObject({ status: 504 });
  });
  test("rechecks membership after generation", async () => {
    await db.tripMember.create({
      data: { tripId: trip.id, userId: member, addedById: owner },
    });
    await expect(
      suggestActivities(member, trip.id, {}, undefined, async () => {
        await operate(owner, "DELETE", ["trips", trip.id, "members", member]);
        return fixture;
      }),
    ).rejects.toMatchObject({ status: 404 });
  });
  test("limits concurrent requests to five per user with atomic global reservation", async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 6 }, () => reserveSuggestionQuota(owner)),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(5);
    expect(
      await db.requestLimit.findUnique({ where: { key: "ai:global" } }),
    ).toMatchObject({ count: 5 });
    await db.requestLimit.updateMany({
      where: { key: { startsWith: "ai:user:" } },
      data: { startedAt: new Date(Date.now() - 61000) },
    });
    await expect(reserveSuggestionQuota(owner)).resolves.toBeUndefined();
  });
  test("enforces a global cap across users and resets after the rolling day", async () => {
    vi.stubEnv("AI_DAILY_REQUEST_LIMIT", "1");
    await reserveSuggestionQuota(owner);
    await expect(reserveSuggestionQuota(member)).rejects.toMatchObject({
      status: 429,
    });
    await db.requestLimit.update({
      where: { key: "ai:global" },
      data: { startedAt: new Date(Date.now() - 86401000) },
    });
    await expect(reserveSuggestionQuota(member)).resolves.toBeUndefined();
  });
});
