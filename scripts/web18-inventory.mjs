import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const origin = 'https://web18.tlu.edu.vn';
const output = resolve(process.argv[2] || 'artifacts/web18-migration');
const pageSize = 50;
const endpoint = new URL('/DesktopModules/cmsview/api/Document/list', origin);

async function fetchPage(page) {
  const url = new URL(endpoint);
  for (const [key, value] of Object.entries({
    PortalId: 0, TypeId: 0, SectorId: 0, IssueId: 0, ImplementId: 0,
    PriorityId: 0, DocNumber: '', Status: 4, Keyword: '',
    pageindex: page, pagesize: pageSize,
  })) url.searchParams.set(key, String(value));

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data.ListData) || !Number.isInteger(data.TotalCount)) {
        throw new Error('Unexpected Document/list response');
      }
      return data;
    } catch (error) {
      if (attempt === 3) throw new Error(`Page ${page}: ${error.message}`);
    }
  }
}

const first = await fetchPage(1);
const pages = Math.ceil(first.TotalCount / pageSize);
const documents = [...first.ListData];
for (let page = 2; page <= pages; page++) {
  const result = await fetchPage(page);
  if (result.TotalCount !== first.TotalCount) {
    throw new Error(`Source total changed while reading page ${page}`);
  }
  documents.push(...result.ListData);
  process.stderr.write(`Fetched ${page}/${pages} pages\r`);
}

const ids = new Set(documents.map((document) => document.Id));
if (documents.length !== first.TotalCount || ids.size !== documents.length) {
  throw new Error(`Incomplete source inventory: ${documents.length}/${first.TotalCount}, unique ${ids.size}`);
}

const attachments = documents.flatMap((document) =>
  (document.docAttachments || []).filter((file) => file.Status !== false && !file.IsDeleted)
    .map((file) => ({
      document_id: document.Id,
      attachment_id: file.Id,
      url: new URL(file.FileUrl, origin).href,
      name: file.FileName,
      declared_bytes: Number(file.FileSize) || null,
      content_type: file.ContentType || '',
    })),
);
for (const file of attachments) {
  const parsed = new URL(file.url);
  if (parsed.origin !== origin || !parsed.pathname.startsWith('/Portals/0/DocumentFiles/')) {
    throw new Error(`Unexpected attachment URL for document ${file.document_id}`);
  }
}

const manifest = {
  source: endpoint.href,
  captured_at: new Date().toISOString(),
  total: documents.length,
  documents,
  attachments,
};
const summary = {
  documents: documents.length,
  with_attachments: documents.filter((document) => (document.docAttachments || []).length > 0).length,
  attachments: attachments.length,
  declared_bytes: attachments.reduce((sum, file) => sum + (file.declared_bytes || 0), 0),
  missing_attachments: documents.filter((document) => !(document.docAttachments || []).length).map((document) => document.Id),
  effect_values: Object.fromEntries([...new Set(documents.map((document) => document.IsInEffect))].map((value) => [value, documents.filter((document) => document.IsInEffect === value).length])),
  types: Object.fromEntries([...new Set(documents.map((document) => document.docType?.DocumentTypeName || ''))].map((value) => [value, documents.filter((document) => (document.docType?.DocumentTypeName || '') === value).length])),
};
await mkdir(output, { recursive: true });
await writeFile(resolve(output, 'manifest.json'), JSON.stringify(manifest, null, 2));
await writeFile(resolve(output, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ output, ...summary }));
