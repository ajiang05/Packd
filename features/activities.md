# Activity Proposals

Status: Planned. Phase: MVP.

## User Story

As a member, I want to suggest activities so that everyone can contribute to the trip.

## Scope and Proposed Behavior

- Members propose an activity with a title and optional description, location, and estimated cost.
- List proposals for the trip with their authors.
- Proposed default: authors manage their own proposals; organizers can moderate all proposals.

## Acceptance Criteria

1. A member can create a valid proposal and other trip members can see it.
2. A blank title or invalid estimated cost is rejected.
3. Nonmembers cannot list or mutate proposals.
4. A member cannot edit another member’s proposal under the proposed permission rule.

## Engineering Notes

Model Activity with trip and author references. Use the trip currency for estimates. Add pagination and trip-scoped indexes as needed. Changes affecting existing votes require an explicit policy.

## Open Decisions

- Choose edit/deletion rules after voting begins.
- Decide which optional details are required for itinerary scheduling.

See the [project plan](../plan.md) for the shared stack, delivery practices, and implementation sequence.
