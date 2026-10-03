import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const cache = resolve(".cache/public-data");
execFileSync("git", ["fetch", "origin", "public-data"], { stdio: "inherit" });
const listed = execFileSync(
  "git",
  [
    "ls-tree",
    "-r",
    "--name-only",
    "FETCH_HEAD",
    "data/projects",
    "data/sources",
    "data/changes.json",
  ],
  { encoding: "utf8" },
)
  .trim()
  .split("\n")
  .filter((path) => path.endsWith(".json"));
if (!listed.includes("data/changes.json"))
  throw new Error("The public-data branch has no change history.");
for (const path of listed)
  if (
    !/^data\/(?:projects|sources)\/[a-z0-9-]+\.json$/.test(path) &&
    path !== "data/changes.json"
  )
    throw new Error(`Unexpected public-data path: ${path}`);
rmSync(cache, { recursive: true, force: true });
for (const path of listed) {
  const file = resolve(cache, path);
  mkdirSync(resolve(file, ".."), { recursive: true });
  const bytes = execFileSync("git", ["show", `FETCH_HEAD:${path}`]);
  writeFileSync(file, bytes);
}
console.log(
  `Synced ${listed.length} public-data files to the local ignored cache.`,
);
