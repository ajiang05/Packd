# Invitations and Permissions

Status: Implemented locally; release verification is tracked in [MVP status](../MVP_STATUS.md). Phase: MVP.

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

## Selected Implementation Policy

The creator is the organizer. Invitations are reusable for seven days and revocable. Organizer removal deletes that member’s votes and revokes all current invitations. Existing proposals remain. Rejoining requires a new invitation and starts with no votes.

See [ADR 001](../adr/001-mvp-defaults.md) for the choices made under the request to finish the MVP. This section resolves the earlier proposed alternatives above.

## Remaining Decisions

- Self-leave and ownership transfer are deferred.
- Account/trip deletion policy remains a public-release prerequisite.

See the [project plan](../plan.md) for the shared stack, delivery practices, and implementation sequence.

## AI planner integration

The [AI planner](activity-generator.md) checks membership before spending provider requests and after generation. Saving a selected suggestion reuses normal membership enforcement; organizer privileges are not needed to request ideas.
