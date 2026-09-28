import test from "node:test";
import assert from "node:assert/strict";
import {
  prepareContribution,
  issueHash,
} from "../src/lib/data-contribution.ts";
import { data } from "../src/lib/data.ts";
import cityContext from "../data/city-context.json" with { type: "json" };
import bmrcl from "../data/agencies/bmrcl.json" with { type: "json" };
import purple from "../data/projects/bengaluru-purple-line.json" with { type: "json" };
import phase3 from "../data/projects/bengaluru-metro-phase-3.json" with { type: "json" };
import purpleSource from "../data/sources/issue-4-source-1.json" with { type: "json" };
import cabinet from "../data/sources/bengaluru-phase3-cabinet.json" with { type: "json" };
import policy from "../data/sources/bengaluru-phase3-bmrcl-policy.json" with { type: "json" };

const section = (name: string, value: string) => `### ${name}\n\n${value}\n\n`;
const sourceUrl = "https://example.org/metro-report-2026";
const source = [
  section("Public source URL", sourceUrl),
  section("Source title", "Metro report 2026"),
  section("Source publisher", "Metro authority"),
  section("Source type", "primary"),
  section("Source publication date (optional)", "2026-09-01"),
  section("Source section or page (optional)", "page 2"),
  section(
    "What does this source establish?",
    "Supports the proposed change for this project.",
  ),
].join("");
const catalog = {
  ...data,
  agencies: [bmrcl],
  projects: [phase3, purple],
  sources: [cabinet, policy, purpleSource],
  cityBounds: cityContext,
};
const input = (body: string, number = 80) => ({
  ...catalog,
  issueNumber: number,
  issueUrl: `https://github.com/harshith363/TrackYourInfra/issues/${number}`,
  author: "example-user",
  today: "2026-09-28",
  body,
});

test("project update generates a sourced claim and history", () => {
  const body =
    section("Contribution type", "Project update") +
    section("Project ID", "bengaluru-purple-line") +
    section("Field to update", "status") +
    section("New value (or Unknown)", "operational") +
    section("Claim as-of date", "2026-09-01") +
    section("Confidence", "high") +
    source;
  const result = prepareContribution(input(body));
  assert.equal(result.project.status, "operational");
  assert.equal(
    result.project.claimEvidence?.status.sourceIds[0],
    "issue-80-source-1",
  );
  assert.equal(result.change.fields[0].before, null);
  assert.equal(result.issueHash, issueHash(body));
});

test("source addition changes only the source register and project references", () => {
  const body =
    section("Contribution type", "Source addition") +
    section("Project ID", "bengaluru-purple-line") +
    section("Source action", "Add new source") +
    source;
  const result = prepareContribution(input(body));
  assert.equal(result.project.status, purple.status);
  assert.deepEqual(result.project.sourceIds, [
    ...purple.sourceIds,
    "issue-80-source-1",
  ]);
  assert.equal(result.change.fields[0].field, "sourceIds");
});

test("source correction updates metadata without changing its ID", () => {
  const body =
    section("Contribution type", "Source addition") +
    section("Project ID", "bengaluru-purple-line") +
    section("Source action", "Correct existing source") +
    section("Existing source ID (for corrections)", "issue-4-source-1") +
    source;
  const result = prepareContribution(input(body));
  assert.equal(result.kind, "source-correction");
  assert.equal(result.sources[0].id, "issue-4-source-1");
  assert.deepEqual(result.project.sourceIds, purple.sourceIds);
  assert.equal(result.change.fields[0].field, "source.title");
});

test("new project uses complete source metadata without placeholder", () => {
  const body =
    section("Contribution type", "New metro project") +
    section("Project name and phase or line", "Sample Line") +
    section("City and state or Union Territory", "Bengaluru, Karnataka") +
    section("Responsible agency, if known", "BMRCL") +
    section("What does this project record cover?", "A proposed metro line.") +
    source +
    section("Optional route proposal or reference", "_No response_") +
    section("Permission to display a submitted route", "No route submitted");
  const result = prepareContribution(input(body));
  assert.equal(result.project.id, "bengaluru-sample-line");
  assert.equal(result.sources[0].title, "Metro report 2026");
  assert.doesNotMatch(result.sources[0].description, /verify title/i);
});

test("map correction keeps licensed community geometry unverified", () => {
  const geojson = JSON.stringify({
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [77.6, 12.9],
            [77.65, 13],
          ],
        },
        properties: {
          proposal: true,
          cityId: "bengaluru",
          precision: "schematic",
          sourceUrl,
        },
      },
    ],
  });
  const body =
    section("Contribution type", "Map correction") +
    section("Project ID", "bengaluru-purple-line") +
    section("Map contribution kind", "Unverified community proposal") +
    section("Route editor GeoJSON", `\`\`\`json\n${geojson}\n\`\`\``) +
    section(
      "Route license declaration",
      "I created these route points and license them under CC BY 4.0",
    ) +
    source;
  const result = prepareContribution(input(body));
  assert.equal(result.project.geometry, null);
  assert.equal(result.project.routeProposal?.status, "unverified");
  assert.equal(result.project.routeProposal?.geometry.coordinates.length, 2);
  assert.throws(
    () => prepareContribution(input(body.replace("77.65", "80"))),
    /outside the city/,
  );
  assert.throws(
    () =>
      prepareContribution(
        input(
          body.replace(
            "I created these route points and license them under CC BY 4.0",
            "No permission",
          ),
        ),
      ),
    /license declaration/,
  );
});

test("rejects repeated source URL and invalid values", () => {
  const body =
    section("Contribution type", "Project update") +
    section("Project ID", "bengaluru-purple-line") +
    section("Field to update", "progressPercent") +
    section("New value (or Unknown)", "101") +
    section("Claim as-of date", "2026-09-01") +
    section("Confidence", "high") +
    source;
  assert.throws(
    () => prepareContribution(input(body)),
    /Invalid numeric value/,
  );
  assert.throws(
    () =>
      prepareContribution({
        ...input(body),
        sources: [
          ...catalog.sources,
          { ...cabinet, id: "other", url: sourceUrl },
        ],
      }),
    /already in the register/,
  );
});
