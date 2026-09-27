import test from 'node:test';
import assert from 'node:assert/strict';
import { data, validateData } from '../src/lib/data.ts';

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
