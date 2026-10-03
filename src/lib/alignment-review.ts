import {
  projectSchema,
  sourceSchema,
  validateData,
  type Project,
  type Source,
} from "./data.ts";
import { issueHash, sections } from "./data-contribution.ts";

type Catalog = Parameters<typeof validateData>[0] & {
  projects: Project[];
  sources: Source[];
  issueNumber: number;
  issueUrl: string;
  body: string;
  today: string;
};

export function prepareAlignmentReview(input: Catalog) {
  const read = sections(input.body);
  const id = read("Project ID").trim();
  if (!/^[a-z0-9-]{1,100}$/.test(id))
    throw new Error("Enter a valid project ID.");
  const before = input.projects.find((project) => project.id === id);
  if (!before) throw new Error(`Unknown project ID: ${id}`);
  if (before.geometry || !before.routeProposal)
    throw new Error(
      "This project needs an existing dashed route proposal and no reviewed alignment.",
    );
  const explanation = read(
    "How does this source establish the drawn path?",
  ).trim();
  if (explanation.length < 20 || explanation.length > 1500)
    throw new Error(
      "Explain how the source supports the drawn path (20–1500 characters).",
    );
  let url: URL;
  try {
    url = new URL(read("Alignment evidence URL").trim());
  } catch {
    throw new Error("Enter a valid alignment evidence URL.");
  }
  if (
    !["https:", "http:"].includes(url.protocol) ||
    !url.hostname.includes(".") ||
    url.username ||
    url.password
  )
    throw new Error(
      "Alignment evidence URL must be a public HTTP(S) URL without credentials.",
    );
  const existingSource = input.sources.find(
    (source) => source.url === url.toString(),
  );
  const source =
    existingSource ??
    sourceSchema.parse({
      id: `issue-${input.issueNumber}-source-1`,
      title: `${url.hostname}${url.pathname === "/" ? "" : url.pathname}`.slice(
        0,
        400,
      ),
      publisher: url.hostname,
      type: "reporting",
      url: url.toString(),
      publishedAt: null,
      accessedAt: input.today,
      description: explanation,
    });
  if (!existingSource && input.sources.some((item) => item.id === source.id))
    throw new Error("This issue already has a published source record.");
  const proposal = before.routeProposal;
  const project = projectSchema.parse({
    ...before,
    updatedAt: input.today,
    sourceIds: [...new Set([...before.sourceIds, source.id])],
    geometry: proposal.geometry,
    geometryMeta: {
      sourceIds: [...new Set([...proposal.sourceIds, source.id])],
      precision: "reviewed",
      license: proposal.license,
      reviewedAt: input.today,
      creator: proposal.creator,
      proposalIssueUrl: proposal.issueUrl,
    },
    routeProposal: undefined,
  });
  validateData({
    ...input,
    projects: input.projects.map((item) => (item.id === id ? project : item)),
    sources: existingSource ? input.sources : [...input.sources, source],
  });
  return {
    kind: "alignment",
    project,
    sources: existingSource ? [] : [source],
    issueHash: issueHash(input.body),
    change: {
      id: `issue-${input.issueNumber}-alignment`,
      projectId: id,
      date: input.today,
      reason: explanation,
      fields: [
        {
          field: "geometry",
          before: "Unverified community proposal",
          after: "Reviewed alignment",
        },
      ],
      sourceIds: [...new Set([...proposal.sourceIds, source.id])],
      issueUrl: input.issueUrl,
    },
  };
}
