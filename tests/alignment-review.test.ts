import test from "node:test";
import assert from "node:assert/strict";
import { prepareAlignmentReview } from "../src/lib/alignment-review.ts";
import { data, type Project } from "../src/lib/data.ts";
import purple from "../data/projects/bengaluru-purple-line.json" with { type: "json" };
import source from "../data/sources/issue-4-source-1.json" with { type: "json" };
import bmrcl from "../data/agencies/bmrcl.json" with { type: "json" };

const section = (name: string, value: string) => `### ${name}\n\n${value}\n\n`;
const evidenceUrl = "https://example.org/official-route-map.pdf";
const body =
  section("Project ID", "bengaluru-purple-line") +
  section("Alignment evidence URL", evidenceUrl) +
  section(
    "How does this source establish the drawn path?",
    "The official map shows each turn and station along this drawn corridor.",
  );
const input = (issueBody = body) => ({
  ...data,
  agencies: [bmrcl],
  projects: [structuredClone(purple) as unknown as Project],
  sources: [source],
  issueNumber: 83,
  issueUrl: "https://github.com/harshith363/TrackYourInfra/issues/83",
  body: issueBody,
  today: "2026-10-03",
});

test("review moves the exact proposed coordinates to a sourced solid alignment", () => {
  const result = prepareAlignmentReview(input());
  assert.deepEqual(result.project.geometry, purple.routeProposal.geometry);
  assert.equal(result.project.routeProposal, undefined);
  assert.equal(result.project.geometryMeta?.precision, "reviewed");
  assert.equal(result.project.geometryMeta?.creator, "harshith363");
  assert.deepEqual(result.project.geometryMeta?.sourceIds, [
    "issue-4-source-1",
    "issue-83-source-1",
  ]);
  assert.equal(result.sources[0].url, evidenceUrl);
  assert.equal(result.change.fields[0].field, "geometry");
});

test("reuses a registered evidence URL", () => {
  const catalog = input();
  catalog.sources.push({ ...source, id: "existing-map", url: evidenceUrl });
  const result = prepareAlignmentReview(catalog);
  assert.deepEqual(result.sources, []);
  assert.ok(result.project.geometryMeta?.sourceIds.includes("existing-map"));
});

test("rejects projects without a dashed proposal and unsafe evidence URLs", () => {
  const catalog = input();
  catalog.projects[0].routeProposal = undefined;
  assert.throws(() => prepareAlignmentReview(catalog), /existing dashed route/);
  assert.throws(
    () =>
      prepareAlignmentReview(
        input(body.replace(evidenceUrl, "file:///tmp/map.pdf")),
      ),
    /public HTTP/,
  );
  assert.throws(
    () =>
      prepareAlignmentReview(
        input(
          body.replace(
            "The official map shows each turn and station along this drawn corridor.",
            "It is there.",
          ),
        ),
      ),
    /20–1500/,
  );
});
