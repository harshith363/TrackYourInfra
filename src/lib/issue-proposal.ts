import {
  projectSchema,
  sourceSchema,
  type Agency,
  type City,
  type Project,
  type Source,
  type State,
} from "./data.ts";

const headings = {
  name: "Project name and phase or line",
  location: "City and state or Union Territory",
  agency: "Responsible agency, if known",
  scope: "What does this project record cover?",
  evidence: "Public source links and relevant page or section",
  route: "Optional route proposal or reference",
  routePermission: "Permission to display a submitted route",
} as const;
type Field = keyof typeof headings;
const missing = (value: string | undefined) =>
  !value || value === "_No response_";
const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function parseNewProjectIssue(body: string): Record<Field, string> {
  if (body.length > 65536) throw new Error("Issue body is too large.");
  const sections = [
    ...body.matchAll(/^### (.+)\s*\n([\s\S]*?)(?=^### |$(?![\s\S]))/gm),
  ];
  const values = new Map<string, string>();
  for (const section of sections) {
    const heading = section[1].trim();
    if (values.has(heading))
      throw new Error(`Duplicate form field: ${heading}`);
    values.set(heading, section[2].trim());
  }
  if (!values.has(headings.evidence) && values.has("Public source URL"))
    values.set(headings.evidence, values.get("Public source URL")!);
  if (
    ![
      headings.name,
      headings.location,
      headings.scope,
      headings.evidence,
    ].every((heading) => values.has(heading))
  )
    throw new Error("Only the New metro project Issue Form is supported.");
  const fields = Object.fromEntries(
    Object.entries(headings).map(([key, heading]) => [
      key,
      values.get(heading) ?? "",
    ]),
  ) as Record<Field, string>;
  for (const field of ["name", "location", "scope", "evidence"] as const)
    if (missing(fields[field]))
      throw new Error(`Required form field is missing: ${headings[field]}`);
  for (const field of ["name", "location", "agency"] as const)
    if (fields[field].length > 160 || /[\r\n]/.test(fields[field]))
      throw new Error(`Invalid form field: ${headings[field]}`);
  if (
    fields.scope.length > 2000 ||
    fields.evidence.length > 8000 ||
    fields.route.length > 50000
  )
    throw new Error("A form field is too long.");
  return fields;
}

function sourceUrls(evidence: string) {
  const matches = evidence.match(/https?:\/\/[^\s<>"']+/gi) ?? [];
  const urls = [
    ...new Set(matches.map((match) => match.replace(/[),.;\]]+$/, ""))),
  ];
  if (!urls.length || urls.length > 5)
    throw new Error("Provide one to five public HTTP(S) source URLs.");
  for (const raw of urls) {
    const url = new URL(raw);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      !url.hostname.includes(".")
    )
      throw new Error("A source URL is invalid.");
  }
  return urls;
}

function selectCity(location: string, cities: City[], states: State[]) {
  const normalized = location.toLowerCase();
  const matches = cities.filter(
    (city) =>
      new RegExp(`\\b${city.name.toLowerCase()}\\b`).test(normalized) ||
      (city.id === "bengaluru" && /\bbangalore\b/.test(normalized)),
  );
  if (matches.length !== 1)
    throw new Error(
      "City is unknown or ambiguous; update the city catalog or the issue before retrying.",
    );
  const city = matches[0];
  const state = states.find((item) => item.id === city.stateId)!;
  const otherStates = states.filter(
    (item) =>
      item.id !== state.id &&
      new RegExp(`\\b${item.name.toLowerCase()}\\b`).test(normalized),
  );
  if (otherStates.length)
    throw new Error("The stated city and state disagree.");
  return city;
}

function selectAgency(value: string, agencies: Agency[]) {
  if (missing(value))
    throw new Error(
      "A known agency is needed for an automatic draft; add it to the catalog or use a manual PR.",
    );
  const normalized = slugify(value);
  const matches = agencies.filter(
    (agency) =>
      normalized === agency.id ||
      normalized === slugify(agency.name) ||
      (agency.id === "bmrcl" &&
        [
          "bangalore-metro",
          "bengaluru-metro",
          "bangalore-metro-rail-corporation",
        ].includes(normalized)),
  );
  if (matches.length !== 1)
    throw new Error(
      "Agency is unknown or ambiguous; update the agency catalog or the issue before retrying.",
    );
  return matches[0];
}

