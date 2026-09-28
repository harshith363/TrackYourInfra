import { createHash } from "node:crypto";
import {
  projectSchema,
  sourceSchema,
  validateData,
  type Project,
  type Source,
} from "./data.ts";
import { prepareNewProject } from "./issue-proposal.ts";

type Catalog = Parameters<typeof prepareNewProject>[0];
type Change = {
  id: string;
  projectId: string;
  date: string;
  reason: string;
  fields: { field: string; before: string | null; after: string | null }[];
  sourceIds: string[];
  issueUrl: string;
};
export type Proposal = {
  kind:
    "new-project" | "project-update" | "source" | "source-correction" | "map";
  project: Project;
  sources: Source[];
  change: Change;
  issueHash: string;
};

const absent = (value?: string) => !value || value === "_No response_";
const clean = (value: string, max = 400) => {
  if (absent(value) || value.length > max || /[\r\n]/.test(value))
    throw new Error("A required form value is missing or too long.");
  return value.trim();
};
export const issueHash = (body: string) =>
  createHash("sha256").update(body).digest("hex");

export function sections(body: string) {
  if (body.length > 65536) throw new Error("Issue body is too large.");
  const fields = new Map<string, string>();
  const matches = [
    ...body.matchAll(/^### (.+)\s*\n([\s\S]*?)(?=^### |$(?![\s\S]))/gm),
  ];
  for (const match of matches) {
    const key = match[1].trim();
    if (fields.has(key)) throw new Error(`Duplicate field: ${key}`);
    fields.set(key, match[2].trim());
  }
  return (heading: string) => fields.get(heading) ?? "";
}

function sourceFromForm(
  read: ReturnType<typeof sections>,
  number: number,
  today: string,
  id = `issue-${number}-source-1`,
) {
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error("Invalid source ID.");
  const urlText = clean(read("Public source URL"), 2000);
  const url = new URL(urlText);
  if (
    !["https:", "http:"].includes(url.protocol) ||
    !url.hostname.includes(".") ||
    url.username ||
    url.password
  )
    throw new Error("Public source URL must be HTTP(S) without credentials.");
  const publishedAt = read("Source publication date (optional)");
  return sourceSchema.parse({
    id,
    title: clean(read("Source title")),
    publisher: clean(read("Source publisher")),
    type: clean(read("Source type")),
    url: url.toString(),
    publishedAt: absent(publishedAt) ? null : clean(publishedAt, 10),
    accessedAt: today,
    description: clean(read("What does this source establish?"), 1500),
    ...(absent(read("Source section or page (optional)"))
      ? {}
      : { section: clean(read("Source section or page (optional)")) }),
  });
}

const claimFields = [
  "status",
  "routeLengthKm",
  "stationCount",
  "approvedCostCrore",
  "latestCostCrore",
  "originalTarget",
  "currentTarget",
  "progressPercent",
] as const;
const contentFields = ["name", "scopeDescription", "summary"] as const;
const statusValues = [
  "proposed",
  "approved",
  "funded",
  "tendering",
  "under-construction",
  "partially-operational",
  "operational",
  "delayed",
  "cancelled",
];
const show = (value: unknown) =>
  value === null || value === undefined ? null : String(value);
function valueFor(field: string, raw: string): unknown {
  if (raw === "Unknown") return null;
  if (field === "status") {
    if (!statusValues.includes(raw)) throw new Error("Invalid status value.");
    return raw;
  }
  if (["originalTarget", "currentTarget"].includes(field)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw))
      throw new Error("Date must be YYYY-MM-DD.");
    return raw;
  }
  if (claimFields.includes(field as (typeof claimFields)[number])) {
    const number = Number(raw);
    if (
      !Number.isFinite(number) ||
      number < 0 ||
      (field === "stationCount" && !Number.isInteger(number)) ||
      (field === "progressPercent" && number > 100)
    )
      throw new Error("Invalid numeric value.");
    return number;
  }
  if (contentFields.includes(field as (typeof contentFields)[number]))
    return clean(raw, 1500);
  throw new Error("Unsupported project field.");
}

function projectFor(input: Catalog, id: string) {
  const project = input.projects.find((item) => item.id === id);
  if (!project) throw new Error(`Unknown project ID: ${id}`);
  return project;
}

