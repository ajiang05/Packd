import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "../lib/server/db";
import { operate } from "../lib/server/domain";
import type { Expense, ExpenseSplit, Trip, TripTask } from "@prisma/client";
const integration =
  process.env.DATABASE_URL &&
  new URL(process.env.DATABASE_URL).pathname === "/packd_test"
    ? describe
    : describe.skip;
integration("review regressions", () => {
  const ids: string[] = [];
  let owner: string, member: string, other: string;
  const input = {
    name: "Review trip",
    destination: "Boston",
    startDate: "2026-12-20",
    endDate: "2026-12-25",
    timezone: "America/New_York",
  };
  beforeAll(async () => {
    for (let i = 0; i < 3; i++)
      ids.push((await db.user.create({ data: { name: `Review ${i}` } })).id);
    [owner, member, other] = ids;
  });
  afterAll(async () => {
    await db.trip.deleteMany({ where: { createdById: owner } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
    await db.$disconnect();
  });
  async function setup() {
    const trip = (await operate(owner, "POST", ["trips"], input)) as Trip;
    for (const userId of [member, other])
      await db.tripMember.create({
        data: { tripId: trip.id, userId, addedById: owner },
      });
    return trip.id;
  }
  type FullExpense = Expense & { splits: ExpenseSplit[] };
  test("expense splits preserve every cent and updates rebuild solo splits", async () => {
    const id = await setup();
    const path = ["trips", id, "expenses"];
    const e = (await operate(owner, "POST", path, {
      title: "Odd cents",
      amountMinor: 100,
      paidByUserId: owner,
      splitUserIds: ids,
    })) as FullExpense;
    expect(e.splits.reduce((sum, s) => sum + s.shareMinor, 0)).toBe(100);
    const solo = (await operate(owner, "PATCH", [...path, e.id], {
      isSolo: true,
    })) as FullExpense;
    expect(solo.splits).toHaveLength(0);
    const shared = (await operate(owner, "PATCH", [...path, e.id], {
      isSolo: false,
    })) as FullExpense;
    expect(shared.splits).toHaveLength(3);
    expect(shared.splits.reduce((sum, s) => sum + s.shareMinor, 0)).toBe(100);
    const tiny = (await operate(owner, "PATCH", [...path, e.id], {
      amountMinor: 1,
    })) as FullExpense;
    expect(tiny.splits.map((s) => s.shareMinor).sort()).toEqual([0, 0, 1]);
  });
  test("duplicate split participants are invalid input, not a uniqueness conflict", async () => {
    const id = await setup();
    await expect(
      operate(owner, "POST", ["trips", id, "expenses"], {
        title: "Duplicates",
        amountMinor: 100,
        paidByUserId: owner,
        splitUserIds: [owner, owner],
      }),
    ).rejects.toMatchObject({ name: "ZodError" });
    expect(await db.expense.count({ where: { tripId: id } })).toBe(0);
  });
  test("settlement does not disclose expenses outside the caller's visibility", async () => {
    const id = await setup();
    await operate(member, "POST", ["trips", id, "expenses"], {
      title: "Private split",
      amountMinor: 10000,
      paidByUserId: member,
      splitUserIds: [member, other],
    });
    const result = (await operate(owner, "GET", [
      "trips",
      id,
      "expenses",
      "settlement",
    ])) as { balances: Record<string, number>; settlements: unknown[] };
    expect(Object.values(result.balances).every((n) => n === 0)).toBe(true);
    expect(result.settlements).toEqual([]);
  });
  test("organizers cannot expose another payer's solo expense by patching it", async () => {
    const id = await setup();
    const expense = (await operate(member, "POST", ["trips", id, "expenses"], {
      title: "Private medicine",
      amountMinor: 100,
      paidByUserId: member,
      isSolo: true,
    })) as Expense;
    await expect(
      operate(owner, "PATCH", ["trips", id, "expenses", expense.id], {
        isSolo: false,
      }),
    ).rejects.toMatchObject({ status: 404 });
  });
  test("task reads are read-only, concurrent first reads cannot duplicate defaults, deleted tasks stay deleted", async () => {
    const id = await setup();
    const before = await db.tripTask.count({ where: { tripId: id } });
    await Promise.all(
      [owner, member, other].map((uid) =>
        operate(uid, "GET", ["trips", id, "tasks"]),
      ),
    );
    expect(await db.tripTask.count({ where: { tripId: id } })).toBe(before);
    const tasks = (await operate(owner, "GET", [
      "trips",
      id,
      "tasks",
    ])) as TripTask[];
    for (const task of tasks)
      await operate(owner, "DELETE", ["trips", id, "tasks", task.id]);
    expect(await operate(owner, "GET", ["trips", id, "tasks"])).toEqual([]);
  });
});
