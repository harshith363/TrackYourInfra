# TrackYourInfra — Phase 2 Specification

Status: Implementation in progress
Date: 28 September 2026
Phase: Community contributions and evidence architecture
Product scope: Indian metro transit, with an extensible infrastructure data model

## 1. Outcome

Make TrackYourInfra a public record that people can help improve. A reader should be able to report a correction or propose a project, a maintainer should be able to review the evidence, and an accepted change should become part of the versioned dataset and public project history.

Keep operating costs low by continuing with Astro, TypeScript, local GeoJSON, and static pages. Use the single public GitHub repository for contributions, discussion, review, and canonical data. Application code remains MIT licensed. Existing geographic assets retain their documented licenses.

Phase 2 implements the contribution system and prepares the repository for community use. Website hosting, domain setup, production publishing, operational monitoring, and maintenance schedules remain Phase 3.

Implementation note (28 September 2026): the public repository is `harshith363/TrackYourInfra`. The route proposal editor, GitHub Issue Forms, contribution pages, per-record data loader, claim evidence checks, activity/history pages, and one source-backed Bengaluru pilot record are in place. The first issue-to-draft-PR workflow supports new-project issues only; it is active once merged to the default branch and the repository's Actions pull-request setting is enabled. Remaining Phase 2 work includes enforcing factual-change history against the PR base in CI and visual/accessibility review of the interactive editor. The descriptions below are intended acceptance criteria, not a claim that every item is complete.

## 2. Decisions and assumptions

| Decision              | Phase 2 design                                                                                                                      |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Contribution channel  | Confirmed: GitHub accounts and Issue Forms for reports; pull requests for data edits.                                               |
| Accounts              | Public reading requires no account. Submitting through GitHub requires a GitHub account. No separate TrackYourInfra account system. |
| Repository            | One public repository: `harshith363/TrackYourInfra`. The site reads the owner/name from configuration.                              |
| Initial moderation    | Project owner acts as the initial maintainer; trusted geography reviewers can be added later.                                       |
| Publication authority | Maintainers merge reviewed changes. Reports and comments do not directly change project facts.                                      |
| Storage               | Structured files in Git, with a static build. No database or continuously running application server.                               |
| Language              | English first. Store names as Unicode and avoid assumptions that prevent later regional languages.                                  |
| Costs                 | No paid service required by this design. Hosting and bandwidth budgets are settled in Phase 3.                                      |

If submissions without GitHub accounts are required, revisit the intake architecture before implementation: a form receiver, abuse controls, storage, and a moderation queue would need an owner and hosting decision. The rest of the data and review design can still be reused.

## 3. Current implementation and gaps

The app has home, directory, state, city, project, contribution, activity, history, and methodology pages. It uses Zod to validate project data, separates demo fixtures from real data, displays the India outline and city context layers, and provides a route proposal editor. Real-data mode contains a source-backed Bengaluru Metro Phase 3 record; demo mode contains three invented corridors.

The following gaps matter for Phase 2:

- New-project Issue Forms can prepare a data branch and draft PR after a maintainer applies the opt-in label; updates, map corrections, and bugs still require a manual PR. See [issue-to-draft-pr-automation.md](issue-to-draft-pr-automation.md).
- CI validates builds and references, but does not yet compare changed factual fields with the PR base and require corresponding history entries.
- Visual and accessibility review of the interactive route editor remains outstanding.
- Some city-boundary dates and approximate area labels still need review.
- The Phase 1 spec includes aspirations beyond the implemented app; this document does not certify every Phase 1 checklist item as complete.

## 4. User experience

### Reader proposing a correction

1. Open a project and choose **Suggest an update** next to its status, metrics, or sources.
2. Read a short explanation that the report will be public and reviewed.
3. Continue to a GitHub form with the project ID and relevant field prefilled where supported.
4. Supply the proposed correction, observation/as-of date, source URL, and explanation.
5. Follow the GitHub issue for questions and the eventual decision.