type InspectedRoute = {
  hasProposal: boolean;
  pointCount: number;
  geometry?: { type: "LineString"; coordinates: [number, number][] };
  precision?: "schematic" | "approximate";
  sourceUrl?: string | null;
};
function inspectRoute(
  raw: string,
  bounds: number[][] | undefined,
  cityId: string,
): InspectedRoute {
  if (missing(raw)) return { hasProposal: false, pointCount: 0 };
  if (!raw.trim().startsWith("{")) return { hasProposal: true, pointCount: 0 };
  if (
    !bounds ||
    bounds.length !== 2 ||
    bounds.some((point) => point.length !== 2)
  )
    throw new Error(
      "No reviewable city extent is available for this route proposal.",
    );
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("Route proposal is not valid JSON.");
  }
  if (
    !value ||
    typeof value !== "object" ||
    (value as { type?: unknown }).type !== "FeatureCollection"
  )
    throw new Error("Route proposal must be a GeoJSON FeatureCollection.");
  const features = (value as { features?: unknown }).features;
  if (!Array.isArray(features) || features.length !== 1)
    throw new Error("Route proposal must contain exactly one feature.");
  const feature = features[0];
  const geometry = feature?.geometry;
  const coordinates =
    geometry?.type === "LineString" ? geometry.coordinates : null;
  if (
    !Array.isArray(coordinates) ||
    coordinates.length < 2 ||
    coordinates.length > 200
  )
    throw new Error("Route proposal needs 2–200 point coordinates.");
  if (feature.properties?.proposal !== true)
    throw new Error("Route GeoJSON must be marked as a proposal.");
  if (feature.properties?.cityId !== cityId)
    throw new Error("Route proposal city does not match the project city.");
  if (!["schematic", "approximate"].includes(feature.properties?.precision))
    throw new Error("Route proposal precision is missing or invalid.");
  const sourceUrl = feature.properties?.sourceUrl;
  if (
    sourceUrl !== null &&
    sourceUrl !== undefined &&
    (typeof sourceUrl !== "string" || !/^https?:\/\//.test(sourceUrl))
  )
    throw new Error("Route proposal source URL is invalid.");
  for (const point of coordinates) {
    if (
      !Array.isArray(point) ||
      point.length !== 2 ||
      point.some((n) => typeof n !== "number" || !Number.isFinite(n)) ||
      Math.abs(point[0]) > 180 ||
      Math.abs(point[1]) > 90
    )
      throw new Error("Route proposal has an invalid coordinate.");
    if (
      bounds &&
      (point[0] < bounds[0][0] ||
        point[0] > bounds[1][0] ||
        point[1] < bounds[0][1] ||
        point[1] > bounds[1][1])
    )
      throw new Error(
        "Route proposal has a point outside the selected city extent.",
      );
  }
  if (new Set(coordinates.map((point) => point.join(","))).size < 2)
    throw new Error("Route proposal needs at least two distinct points.");
  return {
    hasProposal: true,
    pointCount: coordinates.length,
    geometry: {
      type: "LineString",
      coordinates: coordinates as [number, number][],
    },
    precision: feature.properties.precision as "schematic" | "approximate",
    sourceUrl: sourceUrl ?? null,
  };
}

export function prepareNewProject(input: {
  issueNumber: number;
  issueUrl: string;
  author: string;
  body: string;
  today: string;
  cities: City[];
  states: State[];
  agencies: Agency[];
  projects: Project[];
  sources: Source[];
  cityBounds: Record<string, { bounds: number[][] }>;
}) {
  const fields = parseNewProjectIssue(input.body);
  const city = selectCity(fields.location, input.cities, input.states);
  const agency = selectAgency(fields.agency, input.agencies);
  const slug = `${city.id}-${slugify(fields.name)}`;
  if (!/^[a-z0-9-]+$/.test(slug) || slug.length > 100)
    throw new Error("Project name cannot produce a safe project ID.");
  if (
    input.projects.some(
      (project) => project.id === slug || project.slug === slug,
    )
  )
    throw new Error(`Project ${slug} already exists; use a project update PR.`);
  const urls = sourceUrls(fields.evidence);
  const sources = urls.map((url, index) =>
    sourceSchema.parse({
      id: `issue-${input.issueNumber}-source-${index + 1}`,
      title: `Source submitted in issue #${input.issueNumber} — verify title`,
      publisher: new URL(url).hostname,
      publishedAt: null,
      type: "reporting",
      url,
      description: `Contributor-submitted source for issue #${input.issueNumber}; title, publisher, date, applicability and source type require review.`,
      accessedAt: input.today,
    }),
  );
  for (const source of sources)
    if (input.sources.some((existing) => existing.id === source.id))
      throw new Error(`Source ID ${source.id} already exists.`);
  const route = inspectRoute(
    fields.route,
    input.cityBounds[city.id]?.bounds,
    city.id,
  );
  if (route.geometry) {
    if (
      fields.routePermission !==
      "I created these route points and license them under CC BY 4.0"
    )
      throw new Error(
        "Displaying route points requires the contributor permission statement.",
      );
    if (!/^[A-Za-z0-9-]+$/.test(input.author))
      throw new Error("Issue author is invalid.");
  }
  const routeSourceIds = sources.map((source) => source.id);
  const project = projectSchema.parse({
    id: slug,
    slug,
    name: fields.name,
    line: fields.name,
    stateId: city.stateId,
    cityId: city.id,
    agencyId: agency.id,
    recordKind: "real",
    infrastructureType: "metro",
    scopeDescription: fields.scope,
    status: null,
    statusAsOf: null,
    confidence: null,
    updatedAt: input.today,
    routeLengthKm: null,
    stationCount: null,
    approvedCostCrore: null,
    latestCostCrore: null,
    originalTarget: null,
    currentTarget: null,
    progressPercent: null,
    sourceIds: sources.map((source) => source.id),
    summary: fields.scope,
    colour: "#277d68",
    geometry: null,
    routeProposal: route.geometry
      ? {
          status: "unverified",
          geometry: route.geometry,
          precision: route.precision!,
          license: "CC BY 4.0",
          creator: input.author,
          issueUrl: input.issueUrl,
          submittedAt: input.today,
          sourceIds: routeSourceIds,
        }
      : undefined,
    stations: [],
    milestones: [],
  });
  return {
    project,
    sources,
    route,
    fields,
    change: {
      id: `issue-${input.issueNumber}-initial`,
      projectId: slug,
      date: input.today,
      reason: `Community project record submitted in issue #${input.issueNumber}; source claims are unverified.`,
      fields: [
        { field: "record", before: null, after: fields.name },
        ...(route.geometry
          ? [
              {
                field: "routeProposal",
                before: null,
                after: `Unverified ${route.precision} community route`,
              },
            ]
          : []),
      ],
      sourceIds: sources.map((source) => source.id),
      issueUrl: input.issueUrl,
    },
  };
}
