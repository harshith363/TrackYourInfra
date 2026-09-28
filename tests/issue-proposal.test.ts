import test from "node:test";
import assert from "node:assert/strict";
import { data, validateData } from "../src/lib/data.ts";
import { prepareNewProject } from "../src/lib/issue-proposal.ts";
import cityContext from "../data/city-context.json" with { type: "json" };
import bmrcl from "../data/agencies/bmrcl.json" with { type: "json" };
import realProject from "../data/projects/bengaluru-metro-phase-3.json" with { type: "json" };
import cabinet from "../data/sources/bengaluru-phase3-cabinet.json" with { type: "json" };
import policy from "../data/sources/bengaluru-phase3-bmrcl-policy.json" with { type: "json" };

const body = `### Project name and phase or line

Purple line

### City and state or Union Territory

Bangalore

### Responsible agency, if known

BMRCL

### What does this project record cover?

Existing metro line

### Public source links and relevant page or section

https://en.wikipedia.org/wiki/Namma_Metro

### Optional route proposal or reference

_No response_

### Permission to display a submitted route

No route submitted
`;
const input = (issueBody = body) => ({
  issueNumber: 1,
  issueUrl: "https://github.com/harshith363/TrackYourInfra/issues/1",
  author: "test-contributor",
  body: issueBody,
  today: "2026-09-28",
  ...data,
  agencies: [bmrcl],
  projects: [realProject],
  sources: [cabinet, policy],
  cityBounds: cityContext as Record<
    string,
    { bounds: [[number, number], [number, number]] }
  >,
});

test("prepares a conservative Purple Line draft", () => {
  const result = prepareNewProject(input());
  assert.equal(result.project.id, "bengaluru-purple-line");
  assert.equal(result.project.agencyId, "bmrcl");
  assert.equal(result.project.geometry, null);
  assert.equal(result.project.status, null);
  assert.equal(
    result.sources[0].url,
    "https://en.wikipedia.org/wiki/Namma_Metro",
  );
});
test("rejects an unsupported issue form", () => {
  assert.throws(
    () => prepareNewProject(input("### Bug\nBroken map")),
    /Only the New metro project/,
  );
});
test("rejects missing source, ambiguous city, and duplicate project", () => {
  assert.throws(
    () =>
      prepareNewProject(
        input(
          body.replace(
            "https://en.wikipedia.org/wiki/Namma_Metro",
            "_No response_",
          ),
        ),
      ),
    /Required form field/,
  );
  assert.throws(
    () =>
      prepareNewProject(
        input(body.replace("Bangalore", "Bangalore and Mumbai")),
      ),
    /ambiguous/,
  );
  assert.throws(
    () =>
      prepareNewProject({
        ...input(),
        projects: [{ ...data.projects[0], id: "bengaluru-purple-line" }],
      }),
    /already exists/,
  );
});
test("rejects malformed or out-of-city route proposals", () => {
  assert.throws(
    () => prepareNewProject(input(body.replace("_No response_", "{broken"))),
    /valid JSON/,
  );
  const route = JSON.stringify({
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [77.6, 12.9],
            [80, 13],
          ],
        },
        properties: {
          cityId: "bengaluru",
          proposal: true,
          precision: "schematic",
          sourceUrl: null,
        },
      },
    ],
  });
  assert.throws(
    () => prepareNewProject(input(body.replace("_No response_", route))),
    /outside the selected city/,
  );
});

test("publishes contributor-licensed coordinates only as an unverified proposal", () => {
  const route = JSON.stringify({
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          cityId: "bengaluru",
          proposal: true,
          precision: "schematic",
          sourceUrl: "https://en.wikipedia.org/wiki/Namma_Metro",
        },
        geometry: {
          type: "LineString",
          coordinates: [
            [77.6, 12.9],
            [77.65, 13.0],
          ],
        },
      },
    ],
  });
  const withRoute = body
    .replace("_No response_", route)
    .replace(
      "No route submitted",
      "I created these route points and license them under CC BY 4.0",
    );
  const result = prepareNewProject(input(withRoute));
  assert.equal(result.project.geometry, null);
  assert.equal(result.project.routeProposal?.status, "unverified");
  assert.equal(result.project.routeProposal?.geometry.coordinates.length, 2);
  assert.equal(result.project.routeProposal?.creator, "test-contributor");
  assert.equal(result.change.fields[1]?.field, "routeProposal");
  const records = {
    states: data.states,
    cities: data.cities,
    agencies: [bmrcl],
    sources: [cabinet, policy, ...result.sources],
    projects: [realProject, result.project],
  };
  assert.doesNotThrow(() => validateData(records));
  assert.throws(
    () =>
      validateData({
        ...records,
        projects: [
          realProject,
          {
            ...result.project,
            geometry: result.project.routeProposal!.geometry,
          },
        ],
      }),
    /cannot coexist/,
  );
  assert.throws(
    () => prepareNewProject(input(body.replace("_No response_", route))),
    /permission statement/,
  );
});
