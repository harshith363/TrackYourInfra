import { issueHash } from "../src/lib/data-contribution.ts";
import { assertDataOnlyDiff } from "../src/lib/contribution-review.ts";

const repository = process.env.GITHUB_REPOSITORY;
const token = process.env.GH_TOKEN;
const issueNumber = Number(process.env.ISSUE_NUMBER);
const expectedHash = process.env.ISSUE_HASH;
const headSha = process.env.HEAD_SHA;
const prUrl = process.env.PR_URL;
const kind = process.env.CONTRIBUTION_KIND;
if (
  !repository ||
  !/^[-\w.]+\/[-\w.]+$/.test(repository) ||
  !token ||
  !Number.isSafeInteger(issueNumber) ||
  !/^[a-f0-9]{64}$/.test(expectedHash ?? "") ||
  !/^[a-f0-9]{40}$/.test(headSha ?? "") ||
  !prUrl ||
  !kind
)
  throw new Error("Missing automatic-publication context.");
const url = new URL(prUrl);
const prNumber = Number(url.pathname.split("/").at(-1));
if (
  url.origin !== "https://github.com" ||
  !url.pathname.startsWith(`/${repository}/pull/`) ||
  !Number.isSafeInteger(prNumber)
)
  throw new Error("Unexpected generated PR URL.");
const api = async (path: string) => {
  const response = await fetch(
    `https://api.github.com/repos/${repository}/${path}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );
  if (!response.ok) throw new Error(`GitHub API returned ${response.status}.`);
  return response.json();
};
const issue = await api(`issues/${issueNumber}`);
if (
  issue.state !== "open" ||
  typeof issue.body !== "string" ||
  issueHash(issue.body) !== expectedHash
)
  throw new Error(
    "The issue changed during processing; retry its latest revision.",
  );
const pr = await api(`pulls/${prNumber}`);
if (
  pr.state !== "open" ||
  pr.base?.ref !== "main" ||
  pr.head?.repo?.full_name !== repository ||
  pr.head?.sha !== headSha ||
  pr.head?.ref !==
    `automation/issue-${issueNumber}-${expectedHash.slice(0, 12)}` ||
  pr.user?.login !== "github-actions[bot]"
)
  throw new Error("Generated PR does not match the validated issue revision.");
const files = await api(`pulls/${prNumber}/files?per_page=100`);
assertDataOnlyDiff(files, kind);
console.log(`Verified data-only PR #${prNumber} for issue #${issueNumber}.`);
