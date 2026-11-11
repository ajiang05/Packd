import { test, expect, type BrowserContext } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomBytes } from "node:crypto";
import { db } from "../../lib/server/db";

const origin = process.env.PACKD_E2E_BASE_URL ?? "http://localhost:3001";
const ids: string[] = [];
async function login(context: BrowserContext, name: string) {
  const user = await db.user.create({ data: { name } });
  ids.push(user.id);
  const token = randomBytes(32).toString("hex");
  await db.session.create({
    data: {
      sessionToken: token,
      userId: user.id,
      expires: new Date(Date.now() + 3600000),
    },
  });
  await context.addCookies([
    {
      name: "authjs.session-token",
      value: token,
      domain: new URL(origin).hostname,
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  return { ...user, testSessionToken: token };
}
test.afterAll(async () => {
  await db.trip.deleteMany({ where: { createdById: { in: ids } } });
  await db.user.deleteMany({ where: { id: { in: ids } } });
  await db.$disconnect();
});
test("two people create, join, vote, schedule, budget, and prepare privately", async ({
  page,
  context,
  browser,
}) => {
  await login(context, "Organizer Test");
  await page.goto("/trips");
  await page.getByRole("link", { name: "New Trip", exact: true }).click();
  await page.getByLabel("Trip name", { exact: true }).fill("Winter escape");
  await page.getByLabel("Destination", { exact: true }).fill("San Juan");
  await page.getByLabel("Start date", { exact: true }).fill("2026-12-20");
  await page.getByLabel("End date", { exact: true }).fill("2026-12-25");
  await page
    .getByLabel("Trip timezone", { exact: true })
    .fill("America/Puerto_Rico");
  await page.getByRole("button", { name: "Create Trip", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Winter escape", exact: true }),
  ).toBeVisible();
  const tripId = page.url().split("/")[4];
  await page.getByRole("link", { name: "Members", exact: true }).click();
  await page
    .getByRole("button", { name: "Create invitation", exact: true })
    .click();
  const linkField = page.getByLabel("Copy and share this invitation");
  await expect(linkField).toBeVisible();
  const link = await linkField.inputValue();

  const memberContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const member = await login(memberContext, "Member Test");
  const memberPage = await memberContext.newPage();
  await memberPage.goto(link);
  await memberPage
    .getByRole("button", { name: "Join trip", exact: true })
    .click();
  await expect(
    memberPage.getByRole("heading", { name: "Winter escape", exact: true }),
  ).toBeVisible();
  await memberPage
    .getByRole("button", { name: "Suggest an activity", exact: true })
    .click();
  await memberPage
    .getByLabel("Activity", { exact: true })
    .fill("Sunset kayaking");
  await memberPage
    .getByRole("button", { name: "Propose activity", exact: true })
    .click();
  await expect(
    memberPage.getByRole("heading", { name: "Sunset kayaking", exact: true }),
  ).toBeVisible();
  await memberPage
    .getByRole("button", { name: "Yes, I’m in", exact: true })
    .click();
  await expect(
    memberPage.getByText("1 yes · 0 no · 1 waiting to vote"),
  ).toBeVisible();
  await memberPage.reload();
  await expect(
    memberPage.getByRole("button", { name: "Yes, I’m in" }),
  ).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("link", { name: "Activities", exact: true }).click();
  await page.getByRole("button", { name: "Yes, I’m in", exact: true }).click();
  await expect(
    page.getByText("2 yes · 0 no · 0 waiting to vote"),
  ).toBeVisible();
  await page.getByRole("link", { name: "Budget", exact: true }).click();
  await page.getByLabel("Amount (USD)").fill("1250.75");
  await page.getByRole("button", { name: "Save budget", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "$1,250.75", exact: true }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Itinerary", exact: true }).click();
  await page
    .getByRole("button", { name: "Add to Itinerary", exact: true })
    .click();
  await page.getByLabel("Title", { exact: true }).fill("Meet at the beach");
  await page.getByLabel("Start time", { exact: true }).fill("2026-12-21T09:00");
  await page.getByLabel("End time", { exact: true }).fill("2026-12-21T10:00");
  await page.getByRole("button", { name: "Add entry", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Meet at the beach", exact: true }),
  ).toBeVisible();

  await memberPage
    .getByRole("link", { name: "Checklist", exact: true })
    .click();
  await memberPage.getByLabel("Something to remember").fill("Passport");
  await memberPage
    .getByRole("button", { name: "Add item", exact: true })
    .click();
  await memberPage
    .getByRole("checkbox", { name: "Passport", exact: true })
    .check();
  await expect(
    memberPage.getByRole("checkbox", { name: "Passport", exact: true }),
  ).toBeChecked();
  await expect(
    memberPage.getByRole("button", { name: "Add item", exact: true }),
  ).toBeEnabled();
  await memberPage.reload();
  await expect(
    memberPage.getByRole("checkbox", { name: "Passport", exact: true }),
  ).toBeChecked();
  await memberPage.route(`**/api/trips/${tripId}/checklist/*`, (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({
        error: { message: "Test save failed. Please retry." },
      }),
    }),
  );
  await memberPage
    .getByRole("checkbox", { name: "Passport", exact: true })
    .click();
  await expect(
    memberPage.getByRole("alert").filter({ hasText: "Test save failed" }),
  ).toContainText("Test save failed");
  await expect(
    memberPage.getByRole("checkbox", { name: "Passport", exact: true }),
  ).toBeChecked();
  await memberPage.unroute(`**/api/trips/${tripId}/checklist/*`);
  await memberPage
    .getByRole("button", { name: "Edit Passport", exact: true })
    .click();
  await memberPage
    .getByLabel("Something to remember")
    .fill("Passport and visa");
  await memberPage
    .getByRole("button", { name: "Save item", exact: true })
    .click();
  await expect(
    memberPage.getByRole("checkbox", {
      name: "Passport and visa",
      exact: true,
    }),
  ).toBeChecked();
  const accessibility = await new AxeBuilder({ page: memberPage })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
  await memberPage.setViewportSize({ width: 320, height: 700 });
  expect(
    await memberPage.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await memberPage.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("link", { name: "Checklist", exact: true }).click();
  await expect(page.getByText("Nothing on your list yet.")).toBeVisible();

  const privateItem = await db.checklistItem.findFirstOrThrow({
    where: { userId: member.id },
  });
  const denied = await page.request.patch(
    `/api/trips/${tripId}/checklist/${privateItem.id}`,
    {
      headers: { Origin: origin },
      data: { isChecked: false },
    },
  );
  expect(denied.status()).toBe(404);
  const forgedOrigin = await page.request.patch(`/api/trips/${tripId}/budget`, {
    headers: { Origin: "https://attacker.example" },
    data: { budgetMinor: 1, currency: "USD", budgetType: "TOTAL" },
  });
  expect(forgedOrigin.status()).toBe(403);
  expect(
    await memberPage.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await memberPage.screenshot({
    path: "test-results/mobile-checklist.png",
    fullPage: true,
  });

  await page.getByRole("link", { name: "Members", exact: true }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(page.getByText("Member Test", { exact: true })).toHaveCount(0);
  expect((await memberPage.request.get(`/api/trips/${tripId}`)).status()).toBe(
    404,
  );
  await memberContext.close();
});

test("unauthenticated APIs deny access and sign-out invalidates the session", async ({
  page,
  context,
}) => {
  expect((await page.request.get("/api/trips")).status()).toBe(401);
  expect(
    (
      await page.request.post("/api/auth/dev-login", {
        headers: { Origin: origin },
      })
    ).status(),
  ).toBe(403);
  expect((await page.request.get("/api/auth/dev-login")).status()).toBe(405);
  const account = await login(context, "Signout Test");
  await page.goto("/trips");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(origin + "/");
  expect(
    await db.session.findUnique({
      where: { sessionToken: account.testSessionToken },
    }),
  ).toBeNull();
  const oldSession = await page.request.get("/api/trips", {
    headers: { Cookie: `authjs.session-token=${account.testSessionToken}` },
  });
  expect(oldSession.status()).toBe(401);
  expect((await page.request.get("/api/trips")).status()).toBe(401);
});

test("core screens have accessible structure and checklist works by keyboard", async ({
  page,
  context,
}) => {
  const user = await login(context, "Keyboard traveler");
  const trip = await db.trip.create({
    data: {
      name: "Keyboard trip",
      destination: "San Juan",
      timezone: "America/Puerto_Rico",
      startDate: new Date("2026-12-20"),
      endDate: new Date("2026-12-25"),
      createdById: user.id,
      members: { create: { userId: user.id, addedById: user.id } },
    },
  });
  await page.goto(`/trips/${trip.id}/checklist`);
  const title = page.getByLabel("Something to remember");
  await expect(title).toBeVisible();
  async function tabTo(target: import("@playwright/test").Locator) {
    for (let i = 0; i < 30; i++) {
      if (await target.evaluate((el) => el === document.activeElement)) return;
      await page.keyboard.press("Tab");
    }
    throw new Error("Control cannot be reached with Tab.");
  }
  await tabTo(title);
  expect(
    await title.evaluate((el) => getComputedStyle(el).outlineStyle),
  ).not.toBe("none");
  await page.keyboard.type("Keyboard passport");
  await tabTo(page.getByRole("button", { name: "Add item", exact: true }));
  await page.keyboard.press("Enter");
  const checkbox = page.getByRole("checkbox", {
    name: "Keyboard passport",
    exact: true,
  });
  await expect(checkbox).toBeVisible();
  await tabTo(checkbox);
  await page.keyboard.press("Space");
  await expect(checkbox).toBeChecked();
  await expect(
    page.getByRole("button", { name: "Add item", exact: true }),
  ).toBeEnabled();
  await page.reload();
  await expect(checkbox).toBeChecked();

  await page.setViewportSize({ width: 320, height: 740 });
  const screens = [
    ["activities", "What should we do?"],
    ["itinerary", "The shared plan"],
    ["budget", "Not set"],
    ["checklist", "A little preparation goes a long way."],
    ["members", "Your travel people"],
    ["progress", "Trip Readiness & Planning Progress"],
    ["settings", "Trip details"],
  ];
  for (const [section, heading] of screens) {
    await page.goto(`/trips/${trip.id}/${section}`);
    await expect(
      page.getByRole("heading", { name: heading, exact: true }),
    ).toBeVisible();
    const scan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(scan.violations, `Accessibility violations on ${section}`).toEqual(
      [],
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Horizontal overflow on ${section}`,
    ).toBe(true);
  }
  await page.goto("/trips");
  await expect(
    page.getByRole("heading", { name: "Keyboard trip", exact: true }),
  ).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});

test("AI ideas recover from errors and selected proposals persist", async ({
  page,
  context,
}) => {
  const user = await login(context, "AI planner traveler");
  const trip = await db.trip.create({
    data: {
      name: "AI planner trip",
      destination: "Boston",
      timezone: "America/New_York",
      startDate: new Date("2026-12-20"),
      endDate: new Date("2026-12-25"),
      createdById: user.id,
      members: { create: { userId: user.id, addedById: user.id } },
    },
  });
  const endpoint = `/api/trips/${trip.id}/suggestions`;
  expect(
    (
      await page.request.post(endpoint, {
        data: {},
        headers: { Origin: "https://untrusted.example" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await page.request.post("/api/trips/nonmember-trip/suggestions", {
        data: {},
        headers: { Origin: origin },
      })
    ).status(),
  ).toBe(404);
  await page.goto(`/trips/${trip.id}/activities`);
  await page
    .getByRole("button", { name: "Find activity ideas with AI", exact: true })
    .click();
  const generate = page.getByRole("button", {
    name: "Find activity ideas",
    exact: true,
  });
  await generate.click();
  await expect(
    page
      .getByRole("region", { name: "Find activity ideas with AI" })
      .getByRole("alert"),
  ).toContainText("not configured");
  await expect(
    page.getByRole("button", { name: "Find activity ideas", exact: true }),
  ).toBeEnabled();
  let response = {
    status: 502,
    body: {
      error: { message: "Suggestions are unavailable right now." },
    } as unknown,
  };
  await page.route(`**${endpoint}`, (route) =>
    route.fulfill({ status: response.status, json: response.body }),
  );
  await generate.click();
  await expect(
    page
      .getByRole("region", { name: "Find activity ideas with AI" })
      .getByRole("alert"),
  ).toContainText("unavailable");
  response = { status: 200, body: { suggestions: [] } };
  await generate.click();
  await expect(
    page.getByText("No matching suggestions found.", { exact: false }),
  ).toBeVisible();
  response = {
    status: 200,
    body: {
      suggestions: [
        {
          name: "Science museum",
          description: "Explore science exhibits",
          location: "Boston",
          estimatedCostMinor: 2500,
          durationMinutes: 90,
          sourceUrl: "https://example.org/museum",
          sourceTitle: "Museum source",
        },
      ],
    },
  };
  await page.getByLabel("What would your group enjoy?").fill("Museums");
  await page.getByLabel("Maximum estimated cost", { exact: false }).fill("30");
  const request = page.waitForRequest((r) => r.url().endsWith(endpoint));
  await generate.click();
  expect((await request).postDataJSON()).toEqual({
    preferences: "Museums",
    maxCostMinor: 3000,
  });
  await expect(
    page.getByRole("link", { name: "Source: Museum source" }),
  ).toHaveAttribute("href", "https://example.org/museum");
  expect(await db.activity.count({ where: { tripId: trip.id } })).toBe(0);
  await page.setViewportSize({ width: 320, height: 740 });
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const save = page.getByRole("button", {
    name: "Add Science museum to proposals",
    exact: true,
  });
  await page.route(`**/api/trips/${trip.id}/activities`, (route) =>
    route.request().method() === "POST"
      ? route.fulfill({
          status: 500,
          json: { error: { message: "Save failed; try again." } },
        })
      : route.continue(),
  );
  await save.click();
  await expect(
    page
      .getByRole("region", { name: "Find activity ideas with AI" })
      .getByRole("alert"),
  ).toContainText("Save failed");
  await expect(save).toBeEnabled();
  await page.unroute(`**/api/trips/${trip.id}/activities`);
  await save.click();
  await expect(
    page.getByRole("button", { name: "Added to proposals", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("heading", { name: "Science museum", level: 3 }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Science museum", exact: true }),
  ).toBeVisible();
  const activity = await db.activity.findFirstOrThrow({
    where: { tripId: trip.id },
  });
  expect(activity.description).toContain("https://example.org/museum");
  expect(activity.estimatedCostMinor).toBe(2500);
  expect(await db.vote.count({ where: { activityId: activity.id } })).toBe(0);
  expect(await db.scheduleItem.count({ where: { tripId: trip.id } })).toBe(0);
});

test("expenses, splits, debt settlement, and shared group checklist work end-to-end", async ({
  page,
  context,
  browser,
}) => {
  const organizer = await login(context, "Organizer Budgeteer");
  const trip = await db.trip.create({
    data: {
      name: "Financial Adventure",
      destination: "Barcelona",
      timezone: "Europe/Madrid",
      startDate: new Date("2026-07-01"),
      endDate: new Date("2026-07-10"),
      createdById: organizer.id,
      members: { create: { userId: organizer.id, addedById: organizer.id } },
    },
  });

  const memberContext = await browser.newContext();
  const member = await login(memberContext, "Member Sharer");
  await db.tripMember.create({
    data: { tripId: trip.id, userId: member.id, addedById: organizer.id },
  });
  const memberPage = await memberContext.newPage();

  // 1. Organizer navigates to Budget and adds a group expense
  await page.goto(`/trips/${trip.id}/budget`);
  await page
    .getByRole("button", { name: "+ Add expense", exact: true })
    .click();
  await page.getByLabel("Expense description").fill("Beach Paella Dinner");
  await page.getByLabel("Expense amount in USD").fill("100.00");
  await page.getByRole("button", { name: "Save expense", exact: true }).click();

  // Verify expense appears in tracked list
  await expect(page.getByText("Beach Paella Dinner")).toBeVisible();
  await expect(page.getByText("$100.00").first()).toBeVisible();

  // Verify member sees their share and the settlement
  await memberPage.goto(`/trips/${trip.id}/budget`);
  await expect(memberPage.getByText("Beach Paella Dinner")).toBeVisible();
  await expect(memberPage.getByText("owes", { exact: true })).toBeVisible();
  await expect(memberPage.getByText("$50.00").first()).toBeVisible();

  // 2. Member switches to Shared Checklist tab
  await memberPage.goto(`/trips/${trip.id}/checklist`);
  await memberPage.getByRole("tab", { name: "Shared Group Items" }).click();
  await memberPage.getByLabel("Add shared item").fill("Beach towels");
  await memberPage.getByRole("button", { name: "Add to group list" }).click();
  await expect(
    memberPage.getByRole("checkbox", { name: "Beach towels" }),
  ).toBeVisible();

  // Member checks the shared item
  await memberPage.getByRole("checkbox", { name: "Beach towels" }).check();
  await expect(
    memberPage.getByRole("checkbox", { name: "Beach towels" }),
  ).toBeChecked();

  // Organizer sees the shared item checked
  await page.goto(`/trips/${trip.id}/checklist`);
  await page.getByRole("tab", { name: "Shared Group Items" }).click();
  await expect(
    page.getByRole("checkbox", { name: "Beach towels" }),
  ).toBeChecked();

  // 3. Test budget split check marks and custom checkbox card selection
  await page.goto(`/trips/${trip.id}/budget`);
  await page
    .getByRole("button", { name: "+ Add expense", exact: true })
    .click();
  const soloCheckbox = page.getByRole("checkbox", {
    name: "Solo expense (private to you, not shared with group)",
  });
  await expect(soloCheckbox).toBeVisible();
  await soloCheckbox.check();
  await expect(soloCheckbox).toBeChecked();
  await soloCheckbox.uncheck();
  await expect(soloCheckbox).not.toBeChecked();

  const organizerSplit = page.getByRole("checkbox", {
    name: "Organizer Budgeteer (You)",
  });
  const memberSplit = page.getByRole("checkbox", {
    name: "Member Sharer",
  });
  await expect(organizerSplit).toBeChecked();
  await expect(memberSplit).toBeChecked();
  await memberSplit.uncheck();
  await expect(memberSplit).not.toBeChecked();

  // 4. Test Itinerary modal with activity selection dropdown
  await page.goto(`/trips/${trip.id}/activities`);
  await page
    .getByRole("button", { name: "Suggest an activity", exact: true })
    .click();
  await page
    .getByLabel("Activity", { exact: true })
    .fill("Gothic Quarter Tour");
  await page.getByLabel("Location (optional)").fill("Barcelona Cathedral");
  await page
    .getByRole("button", { name: "Propose activity", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Gothic Quarter Tour" }),
  ).toBeVisible();

  await page.goto(`/trips/${trip.id}/itinerary`);
  await page
    .getByRole("button", { name: "Add to Itinerary", exact: true })
    .click();
  await page
    .getByLabel("Choose from activities (optional)")
    .selectOption({ label: "Gothic Quarter Tour · Barcelona Cathedral" });
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue(
    "Gothic Quarter Tour",
  );
  await expect(page.getByLabel("Location (optional)")).toHaveValue(
    "Barcelona Cathedral",
  );
  await page.getByLabel("Start time", { exact: true }).fill("2026-07-02T10:00");
  await page.getByLabel("End time", { exact: true }).fill("2026-07-02T12:00");
  await page.getByRole("button", { name: "Add entry", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Gothic Quarter Tour", level: 3 }),
  ).toBeVisible();
  await expect(
    page.getByText("Linked Activity: Gothic Quarter Tour"),
  ).toBeVisible();

  await memberContext.close();
});

test("trip readiness planning tasks can be added, checked off, and persist", async ({
  page,
  context,
}) => {
  const user = await login(context, "Progress traveler");
  const created = await page.request.post("/api/trips", {
    headers: { Origin: origin },
    data: {
      name: "Progress trip",
      destination: "Rome",
      timezone: "Europe/Rome",
      startDate: "2026-07-01",
      endDate: "2026-07-10",
    },
  });
  expect(created.status()).toBe(201);
  const trip = await created.json();

  await page.goto(`/trips/${trip.id}/progress`);
  await expect(
    page.getByRole("heading", { name: "Trip Readiness & Planning Progress" }),
  ).toBeVisible();

  // Verify standard default tasks exist and have title, status, and description without links
  await expect(
    page.getByRole("heading", { name: "Packing & group supplies" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Manage your personal packing checklist and claim shared group supplies.",
    ),
  ).toBeVisible();

  // Click "+ Add task" in sidebar on right
  await page.getByRole("button", { name: "Add task", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Create a planning task" }),
  ).toBeVisible();

  await page.getByLabel("Task title").fill("Reserve Colosseum tickets");
  await page
    .getByLabel("Assign to (optional)")
    .selectOption({ label: "Progress traveler (You)" });
  await page
    .getByLabel("Description (optional)")
    .fill("Book skip-the-line tickets for morning slot");
  await page.getByRole("button", { name: "Create task", exact: true }).click();

  await expect(
    page.getByRole("heading", { name: "Reserve Colosseum tickets" }),
  ).toBeVisible();
  await expect(
    page.getByText("Book skip-the-line tickets for morning slot"),
  ).toBeVisible();
  await expect(page.getByText("Assigned: You")).toBeVisible();

  const toggleCheckbox = page.getByRole("checkbox", {
    name: "Mark “Reserve Colosseum tickets” as complete",
  });
  await expect(toggleCheckbox).toBeVisible();
  const saved = page.waitForResponse(
    (response) =>
      response.request().method() === "PATCH" &&
      response.url().includes("/tasks/") &&
      response.ok(),
  );
  await toggleCheckbox.check();
  await saved;

  const completedCheckbox = page.getByRole("checkbox", {
    name: "Mark “Reserve Colosseum tickets” as incomplete",
  });
  await expect(completedCheckbox).toBeVisible();

  // Reload and verify persistence in DB
  await page.reload();
  await expect(
    page.getByRole("checkbox", {
      name: "Mark “Reserve Colosseum tickets” as incomplete",
    }),
  ).toBeVisible();

  // Verify in database
  const taskInDb = await db.tripTask.findFirst({
    where: { tripId: trip.id, title: "Reserve Colosseum tickets" },
  });
  expect(taskInDb).not.toBeNull();
  expect(taskInDb?.isChecked).toBe(true);
  expect(taskInDb?.description).toBe(
    "Book skip-the-line tickets for morning slot",
  );
  expect(taskInDb?.assignedToUserId).toBe(user.id);
});

test("modal keyboard focus, itinerary unlinking, and revoked trip access", async ({
  page,
  context,
}) => {
  const user = await login(context, "Review organizer");
  const created = await page.request.post("/api/trips", {
    headers: { Origin: origin },
    data: {
      name: "Review browser trip",
      destination: "Boston",
      timezone: "America/New_York",
      startDate: "2026-12-20",
      endDate: "2026-12-25",
    },
  });
  expect(created.status()).toBe(201);
  const trip = await created.json();
  const activity = await db.activity.create({
    data: { tripId: trip.id, proposedById: user.id, name: "Museum visit" },
  });
  const entry = await db.scheduleItem.create({
    data: {
      tripId: trip.id,
      createdById: user.id,
      title: "Museum visit",
      startTime: new Date("2026-12-21T14:00:00Z"),
      endTime: new Date("2026-12-21T15:00:00Z"),
      activityId: activity.id,
    },
  });
  await page.goto(`/trips/${trip.id}/itinerary`);
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press("Tab");
    expect(
      await dialog.evaluate((el) => el.contains(document.activeElement)),
    ).toBe(true);
  }
  await page.getByLabel("Choose from activities (optional)").selectOption("");
  await page.getByRole("button", { name: "Save entry", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  expect(
    (await db.scheduleItem.findUniqueOrThrow({ where: { id: entry.id } }))
      .activityId,
  ).toBeNull();
  await page
    .getByRole("button", { name: "Add to Itinerary", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Add to Itinerary", exact: true }),
  ).toBeFocused();
  // Simulate access revocation between client-side navigations without reloading JS.
  await db.tripMember.delete({
    where: { tripId_userId: { tripId: trip.id, userId: user.id } },
  });
  await page.getByRole("link", { name: "Budget", exact: true }).click();
  await expect(
    page.getByText("This resource is unavailable.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Review browser trip", exact: true }),
  ).not.toBeVisible();
});
