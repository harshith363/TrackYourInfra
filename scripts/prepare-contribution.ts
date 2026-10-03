import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { data } from "../src/lib/data.ts";
import { prepareContribution } from "../src/lib/data-contribution.ts";
import cityContext from "../data/city-context.json" with { type: "json" };

process.on("uncaughtException", (error) => {
  const message = error instanceof Error ? error.message : String(error);
  const safe = message.replace(/[\r\n]/g, " ").slice(0, 500);
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `Submission needs correction: ${safe}\n`,
    );
  if (process.env.GITHUB_OUTPUT)
    appendFileSync(process.env.GITHUB_OUTPUT, `error=${safe}\n`);
  console.error(safe);
  process.exitCode = 1;
});
process.on("unhandledRejection", (reason) => {
  throw reason;
});

const eventPath = process.env.GITHUB_EVENT_PATH;
const repository = process.env.GITHUB_REPOSITORY;
if (!eventPath || !repository || !/^[-\w.]+\/[-\w.]+$/.test(repository))
  throw new Error("Missing GitHub issue context.");
const event = JSON.parse(readFileSync(eventPath, "utf8"));
const issue = event.issue;
if (
  !Number.isSafeInteger(issue?.number) ||
  issue.number < 1 ||
  issue.state !== "open" ||
  typeof issue.body !== "string" ||
  typeof issue.html_url !== "string" ||
  !/^https:\/\/github\.com\//.test(issue.html_url)
)
  throw new Error("Expected an open GitHub issue with a body.");
const today = new Date().toISOString().slice(0, 10);
const proposal = prepareContribution({
  issueNumber: issue.number,
  issueUrl: issue.html_url,
  author: issue.user?.login,
  body: issue.body,
  today,
  ...data,
  cityBounds: cityContext,
});
const changesPath = resolve("data/changes.json");
const changes = JSON.parse(readFileSync(changesPath, "utf8"));
if (
  !Array.isArray(changes) ||
  changes.some((item) => item.id === proposal.change.id)
)
  throw new Error("This issue already has a published change record.");
const projectPath = resolve(`data/projects/${proposal.project.id}.json`);
writeFileSync(projectPath, `${JSON.stringify(proposal.project, null, 2)}\n`);
if (proposal.sources[0]) {
  const sourcePath = resolve(`data/sources/${proposal.sources[0].id}.json`);
  writeFileSync(
    sourcePath,
    `${JSON.stringify(proposal.sources[0], null, 2)}\n`,
    proposal.kind === "source-correction" ? undefined : { flag: "wx" },
  );
}
changes.push(proposal.change);
writeFileSync(changesPath, `${JSON.stringify(changes, null, 2)}\n`);

const branch = `automation/issue-${issue.number}-${proposal.issueHash.slice(0, 12)}`;
const title = `Data contribution from issue #${issue.number}`;
const body = [
  `Closes #${issue.number}`,
  "",
  `Original report: ${issue.html_url}`,
  `Issue: #${issue.number}`,
  `Issue SHA256: ${proposal.issueHash}`,
  `Contribution type: ${proposal.kind}`,
  `Project: ${proposal.project.id}`,
  "",
  "Automatically generated from the issue and checked for data validity. Source claims have not been independently verified.",
  proposal.kind === "map"
    ? "A community proposal remains unverified unless the form requested an evidence-reviewed alignment and the source establishes that exact alignment."
    : "",
]
  .filter(Boolean)
  .join("\n");
const bodyPath = resolve(
  process.env.RUNNER_TEMP ?? ".",
  `issue-${issue.number}-body.md`,
);
writeFileSync(bodyPath, `${body}\n`);
if (process.env.GITHUB_OUTPUT)
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `branch=${branch}\nbody_path=${bodyPath}\ntitle=${title}\nissue_number=${issue.number}\nissue_hash=${proposal.issueHash}\nkind=${proposal.kind}\n`,
  );
console.log(`Prepared ${proposal.kind} for ${proposal.project.id}.`);
