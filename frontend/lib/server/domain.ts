import { createHash, randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "./db";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
const fail = (status: number, code: string, message: string): never => {
  throw new ApiError(status, code, message);
};
const text = z.string().trim().min(1).max(160);
const optionalText = z.string().trim().max(2000).nullable().optional();
const cents = z.number().int().min(0).max(2_000_000_000);
const date = z.iso.date();
const timezone = z.string().refine((value) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}, "Select a valid timezone.");
const tripInput = z
  .object({
    name: text,
    destination: text,
    startDate: date,
    endDate: date,
    timezone,
  })
  .strict()
  .refine(
    (v) => v.endDate >= v.startDate,
    "End date must not precede start date.",
  );
const activityInput = z
  .object({
    name: text,
    description: optionalText,
    location: optionalText,
    estimatedCostMinor: cents.nullable().optional(),
  })
  .strict();
const entryInput = z
  .object({
    title: text,
    startTime: z.iso.datetime({ offset: true }),
    endTime: z.iso.datetime({ offset: true }),
    location: optionalText,
    activityId: z.string().nullable().optional(),
    version: z.number().int().positive().optional(),
  })
  .strict();
const expenseCategory = z.enum([
  "FOOD",
  "TRANSPORT",
  "LODGING",
  "ACTIVITY",
  "OTHER",
]);
const expenseInput = z
  .object({
    title: text,
    category: expenseCategory.default("OTHER"),
    amountMinor: z.number().int().positive().max(2_000_000_000),
    isSolo: z.boolean().default(false),
    notes: z.string().trim().max(500).nullable().optional(),
    paidByUserId: z.string().min(1),
    splitUserIds: z.array(z.string().min(1)).max(100).default([]),
  })
  .strict();
const expenseUpdateInput = z
  .object({
    title: text.optional(),
    category: expenseCategory.optional(),
    amountMinor: z.number().int().positive().max(2_000_000_000).optional(),
    isSolo: z.boolean().optional(),
    notes: z.string().trim().max(500).nullable().optional(),
    paidByUserId: z.string().min(1).optional(),
    splitUserIds: z.array(z.string().min(1)).max(100).optional(),
  })
  .strict()
  .refine(
    (v) => Object.keys(v).length > 0,
    "Provide at least one field to update.",
  );
