import { data } from '../src/lib/data.ts';
import { changes } from '../src/lib/changes.ts';
console.log(`Validated ${data.states.length} states, ${data.cities.length} cities, ${data.projects.length} projects, ${data.sources.length} sources and ${changes.length} visible changes.`);
