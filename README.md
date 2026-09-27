# TrackYourInfra

An open, map led prototype for tracking public infrastructure in India. Phase 1 focuses on metro transit and uses invented demonstration data. No map line, cost, date, milestone or agency in this repository should be treated as a real project claim.

## Run locally

Requires Node.js 22.12 or newer.

```bash
npm install
npm run dev
```

Open the local URL printed by Astro. The map uses a schematic, self contained India outline and local GeoJSON, so it works without a tile service. The outline and sample corridors are illustrative and should be replaced with reviewed geography before a public launch.

## Verify

```bash
npm run validate
npm test
npm run check
npm run build
```

## Structure

- `data/` — states, cities, agencies, projects and source JSON
- `src/lib/data.ts` — schemas, cross-reference checks and formatting helpers
- `src/components/MapExplorer.astro` — India → state → city → project map navigation
- `src/pages/` — statically generated public pages
- `docs/data-standard.md` — field meanings and contribution handoff

The static JSON export is available at `/data/projects.json` after build.

Canonical URLs and a sitemap should be added once a production domain is chosen in Phase 3.

The public website and data are intended to share one MIT licensed repository. Community review, verified real project data, notifications and deployment are later phases.