function routeFromForm(
  raw: string,
  project: Project,
  input: Catalog,
  sourceUrl: string,
) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("GeoJSON is invalid JSON.");
  }
  const feature = (parsed as { features?: unknown[] })?.features?.[0] as
    | {
        geometry?: { type?: string; coordinates?: unknown };
        properties?: Record<string, unknown>;
      }
    | undefined;
  if (
    (parsed as { type?: string })?.type !== "FeatureCollection" ||
    (parsed as { features?: unknown[] })?.features?.length !== 1 ||
    feature?.geometry?.type !== "LineString" ||
    feature.properties?.cityId !== project.cityId ||
    feature.properties?.proposal !== true
  )
    throw new Error("Use one route-editor LineString for this project's city.");
  if (
    feature.properties?.sourceUrl !== null &&
    feature.properties?.sourceUrl !== sourceUrl
  )
    throw new Error(
      "The route editor source URL must match the submitted source.",
    );
  const points = feature.geometry.coordinates;
  if (!Array.isArray(points) || points.length < 2 || points.length > 200)
    throw new Error("Route needs 2–200 points.");
  const bounds = input.cityBounds[project.cityId]?.bounds;
  if (!bounds) throw new Error("City map extent is unavailable.");
  for (const point of points) {
    if (
      !Array.isArray(point) ||
      point.length !== 2 ||
      point.some((n) => typeof n !== "number" || !Number.isFinite(n)) ||
      point[0] < bounds[0][0] ||
      point[0] > bounds[1][0] ||
      point[1] < bounds[0][1] ||
      point[1] > bounds[1][1]
    )
      throw new Error("A route point is invalid or outside the city extent.");
  }
  if (new Set(points.map((p) => p.join(","))).size < 2)
    throw new Error("Route needs two distinct points.");
  const precision = feature.properties?.precision;
  if (precision !== "schematic" && precision !== "approximate")
    throw new Error("Route precision must be schematic or approximate.");
  return {
    type: "LineString" as const,
    coordinates: points as [number, number][],
    precision: precision as "schematic" | "approximate",
  };
}

