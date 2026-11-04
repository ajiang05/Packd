# Packd — Architecture Specification

Status: Approved Architecture · Version: 2.0 · Owner: Aidan Jiang · Updated: 2026-11-01

## 1. Purpose and System Design

Packd is a collaborative group travel planning web application. A unified Next.js application serves both the responsive React frontend (App Router) and the REST API handlers, with PostgreSQL managed via Prisma as the persistent source of truth.

The architecture emphasizes distributed planning work across group members:
- Collaborative activity proposals and card voting with live avatar piles
- Planned activity promotions into the shared itinerary
- Multi-member expense tracking (Splitwise-style) with solo cost tracking and minimal debt settlement calculation
- Two-layer preparation checklists (collaborative group packing list + private personal preparation)
- AI-assisted activity ideation powered by LangChain, Anthropic Claude, and Tavily

```mermaid
flowchart LR
    U[Traveler Client (Mobile / Desktop Web)] -->|HTTPS| A[Next.js App Router]
    A --> R[REST API Handlers /api/...]
    R --> S[Domain Service Boundary (lib/server/domain.ts)]
    S --> P[Prisma ORM]
    P --> D[(PostgreSQL)]
    S --> L[LangChain Activity Planner]
    L --> C[Claude Structured Output]
    L --> T[Tavily Search API]
    A <-->|Auth.js Session Adapter| G[Google OAuth]
```

---

## 2. Components and Repository Layout

| Component | Responsibility | Location |
| --- | --- | --- |
| App Router Pages | Page layouts, server-side data loading, route parameters | `frontend/app/` |
| Shared UI Components | Navigation, cards, modals, avatar clusters, forms | `frontend/app/components/` |
| REST Route Handlers | Request validation, session checking, dispatching to domain | `frontend/app/api/` |
| Domain Feature Services | Authorization, transactions, business logic, settlement algorithm | `frontend/lib/server/domain.ts` |
| Database Client | Connection management and typed queries | `frontend/lib/server/db.ts` |
| Schema & Migrations | Prisma schema, enum definitions, and versioned SQL migrations | `frontend/prisma/` |
| Automated Tests | Unit tests, PostgreSQL integration tests, Playwright browser journeys | `frontend/tests/` |

---

## 3. Data Model & Schema

```prisma
enum ExpenseCategory {
  FOOD
  TRANSPORT
  LODGING
  ACTIVITY
  OTHER
}

enum ActivityStatus {
  PENDING
  APPROVED
  NOT_APPROVED
}

enum BudgetType {
  TOTAL
  PER_PERSON
}

model Trip {
  id           String     @id @default(cuid())
  name         String
  destination  String?
  startDate    DateTime
  endDate      DateTime
  budgetType   BudgetType @default(TOTAL)
  budgetMinor  Int?
  currency     String     @default("USD")
  timezone     String     @default("UTC")
  createdById  String
  createdAt    DateTime   @default(now())

  createdBy      User                 @relation("TripCreator", fields: [createdById], references: [id])
  members        TripMember[]
  invitations    Invitation[]
  activities     Activity[]
  expenses       Expense[]
  checklistItems ChecklistItem[]
  scheduleItems  ScheduleItem[]
}

model Expense {
  id            String          @id @default(cuid())
  tripId        String
  paidByUserId  String
  title         String
  category      ExpenseCategory @default(OTHER)
  amountMinor   Int
  isSolo        Boolean         @default(false)
  notes         String?
  createdAt     DateTime        @default(now())

  trip          Trip            @relation(fields: [tripId], references: [id], onDelete: Cascade)
  paidBy        User            @relation("ExpensePayer", fields: [paidByUserId], references: [id])
  splits        ExpenseSplit[]

  @@index([tripId, createdAt])
}

model ExpenseSplit {
  id          String   @id @default(cuid())
  expenseId   String
  userId      String
  shareMinor  Int

  expense     Expense  @relation(fields: [expenseId], references: [id], onDelete: Cascade)
  user        User     @relation("ExpenseSplitUser", fields: [userId], references: [id], onDelete: Cascade)

  @@unique([expenseId, userId])
  @@index([expenseId])
}

model ChecklistItem {
  id              String   @id @default(cuid())
  tripId          String
  userId          String
  title           String
  isChecked       Boolean  @default(false)
  isShared        Boolean  @default(false)
  checkedByUserId String?
  createdAt       DateTime @default(now())

  trip            Trip     @relation(fields: [tripId], references: [id], onDelete: Cascade)
  user            User     @relation("ChecklistCreator", fields: [userId], references: [id], onDelete: Cascade)
  checkedBy       User?    @relation("ChecklistChecker", fields: [checkedByUserId], references: [id], onDelete: SetNull)

  @@index([tripId, userId, isShared])
  @@index([tripId, isShared])
}

model Activity {
  id                 String         @id @default(cuid())
  tripId             String
  name               String
  description        String?
  status             ActivityStatus @default(PENDING)
  location           String?
  estimatedCostMinor Int?
  proposedById       String
  createdAt          DateTime       @default(now())

  trip          Trip           @relation(fields: [tripId], references: [id], onDelete: Cascade)
  proposedBy    User           @relation(fields: [proposedById], references: [id])
  votes         Vote[]
  scheduleItems ScheduleItem[]

  @@index([tripId, createdAt])
}
```

