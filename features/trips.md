# Trip Creation and Management

Status: Planned. Phase: MVP.

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

## Open Decisions

- Define archive/deletion behavior and organizer transfer.
- Decide how existing itinerary entries should be handled when trip dates change.

See the [project plan](../plan.md) for the shared stack, delivery practices, and implementation sequence.
