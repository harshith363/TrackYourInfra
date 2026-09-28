import test from "node:test";
import assert from "node:assert/strict";
import { assertDataOnlyDiff } from "../src/lib/contribution-review.ts";

const changes = { filename: "data/changes.json", status: "modified" };
const source = {
  filename: "data/sources/issue-4-source-1.json",
  status: "modified",
};
const project = {
  filename: "data/projects/bengaluru-purple-line.json",
  status: "modified",
};

test("allows a source-only correction without a redundant project edit", () => {
  assert.doesNotThrow(() =>
    assertDataOnlyDiff([changes, source], "source-correction"),
  );
  assert.doesNotThrow(() =>
    assertDataOnlyDiff([changes, source, project], "source-correction"),
  );
});

test("other contributions need one source, project, and history file", () => {
  assert.doesNotThrow(() =>
    assertDataOnlyDiff([changes, source, project], "map"),
  );
  assert.throws(
    () => assertDataOnlyDiff([changes, source], "map"),
    /unexpected files/,
  );
  assert.throws(
    () =>
      assertDataOnlyDiff(
        [
          changes,
          source,
          { filename: "scripts/publish.ts", status: "modified" },
        ],
        "map",
      ),
    /unexpected files/,
  );
  assert.throws(
    () =>
      assertDataOnlyDiff(
        [changes, source, { ...project, status: "removed" }],
        "map",
      ),
    /delete or rename/,
  );
});
