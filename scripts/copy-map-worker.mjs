import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const packageDir = path.dirname(require.resolve('maplibre-gl/package.json'));
const sourceDir = path.join(packageDir, 'dist');
const targetDir = path.resolve('public/maplibre');
mkdirSync(targetDir, { recursive: true });
for (const name of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
  copyFileSync(path.join(sourceDir, name), path.join(targetDir, name));
}
console.log('MapLibre worker assets ready.');
