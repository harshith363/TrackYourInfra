import { readFileSync } from "node:fs";
import { issueHash } from "../src/lib/data-contribution.ts";

const path = process.env.GITHUB_EVENT_PATH;
const repository = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
if (!path || !repository || !token || !/^[-\w.]+\/[-\w.]+$/.test(repository))
  throw new Error("Missing GitHub review context.");
const event = JSON.parse(readFileSync(path, "utf8"));
if (event.action !== "submitted" || event.review?.state !== "approved")
  throw new Error("Expected a newly submitted approval.");
const number = event.pull_request?.number;
if (!Number.isSafeInteger(number) || number < 1)
  throw new Error("Missing pull request number.");
const api = async (suffix: string) => {
  const response = await fetch(
    `https://api.github.com/repos/${repository}/${suffix}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );
  if (!response.ok)
    throw new Error(`GitHub API returned ${response.status} for ${suffix}.`);
  return response.json();
};
const pr = await api(`pulls/${number}`);
if (
  pr.state !== "open" ||
  pr.base?.ref !== "main" ||
  pr.head?.repo?.full_name !== repository ||
  pr.user?.login !== "github-actions[bot]" ||
  typeof pr.body !== "string"
)
  throw new Error("This is not an open bot-generated data PR to main.");
const match = pr.body.match(/^Issue: #(\d+)\nIssue SHA256: ([a-f0-9]{64})$/m);
if (!match) throw new Error("PR is missing its issue revision marker.");
const issueNumber = Number(match[1]);
const hash = match[2];
if (pr.head.ref !== `automation/issue-${issueNumber}-${hash.slice(0, 12)}`)
  throw new Error("PR branch does not match the issue revision.");
const issue = await api(`issues/${issueNumber}`);
if (
  issue.state !== "open" ||
  typeof issue.body !== "string" ||
  issueHash(issue.body) !== hash
)
  throw new Error("Issue changed since generation; a new PR requires review.");
if (event.review.commit_id !== pr.head.sha)
  throw new Error("Approval is not for the current generated commit.");
const reviewer = event.review.user?.login;
if (!/^[A-Za-z0-9-]+$/.test(reviewer ?? ""))
  throw new Error("Invalid reviewer.");
const permission = await api(`collaborators/${reviewer}/permission`);
if (!["admin", "maintain", "write"].includes(permission.permission))
  throw new Error("Approval requires a maintainer with write access.");
const files = await api(`pulls/${number}/files?per_page=100`);
if (
  !Array.isArray(files) ||
  files.length !== 3 ||
  files.some((file) => file.status !== "added" && file.status !== "modified") ||
  !files.some((file) => file.filename === "data/changes.json") ||
  !files.some((file) =>
    /^data\/projects\/[a-z0-9-]+\.json$/.test(file.filename),
  ) ||
  !files.some((file) => /^data\/sources\/[a-z0-9-]+\.json$/.test(file.filename))
)
  throw new Error(
    "PR must contain exactly one project, one source, and change history.",
  );
console.log(`Verified maintainer approval of PR #${number} at ${pr.head.sha}.`);
