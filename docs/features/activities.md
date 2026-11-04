# Activity Proposals & Management

Status: Approved specification · Phase: MVP upgrade · Owner: Aidan Jiang

## User Story

As a member, I want to suggest activities and view planned items so that trip planning work is distributed across the group.

## Scope and Proposed Behavior

### 1. Proposing Activities
- Any trip member can suggest an activity with:
  - Name (required, 1–160 chars)
  - Description (optional, up to 2000 chars)
  - Location (optional, up to 2000 chars)
  - Estimated cost in USD (optional, integer cents in `estimatedCostMinor`)
- Includes curated placeholder art based on context.
- Authors can edit or delete their proposals before any votes are cast. Once votes exist, proposals are locked to protect voting integrity.

### 2. Suggested vs. Planned Organization
- **Suggested Tab**: Displays active suggestions with the card voting UI (❤️ / ✗) and vote tallies.
- **Planned Tab**: Displays confirmed activities that have been scheduled into the trip itinerary.
- **Promotion Workflow**:
  - The organizer reviews high-consensus activities in the Suggested list.
  - The organizer clicks "Add to Itinerary" / "Promote to Planned" to schedule date and time.
  - Activity status transitions from `PENDING` to `APPROVED`.

## Acceptance Criteria

1. Any active member can propose an activity.
2. Blank titles or invalid cost amounts are rejected.
3. Editing and deletion are restricted to the author or organizer, and only before any votes have been cast.
4. Non-members cannot view, propose, or mutate activities.
5. The organizer can promote an activity to the itinerary, moving it to the Planned view.

## Engineering & Schema Notes

```prisma
enum ActivityStatus {
  PENDING
  APPROVED
  NOT_APPROVED
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

  trip               Trip           @relation(fields: [tripId], references: [id], onDelete: Cascade)
  proposedBy         User           @relation(fields: [proposedById], references: [id])
  votes              Vote[]
  scheduleItems      ScheduleItem[]

  @@index([tripId, createdAt])
}
```

## AI Activity Ideas
AI activity suggestions generate ideas that can be converted into standard activity proposals via the same authenticated endpoint and ownership rules.
