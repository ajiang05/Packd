# Group Voting and Participation

Status: Planned. Phase: MVP.

## User Story

As a member, I want to vote on proposed activities and see outstanding participation so the group can make decisions.

## Scope and Proposed Behavior

- Proposed ballot: each current member records yes or no for each activity and can change their response while voting is open.
- Show activity totals and a count of current members who have not responded.
- Do not interpret an absent vote as a no vote.
- Blocking finalization until everyone votes is unresolved; no automatic winner or enforced quorum is assumed.

## Acceptance Criteria

1. Two concurrent submissions from the same user for the same activity leave one stored vote.
2. Changing a vote updates the response without increasing the number of voters.
3. A nonmember cannot submit a vote, including through a direct API request.
4. Totals and outstanding counts match the documented eligibility policy.
5. If voting closure is implemented, requests after closure are rejected consistently.

## Engineering Notes

Model Vote with a unique (activity_id, user_id) constraint. Validate current membership and trip association, and use transactions or locking for eligibility/closure races. Test concurrent submissions against PostgreSQL.

## Open Decisions

- Confirm yes/no versus another ballot format.
- Define deadlines, quorum, ties, and the consequence of missing votes.
- Decide visibility of individual responses and the treatment of removed members.

See the [project plan](../plan.md) for the shared stack, delivery practices, and implementation sequence.