The site must make the handoff to GitHub clear. It must never claim a report was submitted merely because the GitHub page was opened. A correction without sufficient evidence can enter review but cannot replace a factual claim.

### Contributor making a direct edit

1. Use **Edit project data** to open the exact project file on GitHub.
2. Follow CONTRIBUTING instructions to fork, edit, validate, and submit a PR.
3. Include source records and a structured change entry when a factual field changes.
4. Address automated validation and reviewer feedback.
5. Have the PR merged by a maintainer after review.

### Contributor drawing a route on the map

1. Open **Draw a route** from a project page or `/contribute` and choose an existing project or a new-project report.
2. Enter drawing mode on the city map. Click or tap to place a first dot, then further dots in travel order; the map joins them into a visible line. Existing accepted routes remain visible in a contrasting style for comparison, and ordinary map navigation controls remain usable.
3. Review the numbered dots and line. Undo the last dot, remove or edit a dot, clear the draft, and use longitude/latitude inputs as a keyboard-accessible alternative. At least two distinct dots are required. The dots are drawing vertices, not automatically claimed stations.
4. Mark the route as schematic or approximate, provide a source link and what that source supports, and preview the proposed change beside the existing route. A reviewer can request a more precise alignment later.
5. Choose **Copy route data** or download a small GeoJSON file, then open the GitHub map correction/new-project form. The form explains where to paste the line and source details. The browser also offers a copyable text fallback if clipboard access fails.

The draft stays in the browser until the contributor submits it to GitHub; drawing or exporting it does not change the public map. The editor must not imply that a line traced against the minimalist map is a surveyed alignment. If the repository is not configured, drawing and export still work and the submission control explains the missing destination.

### Maintainer reviewing a report

1. Triage the issue, identify the project/scope, and check for duplicates.
2. Compare proposed values with their sources, including dates and geographic scope.
3. Request evidence, decline with a reason, or prepare a linked data PR.
4. Review the field changes and geometry, then merge after checks pass.
5. Close the report with a link to the accepted PR or a clear decision.

### New and updated site surfaces

| Surface                    | Required experience                                                                                                                                             |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/contribute`              | Explain the workflow; offer update/correction, new project, map correction, and site bug routes. Link to open reports and the contributor guide.                |
| `/contribute/map`          | City-scoped click/tap route drawing, visible numbered dots and draft line, point controls, source/precision fields, GeoJSON preview/export, and GitHub handoff. |
| Project page               | Suggest update, edit data, view open reports, view history, claim-specific sources, evidence as-of/review dates, and contributor credits where recorded.        |
| `/projects/[slug]/history` | Dated accepted changes showing field, old/new value, reason, evidence, and linked review issue or PR.                                                           |
| `/activity`                | Recent accepted data changes, generated from committed change entries. Does not pretend to be a live GitHub feed.                                               |
| `/methodology`             | Publish evidence rules, lifecycle definitions, correction policy, date meanings, and geographic/source license information.                                     |
| Repository                 | Issue forms, PR template, contributor guide, conduct policy, review guide, and ownership configuration.                                                         |

With no repository configured, local pages show an honest setup state and the contribution instructions. They must not link to a guessed repository or present an enabled action that cannot work. Avoid showing fabricated open issue counts or live review statuses.

## 5. Contribution types and moderation

Create four Issue Forms:

1. **Project update or correction:** project ID/link; affected field; current and proposed information; as-of/observation date; evidence links; explanation.
2. **New metro project:** name, state/city, agency, tracked scope/phase, known lifecycle stage, sources, and optional route references. Unknown costs and dates are allowed.
3. **Map or location correction:** city/project, affected feature, description of the discrepancy, proposed GeoJSON LineString from the drawing tool or another reference, source date, precision, and permission/license information for supplied geography.
4. **Website bug:** affected page, reproduction steps, expected/actual behavior, and device/browser if relevant.

Require enough structure to route a report; do not require a contributor to invent a value to pass the form. Evidence can be missing on intake, but this sends the report to `needs-evidence`.

Suggested labels: `type:update`, `type:new-project`, `type:map`, `type:bug`; `review:triage`, `review:needs-evidence`, `review:ready`, `review:in-progress`, `review:accepted`, `review:declined`, `review:duplicate`; and `automation:prepare-draft-pr` for an explicit maintainer-triggered draft. At most one review-state label at a time. Labels describe editorial review, independently of project lifecycle status. The automation label must only be applied after a maintainer has reviewed the issue for readiness.

Normal flow: triage → needs evidence or ready → maintainer applies `automation:prepare-draft-pr` → generated draft PR → human review and merge → issue closed with the decision. Declined and duplicate reports close with reasons. An accepted report can be reopened if later evidence requires correction. The automation prepares candidate files on a draft branch; it never changes the default branch or publishes a record before a human-reviewed merge.

Comments stay on GitHub. Do not add website comments, voting, reputation scores, personal profiles, or direct messaging in this phase. GitHub subscriptions provide contribution notifications.

## 6. Evidence and data design

### Repository layout

```text
data/
  projects/<project-id>.json
  sources/<source-id>.json
  changes/<project-id>/<change-id>.json
  states.json
  cities.json
  agencies.json
  city-context.json
