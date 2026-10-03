import { z } from "zod";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { data } from "./data";

const changeSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  date: z.iso.date(),
  reason: z.string().min(1),
  fields: z
    .array(
      z.object({
        field: z.string().min(1),
        before: z.string().nullable(),
        after: z.string().nullable(),
      }),
    )
    .min(1),
  sourceIds: z.array(z.string()).min(1),
  issueUrl: z.url().optional(),
  pullRequestUrl: z.url().optional(),
});

const dataRoot = process.env.TRACKYOURINFRA_DATA_ROOT
  ? resolve(process.cwd(), process.env.TRACKYOURINFRA_DATA_ROOT)
  : process.cwd();
const changesJson = JSON.parse(
  readFileSync(resolve(dataRoot, "data/changes.json"), "utf8"),
);
const allChanges = z.array(changeSchema).parse(changesJson);
export const changes = allChanges
  .filter((change) =>
    data.projects.some((project) => project.id === change.projectId),
  )
  .sort((a, b) => b.date.localeCompare(a.date));
const projectIds = new Set(data.projects.map((project) => project.id));
const sourceIds = new Set(data.sources.map((source) => source.id));
for (const change of changes) {
  if (!projectIds.has(change.projectId))
    throw new Error(`Unknown project in change ${change.id}`);
  for (const id of change.sourceIds)
    if (!sourceIds.has(id))
      throw new Error(`Unknown source in change ${change.id}: ${id}`);
}
if (new Set(allChanges.map((change) => change.id)).size !== allChanges.length)
  throw new Error("Duplicate change ID");
export const changesForProject = (projectId: string) =>
  changes.filter((change) => change.projectId === projectId);
