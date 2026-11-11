"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toInstant, toLocal } from "@/lib/dates";
import {
  suggestionProposal,
  type ActivitySuggestion,
  type SuggestionResponse,
} from "@/lib/suggestions";
import {
  useCallback,
  useRef,
  useEffect,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type ReactNode,
} from "react";
import { signIn, signOut } from "next-auth/react";
import TimezoneSelector from "./TimezoneSelector";
import {
  CheckIcon,
  ClockIcon,
  CompassIcon,
  MapPinIcon,
  PlusIcon,
  TrashIcon,
  XIcon,
} from "./icons";

type Trip = {
  currentUserId: string;
  createdById: string;
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  timezone: string;
  budgetMinor: number | null;
  budgetType: string;
  currency: string;
  isOrganizer: boolean;
  _count?: { members: number };
};
type Activity = {
  proposedById: string;
  id: string;
  name: string;
  description?: string;
  location?: string;
  status?: string;
  estimatedCostMinor?: number;
  yes: number;
  no: number;
  outstanding: number;
  myVote: boolean | null;
  proposedBy?: { name: string | null };
};
type Item = { id: string; title: string; isChecked: boolean };
type SharedItem = {
  id: string;
  title: string;
  isChecked: boolean;
  isShared: boolean;
  checkedByUserId: string | null;
  checkedBy?: { id: string; name: string | null } | null;
  user?: { id: string; name: string | null } | null;
};
type Entry = {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location?: string;
  activityId?: string | null;
  version: number;
};
type Member = {
  id?: string;
  userId: string;
  joinedAt?: string;
  user: { name: string | null; image?: string | null };
};
type Invite = { id: string; expiresAt: string; revokedAt: string | null };

type ExpenseSplit = {
  id: string;
  userId: string;
  shareMinor: number;
  user: { id: string; name: string | null };
};

type Expense = {
  id: string;
  tripId: string;
  paidByUserId: string;
  title: string;
  category: "FOOD" | "TRANSPORT" | "LODGING" | "ACTIVITY" | "OTHER";
  amountMinor: number;
  isSolo: boolean;
  notes: string | null;
  createdAt: string;
  paidBy: { id: string; name: string | null; image?: string | null };
  splits: ExpenseSplit[];
};

type SettlementItem = {
  fromUserId: string;
  toUserId: string;
  fromName: string;
  toName: string;
  amountMinor: number;
};

type Settlement = {
  settlements: SettlementItem[];
  balances: Record<string, number>;
};

