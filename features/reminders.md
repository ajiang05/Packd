# Voting Reminders

Status: Planned. Phase: Optional extension.

## User Story

As a member, I want timely reminders so I remember to participate in trip decisions.

## Scope and Proposed Behavior

- Add reminders after voting deadlines and notification preferences are defined.
- Use a background worker; Redis is an option if the selected queue requires it.
- Target only eligible members with outstanding votes.

## Acceptance Criteria

1. A member who has already voted receives no pending-vote reminder for that activity.
2. Removed members are excluded when a job executes.
3. Transient delivery failures retry with a bounded policy.
4. Repeated job execution avoids duplicate delivery where the provider supports idempotency; document remaining limitations.

## Engineering Notes

Define a durable job key, execution-time eligibility checks, retry/backoff rules, and delivery records. Handle crashes between provider delivery and local acknowledgment. Monitor failed jobs; do not assume exactly-once external delivery.

## Open Decisions

- Choose in-app versus email notifications, timing, and opt-out behavior.
- Choose a queue and delivery provider only after the notification requirements are settled.

See the [project plan](../plan.md) for the shared stack, delivery practices, and implementation sequence.
