# Reviewing data contributions

Every public data change has two stages: automated structural validation, then maintainer evidence approval. Contributors and maintainers do not manually edit JSON during the normal workflow. Read [the automation design](automated-contributions-spec.md) for scope and failure behavior.

1. Open the issue, its public source, and the bot-generated PR. Confirm the source title, publisher, date, page/section, project scope, and proposed value. A URL merely existing is not evidence that the claim is true.
2. Check that the PR changes exactly one project, one new source record, and the change-history entry. For a factual update, check the as-of date and confidence. For a map, inspect the route, city, coordinate order, precision, and license declaration. A community proposal may be published only as visibly unverified; an accepted alignment needs evidence supporting its exact path.
3. If anything is missing or ambiguous, request an issue edit or decline with a reason. Editing an issue creates a new PR revision; do not approve the stale PR.
4. If the exact generated PR commit and its evidence are acceptable, submit an **Approve** review on the PR. The bot rechecks that the issue is unchanged, the approver has maintainer permissions, the diff is data-only, and the real-data build passes before merging. Do not manually merge or alter generated files.
5. Confirm the bot's merge and issue closure. A later correction is a new issue and history entry; do not silently rewrite the earlier decision.

The owner may be the only maintainer initially. An owner approval in that case is not independent review; it is still an explicit evidence decision after automated checks. Website bug issues and code PRs use the developer workflow, not this data-publication gate. Production deployment is separate; a merged PR does not update an already-running local checkout.
