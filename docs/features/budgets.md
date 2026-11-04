# Trip Budgets, Expenses, and Settlement

Status: Approved specification · Phase: MVP upgrade · Owner: Aidan Jiang

## User Story

As a traveler, I want to track trip expenses, split costs with my group, track solo expenses, and see an automated settlement summary so that financial management and trip planning work are fairly distributed and transparent.

## Scope and Proposed Behavior

### 1. Trip Budget Target
- Organizer sets an optional total trip budget or per-person budget target in USD (`budgetMinor`).
- Informational guide to compare against actual incurred expenses.

### 2. Expense Logging
- Any trip member can log an expense with:
  - **Title** (required, 1–160 chars)
  - **Amount** (required, USD integer cents, > 0)
  - **Category** (`FOOD`, `TRANSPORT`, `LODGING`, `ACTIVITY`, `OTHER`)
  - **Payer** (`paidByUserId`, must be an active trip member)
  - **Solo Flag** (`isSolo`, boolean):
    - When `true`: Personal expense or personal debt tracking for the payer. It does not split across the group.
    - When `false`: Group expense split evenly across selected trip members.
  - **Split Participants** (`splitUserIds`, required when `isSolo` is `false`):
    - Defaults to all active trip members.
    - Allows custom subset selection (e.g., splitting a dinner between 3 of 6 members).
    - Even split calculation (`amountMinor / splitUserIds.length`) recorded in `ExpenseSplit`.
  - **Notes** (optional, up to 500 chars).

### 3. Visibility and Permissions
- **Expense Visibility**: A member can only view expenses where:
  - They are the payer (`paidByUserId === currentUserId`), OR
  - They are a split participant (`userId in splitUserIds`), OR
  - The expense is split among the entire group.
  - Solo expenses are strictly visible only to the payer.
- **Editing and Deletion**:
  - The member who created/paid the expense can edit or delete it.
  - The trip organizer can delete any expense for moderation.

### 4. Settlement Summary ("Who Owes Who")
- Real-time derived calculation based on all active non-solo group expenses for which the user has visibility.
- For each member:
  - `Net Balance = (Total Paid for Group Expenses) - (Total Share of Group Expenses)`
  - Positive balance: owed money (creditor).
  - Negative balance: owes money (debtor).
- Minimized settlement transactions computed via greedy debtor/creditor matching:
  - e.g., "Jordan owes Alex $120.00", "Sam owes Alex $60.00".
- Computed on demand, never persisted as mutable settlement state, ensuring instant reconciliation if an expense is edited or deleted.

## Acceptance Criteria

1. Non-negative amounts in integer cents; zero or negative amounts rejected.
2. Solo expenses do not generate `ExpenseSplit` records and appear only in the payer's totals.
3. Group expenses divide evenly across specified members, storing integer minor units.
4. Non-members cannot view, create, edit, or delete expenses.
5. Members cannot view solo expenses logged by other members or group expenses they were not part of.
6. Only the payer or the organizer can edit or delete an expense.
7. Deleting or editing an expense recalculates balances and settlement transactions immediately.
8. External banking, payment gateway processing, and automated money transfers remain non-goals.

## Engineering & Schema Notes

```prisma
enum ExpenseCategory {
  FOOD
  TRANSPORT
  LODGING
  ACTIVITY
  OTHER
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
```

## API Endpoints

- `GET /api/trips/:id/expenses` — Returns filtered list of expenses visible to current user.
- `POST /api/trips/:id/expenses` — Creates a new expense (and splits if not solo).
- `PATCH /api/trips/:id/expenses/:expenseId` — Updates an expense and recomputes splits.
- `DELETE /api/trips/:id/expenses/:expenseId` — Deletes an expense and its splits.
- `GET /api/trips/:id/expenses/settlement` — Returns net balances and minimal debt settlement transactions.
