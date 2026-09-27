import type { APIRoute } from 'astro';
import { data } from '../../lib/data';

export const GET: APIRoute = () => new Response(JSON.stringify({ notice: 'Demonstration data only; not verified infrastructure facts.', generatedFrom: 'TrackYourInfra Phase 1', states: data.states, cities: data.cities, agencies: data.agencies, sources: data.sources, projects: data.projects }, null, 2), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
