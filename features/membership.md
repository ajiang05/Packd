# Invitations and Permissions

Status: Planned. Phase: MVP.

## User Story

As an organizer, I want to invite and remove people so that only the travel group can access the trip.

## Scope and Proposed Behavior

- Use organizer and member roles; the creator starts as organizer.
- Proposed MVP: an organizer creates an expiring shareable invitation link and shares it manually.
- An authenticated recipient accepts a valid invitation; organizers can remove members.
- Email delivery is deferred unless explicitly selected.

## Acceptance Criteria

1. A valid invitation adds a user exactly once, including concurrent or repeated acceptance.
2. An expired or revoked invitation cannot create membership.
3. Only an organizer can create invitations or remove another member.
4. A removed member immediately loses access to protected trip operations.
5. The sole organizer cannot be removed through the member-removal operation.

## Engineering Notes

Store a hash of the invitation token, expiry, and revocation state. Apply membership checks on every request and unique constraints on memberships. Serialize acceptance with revocation where needed.

## Open Decisions

- Choose invitation expiry and whether links are single-use or reusable.
- Define how removed members’ votes and proposals are retained or displayed.
- Decide whether members can leave trips and how ownership transfers.

See the [project plan](../plan.md) for the shared stack, delivery practices, and implementation sequence.
