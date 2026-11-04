import { stripHtml } from '@/lib/utils/html';

export interface ArticleTocItem {
  id: string;
  level: number;
  title: string;
}

/** Add stable anchors to sanitized CMS headings and build their navigation list. */
export function prepareArticleToc(html: string, postId: number): {
  html: string;
  headings: ArticleTocItem[];
} {
  const headings: ArticleTocItem[] = [];
  const reservedIds = new Set(
    Array.from(html.matchAll(/\sid="([^"]+)"/gi), (match) => stripHtml(match[1])),
  );
  const seenHeadingIds = new Set<string>();

  const content = html.replace(/<h([2-4])\b([^>]*)>([\s\S]*?)<\/h\1>/gi, (full, rawLevel: string, attributes: string, innerHtml: string) => {
    const title = stripHtml(innerHtml).replace(/\s+/g, ' ').trim();
    if (!title) return full;

    const existingId = attributes.match(/\sid=(["'])(.*?)\1/i);
    let id = existingId ? stripHtml(existingId[2]) : '';
    let generated = false;

    if (!id || seenHeadingIds.has(id)) {
      generated = true;
      const baseId = `article-heading-${postId}-${headings.length + 1}`;
      id = baseId;
      for (let suffix = 2; reservedIds.has(id); suffix += 1) {
        id = `${baseId}-${suffix}`;
      }
    }

    reservedIds.add(id);
    seenHeadingIds.add(id);
    headings.push({ id, level: Number(rawLevel), title });

    const nextAttributes = existingId && generated
      ? attributes.replace(/\sid=(["']).*?\1/i, ` id="${id}"`)
      : existingId ? attributes : `${attributes} id="${id}"`;

    return `<h${rawLevel}${nextAttributes}>${innerHtml}</h${rawLevel}>`;
  });

  return { html: content, headings };
}