export function prepareContribution(input: Catalog): Proposal {
  const read = sections(input.body);
  const kind = read("Contribution type");
  const correcting =
    kind === "Source addition" &&
    read("Source action") === "Correct existing source";
  const sourceId = correcting
    ? clean(read("Existing source ID (for corrections)"), 100)
    : undefined;
  const source = sourceFromForm(read, input.issueNumber, input.today, sourceId);
  const oldSource = input.sources.find((item) => item.id === source.id);
  if (correcting && !oldSource)
    throw new Error("Existing source ID is not in the register.");
  if (!correcting && oldSource)
    throw new Error("This issue already has a published source record.");
  if (
    input.sources.some(
      (item) => item.id !== source.id && item.url === source.url,
    )
  )
    throw new Error(
      "This source URL is already in the register; cite the existing source or provide a distinct document.",
    );
  if (
    kind === "Source addition" &&
    !["Add new source", "Correct existing source"].includes(
      read("Source action"),
    )
  )
    throw new Error("Select a source action.");
  let project: Project;
  let fields: Change["fields"];
  if (kind === "New metro project") {
    const old = prepareNewProject(input);
    if (
      old.sources.length !== 1 ||
      new URL(old.sources[0].url).toString() !== source.url
    )
      throw new Error("Provide the same single URL in both source fields.");
    project = old.project;
    project.sourceIds = [source.id];
    fields = old.change.fields;
  } else {
    const id = clean(read("Project ID"), 100);
    const before = projectFor(input, id);
    project = structuredClone(before);
    project.updatedAt = input.today;
    if (correcting && !project.sourceIds.includes(source.id))
      throw new Error("That source is not linked to this project.");
    project.sourceIds = [...new Set([...project.sourceIds, source.id])];
    if (kind === "Project update") {
      const field = clean(read("Field to update"), 40);
      const raw = clean(read("New value (or Unknown)"), 1500);
      const value = valueFor(field, raw);
      if (
        show((project as unknown as Record<string, unknown>)[field]) ===
        show(value)
      )
        throw new Error("The proposed value is unchanged.");
      fields = [
        {
          field,
          before: show((project as unknown as Record<string, unknown>)[field]),
          after: show(value),
        },
      ];
      (project as unknown as Record<string, unknown>)[field] = value;
      if (claimFields.includes(field as (typeof claimFields)[number])) {
        const asOf = clean(read("Claim as-of date"), 10);
        const confidence = clean(read("Confidence"), 10);
        if (!/^(high|medium|low)$/.test(confidence))
          throw new Error("Invalid confidence.");
        project.claimEvidence = {
          ...project.claimEvidence,
          [field]: {
            sourceIds: [source.id],
            asOf,
            reviewedAt: input.today,
            confidence: confidence as "high" | "medium" | "low",
          },
        };
        if (field === "status") {
          project.statusAsOf = value === null ? null : asOf;
          project.confidence =
            value === null ? null : (confidence as "high" | "medium" | "low");
        }
      }
    } else if (kind === "Source addition") {
      if (correcting) {
        fields = Object.keys(source)
          .filter(
            (key) =>
              key !== "accessedAt" &&
              show((oldSource as unknown as Record<string, unknown>)[key]) !==
                show((source as unknown as Record<string, unknown>)[key]),
          )
          .map((key) => ({
            field: `source.${key}`,
            before: show(
              (oldSource as unknown as Record<string, unknown>)[key],
            ),
            after: show((source as unknown as Record<string, unknown>)[key]),
          }));
        if (!fields.length) throw new Error("Source metadata is unchanged.");
      } else {
        fields = [
          {
            field: "sourceIds",
            before: before.sourceIds.join(", "),
            after: project.sourceIds.join(", "),
          },
        ];
      }
    } else if (kind === "Map correction") {
      if (
        read("Route license declaration") !==
        "I created these route points and license them under CC BY 4.0"
      )
        throw new Error("Contributor route license declaration is required.");
      if (!/^[A-Za-z0-9-]+$/.test(input.author))
        throw new Error("Invalid contributor login.");
      const rawRoute = read("Route editor GeoJSON");
      if (absent(rawRoute) || rawRoute.length > 50000)
        throw new Error("Route editor GeoJSON is missing or too large.");
      const route = routeFromForm(
        rawRoute.replace(/^```(?:json)?\s*\n/i, "").replace(/\n```\s*$/, ""),
        project,
        input,
        source.url,
      );
      const mode = read("Map contribution kind");
      if (
        mode !== "Unverified community proposal" &&
        mode !== "Evidence-reviewed alignment"
      )
        throw new Error("Unknown map contribution kind.");
      if (mode === "Unverified community proposal") {
        if (project.geometry)
          throw new Error(
            "An accepted alignment already exists; use an evidence-reviewed correction.",
          );
        project.routeProposal = {
          status: "unverified",
          geometry: { type: route.type, coordinates: route.coordinates },
          precision: route.precision,
          license: "CC BY 4.0",
          creator: input.author,
          issueUrl: input.issueUrl,
          submittedAt: input.today,
          sourceIds: [source.id],
        };
        fields = [
          {
            field: "routeProposal",
            before: before.routeProposal ? "Existing proposal" : null,
            after: `${route.precision} community proposal`,
          },
        ];
      } else {
        project.routeProposal = undefined;
        project.geometry = { type: route.type, coordinates: route.coordinates };
        project.geometryMeta = {
          sourceIds: [source.id],
          precision: "reviewed",
          license: "CC BY 4.0",
          reviewedAt: input.today,
        };
        fields = [
          {
            field: "geometry",
            before: before.geometry ? "Existing alignment" : null,
            after: "Evidence-reviewed alignment",
          },
        ];
      }
    } else {
      throw new Error("Unsupported Issue Form contribution type.");
    }
  }
  project = projectSchema.parse(project);
  validateData({
    ...input,
    projects: input.projects.some((p) => p.id === project.id)
      ? input.projects.map((p) => (p.id === project.id ? project : p))
      : [...input.projects, project],
    sources: correcting
      ? input.sources.map((item) => (item.id === source.id ? source : item))
      : [...input.sources, source],
  });
  return {
    kind:
      kind === "New metro project"
        ? "new-project"
        : kind === "Project update"
          ? "project-update"
          : kind === "Source addition"
            ? correcting
              ? "source-correction"
              : "source"
            : "map",
    project,
    sources: [source],
    issueHash: issueHash(input.body),
    change: {
      id: `issue-${input.issueNumber}-change`,
      projectId: project.id,
      date: input.today,
      reason: clean(read("What does this source establish?"), 1500),
      fields,
      sourceIds: [source.id],
      issueUrl: input.issueUrl,
    },
  };
}
