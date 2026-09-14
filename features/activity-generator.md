# Destination-Based Activity Suggestions

Status: Planned. Phase: After MVP.

## User Story

As a member, I want suggested activities for the destination so the group has ideas to discuss.

## Scope and Proposed Behavior

- Generate or retrieve suggestions based on destination, with budget and dates as optional inputs.
- Members explicitly choose which suggestions become normal activity proposals.
- Suggestions must not automatically create votes or itinerary entries.

## Acceptance Criteria

1. Successful results show a title and useful destination-related detail.
2. Accepting a suggestion creates a proposal under the same validation and permission rules as manual entry.
3. An empty result or provider failure shows a recoverable state.
4. Unverified prices and availability are presented as estimates rather than guarantees.

## Engineering Notes

Select a places/search provider or AI approach before implementation. Keep provider credentials on the server, validate external responses, and bound requests and spending. Add caching only when justified by provider limits or measured use.

## Open Decisions

- Choose the provider, cost limit, and whether AI generation is wanted.
- Define data attribution, freshness, and location precision.

See the [project plan](../plan.md) for the shared stack, delivery practices, and implementation sequence.
