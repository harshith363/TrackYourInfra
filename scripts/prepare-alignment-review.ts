import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { data } from "../src/lib/data.ts";
import { prepareAlignmentReview } from "../src/lib/alignment-review.ts";

process.on("uncaughtException", (error) => {
  const message = error instanceof Error ? error.message : String(error);
  const safe = message.replace(/[\r\n]/g, " ").slice(0, 500);
  if (process.env.GITHUB_OUTPUT)
    appendFileSync(process.env.GITHUB_OUTPUT, `error=${safe}\n`);
  console.error(safe);
  process.exitCode = 1;
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
  issue.html_url !== `https://github.com/${repository}/issues/${issue.number}`
)
  throw new Error("Expected an open issue in this repository.");
const today = new Date().toISOString().slice(0, 10);
const proposal = prepareAlignmentReview({
  issueNumber: issue.number,
  issueUrl: issue.html_url,
  body: issue.body,
  today,
  ...data,
});
const changesPath = resolve("data/changes.json");
const changes = JSON.parse(readFileSync(changesPath, "utf8"));
if (
  !Array.isArray(changes) ||
  changes.some((item) => item.id === proposal.change.id)
)
  throw new Error("This issue already has a published alignment review.");

if (process.env.ALIGNMENT_CHECK_ONLY === "1") {
  console.log(
    `Request is structurally valid for ${proposal.project.id}; evidence still needs human review.`,
  );
} else {
  const projectRelativePath = `data/projects/${proposal.project.id}.json`;
  writeFileSync(
    resolve(projectRelativePath),
    `${JSON.stringify(proposal.project, null, 2)}\n`,
  );
  let sourceRelativePath = "";
  if (proposal.sources[0]) {
    sourceRelativePath = `data/sources/${proposal.sources[0].id}.json`;
    writeFileSync(
      resolve(sourceRelativePath),
      `${JSON.stringify(proposal.sources[0], null, 2)}\n`,
      { flag: "wx" },
    );
  }
  changes.push(proposal.change);
  writeFileSync(changesPath, `${JSON.stringify(changes, null, 2)}\n`);
  if (process.env.GITHUB_OUTPUT)
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `issue_number=${issue.number}\nissue_hash=${proposal.issueHash}\nkind=alignment\nproject_path=${projectRelativePath}\nsource_path=${sourceRelativePath}\n`,
    );
  console.log(`Prepared reviewed alignment for ${proposal.project.id}.`);
}