export function localDate(value: Date, zone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const get = (name: string) => parts.find((p) => p.type === name)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
export function validateTimes(
  start: Date,
  end: Date,
  trip: { startDate: Date; endDate: Date; timezone: string },
) {
  if (
    end <= start ||
    localDate(start, trip.timezone) <
      trip.startDate.toISOString().slice(0, 10) ||
    localDate(end, trip.timezone) > trip.endDate.toISOString().slice(0, 10)
  ) {
    fail(
      400,
      "INVALID_TIME",
      "Entry times must be ordered and fall within the trip dates.",
    );
  }
}
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const missing = () => fail(404, "NOT_FOUND", "This resource is unavailable.");
const conflict = (message: string) => fail(409, "CONFLICT", message);
const supported = (allowed: boolean) => {
  if (!allowed)
    fail(405, "METHOD_NOT_ALLOWED", "This operation is not supported.");
};

// Trip row locks serialize membership changes, votes, and schedule edits for one trip.
// Every mutation of trip-owned records must pass through this boundary.
export async function operate(
  userId: string,
  method: string,
  path: string[],
  body: unknown = {},
  paging?: { cursor?: string; limit: number },
) {
  const limit = paging?.limit ?? 100;
  const pageArgs = {
    take: limit + 1,
    ...(paging?.cursor ? { cursor: { id: paging.cursor }, skip: 1 } : {}),
  };
  function page<T extends { id: string }>(rows: T[]) {
    const items = rows.slice(0, limit);
    return paging
      ? { items, nextCursor: rows.length > limit ? items.at(-1)!.id : null }
      : items;
  }
  if (path[0] === "invitations" && path[1] === "accept" && path.length === 2) {
    supported(method === "POST");
    const { token } = z
      .object({ token: z.string().regex(/^[a-f0-9]{64}$/) })
      .strict()
      .parse(body);
    const found = await db.invitation.findUnique({
      where: { tokenHash: hash(token) },
    });
    if (!found) return missing();
    return db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Trip" WHERE id = ${found.tripId} FOR UPDATE`;
      const invite = await tx.invitation.findUnique({
        where: { id: found.id },
      });
      if (!invite || invite.revokedAt || invite.expiresAt <= new Date())
        return fail(
          400,
          "INVALID_INVITATION",
          "This invitation has expired or was revoked.",
        );
      await tx.tripMember.upsert({
        where: { tripId_userId: { tripId: invite.tripId, userId } },
        create: { tripId: invite.tripId, userId, addedById: invite.issuedById },
        update: {},
      });
      return { tripId: invite.tripId };
    });
  }
  if (path[0] !== "trips") return missing();
  if (path.length === 1) {
    if (method === "GET")
      return page(
        await db.trip.findMany({
          where: { members: { some: { userId } } },
          orderBy: [{ startDate: "asc" }, { id: "asc" }],
          ...pageArgs,
          include: { _count: { select: { members: true } } },
        }),
      );
    supported(method === "POST");
    const data = tripInput.parse(body);
    return db.trip.create({
      data: {
        ...data,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        createdById: userId,
        members: { create: { userId, addedById: userId } },
      },
    });
  }
  const tripId = path[1];
  return db.$transaction(
    async (tx) => {
      if (method !== "GET") {
        await tx.$queryRaw`SELECT id FROM "Trip" WHERE id = ${tripId} FOR UPDATE`;
      }
      const trip = await tx.trip.findFirst({
        where: { id: tripId, members: { some: { userId } } },
        include: { members: { select: { userId: true } } },
      });
      if (!trip) return missing();
      const organizer = () => {
        if (trip.createdById !== userId)
          fail(403, "FORBIDDEN", "Only the trip organizer can do that.");
      };
      const activeIds = trip.members.map((m) => m.userId);
      if (path.length === 2) {
        if (method === "GET")
          return {
            ...trip,
            currentUserId: userId,
            isOrganizer: trip.createdById === userId,
          };
        supported(method === "PATCH");
        organizer();
        const data = tripInput.parse(body);
        const dates = {
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
          timezone: data.timezone,
        };
        const entries = await tx.scheduleItem.findMany({ where: { tripId } });
        for (const entry of entries)
          if (entry.endTime)
            validateTimes(entry.startTime, entry.endTime, dates);
        return tx.trip.update({
          where: { id: tripId },
          data: { ...data, ...dates },
        });
      }
      const section = path[2],
        id = path[3];
      if (
        path.length > 4 &&
        !(
          section === "activities" &&
          path[4] === "votes" &&
          (path.length === 5 || (path.length === 6 && path[5] === "me"))
        ) &&
        !(section === "checklist" && path[3] === "shared" && path.length === 5)
      )
        return missing();
      if (section === "members") {
        if (!id && method === "GET")
          return page(
            await tx.tripMember.findMany({
              where: { tripId },
              ...pageArgs,
              orderBy: { id: "asc" },
              select: {
                id: true,
                userId: true,
                joinedAt: true,
                user: { select: { name: true, image: true } },
              },
            }),
          );
        supported(!!id && method === "DELETE");
        organizer();
        if (id === trip.createdById)
          conflict("The organizer cannot be removed.");
        const member = await tx.tripMember.findUnique({
          where: { tripId_userId: { tripId, userId: id } },
        });
        if (!member) return missing();
        await tx.vote.deleteMany({
          where: { userId: id, activity: { tripId } },
        });
        await tx.invitation.updateMany({
          where: { tripId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        await tx.tripMember.delete({ where: { id: member.id } });
        return null;
      }
      if (section === "invitations") {
        organizer();
        if (!id && method === "GET")
          return page(
            await tx.invitation.findMany({
              where: { tripId },
              select: {
                id: true,
                expiresAt: true,
                revokedAt: true,
                createdAt: true,
              },
              orderBy: { createdAt: "desc" },
              ...pageArgs,
            }),
          );
        if (!id && method === "POST") {
          const token = randomBytes(32).toString("hex");
          const invite = await tx.invitation.create({
            data: {
              tripId,
              issuedById: userId,
              tokenHash: hash(token),
              expiresAt: new Date(Date.now() + 7 * 86400000),
            },
          });
          return { id: invite.id, token, expiresAt: invite.expiresAt };
        }
        supported(!!id && method === "DELETE");
        const result = await tx.invitation.updateMany({
          where: { id, tripId },
          data: { revokedAt: new Date() },
        });
        if (!result.count) return missing();
        return null;
      }
      if (section === "budget" && !id) {
        if (method === "GET")
          return {
            budgetMinor: trip.budgetMinor,
            currency: trip.currency,
            budgetType: trip.budgetType,
          };
        supported(method === "PATCH");
        organizer();
        const data = z
          .object({
            budgetMinor: cents,
            currency: z.literal("USD"),
            budgetType: z.enum(["TOTAL", "PER_PERSON"]),
          })
          .strict()
          .parse(body);
        return tx.trip.update({ where: { id: tripId }, data });
      }
      if (section === "activities") {
        if (!id) {
          if (method === "GET") {
            const activities = await tx.activity.findMany({
              where: { tripId },
              orderBy: [{ createdAt: "desc" }, { id: "asc" }],
              ...pageArgs,
              include: {
                votes: { where: { userId: { in: activeIds } } },
                proposedBy: { select: { name: true } },
              },
            });
            return page(
              activities.map(({ votes, ...activity }) => ({
                ...activity,
                yes: votes.filter((v) => v.value).length,
                no: votes.filter((v) => !v.value).length,
                outstanding: activeIds.length - votes.length,
                myVote: votes.find((v) => v.userId === userId)?.value ?? null,
              })),
            );
          }
          supported(method === "POST");
          return tx.activity.create({
            data: {
              ...activityInput.parse(body),
              tripId,
              proposedById: userId,
            },
          });
        }
        const activity = await tx.activity.findFirst({ where: { id, tripId } });
        if (!activity) return missing();
        if (path[4] === "votes") {
          if (path.length === 5 && method === "GET") {
            const votes = await tx.vote.findMany({
              where: { activityId: id, userId: { in: activeIds } },
            });
            return {
              yes: votes.filter((v) => v.value).length,
              no: votes.filter((v) => !v.value).length,
              outstanding: activeIds.length - votes.length,
              myVote: votes.find((v) => v.userId === userId)?.value ?? null,
            };
          }
          supported(path[5] === "me" && method === "PUT");
          const { value } = z
            .object({ value: z.boolean() })
            .strict()
            .parse(body);
          return tx.vote.upsert({
            where: { activityId_userId: { activityId: id, userId } },
            create: { activityId: id, userId, value },
            update: { value },
          });
        }
        supported(method === "PATCH" || method === "DELETE");
        if (activity.proposedById !== userId) organizer();
        if (await tx.vote.count({ where: { activityId: id } }))
          conflict(
            "Activities with votes cannot be edited or deleted. Propose a new activity instead.",
          );
        if (method === "DELETE") {
          await tx.activity.delete({ where: { id } });
          return null;
        }
        return tx.activity.update({
          where: { id },
          data: activityInput.parse(body),
        });
      }
      if (section === "itinerary") {
        if (!id && method === "GET")
          return page(
            await tx.scheduleItem.findMany({
              where: { tripId },
              orderBy: [{ startTime: "asc" }, { id: "asc" }],
              ...pageArgs,
            }),
          );
        organizer();
        supported(
          (!id && method === "POST") ||
            (!!id && (method === "PATCH" || method === "DELETE")),
        );
        if (id) {
          const existing = await tx.scheduleItem.findFirst({
            where: { id, tripId },
          });
          if (!existing) return missing();
        }
        if (method === "DELETE") {
          const { version } = z
            .object({ version: z.number().int().positive() })
            .strict()
            .parse(body);
          const removed = await tx.scheduleItem.deleteMany({
            where: { id, tripId, version },
          });
          if (!removed.count)
            conflict(
              "This entry changed. Reload to review the latest version.",
            );
          return null;
        }
        const input = entryInput.parse(body);
        const { version, ...fields } = input;
        const data = {
          ...fields,
          startTime: new Date(input.startTime),
          endTime: new Date(input.endTime),
        };
        validateTimes(data.startTime, data.endTime, trip);
        if (
          input.activityId &&
          !(await tx.activity.findFirst({
            where: { id: input.activityId, tripId },
          }))
        )
          return missing();
        if (!id)
          return tx.scheduleItem.create({
            data: { ...data, tripId, createdById: userId },
          });
        if (!version)
          fail(400, "VERSION_REQUIRED", "The current version is required.");
        const updated = await tx.scheduleItem.updateMany({
          where: { id, tripId, version },
          data: { ...data, version: { increment: 1 } },
        });
        if (!updated.count)
          conflict(
            "This entry changed. Your draft was not saved; reload the latest version.",
          );
        return tx.scheduleItem.findUnique({ where: { id } });
      }
      if (section === "tasks") {
        if (!id) {
          if (method === "GET") {
            const count = await tx.tripTask.count({ where: { tripId } });
            if (count === 0) {
              const defaultTasks = [
                {
                  title: "Invite your travel crew",
                  description:
                    "Share an invite link so others can join, vote, and plan.",
                },
                {
                  title: "Suggest & vote on activities",
                  description:
                    "Brainstorm with AI or propose ideas to build group consensus.",
                },
                {
                  title: "Build the shared itinerary",
                  description:
                    "Schedule flights, check-ins, and group plans on the calendar.",
                },
                {
                  title: "Budget & expense tracking",
                  description:
                    "Set an estimated trip budget and log shared or solo expenses.",
                },
                {
                  title: "Packing & group supplies",
                  description:
                    "Manage your personal packing checklist and claim shared group supplies.",
                },
              ];
              await tx.tripTask.createMany({
                data: defaultTasks.map((t) => ({
                  ...t,
                  tripId,
                  userId,
                })),
              });
            }
            return page(
              await tx.tripTask.findMany({
                where: { tripId },
                orderBy: [{ createdAt: "asc" }, { id: "asc" }],
                ...pageArgs,
                include: {
                  checkedBy: { select: { id: true, name: true } },
                  user: { select: { id: true, name: true } },
                  assignedTo: { select: { id: true, name: true } },
                },
              }),
            );
          }
          supported(method === "POST");
          const input = z
            .object({
              title: text,
              description: optionalText,
              assignedToUserId: z.string().trim().min(1).nullable().optional(),
            })
            .strict()
            .parse(body);
          if (
            input.assignedToUserId &&
            !activeIds.includes(input.assignedToUserId)
          ) {
            fail(
              400,
              "INVALID_ASSIGNEE",
              "Assignee must be a member of this trip.",
            );
          }
          return tx.tripTask.create({
            data: {
              title: input.title,
              description: input.description ?? null,
              assignedToUserId: input.assignedToUserId ?? null,
              tripId,
              userId,
            },
            include: {
              checkedBy: { select: { id: true, name: true } },
              user: { select: { id: true, name: true } },
              assignedTo: { select: { id: true, name: true } },
            },
          });
        }
        const item = await tx.tripTask.findFirst({
          where: { id, tripId },
        });
        if (!item) return missing();
        supported(method === "PATCH" || method === "DELETE");
        if (method === "DELETE") {
          await tx.tripTask.delete({ where: { id } });
          return null;
        }
        const data = z
          .object({
            title: text.optional(),
            description: optionalText,
            isChecked: z.boolean().optional(),
            assignedToUserId: z.string().trim().min(1).nullable().optional(),
          })
          .strict()
          .refine((v) => Object.keys(v).length > 0)
          .parse(body);
        if (
          data.assignedToUserId &&
          !activeIds.includes(data.assignedToUserId)
        ) {
          fail(
            400,
            "INVALID_ASSIGNEE",
            "Assignee must be a member of this trip.",
          );
        }
        return tx.tripTask.update({
          where: { id },
          data: {
            ...data,
            ...(data.isChecked !== undefined
              ? { checkedByUserId: data.isChecked ? userId : null }
              : {}),
          },
          include: {
            checkedBy: { select: { id: true, name: true } },
            user: { select: { id: true, name: true } },
            assignedTo: { select: { id: true, name: true } },
          },
        });
      }
      if (section === "checklist") {
        if (id === "shared") {
          const sharedItemId = path[4];
          if (!sharedItemId) {
            if (method === "GET")
              return page(
                await tx.checklistItem.findMany({
                  where: { tripId, isShared: true },
                  orderBy: [{ createdAt: "asc" }, { id: "asc" }],
                  ...pageArgs,
                  include: {
                    checkedBy: { select: { id: true, name: true } },
                    user: { select: { id: true, name: true } },
                  },
                }),
              );
            supported(method === "POST");
            return tx.checklistItem.create({
              data: {
                ...z.object({ title: text }).strict().parse(body),
                tripId,
                userId,
                isShared: true,
              },
              include: {
                checkedBy: { select: { id: true, name: true } },
                user: { select: { id: true, name: true } },
              },
            });
          }
          const item = await tx.checklistItem.findFirst({
            where: { id: sharedItemId, tripId, isShared: true },
          });
          if (!item) return missing();
          supported(method === "PATCH" || method === "DELETE");
          if (method === "DELETE") {
            await tx.checklistItem.delete({ where: { id: sharedItemId } });
            return null;
          }
          const data = z
            .object({
              title: text.optional(),
              isChecked: z.boolean().optional(),
            })
            .strict()
            .refine((v) => Object.keys(v).length > 0)
            .parse(body);
          return tx.checklistItem.update({
            where: { id: sharedItemId },
            data: {
              ...data,
              ...(data.isChecked !== undefined
                ? { checkedByUserId: data.isChecked ? userId : null }
                : {}),
            },
            include: {
              checkedBy: { select: { id: true, name: true } },
              user: { select: { id: true, name: true } },
            },
          });
        }
        if (!id && method === "GET")
          return page(
            await tx.checklistItem.findMany({
              where: { tripId, userId, isShared: false },
              orderBy: [{ createdAt: "asc" }, { id: "asc" }],
              ...pageArgs,
            }),
          );
        if (!id && method === "POST")
          return tx.checklistItem.create({
            data: {
              ...z.object({ title: text }).strict().parse(body),
              tripId,
              userId,
              isShared: false,
            },
          });
        supported(!!id && (method === "PATCH" || method === "DELETE"));
        const item = await tx.checklistItem.findFirst({
          where: { id, tripId, userId, isShared: false },
        });
        if (!item) return missing();
        if (method === "DELETE") {
          await tx.checklistItem.delete({ where: { id } });
          return null;
        }
        const data = z
          .object({ title: text.optional(), isChecked: z.boolean().optional() })
          .strict()
          .refine((v) => Object.keys(v).length > 0)
          .parse(body);
        return tx.checklistItem.update({ where: { id }, data });
      }
      if (section === "expenses") {
        if (id === "settlement") {
          supported(method === "GET");
          const allGroupExpenses = await tx.expense.findMany({
            where: { tripId, isSolo: false },
            include: { splits: true },
          });
          const balances: Record<string, number> = {};
          for (const mId of activeIds) {
            balances[mId] = 0;
          }
          for (const exp of allGroupExpenses) {
            balances[exp.paidByUserId] =
              (balances[exp.paidByUserId] ?? 0) + exp.amountMinor;
            for (const sp of exp.splits) {
              balances[sp.userId] = (balances[sp.userId] ?? 0) - sp.shareMinor;
            }
          }
          const creditors = Object.entries(balances)
            .filter(([, v]) => v > 0)
            .map(([uid, amount]) => ({ uid, amount }))
            .sort((a, b) => b.amount - a.amount);
          const debtors = Object.entries(balances)
            .filter(([, v]) => v < 0)
            .map(([uid, amount]) => ({ uid, amount: -amount }))
            .sort((a, b) => b.amount - a.amount);

          const settlements: Array<{
            fromUserId: string;
            toUserId: string;
            fromName: string;
            toName: string;
            amountMinor: number;
          }> = [];

          let ci = 0,
            di = 0;
          while (ci < creditors.length && di < debtors.length) {
            const creditor = creditors[ci];
            const debtor = debtors[di];
            const amount = Math.min(creditor.amount, debtor.amount);
            if (amount > 0) {
              settlements.push({
                fromUserId: debtor.uid,
                toUserId: creditor.uid,
                fromName: "",
                toName: "",
                amountMinor: amount,
              });
            }
            creditor.amount -= amount;
            debtor.amount -= amount;
            if (creditor.amount === 0) ci++;
            if (debtor.amount === 0) di++;
          }
          const involvedUserIds = [
            ...new Set(settlements.flatMap((s) => [s.fromUserId, s.toUserId])),
          ];
          const users = involvedUserIds.length
            ? await tx.user.findMany({
                where: { id: { in: involvedUserIds } },
                select: { id: true, name: true },
              })
            : [];
          const nameMap = Object.fromEntries(
            users.map((u) => [u.id, u.name || "Traveler"]),
          );
          for (const s of settlements) {
            s.fromName = nameMap[s.fromUserId] || "Traveler";
            s.toName = nameMap[s.toUserId] || "Traveler";
          }
          return {
            settlements,
            balances,
          };
        }

        if (!id) {
          if (method === "GET") {
            const expenses = await tx.expense.findMany({
              where: {
                tripId,
                OR: [
                  { paidByUserId: userId },
                  { isSolo: false, splits: { some: { userId } } },
                ],
              },
              orderBy: [{ createdAt: "desc" }, { id: "asc" }],
              ...pageArgs,
              include: {
                paidBy: { select: { id: true, name: true, image: true } },
                splits: {
                  include: { user: { select: { id: true, name: true } } },
                },
              },
            });
            return page(expenses);
          }
          supported(method === "POST");
          const input = expenseInput.parse(body);
          if (!activeIds.includes(input.paidByUserId))
            fail(400, "INVALID_INPUT", "Payer must be an active trip member.");
          const splitMembers = input.isSolo
            ? []
            : input.splitUserIds.length > 0
              ? input.splitUserIds
              : activeIds;
          for (const sId of splitMembers) {
            if (!activeIds.includes(sId))
              fail(
                400,
                "INVALID_INPUT",
                "All split participants must be active trip members.",
              );
          }
          const expense = await tx.expense.create({
            data: {
              tripId,
              paidByUserId: input.paidByUserId,
              title: input.title,
              category: input.category,
              amountMinor: input.amountMinor,
              isSolo: input.isSolo,
              notes: input.notes ?? null,
            },
          });
          if (!input.isSolo && splitMembers.length > 0) {
            const share = Math.floor(input.amountMinor / splitMembers.length);
            await tx.expenseSplit.createMany({
              data: splitMembers.map((uid) => ({
                expenseId: expense.id,
                userId: uid,
                shareMinor: share,
              })),
            });
          }
          return tx.expense.findUnique({
            where: { id: expense.id },
            include: {
              paidBy: { select: { id: true, name: true, image: true } },
              splits: {
                include: { user: { select: { id: true, name: true } } },
              },
            },
          });
        }

        const expense = await tx.expense.findFirst({ where: { id, tripId } });
        if (!expense) return missing();
        if (expense.paidByUserId !== userId && trip.createdById !== userId)
          fail(
            403,
            "FORBIDDEN",
            "Only the payer or trip organizer can modify this expense.",
          );
        supported(method === "PATCH" || method === "DELETE");
        if (method === "DELETE") {
          await tx.expense.delete({ where: { id } });
          return null;
        }
        const input = expenseUpdateInput.parse(body);
        if (input.paidByUserId && !activeIds.includes(input.paidByUserId))
          fail(400, "INVALID_INPUT", "Payer must be an active trip member.");
        const nextIsSolo =
          input.isSolo !== undefined ? input.isSolo : expense.isSolo;
        const nextAmount =
          input.amountMinor !== undefined
            ? input.amountMinor
            : expense.amountMinor;
        if (input.splitUserIds) {
          for (const sId of input.splitUserIds) {
            if (!activeIds.includes(sId))
              fail(
                400,
                "INVALID_INPUT",
                "All split participants must be active trip members.",
              );
          }
        }
        await tx.expense.update({
          where: { id },
          data: {
            ...(input.title ? { title: input.title } : {}),
            ...(input.category ? { category: input.category } : {}),
            ...(input.amountMinor !== undefined
              ? { amountMinor: input.amountMinor }
              : {}),
            ...(input.isSolo !== undefined ? { isSolo: input.isSolo } : {}),
            ...(input.notes !== undefined ? { notes: input.notes } : {}),
            ...(input.paidByUserId ? { paidByUserId: input.paidByUserId } : {}),
          },
        });
        if (nextIsSolo) {
          await tx.expenseSplit.deleteMany({ where: { expenseId: id } });
        } else if (
          input.splitUserIds ||
          (input.amountMinor !== undefined && !nextIsSolo)
        ) {
          const currentSplits = await tx.expenseSplit.findMany({
            where: { expenseId: id },
          });
          const splitMembers =
            input.splitUserIds ?? currentSplits.map((s) => s.userId);
          const effectiveSplitMembers =
            splitMembers.length > 0 ? splitMembers : activeIds;
          await tx.expenseSplit.deleteMany({ where: { expenseId: id } });
          const share = Math.floor(nextAmount / effectiveSplitMembers.length);
          await tx.expenseSplit.createMany({
            data: effectiveSplitMembers.map((uid) => ({
              expenseId: id,
              userId: uid,
              shareMinor: share,
            })),
          });
        }
        return tx.expense.findUnique({
          where: { id },
          include: {
            paidBy: { select: { id: true, name: true, image: true } },
            splits: {
              include: { user: { select: { id: true, name: true } } },
            },
          },
        });
      }
      return missing();
    },
    { maxWait: 10000, timeout: 15000 },
  );
}

export function errorResponse(error: unknown, requestId: string) {
  if (error instanceof z.ZodError)
    return {
      status: 400,
      body: {
        error: {
          code: "INVALID_INPUT",
          message: error.issues[0]?.message ?? "Check your input.",
          fields: error.flatten().fieldErrors,
          requestId,
        },
      },
    };
  if (error instanceof ApiError)
    return {
      status: error.status,
      body: { error: { code: error.code, message: error.message, requestId } },
    };
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  )
    return {
      status: 409,
      body: {
        error: {
          code: "CONFLICT",
          message: "This record already exists.",
          requestId,
        },
      },
    };
  console.error("Unhandled error in errorResponse:", error);
  return {
    status: 500,
    body: {
      error: {
        code: "INTERNAL_ERROR",
        message: "Something went wrong. Please retry.",
        requestId,
      },
    },
  };
}