fixtures/demo/                 # invented projects and their related records
public/maps/                   # reviewed display geography, separately licensed
.github/
  ISSUE_TEMPLATE/
  pull_request_template.md
  workflows/validate.yml
  CODEOWNERS                   # real, configured maintainers only
docs/
  phase-2-spec.md
  data-standard.md
  review-guide.md
  governance.md
  map-data.md
  city-map-data.md
CONTRIBUTING.md
CODE_OF_CONDUCT.md
```

Migrate array-based project/source files through an explicit conversion that preserves IDs, slugs, and existing URLs. The loader should produce the current application-facing data shape where possible. Unknown values remain `null`; do not substitute zero. Route geometry may be unknown: render an explanatory map state and retain the list/page rather than inventing coordinates.

### Project scope and evidence

A record represents a stated scope, such as a named metro line extension or a construction phase. Add `scopeDescription` and `infrastructureType` (initial value `metro`) so figures are not accidentally mixed between an entire network and a single phase. Retain one primary state/city for current navigation; cross-state associations and new infrastructure categories are future schema extensions.

Keep existing factual values on the project record and add a `claimEvidence` map keyed by supported field names. Each factual value must have its own supporting source IDs, an as-of date, confidence, and a short qualifier when needed. Supported keys initially cover lifecycle status, route length, station count, approved/latest cost, original/current target, and reported progress. Milestones and geometry carry their own evidence metadata.

| Record/field       | Required meaning                                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `recordKind`       | `demonstration` or `real`; controls public presentation and validation.                                                                           |
| `updatedAt`        | Date the accepted record changed. Does not mean the source was rechecked.                                                                         |
| Claim `asOf`       | Date to which that claim applies; may be unknown if explicitly explained.                                                                         |
| Claim `reviewedAt` | Date a maintainer checked that claim against cited evidence.                                                                                      |
| Claim `sourceIds`  | One or more existing source IDs for each non-null factual metric/status.                                                                          |
| Claim `confidence` | Human evidence assessment with published definitions; not a numerical fact-check score.                                                           |
| Geometry metadata  | Source IDs, license, precision (`schematic`, `approximate`, `reviewed`), and review date.                                                         |
| Source             | Stable ID, title, publisher, URL, source type, publication date or null, access date, and relevant page/section.                                  |
| Change entry       | Stable ID, project ID, date, author credit if opted in, reason, field-level before/after values, evidence IDs, and available issue/PR references. |

For long documents, record a page/section and a brief explanation of what it supports. Link to documents rather than copying full articles or PDFs into the repository. Permit public HTTP(S) sources and validate URL schemes. Keep unsupported protocols out of generated links.

Do not treat progress percentage as universal: record whether it refers to civil works, the whole project, or another reported scope. Retain `null` when that scope is unclear. A target date passing must not automatically change lifecycle status to delayed; report the elapsed target separately and require evidence for an explicit status change.

### History rules

An accepted factual change adds a change entry in the same PR. CI compares edited fields with the PR base and requires coverage for material factual changes. New records get a creation entry; typo-only edits may use a documented editorial exemption. Compare parsed fields rather than raw JSON formatting.

History entries record exactly which previous and new values changed and why. Previously accepted entries are preserved; later corrections add a new entry. Do not invent legacy history during migration: add a labelled initial import/snapshot. Removing a duplicate real record requires a recorded decision and an alias/redirect to the canonical project where practical.

Use Git history as the complete audit trail. The website history is an accessible factual-change summary, not a replacement for it. The PR number may be added once a PR exists; do not require a final commit hash inside the same commit or create circular merge metadata dependencies. Reviewer approval is authoritative on GitHub. Contributor-provided names or review dates do not establish approval by themselves.

### Evidence quality and disagreements

Prefer direct agency/government publications for approvals, budgets, dates, and openings. Credible reporting can support a claim when clearly attributed. Field observations can establish a local observation but cannot alone establish a whole-project completion percentage or official budget.

If credible sources disagree, retain the existing accepted value until review resolves the discrepancy, or set the value to unknown with an explanation. Record both sources and the decision. Do not silently average conflicting numbers. Unreviewed reports remain visible in GitHub and do not enter accepted project metrics.

### Demo and real records

Move invented corridors into explicit fixtures and support `demo` and `real` dataset modes. Local development may use demo mode. Real mode must reject demonstration records and their fake agencies/sources; the UI derives its banners from the active mode. CI builds both modes, including a valid empty real-data state.

The acceptance exercise includes one narrowly scoped real metro project with reviewed claims and provenance. This validates the workflow without promising nationwide coverage. A missing metric or route is acceptable; fabricated completeness is not.

## 7. Technical architecture

```text
Website contribution link → GitHub issue → maintainer evidence review
                                              ↓
