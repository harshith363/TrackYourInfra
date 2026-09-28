# Contributing to TrackYourInfra

Thank you for helping build a public, checkable account of infrastructure work. Local demo mode contains invented examples; real-data mode contains separately stored, source-backed records. Never treat demo numbers as real claims.

## Report a correction

Use the forms under GitHub Issues to report a project update, propose a metro project, correct a map feature, or report a site bug. Include the affected project/city, what should change, when the information applied, and a public source link with a page or section when possible. Issues are public; do not include private contact details.

For a route proposal, use `/contribute/map/` on the locally running site. Click or tap to place dots, export GeoJSON, then paste it into the map correction or new-project form. The line is an approximate proposal until reviewed.

## Edit data directly

Fork the repository, make a focused change, and open a pull request. Include evidence and a before/after explanation for each factual change. Existing project IDs and slugs should remain stable. Unknown values should be `null`, not guesses or zeros. Only add geometry you can explain and source. Keep imported data under its original license and attribution.

Run `npm run validate`, `npm test`, `npm run check`, `npm run build`, and `TRACKYOURINFRA_DATA_MODE=real npm run build` before requesting review. GitHub also runs these checks on pull requests. Follow the PR template and link any related issue. A maintainer decides whether an issue or PR becomes accepted data.

Real project files belong in `data/projects/`, with source records in `data/sources/` and an accepted-change summary in `data/changes.json`. Keep demonstration data under `fixtures/demo/`. The old array files at the root of `data/` are retained temporarily for migration reference but are not loaded by the app.
