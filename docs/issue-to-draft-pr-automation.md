# Issue to draft pull request automation

Status: First increment implemented locally; activate by merging the workflow into the default branch
Date: 28 September 2026

## Goal

After a maintainer decides an issue is ready for a data change, prepare a draft pull request from its structured answers. The pull request is the review surface. It does not publish anything by itself; only merging reviewed canonical data changes updates the site on its next build.

The first increment is designed around the current **New metro project** form and its optional route proposal, including a Purple Line-style submission. Project update, map correction, and website bug parsing are out of the first increment.

## Maintainer flow

1. Review the issue for duplicates, scope, source quality, location, and any route proposal. Ask the contributor for missing information in the issue.
2. When it is suitable to prepare a data change, apply the dedicated `automation:prepare-draft-pr` label. This label is an explicit maintainer action; ordinary issue submission never runs the workflow.
3. GitHub Actions parses the supported Issue Form fields and opens one draft PR linked to the issue.
4. Review and edit the generated project/source files and any route geometry in the PR. Confirm each factual claim against its source, record applicable dates and confidence, and ensure geometry has the required license and precision metadata.
5. Run the repository checks. Mark the PR ready only when a maintainer considers the data suitable for publication; merge it to publish the accepted record at the next site build.
6. Close the issue with the PR link and decision. The issue remains the discussion record.

## Generated change

For a supported **New metro project** issue, the draft PR:

- creates a stable project JSON candidate using the submitted name, scope, mapped city/state, and named agency;
- creates a source record for each submitted public URL, preserving it as contributor supplied and leaving publication date unknown unless the form provides one;
- leaves unsupported status, cost, length, station count, targets, and progress as `null`;
- validates submitted GeoJSON coordinates, city extent, and proposal metadata; if the contributor explicitly confirms they created the route and grants CC BY 4.0 permission, stores it in a separate `routeProposal` field with `status: unverified`;
- always leaves accepted `geometry` as `null` pending independent alignment review, even when a proposed line appears dashed on the public map;
- adds a change-history entry linked to the originating issue, clearly identifying the record as a proposed initial addition.

The generated PR description links to the issue, lists which fields came from the form, names which fields remain unknown, and includes a checklist for evidence, city/agency mapping, geometry, and history. It must not turn prose into an asserted metric or official status. A source URL alone is not evidence that every claim in the proposed record is true.

If a city or agency cannot be mapped to a known entity, required information is missing, a project ID conflicts with an existing record, or a route fails validation, the workflow creates no PR and reports the reason in its run summary. A maintainer can correct the issue and apply the label again.

## Trigger, permissions, and safety

- Trigger only on the explicit label `automation:prepare-draft-pr`; do not run on issue creation or ordinary edits.
- Permit only the `new-project` form category in the first increment. Ignore site bug issues. Extend to map corrections and project updates after parser fixtures and review rules exist.
- Confirm the label actor has repository write permission. Treat every field in the issue body, including title, source URLs, and GeoJSON, as untrusted input.
- Give the workflow only `contents: write`, `pull-requests: write`, and `issues: read` permissions. Do not use repository secrets or fetch contributor URLs.
- Use the issue number for branch identity; do not put contributor text in shell commands, filenames, or workflow expressions. Serialize input as JSON and validate it before writing files.
- Accept only HTTP(S) source URLs. Do not dereference them during the workflow. Never evaluate issue text as code or a shell script.
- Validate coordinate order/ranges, point count, duplicate project IDs/slugs, existing city bounds, source references, and the normal project schema before creating the PR.
- Make the operation idempotent. If a draft PR for the issue already exists, do not create another branch or overwrite maintainer edits; report the existing PR instead.
- Never merge, mark ready, close an issue, or add a factual claim without a human maintainer action.
- The generated PR must be visibly marked **Draft** and must link back to the public issue. All copied content is already public on GitHub.

## Checks and recovery

The workflow validates the generated branch before opening the PR, using the existing validation, tests, type check, and real-data build. The normal PR workflow also checks demo and real-data builds when it runs. Because Actions-token-created PRs might require approval or not start a separate PR check, the maintainer should review the generator run and run the normal checks again after edits. Do not add a long-lived personal access token just to make checks start.

Repository setup: create the `automation:prepare-draft-pr` label and, with owner approval, enable the repository setting **Allow GitHub Actions to create and approve pull requests**. GitHub couples PR creation and approval in this setting; enabling it grants a broader capability to Actions than this workflow uses. The workflow itself never approves a PR and requests only the listed job permissions. The workflow is active only after it is merged into the default branch and this setting is enabled. To retry a failed issue after editing it, remove and re-add the label. Do not apply the label to any issue until its source and scope have been triaged.

Any parser or validation failure leaves the issue and canonical data untouched. The maintainer can fix the issue and retry, or use the documented manual PR workflow. Workflow logs must avoid printing tokens and should summarize field names and validation errors without dumping unnecessary issue content.

## Acceptance criteria

- Filing an issue alone causes no branch, PR, or app data change.
- A maintainer-applied preparation label creates at most one linked draft PR for a supported new-project issue.
- The candidate contains only form-derived identity/scope/source data; unspecified claims and accepted geometry remain null. A licensed, syntactically valid route may appear separately as an unverified, dashed community proposal after merge.
- Unsupported forms, malformed URLs/GeoJSON, ambiguous city/agency names, and ID conflicts fail closed with a readable run summary.
- Generated files pass repository validation before the PR is opened.
- A human must review evidence and route reuse terms, mark the PR ready, and merge it before the public site can include the project.
- The manual issue-to-PR path remains available if the workflow is disabled or fails.

## Not included

No direct commits to `main`, auto-merge, issue-to-publication sync, automatic source scraping, AI interpretation of free-form claims, issue comments generated by the workflow, or continuous server is required. Hosting and automatic production rebuilds remain Phase 3.
