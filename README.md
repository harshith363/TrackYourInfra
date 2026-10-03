# TrackYourInfra

An open, map-led atlas for tracking public infrastructure in India. The current scope is metro transit. The default local build uses invented demonstration data; a separate real-data mode contains source-backed project records. Demo map lines are not surveyed alignments.

## Run locally

Requires Node.js 22.12 or newer.

```bash
npm install
npm run dev
```

To preview the source-backed dataset instead of the three demo corridors:

```bash
TRACKYOURINFRA_DATA_MODE=real npm run dev
```

To preview the latest automatically recorded contributions without changing tracked files:

```bash
npm run dev:published
```

This fetches the `public-data` branch into an ignored local cache when the server starts. Restart it to fetch later contributions. `npm run build:published` builds the same data for a future deployment. The repository's `main` branch remains the reviewed application code; `public-data` holds automatically generated project/source/history JSON.

Copy `.env.example` to `.env` or set `PUBLIC_GITHUB_REPO=harshith363/TrackYourInfra` to enable links from the contribution pages to GitHub Issue Forms and project files. Route drawing and GeoJSON export work without this setting. The local `.env` is ignored by Git.

Open the local URL printed by Astro. The map uses a locally bundled, simplified DataMeet boundary following India's official territorial depiction, including the full Jammu & Kashmir and Ladakh region and islands. No tile service or API key is required. See [map data provenance](docs/map-data.md). Sample project corridors remain illustrative, not surveyed alignments.

## Verify

```bash
npm run validate
npm test
npm run check
npm run build
TRACKYOURINFRA_DATA_MODE=real npm run build
```

## Structure

- `data/projects/`, `data/sources/`, `data/agencies/` — real records, one JSON file each
- `fixtures/demo/` — clearly separated invented records
- `data/changes.json` — accepted-change summaries for the real pilot
- `src/lib/data.ts` — schemas, cross-reference checks and formatting helpers
- `src/components/MapExplorer.astro` — India → state → city → project map navigation
- `src/pages/` — statically generated public pages
- `docs/data-standard.md` — field meanings and contribution handoff

The static JSON export is available at `/data/projects.json` after build.

Canonical URLs and a sitemap should be added once a production domain is chosen in Phase 3.

The public website, demo fixtures and real records share one MIT licensed repository. The bundled India boundary is CC0; the [separate city boundary assets](docs/city-map-data.md) retain DataMeet's CC BY-SA 2.5 India license. The [contributor guide](CONTRIBUTING.md) describes automatic GitHub Issue Form recording on the separate `public-data` branch. Deployment remains Phase 3.
