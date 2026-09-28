import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { data, validateData } from "../src/lib/data.ts";
import { prepareNewProject } from "../src/lib/issue-proposal.ts";
import cityContext from "../data/city-context.json" with { type: "json" };

process.on("uncaughtException", (error) => {
  const message = error instanceof Error ? error.message : String(error);
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `Draft not created: ${message.replace(/[\r\n]/g, " ")}\n`,
    );
  console.error(message);
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  throw reason;
});

const eventPath = process.env.GITHUB_EVENT_PATH;
const repository = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
if (
  !eventPath ||
  !repository ||
  !token ||
  !/^[-\w.]+\/[-\w.]+$/.test(repository)
)
  throw new Error("Missing GitHub Actions context.");
const event = JSON.parse(readFileSync(eventPath, "utf8"));
if (
  event.action !== "labeled" ||
  event.label?.name !== "automation:prepare-draft-pr"
)
  throw new Error("This workflow requires the preparation label event.");
if (
  !Number.isSafeInteger(event.issue?.number) ||
  event.issue.number < 1 ||
  event.issue.state !== "open"
)
  throw new Error("Expected an open issue.");
if (
  typeof event.sender?.login !== "string" ||
  !/^[A-Za-z0-9-]+$/.test(event.sender.login)
)
  throw new Error("Invalid label actor.");

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
  if (!response.ok)
    throw new Error(`GitHub API ${path} returned ${response.status}.`);
  return response.json();
};
const permission = await api(`collaborators/${event.sender.login}/permission`);
if (!["admin", "maintain", "write"].includes(permission.permission))
  throw new Error("The label actor does not have repository write access.");
const issue = await api(`issues/${event.issue.number}`);
if (
  issue.state !== "open" ||
  !issue.labels?.some(
    (label: { name: string }) => label.name === "automation:prepare-draft-pr",
  )
)
  throw new Error("Issue is closed or the preparation label was removed.");
if (typeof issue.body !== "string" || typeof issue.html_url !== "string")
  throw new Error("Issue body is unavailable.");

const today = new Date().toISOString().slice(0, 10);
const proposal = prepareNewProject({
  issueNumber: event.issue.number,
  issueUrl: issue.html_url,
  author: issue.user?.login,
  body: issue.body,
  today,
  cities: data.cities,
  states: data.states,
  agencies: data.agencies,
  projects: data.projects,
  sources: data.sources,
  cityBounds: cityContext,
});
validateData({
  ...data,
  projects: [...data.projects, proposal.project],
  sources: [...data.sources, ...proposal.sources],
});

const changesPath = resolve("data/changes.json");
const changes = JSON.parse(readFileSync(changesPath, "utf8"));
if (
  !Array.isArray(changes) ||
  changes.some((change) => change.id === proposal.change.id)
)
  throw new Error(
    "Change history ID already exists or the history is invalid.",
  );
for (const source of proposal.sources)
  writeFileSync(
    resolve(`data/sources/${source.id}.json`),
    `${JSON.stringify(source, null, 2)}\n`,
    { flag: "wx" },
  );
writeFileSync(
  resolve(`data/projects/${proposal.project.id}.json`),
  `${JSON.stringify(proposal.project, null, 2)}\n`,
  { flag: "wx" },
);
changes.push(proposal.change);
writeFileSync(changesPath, `${JSON.stringify(changes, null, 2)}\n`);

const branch = `automation/issue-${event.issue.number}-project`;
const title = `Draft project data from issue #${event.issue.number}`;
const prBody = [
  `Closes ${issue.html_url} only when merged. This is a **draft** requiring human evidence review.`,
  "",
  `Project: ${proposal.project.name} (${proposal.project.cityId})`,
  `Submitted sources: ${proposal.sources.length}. Route proposal: ${proposal.route.hasProposal ? `${proposal.route.pointCount || "unparsed"} points/reference in the issue` : "none"}.`,
  "",
  "The project name, scope, agency, city, and URLs came from the issue form. Source titles/types are provisional.",
  "Status, dates, costs, length, stations, progress, and accepted geometry remain unknown. A contributor-licensed route may be shown separately as an UNVERIFIED proposal after merge.",
  "",
  "Review before marking ready:",
  "- [ ] Confirm this is not a duplicate and its scope is precise.",
  "- [ ] Verify city and responsible agency.",
  "- [ ] Open each source; replace provisional title, publisher, type, dates and description.",
  "- [ ] Verify any factual status/metrics and add claim evidence, or leave null.",
  "- [ ] Check route permission and attribution. Keep the proposed line explicitly unverified; add accepted geometry only after independent source review.",
  "- [ ] Check the change-history entry and run validation after edits.",
  "",
].join("\n");
const bodyPath = resolve(
  process.env.RUNNER_TEMP ?? ".",
  `issue-${event.issue.number}-pr-body.md`,
);
writeFileSync(bodyPath, prBody, { flag: "wx" });
if (process.env.GITHUB_OUTPUT)
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `branch=${branch}\nbody_path=${bodyPath}\ntitle=${title}\n`,
  );
if (process.env.GITHUB_STEP_SUMMARY)
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `Prepared draft files for ${issue.html_url}. Geometry is not accepted automatically.\n`,
  );
console.log(
  `Prepared ${proposal.project.id} with ${proposal.sources.length} source(s); route proposal retained only in issue.`,
);
