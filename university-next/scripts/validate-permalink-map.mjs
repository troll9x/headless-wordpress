import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const filename = process.argv[2];
if (!filename) {
  console.error('Usage: node scripts/validate-permalink-map.mjs <redirect-map.json>');
  process.exit(2);
}

const map = JSON.parse(await readFile(resolve(filename), 'utf8'));
if (!map || Array.isArray(map) || typeof map !== 'object') {
  throw new Error('Redirect map must be a JSON object of source path to target path.');
}

const failures = [];
for (const [source, target] of Object.entries(map)) {
  if (!source.startsWith('/') || source.startsWith('//') || source.includes('?') || source.includes('#')) {
    failures.push(`Invalid source path: ${source}`);
  }
  if (typeof target !== 'string' || !target.startsWith('/') || target.startsWith('//') || target.includes('#')) {
    failures.push(`Invalid target path for ${source}: ${target}`);
  }
  if (source.replace(/\/$/, '') === String(target).replace(/\/$/, '')) {
    failures.push(`Self redirect: ${source}`);
  }
  if (Object.hasOwn(map, target)) {
    failures.push(`Redirect chain detected: ${source} -> ${target}`);
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`Validated ${Object.keys(map).length} permanent redirects.`);
