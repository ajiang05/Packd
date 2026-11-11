# Trip Creation and Management

Status: Implemented locally; release verification is tracked in [MVP status](../MVP_STATUS.md). Phase: MVP.

## User Story

As an organizer, I want to create a trip so that the group has one shared planning space.

## Scope and Proposed Behavior

- Capture a trip name, destination, start/end dates, and timezone.
- Create the trip and its organizer membership atomically.
- Let members view trip details; organizer-only editing is the proposed default.

## Acceptance Criteria

1. A valid creation request persists a trip and grants its creator organizer access.
2. An end date before the start date is rejected without saving the trip.
3. A nonmember cannot read or modify a trip by guessing its identifier.
4. A failed creation transaction leaves no orphan trip or membership.

## Engineering Notes

Model Trip and TripMember, with one membership per user per trip. Validate date changes against existing itinerary entries instead of silently invalidating the schedule.

## Selected Implementation Policy

Trip creation atomically creates organizer membership. Required fields are name, destination, dates, and IANA timezone. Only the creator edits metadata. Date/timezone changes are rejected if they invalidate existing itinerary entries.

See [ADR 001](../adr/001-mvp-defaults.md) for the choices made under the request to finish the MVP. This section resolves the earlier proposed alternatives above.

## Remaining Decisions

- Archive, deletion, and organizer transfer are deferred pending lifecycle policy.

See the [project plan](../plan.md) for the shared stack, delivery practices, and implementation sequence.

## AI planner integration

Destination, dates, timezone, shared budget, member count, and recent proposal names provide context for the [AI planner](activity-generator.md). Trip/member identities and private checklists are excluded; a destination is required.
