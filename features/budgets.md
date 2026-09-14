# Trip Budgets

Status: Planned. Phase: MVP.

## User Story

As a traveler, I want to see the trip budget so that suggestions fit what the group can spend.

## Scope and Proposed Behavior

- Record an amount, currency, and either total-trip or per-person mode.
- Organizer edits the budget; members can read it.
- Budget estimates are informational; payments and expense settlement are out of scope.

## Acceptance Criteria

1. Negative amounts and unsupported precision are rejected.
2. The saved amount, currency, and mode survive reload and display consistently.
3. A member cannot change the organizer-controlled budget.
4. If derived totals are displayed, they identify the member count used.

## Engineering Notes

Store money as integer minor units rather than floating-point values. Validate the supported currency and its precision; any derived totals must use a documented membership-count rule.

## Open Decisions

- Choose the initial currency or supported currencies.
- Decide whether derived total/per-person estimates update when membership changes.

See the [project plan](../plan.md) for the shared stack, delivery practices, and implementation sequence.
