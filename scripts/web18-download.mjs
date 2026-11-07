import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const root = resolve(process.argv[2] || 'artifacts/web18-migration');
const manifest = JSON.parse(await readFile(join(root, 'manifest.json'), 'utf8'));
const files = manifest.attachments;
const results = new Array(files.length);
let next = 0;
let completed = 0;

async function sha256(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}

async function downloadOne(file) {
  const extension = basename(file.name).split('.').at(-1)?.toLowerCase();
  if (!['pdf', 'doc', 'docx'].includes(extension)) throw new Error('Unsupported extension');
  const name = `${file.attachment_id}-${basename(file.name)}`;
  const relative = join('files', String(file.document_id), name);
  const target = join(root, relative);
  await mkdir(dirname(target), { recursive: true });

  try {
    const existing = await stat(target);
    if (!file.declared_bytes || existing.size === file.declared_bytes) {
      return { ...file, path: relative, bytes: existing.size, sha256: await sha256(target), reused: true };
    }
  } catch {}

  for (let attempt = 1; attempt <= 3; attempt++) {
    const temporary = `${target}.part`;
    try {
      const response = await fetch(file.url, { signal: AbortSignal.timeout(90_000) });
      if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/html')) throw new Error('HTML response instead of document');
      await pipeline(Readable.fromWeb(response.body), createWriteStream(temporary));
      const actual = (await stat(temporary)).size;
      if (actual === 0) throw new Error('Empty file');
      if (file.declared_bytes && actual !== file.declared_bytes) {
        throw new Error(`Size mismatch ${actual}/${file.declared_bytes}`);
      }
      const digest = await sha256(temporary);
      await rename(temporary, target);
      return { ...file, path: relative, bytes: actual, sha256: digest, reused: false };
    } catch (error) {
      await rm(temporary, { force: true });
      if (attempt === 3) return { ...file, error: error.message };
    }
  }
}

async function worker() {
  while (next < files.length) {
    const index = next++;
    results[index] = await downloadOne(files[index]);
    completed++;
    if (completed % 25 === 0 || completed === files.length) {
      process.stderr.write(`Downloaded/checked ${completed}/${files.length}\n`);
      await writeFile(join(root, 'download-results.json'), JSON.stringify(results.filter(Boolean), null, 2));
    }
  }
}

await Promise.all(Array.from({ length: 4 }, worker));
const failures = results.filter((item) => item.error);
console.log(JSON.stringify({ total: files.length, downloaded: files.length - failures.length, failures: failures.map(({ document_id, attachment_id, error }) => ({ document_id, attachment_id, error })) }));
if (failures.length) process.exitCode = 1;
