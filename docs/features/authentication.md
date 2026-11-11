# Accounts and Sign-in

Status: Implemented locally; release verification is tracked in [MVP status](../MVP_STATUS.md). Phase: MVP.

## User Story

As a traveler, I want to sign in so that my trips and checklist belong to my account.

## Scope and Proposed Behavior

- Use an established authentication library; Google OAuth is the proposed initial sign-in method.
- Create or retrieve a user on successful sign-in, maintain a session, and allow sign-out.
- Require authentication for trip data and mutations.

## Acceptance Criteria

1. A successful sign-in creates or reuses the same account for the same provider identity.
2. Unauthenticated protected API calls return 401 without exposing trip data.
3. After sign-out, the previous session cannot perform protected operations.
4. A canceled or failed provider sign-in shows a recoverable error.

## Engineering Notes

Model User and provider identities with unique provider identifiers. Use library-managed session protections; do not implement custom password storage. Test authentication separately from trip authorization.

## Selected Implementation Policy

Implemented with Auth.js, Google OAuth, and database sessions. Real Google sign-in requires owner credentials and an OAuth round-trip check.

See [ADR 001](../adr/001-mvp-defaults.md) for the choices made under the request to finish the MVP. This section resolves the earlier proposed alternatives above.

## Remaining Decisions

- Additional providers are deferred.
- Public pilot support, retention, and account deletion policy still require owner configuration.

See the [project plan](../plan.md) for the shared stack, delivery practices, and implementation sequence.

## AI planner integration

The [AI planner](activity-generator.md) requires the existing authenticated session. Provider keys stay on the server; identities, sessions, and OAuth tokens are excluded from model context.
