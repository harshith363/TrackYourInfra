import test from 'node:test';
import assert from 'node:assert/strict';
import { data, validateData } from '../src/lib/data.ts';
import realProject from '../data/projects/bengaluru-metro-phase-3.json' with { type: 'json' };
import bmrcl from '../data/agencies/bmrcl.json' with { type: 'json' };
import cabinet from '../data/sources/bengaluru-phase3-cabinet.json' with { type: 'json' };
import policy from '../data/sources/bengaluru-phase3-bmrcl-policy.json' with { type: 'json' };

const fixture = () => JSON.parse(JSON.stringify(data));
test('rejects a project with an unknown source', () => {
  const input = fixture(); input.projects[0].sourceIds = ['missing'];
  assert.throws(() => validateData(input), /Unknown source/);
});
test('rejects a city assigned to the wrong state', () => {
  const input = fixture(); input.projects[0].stateId = 'maharashtra';
  assert.throws(() => validateData(input), /Invalid city\/state/);
});
test('rejects malformed dates', () => {
  const input = fixture(); input.projects[0].statusAsOf = 'September 2026';
  assert.throws(() => validateData(input));
});
test('real pilot validates with claim evidence and an unknown alignment', () => {
  const input = fixture(); input.projects = [realProject]; input.sources = [cabinet, policy]; input.agencies = [bmrcl];
  assert.equal(validateData(input).projects[0].geometry, null);
});
test('real project rejects a factual value without its own evidence', () => {
  const input = fixture(); input.projects = [structuredClone(realProject)]; input.sources = [cabinet, policy]; input.agencies = [bmrcl];
  delete input.projects[0].claimEvidence.routeLengthKm;
  assert.throws(() => validateData(input), /Missing evidence for routeLengthKm/);
});