Direct contributor PR ───────────────────→ data PR
                                              ↓
                               validation + human review
                                              ↓
                                      merge to main
                                              ↓
                                static build with history
                                              ↓
                              production publishing in Phase 3
```

Keep GitHub access out of ordinary page requests. Generate accepted activity and history from repository files. Repository issue/PR/history links can go directly to GitHub; no browser API token, OAuth backend, scheduled GitHub scraping, or live queue mirror is required.

Add a validated repository setting for owner/name and generate contribution URLs centrally, using URL encoding and project IDs. This avoids inconsistent links across pages. Preserve a local no-remote mode for development and demos.

Fix data-to-HTML rendering before exposing contributions: map callouts and other community text must use safe text rendering; trusted UI structure is defined in code. Validate outbound URL protocols. Do not accept arbitrary HTML in report-derived data.

Bundle city boundaries and other reviewed map context as static assets. Require map corrections to include geometry provenance and license; municipality extent, neighborhood labels, and project alignments remain distinct data concepts. Imported geographic assets must not be silently relicensed MIT.

The route editor runs entirely in the browser using the existing MapLibre map. Its draft is an ordered array of `[longitude, latitude]` pairs, rendered as dots and a LineString. It must validate finite coordinates, two or more distinct points, a reasonable point cap, and the selected city's broad geographic bounds before export. Preserve the original project geometry for a clear before/after review; never write a draft directly into accepted `data/` files. The exported GeoJSON includes project/city references and contributor-supplied source/precision metadata for the reviewer, but remains a proposal until a validated PR is merged. Do not place a GitHub token in the browser. Avoid relying on deep links to prefill every Issue Form field; a copyable geometry field and explicit paste instructions are sufficient.

## 8. Review automation and governance

The required `validate` workflow runs on pull requests and main-branch pushes. It uses a lockfile install, validates schema/references/evidence/geometry, checks factual history coverage on PRs, runs focused data tests and type checks, and builds the site. Start with one standard Linux runner and bounded execution time; cancel superseded runs.

Use read-only permissions for PR checks. Do not provide secrets or write tokens to contributor code. Do not execute PR code through a privileged `pull_request_target` workflow. Pin action revisions and maintain dependencies through ordinary reviewed PRs. Network-dependent source availability checks should be advisory, because websites can block automated requests even when the evidence is readable.

Require PRs and passing checks on the main branch. With two maintainers, require an independent approval and use CODEOWNERS for sensitive code/config and geographic responsibilities. With only the project owner, external contributors still need maintainer review; owner-authored changes use passing checks and a documented self-review. Configure an explicit owner-only exception if platform review rules would otherwise make a one-person project unable to merge. Do not claim independent review for such changes.

Start with the project owner as the decision maker. Record maintainers and geography responsibilities in `docs/governance.md`; do not add unconfirmed GitHub handles. Maintainers may decline unsupported, duplicate, out-of-scope, abusive, or unlicensed submissions with a concise explanation. Record decisions on the issue/PR. Contribution forms explain that reports are public and should contain no private contact details.

## 9. Cost and maintenance implications

The design adds static text/data files and validation jobs. It requires no database, paid map service, email delivery, or custom identity service. Standard GitHub-hosted runners are currently free for public repositories; larger runners and other paid services are outside this design. See [GitHub runner documentation](https://docs.github.com/en/actions/reference/runners/github-hosted-runners).

The principal ongoing effort is human source review. Favor a small, well-supported dataset and manual triage at first. Avoid promises of guaranteed review times or complete national coverage. Phase 3 will define hosting limits, maintenance responsibilities, backup/export procedures, and refresh schedules.

## 10. Implementation tasks

### A — Contribution contract and repository configuration

- [x] Confirm GitHub accounts and Issue Forms for intake.
- [ ] Set a configurable repository identity.
- [ ] Add CONTRIBUTING, CODE_OF_CONDUCT, governance, and evidence review guides.
- [ ] Document licenses for code, original records, and imported geographic assets.
- [ ] Define report labels and moderation transitions.

Done when: a newcomer can understand how to contribute, what evidence is needed, and who decides acceptance. Local mode behaves correctly without a configured repository.

### B — Data migration and provenance

- [ ] Split project/source arrays into individual files without changing public URLs.
- [ ] Add explicit scope, dataset mode, claim evidence, geometry metadata, and change-entry schemas.
- [ ] Support unknown metrics/geometry and correct empty states.
- [ ] Move invented content into demo fixtures and build the real-data empty state.
- [ ] Validate references, URL schemes, date semantics, geometry, and dataset separation.

Done when: demo and real modes build; every populated factual claim in real mode has evidence; existing navigation survives migration.

### C — Forms and pull request review

- [ ] Add the four Issue Forms and a PR template.
- [ ] Add project-specific contribution links and centrally generated repository URLs.
- [ ] Build `/contribute/map`: click/tap to place connected dots, numbered route vertices, contrasting accepted/draft lines, undo/remove/edit/clear controls, coordinate-input alternative, GeoJSON export, and source/precision inputs.
- [ ] Connect the map correction and new-project forms to the drawing workflow with clear copy/paste handoff and a no-repository fallback.
- [ ] Document manual issue-to-PR preparation and acceptance/decline decisions.
- [ ] Configure ownership only for confirmed maintainers.

Done when: a nontechnical reporter can draw a proposed route by placing dots, export it, and submit an understandable correction through GitHub, while a contributor can still submit a direct data PR. Before a remote exists, exercise drawing/export locally and mark remote submission validation pending.

### D — Public evidence and history UI

- [ ] Build `/contribute`, `/activity`, and project history pages.
- [ ] Add claim-specific sources and distinguish claim dates, review dates, and edit dates.
- [ ] Show before/after changes, reasons, and review links.
- [ ] Update methodology, contribution callouts, data export, and missing-evidence states.
- [ ] Replace unsafe HTML interpolation and verify keyboard/mobile contribution flows.

Done when: readers can trace a value to evidence and understand why it changed, and all contribution actions state their real destination/status.

### E — Automated gates

- [ ] Add PR/main validation and build workflow with minimal permissions.
- [ ] Add change-coverage validation against the PR base.
- [ ] Test meaningful failures: missing evidence, unknown references, invalid geometry/URLs, stale before-values, and demo leakage.
- [ ] Validate drawn LineStrings: coordinate order/ranges, at least two distinct points, point cap, city association, precision, and source references before any accepted data change.
- [ ] Document and activate main-branch checks and the applicable review policy.

Done when: invalid contributions fail clearly and valid changes can pass without privileged tokens or paid services.

### F — Pilot and Phase 3 handoff

- [ ] Review one real project and create a minimal sourced record.
- [ ] Walk through a correction report, a linked PR, review, and generated history.
- [ ] Draw a sample route on desktop and touch-sized views; verify point order, undo/edit/clear, keyboard coordinate entry, export, and reviewer comparison against the accepted line.
- [ ] Exercise needs-evidence, duplicate, and rejected-report cases.
- [ ] Review desktop/mobile map context and fix remaining Phase 1 city-layer presentation issues.
- [ ] Record repository activation status, deferred items, and Phase 3 publishing requirements.

Done when: the local implementation works end to end and the remote review workflow is demonstrated once a public repository is configured. Production hosting is not required for this gate.

Dependencies: A → B and C; B → D and E; C + D + E → F. Review the data contract before building the history UI.

## 11. Acceptance criteria

1. Existing geographic navigation and project URLs survive the migration.
2. Readers can reach the appropriate contribution form from a project or the contribution page.
3. Intake without evidence can be triaged, but cannot change accepted facts.
4. A maintainer can trace each real metric, status, milestone, and route to its supporting source and scope.
5. Accepted factual changes include validated before/after history and a reason.
6. Pending GitHub issues never appear as accepted project facts or fabricated live website statuses.
7. Real mode excludes all demonstration records; incomplete real records render honestly.
8. Community text and source URLs render safely; fork PR checks have no privileged credentials.
9. Validation, relevant tests, type checks, and production builds pass with documented commands.
10. One real project and one reviewed correction demonstrate the data/evidence/history journey.
11. A contributor can click or tap dots into a route, revise it, export valid GeoJSON, and hand it to the map correction form without it appearing as an accepted line.
12. The route editor, contribution pages, and history pages work on mobile and with keyboard navigation, including coordinate entry without pointer use.
13. No paid infrastructure is required; remote activation and production deployment are reported separately.

## 12. Inputs and phase boundary

Required for remote activation: the public repository URL and actual maintainer GitHub handle(s). These do not block local implementation. No repository creation, push, publication, or settings mutation is implied by creating this specification.

Confirmed user decision: contributions use GitHub accounts and Issue Forms. No further product clarification is required to begin local Phase 2 implementation against this design.

Deferred to Phase 3: production hosting, domain, deployment credentials/workflow, published canonical URLs, monitoring, maintenance cadence, and operational cost limits. Deferred beyond current scope: anonymous intake backend, custom accounts, website discussions, reputation systems, automated fact approval, and comprehensive national data collection.

## 13. Platform references

Checked on 28 September 2026; recheck platform capabilities when activating the repository.

- [GitHub Issue Forms](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/configuring-issue-templates-for-your-repository)
- [Issue form schema](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-issue-forms)
- [CODEOWNERS](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
- [Protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [Standard GitHub-hosted runners](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)
