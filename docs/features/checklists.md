# Preparation Checklists (Personal & Group)

Status: Approved specification · Phase: MVP upgrade · Owner: Aidan Jiang

## User Story

As a traveler, I want both a private checklist for my own essentials and a collaborative group packing list so that our travel group can divide prep responsibilities and ensure nothing gets forgotten.

## Scope and Proposed Behavior

### Layer 1: Personal Private Checklist
- Each member maintains an individual, private checklist within a trip.
- Other members, including the trip organizer, cannot view or edit another member's private checklist items.
- Adding, editing, toggling completion, and deleting items.

### Layer 2: Collaborative Group Packing List
- A shared packing and task list accessible to all members of the trip.
- **Adding Items**: Any active member can add items to the group list.
- **Completion**: Any member can check off or uncheck items. The item records `checkedByUserId` to provide social accountability and transparency.
- **Deletion**: Any member can delete items from the group list to keep it tidy and collaborative.
- **Subtabs in UI**: The checklist screen presents two clean sub-tabs:
  1. `Group List` — Collaborative packing items.
  2. `My List` — Private personal packing items.

## Acceptance Criteria

1. Private checklist items remain strictly isolated per user and cannot be accessed by other members or the organizer.
2. Group checklist items are visible to all members of the trip.
3. Any member can mark a group item as checked/unchecked; the action updates `checkedByUserId` and completion state across the group.
4. Any member can delete an item from the group checklist.
5. Non-members cannot view or modify either private or group checklists.
6. A removed member loses access to both checklists; private items remain stored in case of rejoining.

## Engineering & Schema Notes

```prisma
model ChecklistItem {
  id              String   @id @default(cuid())
  tripId          String
  userId          String   // Creator of the item
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
```

## API Endpoints

- `GET /api/trips/:id/checklist` — Returns private checklist items for the requesting user (`isShared: false`).
- `POST /api/trips/:id/checklist` — Creates a private item (`isShared: false`).
- `PATCH /api/trips/:id/checklist/:id` — Updates a private item.
- `DELETE /api/trips/:id/checklist/:id` — Deletes a private item.
- `GET /api/trips/:id/checklist/shared` — Returns group shared checklist items (`isShared: true`).
- `POST /api/trips/:id/checklist/shared` — Creates a shared item (`isShared: true`).
- `PATCH /api/trips/:id/checklist/shared/:id` — Updates a shared item (toggle completion, update title, sets `checkedByUserId`).
- `DELETE /api/trips/:id/checklist/shared/:id` — Deletes a shared item (any member allowed).
