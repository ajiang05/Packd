import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "../lib/server/db";
import { operate } from "../lib/server/domain";
import type { Trip, Expense, ChecklistItem } from "@prisma/client";

const integration =
  process.env.DATABASE_URL &&
  new URL(process.env.DATABASE_URL).pathname === "/packd_test"
    ? describe
    : describe.skip;

integration("Expenses, Splits, Settlement, and Shared Checklist", () => {
  const userIds: string[] = [];
  let alice: string, bob: string, charlie: string, stranger: string;
  let trip: Trip;

  const tripInput = {
    name: "Amalfi Coastal Escape",
    destination: "Amalfi Coast, Italy",
    startDate: "2026-06-10",
    endDate: "2026-06-17",
    timezone: "Europe/Rome",
  };

  beforeAll(async () => {
    for (const name of [
      "Alice Organizer",
      "Bob Traveler",
      "Charlie Traveler",
      "David Stranger",
    ]) {
      const user = await db.user.create({ data: { name } });
      userIds.push(user.id);
    }
    [alice, bob, charlie, stranger] = userIds;

    trip = (await operate(alice, "POST", ["trips"], tripInput)) as Trip;

    // Enroll Bob and Charlie as trip members
    await db.tripMember.create({
      data: { tripId: trip.id, userId: bob, addedById: alice },
    });
    await db.tripMember.create({
      data: { tripId: trip.id, userId: charlie, addedById: alice },
    });
  });

  afterAll(async () => {
    await db.trip.deleteMany({ where: { id: trip.id } });
    await db.user.deleteMany({ where: { id: { in: userIds } } });
    await db.$disconnect();
  });

  describe("Shared Collaborative Checklist", () => {
    let sharedItem: ChecklistItem & { checkedBy?: { name: string | null } };

    test("any member can add a shared checklist item", async () => {
      sharedItem = (await operate(
        bob,
        "POST",
        ["trips", trip.id, "checklist", "shared"],
        { title: "Group Sunscreen & First Aid" },
      )) as ChecklistItem;

      expect(sharedItem.title).toBe("Group Sunscreen & First Aid");
      expect(sharedItem.isShared).toBe(true);
      expect(sharedItem.isChecked).toBe(false);
      expect(sharedItem.userId).toBe(bob);
    });

    test("all members can view shared items", async () => {
      const items = (await operate(charlie, "GET", [
        "trips",
        trip.id,
        "checklist",
        "shared",
      ])) as ChecklistItem[];

      expect(items.length).toBeGreaterThanOrEqual(1);
      const found = items.find((i) => i.id === sharedItem.id);
      expect(found).toBeDefined();
      expect(found?.title).toBe("Group Sunscreen & First Aid");
    });

    test("any member can check off a shared item and track who checked it", async () => {
      const updated = (await operate(
        alice,
        "PATCH",
        ["trips", trip.id, "checklist", "shared", sharedItem.id],
        { isChecked: true },
      )) as ChecklistItem & { checkedBy?: { name: string | null } };

      expect(updated.isChecked).toBe(true);
      expect(updated.checkedByUserId).toBe(alice);
      expect(updated.checkedBy?.name).toBe("Alice Organizer");
    });

    test("any member can delete a shared item", async () => {
      await operate(
        charlie,
        "DELETE",
        ["trips", trip.id, "checklist", "shared", sharedItem.id],
        {},
      );

      const items = (await operate(bob, "GET", [
        "trips",
        trip.id,
        "checklist",
        "shared",
      ])) as ChecklistItem[];
      expect(items.find((i) => i.id === sharedItem.id)).toBeUndefined();
    });

    test("private checklist items remain isolated and do not appear in shared list", async () => {
      const privateItem = (await operate(
        bob,
        "POST",
        ["trips", trip.id, "checklist"],
        { title: "Bob's Secret Medicine" },
      )) as ChecklistItem;

      expect(privateItem.isShared).toBe(false);

      // Charlie reading his private checklist should not see Bob's item
      const charliePrivate = (await operate(charlie, "GET", [
        "trips",
        trip.id,
        "checklist",
      ])) as ChecklistItem[];
      expect(
        charliePrivate.find((i) => i.id === privateItem.id),
      ).toBeUndefined();

      // Shared list should not contain Bob's private item
      const sharedList = (await operate(alice, "GET", [
        "trips",
        trip.id,
        "checklist",
        "shared",
      ])) as ChecklistItem[];
      expect(sharedList.find((i) => i.id === privateItem.id)).toBeUndefined();

      // Cleanup
      await operate(
        bob,
        "DELETE",
        ["trips", trip.id, "checklist", privateItem.id],
        {},
      );
    });

    test("non-members cannot access shared checklist", async () => {
      await expect(
        operate(stranger, "GET", ["trips", trip.id, "checklist", "shared"]),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  describe("Expenses, Splits, and Settlement", () => {
    let soloExpense: Expense;
    let groupDinner: Expense & {
      splits: Array<{ userId: string; shareMinor: number }>;
    };
    let privateSplit: Expense;

    test("logging a solo expense is visible ONLY to the payer", async () => {
      soloExpense = (await operate(
        alice,
        "POST",
        ["trips", trip.id, "expenses"],
        {
          title: "Alice Solo Gelato",
          category: "FOOD",
          amountMinor: 650, // $6.50
          isSolo: true,
          paidByUserId: alice,
        },
      )) as Expense;

      expect(soloExpense.isSolo).toBe(true);
      expect(soloExpense.amountMinor).toBe(650);

      // Alice sees it
      const aliceExpenses = (await operate(alice, "GET", [
        "trips",
        trip.id,
        "expenses",
      ])) as Expense[];
      expect(aliceExpenses.find((e) => e.id === soloExpense.id)).toBeDefined();

      // Bob does NOT see Alice's solo expense
      const bobExpenses = (await operate(bob, "GET", [
        "trips",
        trip.id,
        "expenses",
      ])) as Expense[];
      expect(bobExpenses.find((e) => e.id === soloExpense.id)).toBeUndefined();

      // Charlie does NOT see it
      const charlieExpenses = (await operate(charlie, "GET", [
        "trips",
        trip.id,
        "expenses",
      ])) as Expense[];
      expect(
        charlieExpenses.find((e) => e.id === soloExpense.id),
      ).toBeUndefined();
    });

    test("logging a group expense splits evenly across participants", async () => {
      groupDinner = (await operate(
        bob,
        "POST",
        ["trips", trip.id, "expenses"],
        {
          title: "Dinner in Positano",
          category: "FOOD",
          amountMinor: 9000, // $90.00
          isSolo: false,
          paidByUserId: bob,
          splitUserIds: [alice, bob, charlie],
        },
      )) as typeof groupDinner;

      expect(groupDinner.isSolo).toBe(false);
      expect(groupDinner.amountMinor).toBe(9000);
      expect(groupDinner.splits).toHaveLength(3);

      // 9000 / 3 = 3000 each
      for (const split of groupDinner.splits) {
        expect(split.shareMinor).toBe(3000);
      }

      // Alice, Bob, and Charlie all see it
      const aliceList = (await operate(alice, "GET", [
        "trips",
        trip.id,
        "expenses",
      ])) as Expense[];
      expect(aliceList.find((e) => e.id === groupDinner.id)).toBeDefined();

      const charlieList = (await operate(charlie, "GET", [
        "trips",
        trip.id,
        "expenses",
      ])) as Expense[];
      expect(charlieList.find((e) => e.id === groupDinner.id)).toBeDefined();
    });

    test("expense split between subset is hidden from non-participants", async () => {
      privateSplit = (await operate(
        charlie,
        "POST",
        ["trips", trip.id, "expenses"],
        {
          title: "Taxi for Alice and Charlie",
          category: "TRANSPORT",
          amountMinor: 4000, // $40.00
          isSolo: false,
          paidByUserId: charlie,
          splitUserIds: [alice, charlie],
        },
      )) as Expense;

      // Alice sees it
      const aliceExpenses = (await operate(alice, "GET", [
        "trips",
        trip.id,
        "expenses",
      ])) as Expense[];
      expect(aliceExpenses.find((e) => e.id === privateSplit.id)).toBeDefined();

      // Charlie sees it
      const charlieExpenses = (await operate(charlie, "GET", [
        "trips",
        trip.id,
        "expenses",
      ])) as Expense[];
      expect(
        charlieExpenses.find((e) => e.id === privateSplit.id),
      ).toBeDefined();

      // Bob was NOT in the split and did not pay, so he must NOT see it
      const bobExpenses = (await operate(bob, "GET", [
        "trips",
        trip.id,
        "expenses",
      ])) as Expense[];
      expect(bobExpenses.find((e) => e.id === privateSplit.id)).toBeUndefined();
    });

    test("settlement algorithm accurately minimizes debts", async () => {
      // Current group expenses:
      // 1. Group Dinner: Bob paid $90.00. Alice owes $30, Bob owes $30, Charlie owes $30.
      // 2. Taxi: Charlie paid $40.00. Alice owes $20, Charlie owes $20.
      //
      // Balances:
      // Bob: Paid 9000 - Share 3000 = +6000 (Creditor)
      // Charlie: Paid 4000 - Share (3000 + 2000) = -1000 (Debtor)
      // Alice: Paid 0 - Share (3000 + 2000) = -5000 (Debtor)
      //
      // Settlement transfers:
      // Alice owes Bob $50.00 (5000 cents)
      // Charlie owes Bob $10.00 (1000 cents)
      // Total debt transferred = 6000 cents. Exactly 2 transactions!

      const settlement = (await operate(alice, "GET", [
        "trips",
        trip.id,
        "expenses",
        "settlement",
      ])) as {
        settlements: Array<{
          fromUserId: string;
          toUserId: string;
          fromName: string;
          toName: string;
          amountMinor: number;
        }>;
        balances: Record<string, number>;
      };

      expect(settlement.balances[bob]).toBe(6000);
      expect(settlement.balances[charlie]).toBe(-1000);
      expect(settlement.balances[alice]).toBe(-5000);

      expect(settlement.settlements).toHaveLength(2);

      const aliceTransfer = settlement.settlements.find(
        (s) => s.fromUserId === alice,
      );
      expect(aliceTransfer).toBeDefined();
      expect(aliceTransfer?.toUserId).toBe(bob);
      expect(aliceTransfer?.amountMinor).toBe(5000);
      expect(aliceTransfer?.fromName).toBe("Alice Organizer");
      expect(aliceTransfer?.toName).toBe("Bob Traveler");

      const charlieTransfer = settlement.settlements.find(
        (s) => s.fromUserId === charlie,
      );
      expect(charlieTransfer).toBeDefined();
      expect(charlieTransfer?.toUserId).toBe(bob);
      expect(charlieTransfer?.amountMinor).toBe(1000);
    });

    test("editing an expense re-evaluates splits and recalculates balances", async () => {
      // Bob updates dinner amount from $90.00 to $60.00 (2000 each)
      const updated = (await operate(
        bob,
        "PATCH",
        ["trips", trip.id, "expenses", groupDinner.id],
        { amountMinor: 6000 },
      )) as typeof groupDinner;

      expect(updated.amountMinor).toBe(6000);
      expect(updated.splits).toHaveLength(3);
      for (const sp of updated.splits) {
        expect(sp.shareMinor).toBe(2000);
      }

      // New balances:
      // Bob: Paid 6000 - Share 2000 = +4000
      // Charlie: Paid 4000 - Share (2000 + 2000) = 0 (Balanced!)
      // Alice: Paid 0 - Share (2000 + 2000) = -4000
      // Now only Alice owes Bob $40.00!
      const settlement = (await operate(alice, "GET", [
        "trips",
        trip.id,
        "expenses",
        "settlement",
      ])) as {
        settlements: Array<{
          fromUserId: string;
          toUserId: string;
          amountMinor: number;
        }>;
        balances: Record<string, number>;
      };

      expect(settlement.balances[bob]).toBe(4000);
      expect(settlement.balances[charlie]).toBe(0);
      expect(settlement.balances[alice]).toBe(-4000);

      expect(settlement.settlements).toHaveLength(1);
      expect(settlement.settlements[0].fromUserId).toBe(alice);
      expect(settlement.settlements[0].toUserId).toBe(bob);
      expect(settlement.settlements[0].amountMinor).toBe(4000);
    });

    test("unauthorized user cannot edit or delete another user's expense", async () => {
      // Charlie tries to edit Bob's expense
      await expect(
        operate(
          charlie,
          "PATCH",
          ["trips", trip.id, "expenses", groupDinner.id],
          {
            title: "Hacked Dinner",
          },
        ),
      ).rejects.toMatchObject({ status: 403 });

      // Charlie tries to delete Bob's expense
      await expect(
        operate(
          charlie,
          "DELETE",
          ["trips", trip.id, "expenses", groupDinner.id],
          {},
        ),
      ).rejects.toMatchObject({ status: 403 });
    });

    test("organizer can delete any expense and payer can delete own expense", async () => {
      // Charlie deletes his own Taxi expense
      await operate(
        charlie,
        "DELETE",
        ["trips", trip.id, "expenses", privateSplit.id],
        {},
      );

      // Alice (organizer) deletes Bob's group dinner
      await operate(
        alice,
        "DELETE",
        ["trips", trip.id, "expenses", groupDinner.id],
        {},
      );

      // Only Alice's solo gelato remains
      const aliceRemaining = (await operate(alice, "GET", [
        "trips",
        trip.id,
        "expenses",
      ])) as Expense[];
      expect(aliceRemaining).toHaveLength(1);
      expect(aliceRemaining[0].id).toBe(soloExpense.id);

      // Clean up solo expense
      await operate(
        alice,
        "DELETE",
        ["trips", trip.id, "expenses", soloExpense.id],
        {},
      );
    });

    test("non-members cannot access expenses or settlement", async () => {
      await expect(
        operate(stranger, "GET", ["trips", trip.id, "expenses"]),
      ).rejects.toMatchObject({ status: 404 });

      await expect(
        operate(stranger, "GET", ["trips", trip.id, "expenses", "settlement"]),
      ).rejects.toMatchObject({ status: 404 });

      await expect(
        operate(stranger, "POST", ["trips", trip.id, "expenses"], {
          title: "Unauthorized",
          amountMinor: 1000,
          paidByUserId: stranger,
        }),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  describe("Trip Planning Tasks", () => {
    let taskId: string;

    test("member can create a planning task", async () => {
      const task = (await operate(bob, "POST", ["trips", trip.id, "tasks"], {
        title: "Book rental car for Amalfi drive",
      })) as unknown as {
        id: string;
        title: string;
        isChecked: boolean;
        user?: { name: string };
      };

      expect(task.title).toBe("Book rental car for Amalfi drive");
      expect(task.isChecked).toBe(false);
      expect(task.user?.name).toBe("Bob Traveler");
      taskId = task.id;
    });

    test("all members can retrieve planning tasks", async () => {
      const tasks = (await operate(alice, "GET", [
        "trips",
        trip.id,
        "tasks",
      ])) as unknown as Array<{
        id: string;
        title: string;
        isChecked: boolean;
      }>;

      expect(tasks.length).toBeGreaterThanOrEqual(1);
      const found = tasks.find((t) => t.id === taskId);
      expect(found).toBeDefined();
      expect(found?.title).toBe("Book rental car for Amalfi drive");
    });

    test("member can toggle task completion status and records checkedBy", async () => {
      const checked = (await operate(
        charlie,
        "PATCH",
        ["trips", trip.id, "tasks", taskId],
        { isChecked: true },
      )) as unknown as {
        id: string;
        isChecked: boolean;
        checkedBy?: { name: string };
      };

      expect(checked.isChecked).toBe(true);
      expect(checked.checkedBy?.name).toBe("Charlie Traveler");

      const unchecked = (await operate(
        alice,
        "PATCH",
        ["trips", trip.id, "tasks", taskId],
        { isChecked: false },
      )) as unknown as {
        id: string;
        isChecked: boolean;
        checkedBy?: { name: string } | null;
      };

      expect(unchecked.isChecked).toBe(false);
      expect(unchecked.checkedBy).toBeNull();
    });

    test("member can delete a planning task", async () => {
      await operate(alice, "DELETE", ["trips", trip.id, "tasks", taskId], {});

      const tasks = (await operate(alice, "GET", [
        "trips",
        trip.id,
        "tasks",
      ])) as Array<{ id: string }>;
      expect(tasks.find((t) => t.id === taskId)).toBeUndefined();
    });

    test("non-members cannot access planning tasks", async () => {
      await expect(
        operate(stranger, "GET", ["trips", trip.id, "tasks"]),
      ).rejects.toMatchObject({ status: 404 });
    });
  });
});
