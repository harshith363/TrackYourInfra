import { z } from 'zod';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import statesJson from '../../data/states.json';
import citiesJson from '../../data/cities.json';

export const dataMode = process.env.TRACKYOURINFRA_DATA_MODE === 'real' ? 'real' : 'demo';
const collection = (path: string) => {
  const directory = resolve(process.cwd(), path);
  return readdirSync(directory).filter((name) => name.endsWith('.json')).sort().map((name) => JSON.parse(readFileSync(resolve(directory, name), 'utf8')));
};
const agenciesJson = dataMode === 'real' ? collection('data/agencies') : collection('fixtures/demo/agencies');
const sourcesJson = dataMode === 'real' ? collection('data/sources') : collection('fixtures/demo/sources');
const projectsJson = dataMode === 'real' ? collection('data/projects') : collection('fixtures/demo/projects');

const date = z.iso.date();
const coordinates = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);
export const stateSchema = z.object({ id: z.string(), name: z.string(), code: z.string(), type: z.enum(['state', 'union-territory']), summary: z.string(), center: coordinates, zoom: z.number() });
export const citySchema = z.object({ id: z.string(), name: z.string(), stateId: z.string(), summary: z.string(), coordinates });
export const agencySchema = z.object({ id: z.string(), name: z.string(), officialUrl: z.url().optional() });
export const sourceSchema = z.object({ id: z.string(), title: z.string(), publisher: z.string(), publishedAt: date.nullable(), type: z.enum(['primary', 'reporting', 'field', 'demonstration']), url: z.string(), description: z.string(), accessedAt: date.optional(), section: z.string().optional() });
export const milestoneSchema = z.object({ id: z.string(), date, title: z.string(), description: z.string(), sourceId: z.string(), confidence: z.enum(['high', 'medium', 'low']) });
export const projectSchema = z.object({
  id: z.string(), slug: z.string(), name: z.string(), line: z.string(), stateId: z.string(), cityId: z.string(), agencyId: z.string(),
  recordKind: z.enum(['demonstration', 'real']), infrastructureType: z.literal('metro'), scopeDescription: z.string().min(1),
  status: z.enum(['proposed', 'approved', 'funded', 'tendering', 'under-construction', 'partially-operational', 'operational', 'delayed', 'cancelled']).nullable(),
  statusAsOf: date.nullable(), confidence: z.enum(['high', 'medium', 'low']).nullable(), updatedAt: date,
  routeLengthKm: z.number().nonnegative().nullable(), stationCount: z.number().int().nonnegative().nullable(),
  approvedCostCrore: z.number().nonnegative().nullable(), latestCostCrore: z.number().nonnegative().nullable(),
  originalTarget: date.nullable(), currentTarget: date.nullable(), progressPercent: z.number().min(0).max(100).nullable(),
  sourceIds: z.array(z.string()).min(1), summary: z.string(), colour: z.string(),
  geometry: z.object({ type: z.literal('LineString'), coordinates: z.array(coordinates).min(2) }).nullable(),
  geometryMeta: z.object({ sourceIds: z.array(z.string()).min(1), precision: z.enum(['schematic', 'approximate', 'reviewed']), license: z.string().min(1), reviewedAt: date.nullable() }).optional(),
  claimEvidence: z.record(z.string(), z.object({ sourceIds: z.array(z.string()).min(1), asOf: date.nullable(), reviewedAt: date.nullable(), confidence: z.enum(['high', 'medium', 'low']), qualifier: z.string().optional() })).optional(),
  stations: z.array(z.string()), milestones: z.array(milestoneSchema),
});

export type State = z.infer<typeof stateSchema>;
export type City = z.infer<typeof citySchema>;
export type Agency = z.infer<typeof agencySchema>;
export type Source = z.infer<typeof sourceSchema>;
export type Project = z.infer<typeof projectSchema>;