type TripTask = {
  id: string;
  tripId: string;
  userId: string;
  assignedToUserId?: string | null;
  title: string;
  description?: string | null;
  isChecked: boolean;
  checkedByUserId: string | null;
  createdAt: string;
  user?: { id: string; name: string | null };
  assignedTo?: { id: string; name: string | null } | null;
  checkedBy?: { id: string; name: string | null } | null;
};
export async function api<T>(
  path: string,
  method = "GET",
  data?: unknown,
): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    method,
    headers: method === "GET" ? {} : { "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
    cache: "no-store",
  });
  if (response.status === 204) return null as T;
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      response.status === 401
        ? "Your session expired. Sign in to continue."
        : (result.error?.message ?? "Unable to save. Please retry."),
    );
  if (method === "GET" && result && Array.isArray(result.items)) {
    if (result.nextCursor) {
      const url = new URL(path, "http://packd.local");
      url.searchParams.set("cursor", result.nextCursor);
      const remaining = await api<unknown[]>(
        url.pathname.replace(/^\//, "") + url.search,
      );
      return [...result.items, ...remaining] as T;
    }
    return result.items as T;
  }
  return result;
}
export function LoginButton() {
  return (
    <button
      className="primary"
      onClick={() => signIn("google", { callbackUrl: "/trips" })}
    >
      Continue with Google
    </button>
  );
}
export function Shell({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="app-header">
        <Link className="wordmark" href="/trips">
          Packd
        </Link>
        <button className="quiet" onClick={() => signOut({ callbackUrl: "/" })}>
          Sign out
        </button>
      </header>
      <main className="workspace">{children}</main>
    </>
  );
}
function Alert({ message }: { message: string }) {
  return message ? (
    <div className="notice" role="alert">
      <p>{message}</p>
      {message.includes("session expired") && <LoginButton />}
    </div>
  ) : null;
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function useAction(refresh: () => void | Promise<unknown>) {
  const [error, setError] = useState(""),
    [pending, setPending] = useState(false);
  async function run(action: () => Promise<unknown>, after?: () => void) {
    setPending(true);
    setError("");
    try {
      await action();
      after?.();
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }
  return { error, pending, run };
}

function PackdCheckbox({
  checked,
  onChange,
  disabled,
  id,
  name,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  name?: string;
  ariaLabel?: string;
}) {
  return (
    <span className="packd-checkbox-custom">
      <input
        type="checkbox"
        id={id}
        name={name}
        aria-label={ariaLabel}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span
        className={`packd-checkbox-box ${checked ? "checked" : ""}`}
        aria-hidden="true"
      >
        {checked && (
          <svg
            className="w-3.5 h-3.5"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="3.5 8.5 6.5 11.5 12.5 4.5" />
          </svg>
        )}
      </span>
    </span>
  );
}
const destinationPhotos: Record<string, string> = {
  amalfi:
    "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80",
  barcelona:
    "https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&w=800&q=80",
  "puerto rico":
    "https://images.unsplash.com/photo-1508672019048-805c876b67e2?auto=format&fit=crop&w=800&q=80",
  tokyo:
    "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80",
  paris:
    "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80",
  hawaii:
    "https://images.unsplash.com/photo-1542259009477-d625272157b7?auto=format&fit=crop&w=800&q=80",
};

export function getTripPhoto(destination?: string, name?: string): string {
  const query = `${destination ?? ""} ${name ?? ""}`.toLowerCase();
  for (const [key, url] of Object.entries(destinationPhotos)) {
    if (query.includes(key)) return url;
  }
  return "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80";
}

const activityPlaceholders: Record<string, string> = {
  lemon:
    "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80",
  beach:
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
  boat: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80",
  kayak:
    "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80",
  dinner:
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
  food: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
  tour: "https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=800&q=80",
  hike: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80",
  museum:
    "https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=800&q=80",
  wine: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=800&q=80",
};

export function getActivityPhoto(name: string, description?: string): string {
  const query = `${name} ${description ?? ""}`.toLowerCase();
  for (const [key, url] of Object.entries(activityPlaceholders)) {
    if (query.includes(key)) return url;
  }
  return "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80";
}

export function TripProgress({
  trip,
  memberCount,
  activityCount,
  itineraryCount,
}: {
  trip: Trip;
  memberCount: number;
  activityCount: number;
  itineraryCount: number;
}) {
  const milestones = [
    {
      label: "Invite group",
      done: memberCount > 1,
      href: `/trips/${trip.id}/members`,
    },
    {
      label: "Trip dates",
      done: Boolean(trip.startDate && trip.endDate),
      href: trip.isOrganizer
        ? `/trips/${trip.id}/settings`
        : `/trips/${trip.id}`,
    },
    {
      label: "Suggest activities",
      done: activityCount > 0,
      href: `/trips/${trip.id}/activities`,
    },
    {
      label: "Build itinerary",
      done: itineraryCount > 0,
      href: `/trips/${trip.id}/itinerary`,
    },
  ];
  const completedCount = milestones.filter((m) => m.done).length;
  const progressPercent = Math.round(
    (completedCount / milestones.length) * 100,
  );

  return (
    <div className="progress-card mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-[#252525]">Trip Progress</h3>
          <p className="text-xs text-[#736B66]">
            {completedCount} of {milestones.length} completed
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#F4EDE8] text-[#872E27]">
            {progressPercent}%
          </span>
          <a
            href="#trip-readiness"
            className="text-xs font-semibold text-[#B54E46] hover:underline"
          >
            Planning steps &darr;
          </a>
        </div>
      </div>
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        {milestones.map((m, idx) => (
          <li key={idx}>
            <Link
              href={m.href}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-[#FAF9F6] transition-colors"
            >
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                  m.done
                    ? "bg-[#B54E46] text-white"
                    : "border border-[#EAE7E2] text-transparent"
                }`}
              >
                <CheckIcon width={10} height={10} />
              </span>
              <span
                className={`truncate ${
                  m.done ? "text-[#252525] font-medium" : "text-[#736B66]"
                }`}
              >
                {m.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

const membersCache = new Map<string, Member[]>();

export function TripProgressSection({ trip }: { trip: Trip }) {
  const [tasks, setTasks] = useState<TripTask[] | null>(null);
  const [members, setMembers] = useState<Member[] | null>(
    () => membersCache.get(trip.id) ?? null,
  );
  const [taskError, setTaskError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  const base = `trips/${trip.id}/tasks`;

  const loadTasks = useCallback(() => {
    return api<TripTask[]>(base)
      .then((data) => {
        setTasks(data);
        setTaskError("");
      })
      .catch((e) => setTaskError(e.message));
  }, [base]);

  useEffect(() => {
    loadTasks();
    api<Member[]>(`trips/${trip.id}/members`)
      .then((m) => {
        membersCache.set(trip.id, m);
        setMembers(m);
      })
      .catch(() => {});
  }, [loadTasks, trip.id]);

  const taskAction = useAction(loadTasks);

  function addTask(e: FormEvent<HTMLFormElement>) {
    const form = e.currentTarget;
    const data = values(e);
    const title = String(data.get("title") ?? "").trim();
    const description =
      String(data.get("description") ?? "").trim() || undefined;
    const assignedToUserId =
      String(data.get("assignedToUserId") ?? "").trim() || undefined;
    if (!title) return;
    taskAction.run(
      () => api(base, "POST", { title, description, assignedToUserId }),
      () => {
        form.reset();
        setShowAddModal(false);
      },
    );
  }

  function toggleTask(task: TripTask, checked: boolean) {
    setTasks(
      (prev) =>
        prev?.map((t) =>
          t.id === task.id
            ? {
                ...t,
                isChecked: checked,
                checkedBy: checked
                  ? { id: trip.currentUserId, name: "You" }
                  : null,
              }
            : t,
        ) ?? null,
    );
    taskAction.run(async () => {
      try {
        await api(`${base}/${task.id}`, "PATCH", { isChecked: checked });
      } catch (err) {
        loadTasks();
        throw err;
      }
    });
  }

  function deleteTask(task: TripTask) {
    if (confirm(`Delete “${task.title}”?`)) {
      setTasks((prev) => prev?.filter((t) => t.id !== task.id) ?? null);
      taskAction.run(async () => {
        try {
          await api(`${base}/${task.id}`, "DELETE", {});
        } catch (err) {
          loadTasks();
          throw err;
        }
      });
    }
  }

  const completedCount = tasks?.filter((t) => t.isChecked).length ?? 0;
  const totalCount = tasks?.length ?? 0;
  const percent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="workspace-layout">
      <div className="workspace-main">
        <section id="trip-readiness" className="panel">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-bold font-display text-[#252525]">
                Trip Readiness & Planning Progress
              </h2>
              <p className="muted text-sm mt-1">
                Collaborative milestones for your group. Anyone can take action
                to get the trip ready.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold px-3 py-1.5 rounded-full bg-[#F4EDE8] text-[#872E27]">
                {percent}% Ready
              </span>
            </div>
          </div>

          <div className="progress-track mb-3">
            <div className="progress-fill" style={{ width: `${percent}%` }} />
          </div>

          <div className="flex items-center justify-between text-xs text-[#736B66] mb-6">
            <span>
              {completedCount} of {totalCount} completed
            </span>
          </div>

          <Alert message={taskError || taskAction.error} />
          {taskError && (
            <button
              type="button"
              onClick={loadTasks}
              className="text-xs font-semibold text-[#B54E46] hover:underline mb-4"
            >
              Retry loading tasks
            </button>
          )}

          {tasks === null ? (
            <p className="text-xs text-[#736B66] py-4">Loading tasks...</p>
          ) : tasks.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#FAF9F6] border border-[#EAE7E2] text-center my-4">
              <p className="text-sm font-semibold text-[#252525]">
                No planning tasks yet
              </p>
              <p className="text-xs text-[#736B66] mt-1 max-w-md mx-auto">
                Click “Add task” in the sidebar to create your first trip
                milestone.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                    task.isChecked
                      ? "bg-[#FAF9F6] border-[#EAE7E2]"
                      : "bg-white border-[#D8D4CD] shadow-sm hover:border-[#B54E46]"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="pt-0.5 shrink-0">
                          <PackdCheckbox
                            checked={task.isChecked}
                            onChange={(checked) => toggleTask(task, checked)}
                            ariaLabel={`Mark “${task.title}” as ${task.isChecked ? "incomplete" : "complete"}`}
                          />
                        </div>
                        <div className="min-w-0">
                          <h4
                            className={`font-bold text-sm text-[#252525] break-words ${
                              task.isChecked
                                ? "line-through text-[#736B66]"
                                : ""
                            }`}
                          >
                            {task.title}
                          </h4>
                          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                            <span
                              onClick={() => toggleTask(task, !task.isChecked)}
                              className={`badge cursor-pointer select-none ${
                                task.isChecked
                                  ? "badge-completed"
                                  : "badge-in-progress"
                              }`}
                              title="Click to toggle status"
                            >
                              {task.isChecked ? "Completed" : "In Progress"}
                            </span>
                            {task.assignedTo ? (
                              <span className="text-[11px] font-semibold text-[#872E27] bg-[#F4EDE8] px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                Assigned:{" "}
                                {task.assignedTo.id === trip.currentUserId
                                  ? "You"
                                  : task.assignedTo.name || "Traveler"}
                              </span>
                            ) : (
                              <span className="text-[11px] font-medium text-[#736B66] bg-[#FAF9F6] border border-[#EAE7E2] px-2 py-0.5 rounded-full">
                                Unassigned
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={taskAction.pending}
                        aria-label={`Delete task “${task.title}”`}
                        onClick={() => deleteTask(task)}
                        className="task-delete-btn shrink-0"
                      >
                        <TrashIcon width={16} height={16} />
                      </button>
                    </div>
                    {task.description && (
                      <p className="text-xs text-[#736B66] leading-relaxed pl-8 mt-1 break-words">
                        {task.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <aside className="workspace-sidebar">
        <div className="sidebar-card">
          <h3 className="font-bold text-base text-[#252525] mb-1">
            Planning Tasks
          </h3>
          <p className="muted text-xs mb-4">
            Track your trip preparation and collaborate on to-dos with your
            crew.
          </p>
          <div className="sidebar-actions">
            <button
              type="button"
              className="sidebar-btn primary"
              onClick={() => setShowAddModal(true)}
            >
              <PlusIcon width={16} height={16} />
              <span>Add task</span>
            </button>
          </div>
        </div>
      </aside>

      {showAddModal && (
        <Modal
          title="Create a planning task"
          subtitle="Add a milestone or preparation task to Trip Readiness & Planning Progress."
          onClose={() => setShowAddModal(false)}
          ariaLabelledBy="add-task-heading"
        >
          <form className="form" onSubmit={addTask}>
            <Alert message={taskAction.error} />
            <Field label="Task title">
              <input
                name="title"
                type="text"
                required
                maxLength={160}
                placeholder="e.g. Reserve rental car, renew passports, confirm Airbnb"
                autoFocus
              />
            </Field>
            <Field label="Assign to (optional)">
              <select name="assignedToUserId" defaultValue="">
                <option value="">Unassigned (anyone in crew)</option>
                {members?.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user.name || "Traveler"}
                    {m.userId === trip.currentUserId ? " (You)" : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Description (optional)">
              <textarea
                name="description"
                rows={3}
                maxLength={500}
                placeholder="e.g. Coordinate driver license details and reserve SUV at airport"
              />
            </Field>
            <div className="flex gap-2 mt-2">
              <button
                type="submit"
                className="primary"
                disabled={taskAction.pending}
              >
                {taskAction.pending ? "Creating..." : "Create task"}
              </button>
              <button type="button" onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

const values = (event: FormEvent<HTMLFormElement>) => {
  event.preventDefault();
  return new FormData(event.currentTarget);
};
const money = (value: number | null | undefined) =>
  value == null
    ? "Not set"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(value / 100);

export function TripList() {
  const [trips, setTrips] = useState<Trip[] | null>(null),
    [error, setError] = useState("");
  const load = useCallback(() => {
    return api<Trip[]>("trips")
      .then((data) => {
        setTrips(data);
        setError("");
      })
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  return (
    <Shell>
      <div className="page-heading">
        <div>
          <p className="eyebrow">GOOD PLANS START HERE</p>
          <h1>Your trips</h1>
          <p>A little less group chat. A lot more going places.</p>
        </div>
        <Link className="primary" href="/trips/new">
          New Trip
        </Link>
      </div>
      <Alert message={error} />
      {error && <button onClick={load}>Retry</button>}
      {!trips && !error && <p role="status">Loading your trips…</p>}
      {trips?.length === 0 && (
        <section className="panel">
          <h2>Your next adventure starts here.</h2>
          <p>Create a trip, invite your people, and make a plan together.</p>
        </section>
      )}
      <div className="trip-grid">
        {trips?.map((trip) => (
          <Link
            className="trip-card"
            key={trip.id}
            href={`/trips/${trip.id}/activities`}
          >
            <div className="trip-art" style={{ padding: 0 }}>
              <img
                src={getTripPhoto(trip.destination, trip.name)}
                alt={trip.destination || trip.name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
            <div className="card-content">
              <h2>{trip.name}</h2>
              <p>{trip.destination}</p>
              <p className="muted">
                {trip.startDate.slice(0, 10)} – {trip.endDate.slice(0, 10)}
                {trip._count?.members
                  ? ` · ${trip._count.members} ${trip._count.members === 1 ? "person" : "people"}`
                  : ""}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </Shell>
  );
}
export function TripForm({
  trip,
  onSaved,
}: {
  trip?: Trip;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState(""),
    [pending, setPending] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    const data = values(e);
    setPending(true);
    setError("");
    try {
      const result = await api<Trip>(
        trip ? `trips/${trip.id}` : "trips",
        trip ? "PATCH" : "POST",
        Object.fromEntries(data),
      );
      if (onSaved) onSaved();
      else router.push(`/trips/${result.id}/activities`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }
  return (
    <form className="panel form" onSubmit={submit}>
      <h2>{trip ? "Trip details" : "Where are we going?"}</h2>
      <Field label="Trip name">
        <input
          name="name"
          required
          maxLength={160}
          defaultValue={trip?.name}
          placeholder="A week in Puerto Rico"
        />
      </Field>
      <Field label="Destination">
        <input
          name="destination"
          required
          maxLength={160}
          defaultValue={trip?.destination}
          placeholder="San Juan, Puerto Rico"
        />
      </Field>
      <div className="form-row">
        <Field label="Start date">
          <input
            type="date"
            name="startDate"
            required
            defaultValue={trip?.startDate.slice(0, 10)}
          />
        </Field>
        <Field label="End date">
          <input
            type="date"
            name="endDate"
            required
            defaultValue={trip?.endDate.slice(0, 10)}
          />
        </Field>
      </div>
      <Field label="Trip timezone">
        <TimezoneSelector
          name="timezone"
          defaultValue={
            trip?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
          }
        />
      </Field>
      <Alert message={error} />
      <button className="primary" disabled={pending}>
        {pending ? "Saving…" : trip ? "Save details" : "Create Trip"}
      </button>
    </form>
  );
}
export function NewTrip() {
  return (
    <Shell>
      <Link href="/trips">← Your trips</Link>
      <h1>Make it a real plan.</h1>
      <TripForm />
    </Shell>
  );
}

export function TripWorkspace({
  tripId,
  section,
}: {
  tripId: string;
  section: string;
}) {
  const [trip, setTrip] = useState<Trip | null>(null),
    [error, setError] = useState("");
  const loadCounts = useCallback(() => {
    // Kept as a stable callback for Activities to call after mutations.
  }, []);

  const load = useCallback(() => {
    return api<Trip>(`trips/${tripId}`)
      .then((data) => {
        setTrip(data);
        setError("");
      })
      .catch((e) => {
        setTrip(null);
        membersCache.delete(tripId);
        setError(e.message);
      });
  }, [tripId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Shell>
      <Link href="/trips">← Your trips</Link>
      <Alert message={error} />
      {error && <button onClick={load}>Retry</button>}
      {!trip && !error && <p role="status">Loading trip…</p>}
      {trip && (
        <>
          <div className="page-heading">
            <div>
              <p className="eyebrow">{trip.destination}</p>
              <h1>{trip.name}</h1>
              <p>
                {trip.startDate.slice(0, 10)} – {trip.endDate.slice(0, 10)} ·{" "}
                {trip.timezone}
              </p>
            </div>
          </div>
          <nav className="trip-nav" aria-label="Trip sections">
            {[
              "activities",
              "itinerary",
              "budget",
              "checklist",
              "members",
              "progress",
              ...(trip.isOrganizer ? ["settings"] : []),
            ].map((tab) => (
              <Link
                key={tab}
                href={`/trips/${tripId}/${tab}`}
                aria-current={section === tab ? "page" : undefined}
              >
                {tab[0].toUpperCase() + tab.slice(1)}
              </Link>
            ))}
          </nav>
          {section === "activities" && (
            <Activities trip={trip} onUpdateCounts={loadCounts} />
          )}{" "}
          {section === "budget" && <Budget trip={trip} refresh={load} />}{" "}
          {section === "checklist" && <Checklist trip={trip} />}{" "}
          {section === "itinerary" && <Itinerary trip={trip} />}{" "}
          {section === "members" && <Members trip={trip} />}{" "}
          {section === "progress" && <TripProgressSection trip={trip} />}{" "}
          {section === "settings" && trip.isOrganizer && (
            <TripForm trip={trip} onSaved={load} />
          )}
        </>
      )}
    </Shell>
  );
}

function Modal({
  title,
  subtitle,
  onClose,
  children,
  ariaLabelledBy = "modal-title",
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  ariaLabelledBy?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const dialog = dialogRef.current!;
    const originalOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby={ariaLabelledBy}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3
              id={ariaLabelledBy}
              className="text-xl font-bold font-display text-[#252525]"
            >
              {title}
            </h3>
            {subtitle && <p className="muted text-sm mt-1">{subtitle}</p>}
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
            title="Close modal"
          >
            <XIcon width={18} height={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </dialog>
  );
}
function Activities({
  trip,
  onUpdateCounts,
}: {
  trip: Trip;
  onUpdateCounts?: () => void;
}) {
  const [editing, setEditing] = useState<Activity | null>(null);
  const [scheduling, setScheduling] = useState<Activity | null>(null);
  const [tab, setTab] = useState<"suggested" | "planned">("suggested");
  const [showAiModal, setShowAiModal] = useState(false);
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [items, setItems] = useState<Activity[] | null>(null),
    [loadError, setLoadError] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const base = `trips/${trip.id}/activities`;

  const load = useCallback(() => {
    return Promise.allSettled([
      api<Activity[]>(base),
      api<Entry[]>(`trips/${trip.id}/itinerary`),
    ]).then(([actRes, itRes]) => {
      if (actRes.status === "fulfilled") {
        setItems(actRes.value);
        setLoadError("");
      } else {
        setLoadError(actRes.reason?.message ?? "Unable to load activities.");
      }
      if (itRes.status === "fulfilled") {
        setEntries(itRes.value);
      }
      onUpdateCounts?.();
    });
  }, [base, trip.id, onUpdateCounts]);

  useEffect(() => {
    load();
  }, [load]);

  const action = useAction(load);

  function propose(e: FormEvent<HTMLFormElement>) {
    const form = e.currentTarget,
      data = values(e);
    const cost = String(data.get("cost"));
    action.run(
      () =>
        api(
          editing ? `${base}/${editing.id}` : base,
          editing ? "PATCH" : "POST",
          {
            name: data.get("name"),
            description: data.get("description"),
            location: data.get("location"),
            estimatedCostMinor:
              cost === "" ? null : Math.round(Number(cost) * 100),
          },
        ),
      () => {
        setEditing(null);
        setShowSuggestModal(false);
        form.reset();
      },
    );
  }

  function scheduleActivity(e: FormEvent<HTMLFormElement>) {
    const data = values(e);
    action.run(
      () =>
        api(`trips/${trip.id}/itinerary`, "POST", {
          title: scheduling!.name,
          startTime: toInstant(String(data.get("startTime")), trip.timezone),
          endTime: toInstant(String(data.get("endTime")), trip.timezone),
          location: String(data.get("location") || scheduling!.location || ""),
          activityId: scheduling!.id,
        }),
      () => {
        setScheduling(null);
        load();
      },
    );
  }

  const plannedActivityIds = new Set(
    entries.filter((e) => e.activityId).map((e) => e.activityId),
  );
  const suggestedItems =
    items?.filter((item) => !plannedActivityIds.has(item.id)) ?? [];
  const plannedItems =
    items?.filter((item) => plannedActivityIds.has(item.id)) ?? [];

  return (
    <>
      <div className="section-heading">
        <h2>What should we do?</h2>
        <p>Everyone gets a say. Missing votes never count as “no.”</p>
      </div>

      <Alert message={loadError || action.error} />
      {loadError && <button onClick={load}>Retry</button>}

      <div className="workspace-layout">
        <div className="workspace-main">
          <div className="segment-tabs mb-6" role="tablist">
            <button
              type="button"
              role="tab"
              className={`segment-tab ${tab === "suggested" ? "active" : ""}`}
              aria-selected={tab === "suggested"}
              onClick={() => setTab("suggested")}
            >
              Suggested ({suggestedItems.length})
            </button>
            <button
              type="button"
              role="tab"
              className={`segment-tab ${tab === "planned" ? "active" : ""}`}
              aria-selected={tab === "planned"}
              onClick={() => setTab("planned")}
            >
              Planned ({plannedItems.length})
            </button>
          </div>

          {tab === "suggested" && (
            <>
              {!items && !loadError && <p role="status">Loading activities…</p>}
              {items && items.length === 0 && (
                <p className="empty">
                  No ideas yet. Click “Suggest an activity” or “Find activity
                  ideas with AI” in the sidebar to get started!
                </p>
              )}
              {items && items.length > 0 && suggestedItems.length === 0 && (
                <p className="empty">
                  All suggested activities have been added to the planned
                  itinerary!
                </p>
              )}

              <div className="stack">
                {suggestedItems.map((item) => (
                  <article className="activity-card" key={item.id}>
                    <div className="activity-card-image">
                      <img
                        src={getActivityPhoto(item.name, item.description)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      {item.yes > 0 && (
                        <span className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-[#B54E46] shadow-sm inline-flex items-center gap-1">
                          <CheckIcon width={12} height={12} />
                          <span>{item.yes} interested</span>
                        </span>
                      )}
                    </div>
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-xl font-bold font-display text-[#252525]">
                            {item.name}
                          </h3>
                          {item.description && (
                            <p className="text-sm text-[#736B66] mt-1">
                              {item.description}
                            </p>
                          )}
                          {item.location && (
                            <p className="muted text-xs mt-1 flex items-center gap-1">
                              <MapPinIcon width={13} height={13} />
                              <span>{item.location}</span>
                            </p>
                          )}
                          {item.estimatedCostMinor != null && (
                            <p className="text-sm font-semibold text-[#252525] mt-2">
                              {money(item.estimatedCostMinor)} estimated
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="vote-controls">
                        <button
                          type="button"
                          className="vote-btn-heart"
                          disabled={action.pending}
                          aria-pressed={item.myVote === true}
                          aria-label="Yes, I’m in"
                          title="Yes, I’m in"
                          onClick={() =>
                            action.run(() =>
                              api(`${base}/${item.id}/votes/me`, "PUT", {
                                value: true,
                              }),
                            )
                          }
                        >
                          <CheckIcon width={24} height={24} />
                          <span className="sr-only">Yes, I’m in</span>
                        </button>
                        <button
                          type="button"
                          className="vote-btn-cross"
                          disabled={action.pending}
                          aria-pressed={item.myVote === false}
                          aria-label="Not for me"
                          title="Not for me"
                          onClick={() =>
                            action.run(() =>
                              api(`${base}/${item.id}/votes/me`, "PUT", {
                                value: false,
                              }),
                            )
                          }
                        >
                          <XIcon width={24} height={24} />
                          <span className="sr-only">Not for me</span>
                        </button>
                      </div>

                      <p className="muted text-center mt-2" aria-live="polite">
                        {item.yes} yes · {item.no} no · {item.outstanding}{" "}
                        waiting to vote
                      </p>

                      {trip.isOrganizer && (
                        <div className="mt-4 pt-4 border-t border-[#EAE7E2] flex items-center justify-between">
                          <button
                            type="button"
                            className="quiet font-semibold text-[#B54E46]"
                            onClick={() =>
                              setScheduling(
                                scheduling?.id === item.id ? null : item,
                              )
                            }
                          >
                            {scheduling?.id === item.id
                              ? "Cancel scheduling"
                              : "+ Add to itinerary"}
                          </button>
                        </div>
                      )}

                      {scheduling?.id === item.id && (
                        <form
                          onSubmit={scheduleActivity}
                          className="mt-3 p-4 bg-[#FAF9F6] rounded-xl border border-[#EAE7E2] form"
                        >
                          <p className="font-bold text-xs uppercase text-[#B54E46]">
                            Schedule “{item.name}”
                          </p>
                          <Field label="Start time">
                            <input
                              type="datetime-local"
                              name="startTime"
                              required
                              defaultValue={`${trip.startDate.slice(0, 10)}T10:00`}
                            />
                          </Field>
                          <Field label="End time">
                            <input
                              type="datetime-local"
                              name="endTime"
                              required
                              defaultValue={`${trip.startDate.slice(0, 10)}T12:00`}
                            />
                          </Field>
                          <Field label="Location (optional)">
                            <input
                              name="location"
                              defaultValue={item.location ?? ""}
                            />
                          </Field>
                          <div className="flex gap-2">
                            <button
                              className="primary"
                              disabled={action.pending}
                            >
                              Confirm schedule
                            </button>
                            <button
                              type="button"
                              onClick={() => setScheduling(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      )}

                      {(trip.isOrganizer ||
                        item.proposedById === trip.currentUserId) &&
                        item.yes + item.no === 0 && (
                          <div className="actions mt-3">
                            <button
                              type="button"
                              onClick={() => {
                                setEditing(item);
                                setShowSuggestModal(true);
                              }}
                            >
                              Edit activity
                            </button>
                            <button
                              type="button"
                              disabled={action.pending}
                              onClick={() => {
                                if (confirm(`Delete “${item.name}”?`))
                                  action.run(() =>
                                    api(`${base}/${item.id}`, "DELETE", {}),
                                  );
                              }}
                            >
                              Delete activity
                            </button>
                          </div>
                        )}
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}

          {tab === "planned" && (
            <div className="stack">
              {plannedItems.length === 0 ? (
                <p className="empty">
                  No activities planned yet. Vote on suggestions and add
                  favorites to your itinerary!
                </p>
              ) : (
                plannedItems.map((item) => {
                  const matchedEntry = entries.find(
                    (e) => e.activityId === item.id,
                  );
                  return (
                    <article className="activity-card" key={item.id}>
                      <div className="activity-card-image">
                        <img
                          src={getActivityPhoto(item.name, item.description)}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-3 left-3 bg-[#252525] text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm inline-flex items-center gap-1">
                          <CheckIcon width={12} height={12} />
                          <span>Planned in Itinerary</span>
                        </span>
                      </div>
                      <div className="p-5">
                        <h3 className="text-xl font-bold font-display text-[#252525]">
                          {item.name}
                        </h3>
                        {item.description && (
                          <p className="text-sm text-[#736B66] mt-1">
                            {item.description}
                          </p>
                        )}
                        {matchedEntry && (
                          <p className="text-sm font-medium text-[#B54E46] mt-2 flex items-center gap-1.5">
                            <ClockIcon width={14} height={14} />
                            <span>
                              {new Intl.DateTimeFormat("en-US", {
                                timeZone: trip.timezone,
                                dateStyle: "medium",
                                timeStyle: "short",
                              }).format(new Date(matchedEntry.startTime))}{" "}
                              –{" "}
                              {new Intl.DateTimeFormat("en-US", {
                                timeZone: trip.timezone,
                                timeStyle: "short",
                              }).format(new Date(matchedEntry.endTime))}
                            </span>
                          </p>
                        )}
                        {item.location && (
                          <p className="muted text-xs mt-1 flex items-center gap-1">
                            <MapPinIcon width={13} height={13} />
                            <span>{item.location}</span>
                          </p>
                        )}
                        {item.estimatedCostMinor != null && (
                          <p className="text-sm font-semibold text-[#252525] mt-1">
                            {money(item.estimatedCostMinor)} estimated
                          </p>
                        )}
                        <div className="mt-4 pt-3 border-t border-[#EAE7E2]">
                          <Link
                            href={`/trips/${trip.id}/itinerary`}
                            className="quiet font-semibold"
                          >
                            View in Itinerary →
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          )}
        </div>

        <aside className="workspace-sidebar">
          <div className="sidebar-card">
            <h3 className="font-bold text-base text-[#252525] mb-1">
              Activity Ideas
            </h3>
            <p className="muted text-xs mb-4">
              Brainstorm with AI or suggest an activity for your travel crew to
              vote on.
            </p>
            <div className="sidebar-actions">
              <button
                type="button"
                className="sidebar-btn primary"
                onClick={() => setShowAiModal(true)}
              >
                <CompassIcon width={16} height={16} />
                <span>Find activity ideas with AI</span>
              </button>
              <button
                type="button"
                className="sidebar-btn secondary"
                onClick={() => {
                  setEditing(null);
                  setShowSuggestModal(true);
                }}
              >
                <PlusIcon width={16} height={16} />
                <span>Suggest an activity</span>
              </button>
            </div>
          </div>
        </aside>
      </div>

      {showAiModal && (
        <Modal
          title="Find activity ideas with AI"
          subtitle="Get tailored suggestions based on your destination, budget, and dates."
          onClose={() => setShowAiModal(false)}
          ariaLabelledBy="planner-heading"
        >
          <ActivityPlanner tripId={trip.id} refresh={load} />
        </Modal>
      )}

      {(showSuggestModal || editing) && (
        <Modal
          title={editing ? "Edit activity" : "Suggest an activity"}
          subtitle={
            editing
              ? "Update details for this proposed activity."
              : "Propose something fun for the group to vote on."
          }
          onClose={() => {
            setShowSuggestModal(false);
            setEditing(null);
          }}
        >
          <form key={editing?.id ?? "new"} className="form" onSubmit={propose}>
            <Field label="Activity">
              <input
                name="name"
                required
                maxLength={160}
                placeholder="Sunset kayak tour"
                defaultValue={editing?.name}
              />
            </Field>
            <Field label="Description (optional)">
              <textarea
                name="description"
                maxLength={2000}
                defaultValue={editing?.description ?? ""}
              />
            </Field>
            <div className="form-row">
              <Field label="Location (optional)">
                <input
                  name="location"
                  maxLength={2000}
                  defaultValue={editing?.location ?? ""}
                />
              </Field>
              <Field label="Estimated cost in USD (optional)">
                <input
                  name="cost"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={
                    editing?.estimatedCostMinor == null
                      ? ""
                      : editing.estimatedCostMinor / 100
                  }
                />
              </Field>
            </div>
            <div className="flex gap-2 mt-2">
              <button className="primary" disabled={action.pending}>
                {editing ? "Save activity" : "Propose activity"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSuggestModal(false);
                  setEditing(null);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
function ActivityPlanner({
  tripId,
  refresh,
}: {
  tripId: string;
  refresh: () => Promise<void>;
}) {
  const [suggestions, setSuggestions] = useState<ActivitySuggestion[] | null>(
    null,
  );
  const [added, setAdded] = useState<number[]>([]);
  const generate = useAction(() => {});
  const save = useAction(refresh);
  const busy = generate.pending || save.pending;
  return (
    <section className="form" aria-labelledby="planner-heading">
      <h3 id="planner-heading" className="sr-only">
        Find activity ideas with AI
      </h3>
      <p className="muted">
        Get up to five ideas using your destination, dates, budget, and existing
        proposals. Your preferences and shared trip details are sent to our AI
        and search providers; private checklists are excluded.
      </p>
      <form
        className="form"
        onSubmit={(e) => {
          const data = values(e);
          const amount = String(data.get("maxCost"));
          generate.run(async () => {
            setSuggestions(null);
            setAdded([]);
            const result = await api<SuggestionResponse>(
              `trips/${tripId}/suggestions`,
              "POST",
              {
                preferences: data.get("preferences"),
                maxCostMinor:
                  amount === "" ? null : Math.round(Number(amount) * 100),
              },
            );
            setSuggestions(result.suggestions);
          });
        }}
      >
        <Field label="What would your group enjoy?">
          <textarea
            name="preferences"
            maxLength={600}
            placeholder="Museums, local food, and indoor options"
          />
        </Field>
        <Field label="Maximum estimated cost per person, per activity (USD, optional)">
          <input
            name="maxCost"
            type="number"
            min="0"
            max="20000000"
            step="0.01"
          />
        </Field>
        <button className="primary" disabled={busy}>
          {generate.pending ? "Finding ideas…" : "Find activity ideas"}
        </button>
      </form>
      <Alert message={generate.error || save.error} />
      {generate.pending && (
        <p role="status">
          Searching for ideas. This can take up to 45 seconds.
        </p>
      )}
      {suggestions?.length === 0 && (
        <p role="status">
          No matching suggestions found. Try broader preferences or a higher
          cost limit, or propose your own activity.
        </p>
      )}
      {!!suggestions?.length && (
        <p className="muted">
          AI suggestions may be inaccurate. Check source details, prices, and
          availability before making plans. Adding an idea creates a proposal
          for the group to vote on.
        </p>
      )}
      {suggestions?.map((item, index) => (
        <article className="panel" key={index}>
          <h4>{item.name}</h4>
          <p>{item.description}</p>
          <p>{item.location}</p>
          <p>
            {item.estimatedCostMinor === null
              ? "Price unknown"
              : `${money(item.estimatedCostMinor)} estimated per person`}
            {item.durationMinutes
              ? ` · About ${item.durationMinutes} minutes`
              : ""}
          </p>
          <p style={{ overflowWrap: "anywhere" }}>
            <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">
              Source: {item.sourceTitle}
            </a>
          </p>
          <button
            disabled={busy || added.includes(index)}
            onClick={() =>
              save.run(async () => {
                await api(
                  `trips/${tripId}/activities`,
                  "POST",
                  suggestionProposal(item),
                );
                setAdded((previous) => [...previous, index]);
              })
            }
          >
            {added.includes(index)
              ? "Added to proposals"
              : `Add ${item.name} to proposals`}
          </button>
        </article>
      ))}
      {added.length > 0 && (
        <p role="status">
          {added.length} {added.length === 1 ? "idea added" : "ideas added"} to
          proposals.
        </p>
      )}
    </section>
  );
}
function Budget({ trip, refresh }: { trip: Trip; refresh: () => void }) {
  const action = useAction(refresh);
  const [expenses, setExpenses] = useState<Expense[] | null>(null);
  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const [members, setMembers] = useState<Member[] | null>(
    () => membersCache.get(trip.id) ?? null,
  );
  const [loadError, setLoadError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [isSolo, setIsSolo] = useState(false);
  const [inputAmount, setInputAmount] = useState("");
  const [selectedSplits, setSelectedSplits] = useState<Record<string, boolean>>(
    () => {
      const cached = membersCache.get(trip.id);
      if (!cached) return {};
      const initial: Record<string, boolean> = {};
      for (const m of cached) initial[m.userId] = true;
      return initial;
    },
  );

  const loadExpenses = useCallback(() => {
    return Promise.all([
      api<Expense[]>(`trips/${trip.id}/expenses`),
      api<Settlement>(`trips/${trip.id}/expenses/settlement`),
      api<Member[]>(`trips/${trip.id}/members`),
    ])
      .then(([expData, setlData, memData]) => {
        setExpenses(expData);
        setSettlement(setlData);
        membersCache.set(trip.id, memData);
        setMembers(memData);
        setLoadError("");
        if (memData) {
          const initial: Record<string, boolean> = {};
          for (const m of memData) initial[m.userId] = true;
          setSelectedSplits(initial);
        }
      })
      .catch((e) => {
        setLoadError((e as Error).message);
      });
  }, [trip.id]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const expenseAction = useAction(loadExpenses);

  function submitExpense(e: FormEvent<HTMLFormElement>) {
    const form = e.currentTarget,
      data = values(e);
    const amountNum = Number(data.get("amount"));
    const splitUserIds = isSolo
      ? undefined
      : Object.entries(selectedSplits)
          .filter(([, checked]) => checked)
          .map(([userId]) => userId);

    expenseAction.run(
      () =>
        api(`trips/${trip.id}/expenses`, "POST", {
          title: data.get("title"),
          amountMinor: Math.round(amountNum * 100),
          category: data.get("category"),
          paidByUserId: data.get("paidByUserId"),
          isSolo,
          splitUserIds:
            splitUserIds && splitUserIds.length > 0 ? splitUserIds : undefined,
          notes: String(data.get("notes") || "") || null,
        }),
      () => {
        form.reset();
        setInputAmount("");
        setIsSolo(false);
        setShowAddForm(false);
      },
    );
  }

  const groupTotal =
    expenses
      ?.filter((e) => !e.isSolo)
      .reduce((sum, e) => sum + e.amountMinor, 0) ?? 0;
  const yourShare =
    expenses
      ?.filter((e) => !e.isSolo)
      .reduce(
        (sum, e) =>
          sum +
          (e.splits.find((s) => s.userId === trip.currentUserId)?.shareMinor ??
            0),
        0,
      ) ?? 0;
  const soloTotal =
    expenses
      ?.filter((e) => e.isSolo && e.paidByUserId === trip.currentUserId)
      .reduce((sum, e) => sum + e.amountMinor, 0) ?? 0;
  const myBalance = settlement?.balances[trip.currentUserId] ?? 0;

  const splitCount = Object.values(selectedSplits).filter(Boolean).length;

  const filteredExpenses =
    expenses?.filter(
      (e) => categoryFilter === "ALL" || e.category === categoryFilter,
    ) ?? [];

  return (
    <>
      <section className="panel">
        <p className="eyebrow">THE PLAN, NOT A PAYMENT</p>
        <h2 className="budget-number">{money(trip.budgetMinor)}</h2>
        <p>
          {trip.budgetType === "TOTAL"
            ? "Total trip budget"
            : "Budget per person"}{" "}
          · USD
        </p>
        <p className="muted">
          An estimate to guide your plans. Packd does not collect payments.
        </p>
        <Alert message={action.error} />
        {trip.isOrganizer && (
          <form
            className="form"
            onSubmit={(e) => {
              const data = values(e);
              action.run(() =>
                api(`trips/${trip.id}/budget`, "PATCH", {
                  budgetMinor: Math.round(Number(data.get("amount")) * 100),
                  currency: "USD",
                  budgetType: data.get("budgetType"),
                }),
              );
            }}
          >
            <Field label="Amount (USD)">
              <input
                key={trip.budgetMinor}
                name="amount"
                type="number"
                required
                min="0"
                max="20000000"
                step="0.01"
                defaultValue={
                  trip.budgetMinor == null ? "" : trip.budgetMinor / 100
                }
              />
            </Field>
            <Field label="Budget applies to">
              <select name="budgetType" defaultValue={trip.budgetType}>
                <option value="TOTAL">Whole trip</option>
                <option value="PER_PERSON">Each person</option>
              </select>
            </Field>
            <button className="primary" disabled={action.pending}>
              Save budget
            </button>
          </form>
        )}
      </section>

      <div className="section-heading mt-10">
        <h2>Expenses & Splitting</h2>
        <p>
          Track group and solo expenses, split bills fairly, and settle debts.
        </p>
      </div>

      <Alert message={loadError || expenseAction.error} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
        <div className="stat-card">
          <span className="stat-label">Group Total</span>
          <span className="stat-value">{money(groupTotal)}</span>
          <span className="text-xs text-[#736B66]">Shared costs</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Your Share</span>
          <span className="stat-value">{money(yourShare)}</span>
          <span className="text-xs text-[#736B66]">What you owe in splits</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Your Balance</span>
          <span
            className={`stat-value ${
              myBalance > 0
                ? "text-[#2BB673]"
                : myBalance < 0
                  ? "text-[#B54E46]"
                  : ""
            }`}
          >
            {myBalance > 0
              ? `+${money(myBalance)}`
              : myBalance < 0
                ? `-${money(Math.abs(myBalance))}`
                : "$0.00"}
          </span>
          <span className="text-xs text-[#736B66]">
            {myBalance > 0
              ? "You are owed"
              : myBalance < 0
                ? "You owe others"
                : "All settled up"}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Solo Spend</span>
          <span className="stat-value">{money(soloTotal)}</span>
          <span className="text-xs text-[#736B66]">Your private items</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div className="segment-tabs flex-wrap" role="tablist">
          {["ALL", "FOOD", "TRANSPORT", "LODGING", "ACTIVITY", "OTHER"].map(
            (cat) => (
              <button
                key={cat}
                type="button"
                role="tab"
                className={`segment-tab ${categoryFilter === cat ? "active" : ""}`}
                aria-selected={categoryFilter === cat}
                onClick={() => setCategoryFilter(cat)}
              >
                {cat === "ALL" ? "All" : cat[0] + cat.slice(1).toLowerCase()}
              </button>
            ),
          )}
        </div>
        <button
          className="primary self-start sm:self-auto"
          onClick={() => setShowAddForm(true)}
        >
          + Add expense
        </button>
      </div>

      {showAddForm && (
        <Modal
          title="Add an expense"
          subtitle="Log a group or solo expense and specify splits."
          onClose={() => setShowAddForm(false)}
          ariaLabelledBy="add-expense-heading"
        >
          <form className="form" onSubmit={submitExpense}>
            <Alert message={expenseAction.error} />
            <Field label="Expense description">
              <input
                name="title"
                required
                maxLength={160}
                placeholder="Dinner at beachfront taverna"
                autoFocus
              />
            </Field>
            <div className="form-row">
              <Field label="Expense amount in USD">
                <input
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={inputAmount}
                  onChange={(e) => setInputAmount(e.target.value)}
                />
              </Field>
              <Field label="Category">
                <select name="category" defaultValue="FOOD">
                  <option value="FOOD">Food & Drink</option>
                  <option value="TRANSPORT">Transport</option>
                  <option value="LODGING">Lodging</option>
                  <option value="ACTIVITY">Activity</option>
                  <option value="OTHER">Other</option>
                </select>
              </Field>
            </div>
            <Field label="Paid by">
              <select name="paidByUserId" defaultValue={trip.currentUserId}>
                {members?.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user.name || "Traveler"}
                    {m.userId === trip.currentUserId ? " (You)" : ""}
                  </option>
                ))}
              </select>
            </Field>
            <label className="packd-checkbox-label py-1">
              <PackdCheckbox
                checked={isSolo}
                onChange={setIsSolo}
                ariaLabel="Solo expense (private to you, not shared with group)"
              />
              <span className="text-sm font-medium text-[#252525]">
                Solo expense (private to you, not shared with group)
              </span>
            </label>
            {!isSolo && (
              <div className="p-3 bg-[#FAF9F6] rounded-xl border border-[#EAE7E2]">
                <p className="font-semibold text-sm mb-2 text-[#252525]">
                  Split between:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {members?.map((m) => {
                    const isChecked = selectedSplits[m.userId] ?? true;
                    return (
                      <label
                        key={m.userId}
                        className={`packd-checkbox-card ${isChecked ? "selected" : ""}`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-[#FAF9F6] border border-[#EAE7E2] flex items-center justify-center text-xs font-bold text-[#B54E46] shrink-0">
                            {(m.user.name || "T")[0].toUpperCase()}
                          </div>
                          <span className="text-sm font-medium truncate text-[#252525]">
                            {m.user.name || "Traveler"}
                            {m.userId === trip.currentUserId ? " (You)" : ""}
                          </span>
                        </div>
                        <PackdCheckbox
                          checked={isChecked}
                          onChange={(c) =>
                            setSelectedSplits((prev) => ({
                              ...prev,
                              [m.userId]: c,
                            }))
                          }
                          ariaLabel={
                            m.user.name
                              ? `${m.user.name}${m.userId === trip.currentUserId ? " (You)" : ""}`
                              : "Traveler"
                          }
                        />
                      </label>
                    );
                  })}
                </div>
                {splitCount > 0 && Number(inputAmount) > 0 && (
                  <p className="text-xs text-[#736B66] mt-3 pt-2 border-t border-[#EAE7E2]">
                    Estimated: ${inputAmount} ÷ {splitCount}{" "}
                    {splitCount === 1 ? "person" : "people"} ={" "}
                    {money(
                      Math.round((Number(inputAmount) * 100) / splitCount),
                    )}{" "}
                    / person
                  </p>
                )}
              </div>
            )}
            <Field label="Notes (optional)">
              <input
                name="notes"
                maxLength={500}
                placeholder="Receipt details or notes"
              />
            </Field>
            <div className="flex gap-2 mt-2">
              <button
                className="primary"
                disabled={
                  expenseAction.pending || (!isSolo && splitCount === 0)
                }
              >
                {expenseAction.pending ? "Saving..." : "Save expense"}
              </button>
              <button type="button" onClick={() => setShowAddForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      <div className="panel">
        <h3 className="mb-4">Tracked Expenses ({filteredExpenses.length})</h3>
        {filteredExpenses.length === 0 ? (
          <p className="empty">No expenses recorded in this category.</p>
        ) : (
          <div>
            {filteredExpenses.map((item) => {
              const mySplit = item.splits.find(
                (s) => s.userId === trip.currentUserId,
              );
              const badgeClass =
                item.category === "FOOD"
                  ? "badge-food"
                  : item.category === "TRANSPORT"
                    ? "badge-transport"
                    : item.category === "LODGING"
                      ? "badge-lodging"
                      : item.category === "ACTIVITY"
                        ? "badge-activity"
                        : "badge-other";

              return (
                <div className="expense-row" key={item.id}>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`badge ${badgeClass}`}>
                        {item.category.toLowerCase()}
                      </span>
                      {item.isSolo && (
                        <span className="badge badge-solo">Solo</span>
                      )}
                      <h4 className="font-semibold text-base text-[#252525]">
                        {item.title}
                      </h4>
                    </div>
                    <p className="text-xs text-[#736B66]">
                      Paid by {item.paidBy.name || "Traveler"} ·{" "}
                      {item.isSolo
                        ? "Private solo expense"
                        : `Split between ${item.splits.length} ${
                            item.splits.length === 1 ? "person" : "people"
                          }`}
                      {item.notes ? ` · ${item.notes}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-base text-[#252525]">
                        {money(item.amountMinor)}
                      </p>
                      {!item.isSolo && mySplit && (
                        <p className="text-xs text-[#736B66]">
                          Your share: {money(mySplit.shareMinor)}
                        </p>
                      )}
                    </div>
                    {(trip.isOrganizer ||
                      item.paidByUserId === trip.currentUserId) && (
                      <button
                        className="quiet"
                        disabled={expenseAction.pending}
                        aria-label={`Delete ${item.title}`}
                        onClick={() => {
                          if (confirm(`Delete expense “${item.title}”?`))
                            expenseAction.run(() =>
                              api(
                                `trips/${trip.id}/expenses/${item.id}`,
                                "DELETE",
                                {},
                              ),
                            );
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="panel mt-8">
        <h3>Who Owes Who</h3>
        <p className="muted mb-4">
          Suggested transfers based on the shared expenses visible to you. Other
          members may see different summaries for their expenses.
        </p>
        {!settlement ? (
          <p className="empty">
            {loadError
              ? "Settlement unavailable. Retry loading expenses."
              : "Loading settlement…"}
          </p>
        ) : settlement.settlements.length === 0 ? (
          <p className="empty">No debts in the expenses visible to you.</p>
        ) : (
          <div className="stack">
            {settlement.settlements.map((s, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-[#FAF9F6] rounded-xl border border-[#EAE7E2]"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#252525]">{s.fromName}</span>
                  <span className="text-xs text-[#736B66]">owes</span>
                  <span className="font-bold text-[#252525]">{s.toName}</span>
                </div>
                <span className="text-base font-bold text-[#B54E46]">
                  {money(s.amountMinor)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function Checklist({ trip }: { trip: Trip }) {
  const [tab, setTab] = useState<"my" | "group">("my");
  const base = `trips/${trip.id}/checklist`;
  const [editing, setEditing] = useState<Item | null>(null);
  const [items, setItems] = useState<Item[] | null>(null),
    [error, setError] = useState("");

  const [sharedItems, setSharedItems] = useState<SharedItem[] | null>(null),
    [sharedError, setSharedError] = useState("");

  const load = useCallback(() => {
    return api<Item[]>(base)
      .then((data) => {
        setItems(data);
        setError("");
      })
      .catch((e) => setError(e.message));
  }, [base]);

  const loadShared = useCallback(() => {
    return api<SharedItem[]>(`${base}/shared`)
      .then((data) => {
        setSharedItems(data);
        setSharedError("");
      })
      .catch((e) => setSharedError(e.message));
  }, [base]);

  useEffect(() => {
    load();
    loadShared();
  }, [load, loadShared]);

  const action = useAction(load);
  const sharedAction = useAction(loadShared);

  function addShared(e: FormEvent<HTMLFormElement>) {
    const form = e.currentTarget,
      data = values(e);
    sharedAction.run(
      () =>
        api(`${base}/shared`, "POST", {
          title: data.get("title"),
        }),
      () => form.reset(),
    );
  }

  return (
    <section className="panel">
      <div className="segment-tabs mb-6" role="tablist">
        <button
          type="button"
          role="tab"
          className={`segment-tab ${tab === "my" ? "active" : ""}`}
          aria-selected={tab === "my"}
          onClick={() => setTab("my")}
        >
          My Packing List
        </button>
        <button
          type="button"
          role="tab"
          className={`segment-tab ${tab === "group" ? "active" : ""}`}
          aria-selected={tab === "group"}
          onClick={() => setTab("group")}
        >
          Shared Group Items
        </button>
      </div>

      {tab === "my" && (
        <>
          <h2>A little preparation goes a long way.</h2>
          <p className="muted">
            Your checklist is private—even from the organizer.
          </p>
          <Alert message={error || action.error} />
          {error && <button onClick={load}>Retry</button>}
          <form
            key={editing?.id ?? "new"}
            className="form"
            onSubmit={(e) => {
              const form = e.currentTarget,
                data = values(e);
              action.run(
                () =>
                  api(
                    editing ? `${base}/${editing.id}` : base,
                    editing ? "PATCH" : "POST",
                    { title: data.get("title") },
                  ),
                () => {
                  setEditing(null);
                  form.reset();
                },
              );
            }}
          >
            <Field label="Something to remember">
              <input
                name="title"
                required
                maxLength={160}
                placeholder="Pack passport"
                defaultValue={editing?.title}
              />
            </Field>
            <button className="primary" disabled={action.pending}>
              {editing ? "Save item" : "Add item"}
            </button>
            {editing && (
              <button type="button" onClick={() => setEditing(null)}>
                Cancel edit
              </button>
            )}
          </form>
          {!items && !error && <p role="status">Loading checklist…</p>}
          {items?.length === 0 && (
            <p className="empty">Nothing on your list yet.</p>
          )}
          <ul className="checklist">
            {items?.map((item) => (
              <li key={item.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={item.isChecked}
                    disabled={action.pending}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setItems(
                        (previous) =>
                          previous?.map((row) =>
                            row.id === item.id
                              ? { ...row, isChecked: checked }
                              : row,
                          ) ?? null,
                      );
                      action.run(async () => {
                        try {
                          await api(`${base}/${item.id}`, "PATCH", {
                            isChecked: checked,
                          });
                        } catch (error) {
                          setItems(
                            (previous) =>
                              previous?.map((row) =>
                                row.id === item.id
                                  ? { ...row, isChecked: item.isChecked }
                                  : row,
                              ) ?? null,
                          );
                          throw error;
                        }
                      });
                    }}
                  />
                  <span className={item.isChecked ? "completed" : ""}>
                    {item.title}
                  </span>
                </label>
                <button
                  className="quiet"
                  aria-label={`Edit ${item.title}`}
                  onClick={() => setEditing(item)}
                >
                  Edit
                </button>
                <button
                  className="quiet"
                  disabled={action.pending}
                  aria-label={`Delete ${item.title}`}
                  onClick={() => {
                    if (confirm(`Delete “${item.title}”?`))
                      action.run(() => api(`${base}/${item.id}`, "DELETE", {}));
                  }}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {tab === "group" && (
        <>
          <h2>Shared group packing list</h2>
          <p className="muted">
            Gear and supplies for the whole group. Anyone can add or claim
            items.
          </p>
          <Alert message={sharedError || sharedAction.error} />
          {sharedError && <button onClick={loadShared}>Retry</button>}
          <form className="form" onSubmit={addShared}>
            <Field label="Add shared item">
              <input
                name="title"
                required
                maxLength={160}
                placeholder="Beach towels, Sunscreen, Bluetooth speaker..."
              />
            </Field>
            <button className="primary" disabled={sharedAction.pending}>
              Add to group list
            </button>
          </form>
          {!sharedItems && !sharedError && (
            <p role="status">Loading shared items…</p>
          )}
          {sharedItems?.length === 0 && (
            <p className="empty">
              No shared items yet. Add something for everyone!
            </p>
          )}
          <ul className="checklist">
            {sharedItems?.map((item) => (
              <li key={item.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={item.isChecked}
                    disabled={sharedAction.pending}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setSharedItems(
                        (previous) =>
                          previous?.map((row) =>
                            row.id === item.id
                              ? { ...row, isChecked: checked }
                              : row,
                          ) ?? null,
                      );
                      sharedAction.run(async () => {
                        try {
                          await api(`${base}/shared/${item.id}`, "PATCH", {
                            isChecked: checked,
                          });
                        } catch (err) {
                          setSharedItems(
                            (previous) =>
                              previous?.map((row) =>
                                row.id === item.id
                                  ? { ...row, isChecked: item.isChecked }
                                  : row,
                              ) ?? null,
                          );
                          throw err;
                        }
                      });
                    }}
                  />
                  <span className={item.isChecked ? "completed" : ""}>
                    {item.title}
                  </span>
                  {item.isChecked && item.checkedBy && (
                    <span className="badge badge-activity text-[10px] ml-2">
                      Packed by {item.checkedBy.name || "traveler"}
                    </span>
                  )}
                </label>
                <button
                  className="quiet"
                  disabled={sharedAction.pending}
                  aria-label={`Delete shared item ${item.title}`}
                  onClick={() => {
                    if (confirm(`Delete “${item.title}”?`))
                      sharedAction.run(() =>
                        api(`${base}/shared/${item.id}`, "DELETE", {}),
                      );
                  }}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
function Members({ trip }: { trip: Trip }) {
  const base = `trips/${trip.id}`;
  const [members, setMembers] = useState<Member[] | null>(
      () => membersCache.get(trip.id) ?? null,
    ),
    [invites, setInvites] = useState<Invite[]>([]),
    [link, setLink] = useState(""),
    [error, setError] = useState("");
  const load = useCallback(() => {
    api<Member[]>(`${base}/members`)
      .then((data) => {
        membersCache.set(trip.id, data);
        setMembers(data);
        setError("");
      })
      .catch((e) => setError(e.message));
    if (trip.isOrganizer)
      api<Invite[]>(`${base}/invitations`)
        .then(setInvites)
        .catch((e) => setError(e.message));
  }, [base, trip.isOrganizer, trip.id]);
  useEffect(() => {
    load();
  }, [load]);
  const action = useAction(load);
  return (
    <section className="panel">
      <h2>Your travel people</h2>
      <Alert message={error || action.error} />
      {error && <button onClick={load}>Retry</button>}
      {!members && !error && <p role="status">Loading members…</p>}
      <ul className="checklist">
        {members?.map((m) => (
          <li key={m.userId}>
            <span>{m.user.name || "Traveler"}</span>
            {trip.isOrganizer && m.userId !== trip.createdById && (
              <button
                className="quiet"
                disabled={action.pending}
                onClick={() => {
                  if (
                    confirm(
                      "Remove this member? Their votes will be removed and existing invitation links revoked.",
                    )
                  )
                    action.run(
                      () => api(`${base}/members/${m.userId}`, "DELETE", {}),
                      () => setLink(""),
                    );
                }}
              >
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>
      {trip.isOrganizer && (
        <div className="mt-8 pt-2">
          <h3 className="text-lg font-bold font-display text-[#252525]">
            Bring your friends
          </h3>
          <p className="muted text-sm mt-1 mb-4">
            Links work for seven days. Share with people you want on this trip.
          </p>
          <button
            className="primary"
            disabled={action.pending}
            onClick={() =>
              action.run(async () => {
                const invite = await api<{ token: string }>(
                  `${base}/invitations`,
                  "POST",
                  {},
                );
                setLink(`${window.location.origin}/invite#${invite.token}`);
              })
            }
          >
            Create invitation
          </button>
          {link && (
            <div className="mt-4">
              <Field label="Copy and share this invitation">
                <input
                  value={link}
                  readOnly
                  onFocus={(e) => e.target.select()}
                />
              </Field>
            </div>
          )}
          {invites.length > 0 && (
            <div className="mt-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#736B66] mb-2">
                Active Invitations
              </h4>
              <ul className="checklist">
                {invites.map((invite) => (
                  <li key={invite.id}>
                    <span>
                      {invite.revokedAt
                        ? "Revoked"
                        : `Expires ${new Date(invite.expiresAt).toLocaleDateString()}`}
                    </span>
                    {!invite.revokedAt && (
                      <button
                        className="quiet"
                        disabled={action.pending}
                        onClick={() =>
                          action.run(
                            () =>
                              api(
                                `${base}/invitations/${invite.id}`,
                                "DELETE",
                                {},
                              ),
                            () => setLink(""),
                          )
                        }
                      >
                        Revoke
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
function Itinerary({ trip }: { trip: Trip }) {
  const base = `trips/${trip.id}/itinerary`;
  const [entries, setEntries] = useState<Entry[] | null>(null),
    [error, setError] = useState(""),
    [editing, setEditing] = useState<Entry | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState("");
  const [titleInput, setTitleInput] = useState("");
  const [locationInput, setLocationInput] = useState("");

  const load = useCallback(() => {
    return Promise.allSettled([
      api<Entry[]>(base),
      api<Activity[]>(`trips/${trip.id}/activities`),
    ]).then(([itRes, actRes]) => {
      if (itRes.status === "fulfilled") {
        setEntries(itRes.value);
        setError("");
      } else {
        setError(itRes.reason?.message ?? "Unable to load itinerary.");
      }
      if (actRes.status === "fulfilled") {
        setActivities(actRes.value);
      }
    });
  }, [base, trip.id]);

  useEffect(() => {
    load();
  }, [load]);

  const action = useAction(load);

  const formatted = (time: string) =>
    new Intl.DateTimeFormat("en-US", {
      timeZone: trip.timezone,
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(time));

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = values(e);
    // Convert the selected trip-local times, rejecting ambiguous daylight-saving times.
    action.run(
      () =>
        api(
          editing ? `${base}/${editing.id}` : base,
          editing ? "PATCH" : "POST",
          {
            title: titleInput || data.get("title"),
            startTime: toInstant(String(data.get("startTime")), trip.timezone),
            endTime: toInstant(String(data.get("endTime")), trip.timezone),
            location: locationInput || data.get("location") || "",
            activityId: selectedActivityId || null,
            ...(editing ? { version: editing.version } : {}),
          },
        ),
      () => {
        setEditing(null);
        setShowAddModal(false);
      },
    );
  }

  function openAddModal() {
    setEditing(null);
    setSelectedActivityId("");
    setTitleInput("");
    setLocationInput("");
    setShowAddModal(true);
  }

  function openEditModal(entry: Entry) {
    setEditing(entry);
    setSelectedActivityId(entry.activityId || "");
    setTitleInput(entry.title);
    setLocationInput(entry.location || "");
    setShowAddModal(true);
  }

  return (
    <>
      <div className="section-heading">
        <h2>The shared plan</h2>
        <p className="muted">
          Times shown in {trip.timezone}. Overlapping plans are allowed.
        </p>
      </div>

      <Alert message={error || action.error} />
      <button className="quiet mb-4" onClick={load}>
        Refresh schedule
      </button>

      <div className="workspace-layout">
        <div className="workspace-main">
          {!entries && !error && <p role="status">Loading itinerary…</p>}
          {entries?.length === 0 && (
            <p className="empty">No plans scheduled yet.</p>
          )}
          <div className="stack">
            {entries?.map((entry) => {
              const matchedActivity = activities.find(
                (a) => a.id === entry.activityId,
              );
              return (
                <article className="panel" key={entry.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold font-display text-[#252525]">
                        {entry.title}
                      </h3>
                      {matchedActivity && (
                        <span className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FBEAE8] text-[#B54E46]">
                          Linked Activity: {matchedActivity.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-[#736B66] mt-2 flex items-center gap-1.5">
                    <ClockIcon width={14} height={14} />
                    <span>
                      {formatted(entry.startTime)} – {formatted(entry.endTime)}
                    </span>
                  </p>
                  {entry.location && (
                    <p className="muted text-sm mt-1 flex items-center gap-1">
                      <MapPinIcon width={14} height={14} />
                      <span>{entry.location}</span>
                    </p>
                  )}
                  {trip.isOrganizer && (
                    <div className="actions mt-4 pt-3 border-t border-[#EAE7E2]">
                      <button onClick={() => openEditModal(entry)}>Edit</button>
                      <button
                        disabled={action.pending}
                        onClick={() => {
                          if (confirm(`Delete “${entry.title}”?`))
                            action.run(() =>
                              api(`${base}/${entry.id}`, "DELETE", {
                                version: entry.version,
                              }),
                            );
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>

        {trip.isOrganizer && (
          <aside className="workspace-sidebar">
            <div className="sidebar-card">
              <h3 className="font-bold text-base text-[#252525] mb-1">
                Trip Schedule
              </h3>
              <p className="muted text-xs mb-4">
                Build your schedule or choose from proposed activities your crew
                voted on.
              </p>
              <div className="sidebar-actions">
                <button
                  type="button"
                  className="sidebar-btn primary"
                  onClick={openAddModal}
                >
                  <PlusIcon width={16} height={16} />
                  <span>Add to Itinerary</span>
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>

      {showAddModal && trip.isOrganizer && (
        <Modal
          title={editing ? "Edit plan" : "Add to Itinerary"}
          subtitle={
            editing
              ? "Update this schedule entry."
              : "Choose an activity from your trip proposals or enter a custom plan."
          }
          onClose={() => {
            setShowAddModal(false);
            setEditing(null);
          }}
        >
          <form key={editing?.id ?? "new"} className="form" onSubmit={submit}>
            {activities.length > 0 && (
              <Field label="Choose from activities (optional)">
                <select
                  value={selectedActivityId}
                  onChange={(e) => {
                    const actId = e.target.value;
                    setSelectedActivityId(actId);
                    const act = activities.find((a) => a.id === actId);
                    if (act) {
                      setTitleInput(act.name);
                      if (act.location) setLocationInput(act.location);
                    }
                  }}
                >
                  <option value="">
                    -- Custom plan (or choose an activity) --
                  </option>
                  {activities.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                      {a.location ? ` · ${a.location}` : ""}
                      {a.estimatedCostMinor != null
                        ? ` · ${money(a.estimatedCostMinor)}`
                        : ""}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <Field label="Title">
              <input
                name="title"
                required
                maxLength={160}
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                placeholder="e.g. Sunset kayaking or Dinner"
              />
            </Field>

            <p className="muted text-xs">
              Enter local times in {trip.timezone}.
            </p>

            <div className="form-row">
              <Field label="Start time">
                <input
                  type="datetime-local"
                  name="startTime"
                  required
                  defaultValue={
                    editing
                      ? toLocal(editing.startTime, trip.timezone)
                      : `${trip.startDate.slice(0, 10)}T10:00`
                  }
                />
              </Field>
              <Field label="End time">
                <input
                  type="datetime-local"
                  name="endTime"
                  required
                  defaultValue={
                    editing
                      ? toLocal(editing.endTime, trip.timezone)
                      : `${trip.startDate.slice(0, 10)}T12:00`
                  }
                />
              </Field>
            </div>

            <Field label="Location (optional)">
              <input
                name="location"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                placeholder="e.g. Condado Beach"
              />
            </Field>

            <div className="flex gap-2 mt-2">
              <button className="primary" disabled={action.pending}>
                {editing ? "Save entry" : "Add entry"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setEditing(null);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
function subscribeInvite(callback: () => void) {
  window.addEventListener("packd-invite", callback);
  return () => window.removeEventListener("packd-invite", callback);
}
function readInvite() {
  if (typeof window === "undefined") return "";
  return (
    window.location.hash.slice(1) ||
    sessionStorage.getItem("packdInvite") ||
    localStorage.getItem("packdInvite") ||
    ""
  );
}
export function AcceptInvitation({
  user,
}: {
  user?: { id?: string; name?: string | null; email?: string | null };
}) {
  const router = useRouter();
  const token = useSyncExternalStore(subscribeInvite, readInvite, () => "");
  const [error, setError] = useState(""),
    [pending, setPending] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      sessionStorage.setItem("packdInvite", hash);
      localStorage.setItem("packdInvite", hash);
    }
    window.dispatchEvent(new Event("packd-invite"));
  }, []);

  const joinTrip = async () => {
    if (!token) return;
    setPending(true);
    setError("");
    try {
      const result = await api<{ tripId: string }>(
        "invitations/accept",
        "POST",
        { token },
      );
      sessionStorage.removeItem("packdInvite");
      localStorage.removeItem("packdInvite");
      router.push(`/trips/${result.tripId}/activities`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  };

  if (!user) {
    return (
      <main className="workspace">
        <Link className="wordmark" href="/">
          Packd
        </Link>
        <section className="panel form">
          <h1>You’re invited.</h1>
          <p>
            Sign in with your Google account to view and accept this trip
            invitation.
          </p>
          <Alert message={error} />
          <button
            className="primary"
            onClick={() => signIn("google", { callbackUrl: "/invite" })}
          >
            Sign in with Google
          </button>
          {!token && (
            <p className="muted text-sm mt-2">
              Open the invitation link shared by your organizer.
            </p>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="workspace">
      <Link className="wordmark" href="/">
        Packd
      </Link>
      <section className="panel form">
        <h1>Ready to join?</h1>
        <p>
          You’re signed in as <strong>{user.name || user.email}</strong>. Accept
          the invitation to join your friends on this trip.
        </p>
        <Alert message={error} />
        <button
          className="primary"
          disabled={!token || pending}
          onClick={joinTrip}
        >
          {pending ? "Joining trip..." : "Join trip"}
        </button>
        <button
          className="quiet mt-2"
          onClick={() => signOut({ callbackUrl: "/invite" })}
        >
          Switch account
        </button>
        {!token && (
          <p className="muted text-sm mt-2">
            No invitation token found. Open the invitation link shared by your
            organizer.
          </p>
        )}
      </section>
    </main>
  );
}
