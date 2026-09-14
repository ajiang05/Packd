# Accounts and Sign-in

Status: Planned. Phase: MVP.

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

## Open Decisions

- Select the authentication library and configure Google OAuth.
- Decide whether additional providers or account deletion are required.

See the [project plan](../plan.md) for the shared stack, delivery practices, and implementation sequence.
