import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { rateLimit } from "../lib/server/http";
import { createHash } from "node:crypto";
import { db } from "../lib/server/db";
import { operate, validateTimes, localDate } from "../lib/server/domain";
import type {
  Trip,
  Activity,
  Invitation,
  ChecklistItem,
  ScheduleItem,
} from "@prisma/client";

// Never run database integration tests against an unspecified or shared production DB.
const integration =
  process.env.DATABASE_URL &&
  new URL(process.env.DATABASE_URL).pathname === "/packd_test"
    ? describe
    : describe.skip;
integration("PostgreSQL domain behavior", () => {
  const ids: string[] = [];
  let owner: string, member: string, stranger: string, trip: Trip;
  const input = {
    name: "Integration adventure",
    destination: "San Juan",
    startDate: "2026-12-20",
    endDate: "2026-12-25",
    timezone: "America/Puerto_Rico",
  };
  beforeAll(async () => {
    for (const name of ["Organizer", "Member", "Stranger"]) {
      const user = await db.user.create({ data: { name } });
      ids.push(user.id);
    }
    [owner, member, stranger] = ids;
    trip = (await operate(owner, "POST", ["trips"], input)) as Trip;
  });
  afterAll(async () => {
    await db.trip.deleteMany({ where: { createdById: { in: ids } } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
    await db.$disconnect();
  });
  test("creates organizer membership atomically and validates dates", async () => {
    expect(
      await db.tripMember.count({ where: { tripId: trip.id, userId: owner } }),
    ).toBe(1);
    await expect(
      operate(owner, "POST", ["trips"], { ...input, endDate: "2026-01-01" }),
    ).rejects.toThrow();
    await expect(
      operate("nonexistent-user", "POST", ["trips"], {
        ...input,
        name: "must roll back",
      }),
    ).rejects.toThrow();
    expect(await db.trip.count({ where: { name: "must roll back" } })).toBe(0);
  });
  test("denies nonmembers and accepts invitations exactly once", async () => {
    await expect(
      operate(stranger, "GET", ["trips", trip.id]),
    ).rejects.toMatchObject({ status: 404 });
    const invite = (await operate(owner, "POST", [
      "trips",
      trip.id,
      "invitations",
    ])) as Invitation & { token: string };
    await Promise.all(
      Array.from({ length: 5 }, () =>
        operate(member, "POST", ["invitations", "accept"], {
          token: invite.token,
        }),
      ),
    );
    expect(
      await db.tripMember.count({ where: { tripId: trip.id, userId: member } }),
    ).toBe(1);
    const stored = await db.invitation.findUniqueOrThrow({
      where: { id: invite.id },
    });
    expect(stored.tokenHash).not.toEqual(invite.token);
    await operate(owner, "DELETE", [
      "trips",
      trip.id,
      "invitations",
      invite.id,
    ]);
    await expect(
      operate(stranger, "POST", ["invitations", "accept"], {
        token: invite.token,
      }),
    ).rejects.toMatchObject({ status: 400 });
    const expired = (await operate(owner, "POST", [
      "trips",
      trip.id,
      "invitations",
    ])) as Invitation & { token: string };
    await db.invitation.update({
      where: { id: expired.id },
      data: { expiresAt: new Date(0) },
    });
    await expect(
      operate(stranger, "POST", ["invitations", "accept"], {
        token: expired.token,
      }),
    ).rejects.toMatchObject({ status: 400 });
  });
  test("protects budget and preserves exact cents", async () => {
    const value = {
      budgetMinor: 12345,
      budgetType: "PER_PERSON",
      currency: "USD",
    };
    await expect(
      operate(member, "PATCH", ["trips", trip.id, "budget"], value),
    ).rejects.toMatchObject({ status: 403 });
    await operate(owner, "PATCH", ["trips", trip.id, "budget"], value);
    expect(await operate(member, "GET", ["trips", trip.id, "budget"])).toEqual(
      value,
    );
    await expect(
      operate(owner, "PATCH", ["trips", trip.id, "budget"], {
        ...value,
        budgetMinor: -1,
      }),
    ).rejects.toThrow();
    await expect(
      operate(owner, "PATCH", ["trips", trip.id, "budget"], {
        ...value,
        budgetMinor: 1.5,
      }),
    ).rejects.toThrow();
  });
  test("serializes votes and prevents changing voted-on proposals", async () => {
    const activity = (await operate(
      member,
      "POST",
      ["trips", trip.id, "activities"],
      { name: "Kayaking" },
    )) as Activity;
    const path = ["trips", trip.id, "activities", activity.id, "votes", "me"];
    await Promise.all(
      Array.from({ length: 8 }, () =>
        operate(member, "PUT", path, { value: true }),
      ),
    );
    expect(
      await db.vote.count({
        where: { activityId: activity.id, userId: member },
      }),
    ).toBe(1);
    await operate(member, "PUT", path, { value: false });
    expect(await operate(member, "GET", path.slice(0, -1))).toMatchObject({
      yes: 0,
      no: 1,
      outstanding: 1,
      myVote: false,
    });
    await expect(
      operate(owner, "PATCH", ["trips", trip.id, "activities", activity.id], {
        name: "Different proposal",
      }),
    ).rejects.toMatchObject({ status: 409 });
    const other = (await operate(stranger, "POST", ["trips"], input)) as Trip;
    await expect(
      operate(
        stranger,
        "PUT",
        ["trips", other.id, "activities", activity.id, "votes", "me"],
        { value: true },
      ),
    ).rejects.toMatchObject({ status: 404 });
  });
  test("keeps checklists private from other members and organizers", async () => {
    const item = (await operate(
      member,
      "POST",
      ["trips", trip.id, "checklist"],
      { title: "Passport" },
    )) as ChecklistItem;
    await expect(
      operate(owner, "PATCH", ["trips", trip.id, "checklist", item.id], {
        isChecked: true,
      }),
    ).rejects.toMatchObject({ status: 404 });
    await operate(member, "PATCH", ["trips", trip.id, "checklist", item.id], {
      isChecked: true,
    });
    expect(
      await operate(member, "GET", ["trips", trip.id, "checklist"]),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: item.id, isChecked: true }),
      ]),
    );
    expect(
      await operate(owner, "GET", ["trips", trip.id, "checklist"]),
    ).toEqual([]);
  });
  test("rejects stale itinerary updates and invalid trip date edits", async () => {
    const data = {
      title: "Beach",
      startTime: "2026-12-21T09:00:00-04:00",
      endTime: "2026-12-21T10:00:00-04:00",
    };
    const entry = (await operate(
      owner,
      "POST",
      ["trips", trip.id, "itinerary"],
      data,
    )) as ScheduleItem;
    const results = await Promise.allSettled(
      ["First", "Second"].map((title) =>
        operate(owner, "PATCH", ["trips", trip.id, "itinerary", entry.id], {
          ...data,
          title,
          version: 1,
        }),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find(
      (r) => r.status === "rejected",
    ) as PromiseRejectedResult;
    expect(rejected.reason).toMatchObject({ status: 409 });
    await expect(
      operate(member, "POST", ["trips", trip.id, "itinerary"], data),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      operate(owner, "PATCH", ["trips", trip.id], {
        ...input,
        endDate: "2026-12-20",
      }),
    ).rejects.toMatchObject({ status: 400 });
  });
  test("authors can edit and delete unvoted proposals; other members cannot", async () => {
    const activity = (await operate(
      owner,
      "POST",
      ["trips", trip.id, "activities"],
      { name: "Museum", estimatedCostMinor: 1250 },
    )) as Activity;
    const path = ["trips", trip.id, "activities", activity.id];
    await expect(
      operate(member, "PATCH", path, { name: "Unauthorized" }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(operate(member, "DELETE", path)).rejects.toMatchObject({
      status: 403,
    });
    await operate(owner, "PATCH", path, {
      name: "Art museum",
      estimatedCostMinor: 1500,
    });
    expect(
      await db.activity.findUnique({ where: { id: activity.id } }),
    ).toMatchObject({ name: "Art museum", estimatedCostMinor: 1500 });
    await operate(owner, "DELETE", path);
    expect(
      await db.activity.findUnique({ where: { id: activity.id } }),
    ).toBeNull();
    await expect(
      operate(member, "POST", ["trips", trip.id, "activities"], {
        name: "   ",
      }),
    ).rejects.toThrow();
    await expect(
      operate(member, "POST", ["trips", trip.id, "activities"], {
        name: "Invalid cost",
        estimatedCostMinor: -2,
      }),
    ).rejects.toThrow();
  });
  test("members cannot issue invitations or edit trip details", async () => {
    await expect(
      operate(member, "POST", ["trips", trip.id, "invitations"]),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      operate(member, "PATCH", ["trips", trip.id], input),
    ).rejects.toMatchObject({ status: 403 });
    await operate(owner, "PATCH", ["trips", trip.id], {
      ...input,
      name: "Updated trip",
    });
    expect(await operate(member, "GET", ["trips", trip.id])).toMatchObject({
      name: "Updated trip",
    });
  });
  test("checklist edits and deletion preserve owner isolation", async () => {
    const item = (await operate(
      member,
      "POST",
      ["trips", trip.id, "checklist"],
      { title: "Old item" },
    )) as ChecklistItem;
    const path = ["trips", trip.id, "checklist", item.id];
    await expect(operate(owner, "DELETE", path)).rejects.toMatchObject({
      status: 404,
    });
    await expect(
      operate(member, "PATCH", path, { title: " " }),
    ).rejects.toThrow();
    await operate(member, "PATCH", path, { title: "Updated item" });
    expect(
      await db.checklistItem.findUnique({ where: { id: item.id } }),
    ).toMatchObject({ title: "Updated item" });
    await operate(member, "DELETE", path);
    expect(
      await db.checklistItem.findUnique({ where: { id: item.id } }),
    ).toBeNull();
  });
  test("itinerary deletion checks versions and cannot target another trip", async () => {
    const data = {
      title: "Coffee",
      startTime: "2026-12-22T09:00:00-04:00",
      endTime: "2026-12-22T10:00:00-04:00",
    };
    const entry = (await operate(
      owner,
      "POST",
      ["trips", trip.id, "itinerary"],
      data,
    )) as ScheduleItem;
    const path = ["trips", trip.id, "itinerary", entry.id];
    await expect(
      operate(owner, "DELETE", path, { version: 2 }),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      operate(owner, "POST", ["trips", trip.id, "itinerary"], {
        ...data,
        endTime: data.startTime,
      }),
    ).rejects.toMatchObject({ status: 400 });
    await operate(owner, "DELETE", path, { version: 1 });
    expect(
      await db.scheduleItem.findUnique({ where: { id: entry.id } }),
    ).toBeNull();
  });
  test("paginates private items without duplicates or cross-user leakage", async () => {
    for (const title of ["Hat", "Sunscreen", "Charger"])
      await operate(member, "POST", ["trips", trip.id, "checklist"], { title });
    type Page = { items: ChecklistItem[]; nextCursor: string | null };
    const first = (await operate(
      member,
      "GET",
      ["trips", trip.id, "checklist"],
      {},
      { limit: 2 },
    )) as Page;
    expect(first.items).toHaveLength(2);
    expect(first.nextCursor).toBeTruthy();
    const second = (await operate(
      member,
      "GET",
      ["trips", trip.id, "checklist"],
      {},
      { limit: 2, cursor: first.nextCursor! },
    )) as Page;
    expect(
      new Set([...first.items, ...second.items].map((item) => item.id)).size,
    ).toBe(4);
    expect(second.nextCursor).toBeNull();
    expect(
      await operate(
        owner,
        "GET",
        ["trips", trip.id, "checklist"],
        {},
        { limit: 2 },
      ),
    ).toEqual({ items: [], nextCursor: null });
  });
  test("enforces a shared invitation rate limit and resets after its window", async () => {
    const key = createHash("sha256")
      .update(`${stranger}:invitation`)
      .digest("hex");
    try {
      const results = await Promise.allSettled(
        Array.from({ length: 21 }, () => rateLimit(stranger, true)),
      );
      expect(
        results.filter((result) => result.status === "fulfilled"),
      ).toHaveLength(20);
      const rejected = results.find(
        (result) => result.status === "rejected",
      ) as PromiseRejectedResult;
      expect(rejected.reason).toMatchObject({ status: 429 });
      await db.requestLimit.update({
        where: { key },
        data: { startedAt: new Date(0) },
      });
      await expect(rateLimit(stranger, true)).resolves.toBeUndefined();
    } finally {
      await db.requestLimit.deleteMany({ where: { key } });
    }
  });
  test("removal denies future access, clears votes, and revokes invitations", async () => {
    const invite = (await operate(owner, "POST", [
      "trips",
      trip.id,
      "invitations",
    ])) as Invitation & { token: string };
    await expect(
      operate(member, "DELETE", ["trips", trip.id, "members", owner]),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      operate(owner, "DELETE", ["trips", trip.id, "members", owner]),
    ).rejects.toMatchObject({ status: 409 });
    await operate(owner, "DELETE", ["trips", trip.id, "members", member]);
    await expect(
      operate(member, "GET", ["trips", trip.id, "checklist"]),
    ).rejects.toMatchObject({ status: 404 });
    expect(
      await db.vote.count({
        where: { userId: member, activity: { tripId: trip.id } },
      }),
    ).toBe(0);
    await expect(
      operate(member, "POST", ["invitations", "accept"], {
        token: invite.token,
      }),
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe("timezone validation", () => {
  test("uses trip calendar dates rather than UTC dates", () => {
    expect(
      localDate(new Date("2026-12-21T02:00:00Z"), "America/New_York"),
    ).toBe("2026-12-20");
    const trip = {
      startDate: new Date("2026-12-20"),
      endDate: new Date("2026-12-20"),
      timezone: "America/New_York",
    };
    expect(() =>
      validateTimes(
        new Date("2026-12-21T02:00:00Z"),
        new Date("2026-12-21T03:00:00Z"),
        trip,
      ),
    ).not.toThrow();
    expect(() =>
      validateTimes(
        new Date("2026-12-21T04:00:00Z"),
        new Date("2026-12-21T06:00:00Z"),
        trip,
      ),
    ).toThrow();
  });
});
