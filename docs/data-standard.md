# Data standard

Phase 1 stores JSON files in `data/`. `src/lib/data.ts` validates the schema and all references before build. A project belongs to one primary state and city. Future cross-boundary projects can add secondary geographies.

Every factual project record needs a source ID, a dated status, and a route geometry reviewed against public evidence. Unknown dates and costs are `null`. Coordinates use GeoJSON order `[longitude, latitude]` in WGS84. `statusAsOf` and source dates use `YYYY-MM-DD`.

The Phase 1 JSON records are intentionally invented demonstration content. Their single source points to the public methodology note. Do not use these values as factual project data.

The intended Phase 2 workflow is: community report → source review → validated data pull request → maintainer approval → static rebuild. Changes to values and geometry will remain visible in Git history.
