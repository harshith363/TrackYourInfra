# Reviewing contributions

TrackYourInfra accepts data only after a maintainer checks the scope, source, date, and proposed change. A GitHub report can be useful even before it has enough evidence to change a published fact.

1. Triage the report: identify project or city, check duplicates, remove private details, and assign one review state.
2. Compare the proposed fact with its cited source. Record the source page or section, publication date, applicable scope, and any disagreement with existing evidence.
3. For geometry, check coordinate order, route direction, city association, declared precision, source permission, and whether a drawn line is only schematic. Compare visually with the accepted route.
4. Request clarification, decline with a reason, or prepare a focused data PR linked to the issue.
5. Run validation and review the generated site. Merge only when the change is supported and the PR checks pass.
6. Close the report with the PR link or a concise explanation. A later correction adds a new change record; it does not erase the earlier decision.

Initial report labels: `review:triage`, `review:needs-evidence`, `review:ready`, `review:in-progress`, `review:accepted`, `review:declined`, and `review:duplicate`. Use at most one at a time. Create the labels when configuring the public repository. New claims from direct field observations should describe exactly what was seen; they cannot establish an agency's official budget or total construction progress alone.

With one maintainer, owner-authored changes should document a self-review and pass checks. Do not describe them as independently approved. The repository URL and maintainer handles must be configured before remote submissions and ownership rules can be activated.
