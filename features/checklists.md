# Personal Preparation Checklists

Status: Planned. Phase: MVP.

## User Story

As a traveler, I want a private checklist so I remember essentials such as my passport.

## Scope and Proposed Behavior

- Each member manages their own checklist within a trip.
- Allow adding, editing, completing, and deleting text items.
- Proposed default: other members, including organizers, cannot view personal checklist items.

## Acceptance Criteria

1. A saved item and its completion state persist across reloads.
2. A blank item is rejected.
3. A member cannot read or modify another user’s checklist by changing identifiers.
4. A removed member cannot access that trip’s checklist endpoints.

## Engineering Notes

Model ChecklistItem with trip and owner references. Every operation checks ownership and active trip membership. Test isolation between two users in the same trip.

## Open Decisions

- Decide whether starter templates are useful.
- Define retention behavior when a user leaves or a trip is deleted.

See the [project plan](../plan.md) for the shared stack, delivery practices, and implementation sequence.