export function validateData(input: { states: unknown; cities: unknown; agencies: unknown; sources: unknown; projects: unknown }) {
  const states = z.array(stateSchema).parse(input.states);
  const cities = z.array(citySchema).parse(input.cities);
  const agencies = z.array(agencySchema).parse(input.agencies);
  const sources = z.array(sourceSchema).parse(input.sources);
  const projects = z.array(projectSchema).parse(input.projects);
  const unique = (items: { id: string }[], label: string) => {
    if (new Set(items.map((item) => item.id)).size !== items.length) throw new Error(`Duplicate ${label} id`);
  };
  unique(states, 'state'); unique(cities, 'city'); unique(agencies, 'agency'); unique(sources, 'source'); unique(projects, 'project');
  if (new Set(projects.map((item) => item.slug)).size !== projects.length) throw new Error('Duplicate project slug');
  const stateIds = new Set(states.map((item) => item.id));
  const cityById = new Map(cities.map((item) => [item.id, item]));
  const agencyIds = new Set(agencies.map((item) => item.id));
  const sourceIds = new Set(sources.map((item) => item.id));
  for (const city of cities) if (!stateIds.has(city.stateId)) throw new Error(`Unknown state ${city.stateId} in city ${city.id}`);
  for (const project of projects) {
    const city = cityById.get(project.cityId);
    if (!city || city.stateId !== project.stateId) throw new Error(`Invalid city/state relationship in ${project.id}`);
    if (!agencyIds.has(project.agencyId)) throw new Error(`Unknown agency in ${project.id}`);
    for (const id of project.sourceIds) if (!sourceIds.has(id)) throw new Error(`Unknown source ${id} in ${project.id}`);
    for (const milestone of project.milestones) if (!sourceIds.has(milestone.sourceId)) throw new Error(`Unknown milestone source in ${project.id}`);
    if (project.geometryMeta) for (const id of project.geometryMeta.sourceIds) if (!sourceIds.has(id)) throw new Error(`Unknown geometry source in ${project.id}`);
    if (project.claimEvidence) for (const claim of Object.values(project.claimEvidence)) for (const id of claim.sourceIds) if (!sourceIds.has(id)) throw new Error(`Unknown claim source in ${project.id}`);
    if (project.recordKind === 'real') {
      if (project.geometry && !project.geometryMeta) throw new Error(`Missing geometry metadata in ${project.id}`);
      const requiredClaims = ['status', 'routeLengthKm', 'stationCount', 'approvedCostCrore', 'latestCostCrore', 'originalTarget', 'currentTarget', 'progressPercent'] as const;
      for (const key of requiredClaims) if (project[key] !== null && !project.claimEvidence?.[key]) throw new Error(`Missing evidence for ${key} in ${project.id}`);
      if (!project.sourceIds.length) throw new Error(`Missing project sources in ${project.id}`);
      for (const id of project.sourceIds) {
        const source = sources.find((item) => item.id === id)!;
        if (!/^https?:\/\//.test(source.url) || source.type === 'demonstration') throw new Error(`Real project ${project.id} has an invalid source ${id}`);
      }
    }
  }
  return { states, cities, agencies, sources, projects };
}

export const data = validateData({ states: statesJson, cities: citiesJson, agencies: agenciesJson, sources: sourcesJson, projects: projectsJson });
export const getState = (id: string) => data.states.find((state) => state.id === id);
export const getCity = (id: string) => data.cities.find((city) => city.id === id);
export const getAgency = (id: string) => data.agencies.find((agency) => agency.id === id);
export const getSource = (id: string) => data.sources.find((source) => source.id === id);
export const projectsForCity = (cityId: string) => data.projects.filter((project) => project.cityId === cityId);
export const projectsForState = (stateId: string) => data.projects.filter((project) => project.stateId === stateId);
export const statusLabel = (status: Project['status']) => status ? status.split('-').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ') : 'Not verified';
export const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`)) : 'Not reported';
export const formatCost = (value: number | null) => value === null ? 'Not reported' : `₹${value.toLocaleString('en-IN')} cr`;
