import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { issueHash } from "../src/lib/data-contribution.ts";
import { assertDataOnlyDiff } from "../src/lib/contribution-review.ts";

const repository = process.env.GITHUB_REPOSITORY;
const token = process.env.GH_TOKEN;
const issueNumber = Number(process.env.ISSUE_NUMBER);
const expectedHash = process.env.ISSUE_HASH;
const kind = process.env.CONTRIBUTION_KIND;
if (
  !repository ||
  !/^[-\w.]+\/[-\w.]+$/.test(repository) ||
  !token ||
  !Number.isSafeInteger(issueNumber) ||
  !/^[a-f0-9]{64}$/.test(expectedHash ?? "") ||
  !kind
)
  throw new Error("Missing data-publication context.");

const response = await fetch(
  `https://api.github.com/repos/${repository}/issues/${issueNumber}`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  },
);
if (!response.ok) throw new Error(`GitHub API returned ${response.status}.`);
const issue = await response.json();
if (
  issue.state !== "open" ||
  typeof issue.body !== "string" ||
  issueHash(issue.body) !== expectedHash
)
  throw new Error(
    "The issue changed during processing; retry its latest revision.",
  );
if (
  process.env.REQUIRED_LABEL &&
  !issue.labels?.some(
    (label: { name?: string }) => label.name === process.env.REQUIRED_LABEL,
  )
)
  throw new Error(
    "The required maintainer approval label is no longer present.",
  );

const checkout = resolve(".published-data");
const branch = execFileSync("git", ["branch", "--show-current"], {
  cwd: checkout,
  encoding: "utf8",
}).trim();
if (branch !== "public-data")
  throw new Error("Expected the public-data branch checkout.");
const raw = execFileSync("git", ["diff", "--cached", "--name-status", "-z"], {
  cwd: checkout,
  encoding: "utf8",
});
const pieces = raw.split("\0").filter(Boolean);
if (pieces.length % 2 !== 0) throw new Error("Invalid staged file list.");
const files = [];
for (let i = 0; i < pieces.length; i += 2)
  files.push({
    status:
      pieces[i] === "A" ? "added" : pieces[i] === "M" ? "modified" : pieces[i],
    filename: pieces[i + 1],
  });
assertDataOnlyDiff(files, kind);
console.log(`Verified ${files.length} data files for issue #${issueNumber}.`);
