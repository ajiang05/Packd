# Shared Itinerary

Status: Implemented locally; release verification is tracked in [MVP status](../MVP_STATUS.md). Phase: MVP.

## User Story

As a traveler, I want a shared schedule so I know where the group plans to be and when.

## Scope and Proposed Behavior

- Display entries by day in the trip timezone.
- Proposed default: organizers create, edit, and remove entries; members view them.
- Entries have a title, start/end time, optional location, and optional activity reference.
- Use version checks to detect stale edits.

## Acceptance Criteria

1. Entries display in chronological order in the trip timezone.
2. An end time before or equal to the start time is rejected.
3. Entries outside the trip dates are rejected under the proposed default.
4. A stale update returns a conflict instead of overwriting a newer edit.
5. Unauthorized users cannot change the schedule.

## Engineering Notes

Model ItineraryEntry with UTC timestamps and a version field; retain the IANA timezone on the trip. Make the version comparison and update atomic. Test daylight-saving boundaries and simultaneous edits.

## Selected Implementation Policy

Organizer-only editing. Overlaps are allowed; start/end must be ordered and fall within trip dates. Changes to trip dates/timezone that invalidate entries are rejected. Entries are scheduled manually. Version checks protect updates and deletions.

See [ADR 001](../adr/001-mvp-defaults.md) for the choices made under the request to finish the MVP. This section resolves the earlier proposed alternatives above.

## Remaining Decisions

- Calendar synchronization and real-time coediting are deferred.

See the [project plan](../plan.md) for the shared stack, delivery practices, and implementation sequence.

## AI planner integration

The [AI planner](activity-generator.md) creates draft suggestions only. Accepting one creates a proposal; organizers still schedule entries explicitly. Suggested durations are estimates, not scheduled times.
