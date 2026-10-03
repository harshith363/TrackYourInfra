# Automated data contributions

Status: historical two-stage design, superseded by the simpler automatic-publication workflow described in [CONTRIBUTING.md](../CONTRIBUTING.md). This document is retained for design history; its approval gate and form contract are not the current implementation. A live GitHub trial of the new workflow and production deployment remain to be verified.

## Decision

People contribute through GitHub Issue Forms. They do not need to clone the repository, edit JSON, write code, open a pull request, merge it, or restart a server. The bot is responsible for every data-file edit and the publication handoff. Maintainers decide whether the evidence supports publication, but also do not hand-edit data for a normal contribution.

This applies to new metro projects, factual project updates, source additions/corrections, and map route corrections. Website bugs and changes to application code remain developer work. A contributor may optionally propose code in a separate developer PR, but that is not the public data-contribution path.

## Two verification stages

1. **Automated validation:** on issue creation or edit, parse a versioned form, identify the target record, check required fields, source URLs, duplicate IDs, dates, numerical ranges, referential integrity, geometry, licensing declaration, and changed-field history. Build the site with the proposed data. The bot reports a concrete failure reason on the issue and requests a corrected form; it does not publish failing data. Passing checks mean the submission is structurally eligible for review, **not** that its claims are true.
2. **Maintainer evidence approval:** a human opens the cited material and checks that it supports the exact claim, scope, as-of date, source metadata, and (for maps) attribution and permissible reuse. The maintainer approves or declines on GitHub without editing files. Approval is bound to the exact issue revision and generated commit that passed Stage 1; an issue edit or regenerated commit invalidates an earlier approval. The bot then merges the data change after rechecking validations and publishes via the configured deployment pipeline. Declines and requests for information remain documented on the issue.

An approved **community route proposal** is approved for display as a clearly marked, dashed _unverified proposal_. It is not an approved route alignment. Promoting it to accepted geometry requires a separate sourced map contribution and evidence review. Automated coordinate checks cannot establish survey accuracy.

## Workflow and trust boundaries

```text
GitHub Issue Form (untrusted text)
  → parser and deterministic data generator
  → isolated data-only branch and PR + checks (Stage 1)
  → maintainer evidence review of exact PR diff (Stage 2)
  → bot rechecks review identity, commit SHA, checks, and data-only diff
  → bot merges PR; issue closes; production deployment rebuilds from main
```

The issue is the discussion and evidence surface; the generated PR is an auditable transport and review surface. No browser token or paid database is needed. Do not use a label alone as proof of approval, because labels can outlive edited issue content. A stale PR is regenerated or closed without overwriting human work; a new issue revision gets a new reviewable commit. The bot never executes issue text as shell code or fetches contributor-supplied URLs in a privileged job. Source availability checks are advisory; the human must read the source. A failed automation run leaves canonical data unchanged.

The workflow's write token is limited to creating its data-only branch, PR, issue status comment, and merge. Reviewers need repository write/maintain/admin permission. The publication workflow must reject self-asserted approval in issue text, stale review, changed workflow/code files, failed checks, an unexpected PR author/branch, or an untrusted event actor. Repository settings should require the checks and a reviewed PR on `main`; document a one-maintainer owner exception without calling that an independent review. If GitHub's Actions-generated PRs do not trigger normal PR checks, explicitly run the same checks in the preparation job and again before merge.

## Form contract

Every form asks for the exact target (stable project ID for existing records), one focused change, a public evidence URL, source title, publisher, source type, publication/as-of date where known, and a concise explanation of what the source proves. Unknown facts are left empty, never guessed. A typed field selector and value input replace free-text instructions such as “update the status”; one claim per issue keeps evidence and history unambiguous. A separate source form permits source metadata changes and source-only additions without inventing a factual claim.

New projects require a supported city and agency, or a separate catalog request that the generator can validate; an unknown city/agency must yield an actionable `needs-info` result rather than a request that the contributor edit code. Map forms accept the route editor's GeoJSON, precision, source, and explicit reuse permission. Coordinates remain bounded and distinct. Proposals and accepted geometry are separate selections with different evidence standards. City boundary/base-map changes are not silently inferred from a drawn line; they need licensed boundary data and their own reviewable contribution type before being offered as an automated form.

## Tasks

1. Replace the current free-text update/map forms with versioned, machine-readable forms; add a source form and source metadata to the new-project form. Keep a helpful error path for older issues such as #4.
2. Build a pure, tested converter for each data contribution type. It produces project/source/change-history records without network calls, never placeholders such as “verify title”, and rejects unknown or ambiguous fields.
3. Run the converter and full real-data validation/build when an issue is opened or edited. Post or update one bot status comment with `needs-info`, `checks-passed`, or a precise validation failure, and create/update one linked data-only PR. Limit bot spam and serialize by issue number.
4. Enforce data-only generated diffs, issue-revision/commit binding, a human reviewer with maintainer permission, and fresh green checks in the merge job. Automatically merge and close the issue only after both stages pass. Make retries idempotent.
5. Update the website, contributor guide, review guide, and methodology to describe the actual workflow, including that local development does not automatically pull or redeploy merged changes. Production deployment is a Phase 3 dependency.
6. Test happy paths and failures for all four contribution types, edited issues, duplicate/stale PRs, invalid URLs, dates, coordinates, missing licenses, conflicting evidence, and forged/stale approvals. Test the GitHub workflow in a throwaway issue before announcing it as live.

## Acceptance

A person can submit each supported data type using only a GitHub form. The bot creates and validates the exact proposed data change. The person receives a clear status. A maintainer can approve or reject it without editing files. After approval, the bot merges a validated data-only change and closes the issue, and the next production build shows it. No assertion of factual truth is made by the automated stage. If deployment is not configured yet, the merge updates `main` but the local server will still need a local pull/restart or hot reload; this is not hidden from contributors.
