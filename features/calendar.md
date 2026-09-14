# Google Calendar Integration

Status: Planned. Phase: After MVP.

## User Story

As a traveler, I want the itinerary in my calendar so I can follow the trip alongside my other plans.

## Scope and Proposed Behavior

- Choose between downloadable calendar export and direct Google Calendar integration before implementation.
- Calendar entries should preserve itinerary titles, times, and timezone meaning.
- Direct synchronization requires explicit user authorization and a documented update/deletion policy.

## Acceptance Criteria

1. Exported or synchronized entries represent the correct times, including across timezone changes.
2. If direct synchronization is chosen, repeating an operation does not create duplicate events.
3. If direct synchronization is chosen, authorization denial or revocation produces a recoverable error.

## Engineering Notes

Depend on the itinerary model. Calendar export can be an initial milestone but does not fulfill direct Google synchronization. For direct integration, protect OAuth tokens, use minimum required scopes, and persist external event mappings.

## Open Decisions

- Choose export, one-way synchronization, or two-way synchronization.
- Define target calendar, update frequency, and treatment of deleted events.

See the [project plan](../plan.md) for the shared stack, delivery practices, and implementation sequence.