---

## 4. Key Runtime Flows

### 4.1 Expense Logging & Even Splitting
1. Client submits `POST /api/trips/:id/expenses` with `{ title, amountMinor, category, paidByUserId, isSolo, splitUserIds, notes }`.
2. Server verifies `paidByUserId` and all `splitUserIds` are active members of the trip.
3. If `isSolo` is `true`:
   - Saves `Expense` record with `isSolo = true`.
   - Creates zero `ExpenseSplit` records.
4. If `isSolo` is `false`:
   - Calculates `shareMinor = floor(amountMinor / splitUserIds.length)`.
   - Saves `Expense` record and inserts `ExpenseSplit` rows for each participant in a single atomic transaction.

### 4.2 Debt Settlement Minimization
1. Client calls `GET /api/trips/:id/expenses/settlement`.
2. Server queries all active group expenses (`isSolo: false`) for the trip visible to the user.
3. Calculates net balance per member:
   $$\text{Balance}(u) = \sum \text{PaidAsCreditor}(u) - \sum \text{ShareAsDebtor}(u)$$
4. Sorts positive balances into a Creditors list and negative balances into a Debtors list.
5. Applies greedy debtor-creditor matching algorithm to output minimal settlement instructions:
   `[{ fromUserId, toUserId, fromName, toName, amountMinor }]`.

### 4.3 Two-Layer Checklists
- **Private items**: `GET /api/trips/:id/checklist` filters by `tripId`, `userId: currentUserId`, and `isShared: false`. Accessible exclusively by the creator.
- **Shared group items**: `GET /api/trips/:id/checklist/shared` filters by `tripId` and `isShared: true`. Any trip member can create, toggle completion (sets `checkedByUserId`), or delete shared items.

### 4.4 Activity Voting & Itinerary Promotion
- `PUT /api/trips/:id/activities/:activityId/votes/me` upserts vote records atomically.
- Organizer calls `POST /api/trips/:id/itinerary` with `activityId` to schedule the activity and updates the activity status to `APPROVED` (moving it from `Suggested` to `Planned`).

---

## 5. REST API Endpoint Contract

| Method | Route | Description / Access Rules |
| --- | --- | --- |
| `GET, POST` | `/api/trips` | List user's trips / Create trip |
| `GET, PATCH` | `/api/trips/{tripId}` | Get trip details / Update settings (organizer only) |
| `GET` | `/api/trips/{tripId}/members` | Get member list with names & avatars |
| `POST, DELETE` | `/api/trips/{tripId}/invitations` | Create / revoke 7-day invitation tokens |
| `POST` | `/api/invitations/accept` | Accept an invitation token |
| `DELETE` | `/api/trips/{tripId}/members/{userId}` | Remove member (organizer only) |
| `GET, POST` | `/api/trips/{tripId}/expenses` | List visible expenses / Log new expense |
| `PATCH, DELETE` | `/api/trips/{tripId}/expenses/{expenseId}` | Edit / delete expense (payer or organizer) |
| `GET` | `/api/trips/{tripId}/expenses/settlement` | Calculate and return debt settlement summary |
| `GET, POST` | `/api/trips/{tripId}/activities` | List activities with vote tallies / Propose activity |
| `PATCH, DELETE` | `/api/trips/{tripId}/activities/{activityId}` | Edit / delete proposal (author/organizer, before votes) |
| `PUT, DELETE` | `/api/trips/{tripId}/activities/{activityId}/votes/me` | Cast or clear user's vote |
| `GET, POST` | `/api/trips/{tripId}/itinerary` | List schedule entries / Add entry (organizer only) |
| `PATCH, DELETE` | `/api/trips/{tripId}/itinerary/{entryId}` | Edit / delete schedule entry (version-checked) |
| `GET, POST` | `/api/trips/{tripId}/checklist` | List / add private personal checklist items |
| `PATCH, DELETE` | `/api/trips/{tripId}/checklist/{itemId}` | Edit / delete private personal checklist item |
| `GET, POST` | `/api/trips/{tripId}/checklist/shared` | List / add collaborative group packing items |
| `PATCH, DELETE` | `/api/trips/{tripId}/checklist/shared/{itemId}` | Toggle / delete shared item (any trip member) |
| `POST` | `/api/trips/{tripId}/suggestions` | Generate contextual AI activity suggestions |

---

## 6. Security and Isolation Guarantees

1. **Expense Privacy**: Solo expenses are strictly isolated and never returned in other members' expense queries. Group expenses are visible only to members involved in the split or payer, or whole-group expenses.
2. **Personal Checklist Isolation**: Personal items are indexed by `(tripId, userId)` and cannot be read or manipulated by other travelers, including the trip organizer.
3. **Transaction Safety**: All trip mutations (membership changes, votes, expense splits, schedule updates) are wrapped in PostgreSQL transactions with row-level locking (`SELECT ... FOR UPDATE`) to prevent race conditions.
