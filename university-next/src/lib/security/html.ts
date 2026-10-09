import sanitizeHtml from 'sanitize-html';

const sharedAttributes = ['class', 'id', 'title', 'lang', 'dir', 'aria-*', 'data-*'];

const cmsOptions: sanitizeHtml.IOptions = {
  allowedTags: [
    'a', 'abbr', 'address', 'article', 'aside', 'b', 'blockquote', 'br',
    'caption', 'cite', 'code', 'col', 'colgroup', 'dd', 'del', 'details',
    'div', 'dl', 'dt', 'em', 'figcaption', 'figure', 'footer', 'h1', 'h2',
    'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'i', 'iframe', 'img', 'li',
    'main', 'mark', 'nav', 'ol', 'p', 'picture', 'pre', 'section', 'small',
    'source', 'span', 'strong', 'sub', 'summary', 'sup', 'table', 'tbody',
    'td', 'tfoot', 'th', 'thead', 'time', 'tr', 'u', 'ul', 'video',
  ],
  allowedAttributes: {
    '*': sharedAttributes,
    a: ['href', 'name', 'target', 'rel'],
    blockquote: ['cite'],
    col: ['span', 'width'],
    colgroup: ['span', 'width'],
    iframe: [
      'src', 'width', 'height', 'allow', 'allowfullscreen', 'loading',
      'referrerpolicy', 'sandbox',
    ],
    img: [
      'src', 'srcset', 'sizes', 'alt', 'width', 'height', 'loading',
      'decoding', 'referrerpolicy',
    ],
    source: ['src', 'srcset', 'sizes', 'type', 'media'],
    table: ['summary', 'width'],
    td: ['colspan', 'rowspan', 'headers', 'width'],
    th: ['colspan', 'rowspan', 'headers', 'scope', 'width'],
    time: ['datetime'],
    video: ['src', 'poster', 'width', 'height', 'controls', 'preload'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: {
    img: ['https', 'data'],
    source: ['https'],
    video: ['https'],
  },
  allowedSchemesAppliedToAttributes: ['href', 'src', 'cite', 'poster'],
  allowProtocolRelative: false,
  allowedIframeHostnames: [
    'www.google.com',
    'www.youtube.com',
    'www.youtube-nocookie.com',
  ],
  transformTags: {
    a: (_tagName, attribs) => {
      if (attribs.target === '_blank') {
        const rel = new Set((attribs.rel || '').split(/\s+/).filter(Boolean));
        rel.add('noopener');
        rel.add('noreferrer');
        attribs.rel = Array.from(rel).join(' ');
      }
      return { tagName: 'a', attribs };
    },
    iframe: (_tagName, attribs) => ({
      tagName: 'iframe',
      attribs: {
        ...attribs,
        loading: 'lazy',
        referrerpolicy: 'no-referrer',
        sandbox: attribs.sandbox || 'allow-scripts allow-same-origin allow-presentation',
      },
    }),
    img: (_tagName, attribs) => ({
      tagName: 'img',
      attribs: {
        ...attribs,
        loading: attribs.loading || 'lazy',
        decoding: attribs.decoding || 'async',
      },
    }),
  },
  disallowedTagsMode: 'discard',
  enforceHtmlBoundary: true,
};

const inlineOptions: sanitizeHtml.IOptions = {
  allowedTags: ['b', 'br', 'em', 'i', 'mark', 'span', 'strong', 'sub', 'sup'],
  allowedAttributes: {
    mark: ['class'],
    span: ['class'],
  },
  disallowedTagsMode: 'discard',
  enforceHtmlBoundary: true,
};

function resolveMediaUrl(value: string, mediaBaseUrl: string): string {
  const url = value.trim();
  if (!url || /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(url)) return value;

  try {
    return new URL(url, mediaBaseUrl).toString();
  } catch {
    return value;
  }
}

function resolveMediaSrcset(value: string, mediaBaseUrl: string): string {
  return value.split(',').map((candidate) => {
    const [url, ...descriptors] = candidate.trim().split(/\s+/);
    if (!url) return candidate;
    return [resolveMediaUrl(url, mediaBaseUrl), ...descriptors].join(' ');
  }).join(', ');
}

/** Sanitize trusted-editor CMS markup against an explicit HTML allowlist. */
export function sanitizeCmsHtml(value: string, mediaBaseUrl?: string): string {
  const options = mediaBaseUrl
    ? {
        ...cmsOptions,
        transformTags: {
          ...cmsOptions.transformTags,
          img: (_tagName: string, attribs: Record<string, string>) => ({
            tagName: 'img',
            attribs: {
              ...attribs,
              ...(attribs.src ? { src: resolveMediaUrl(attribs.src, mediaBaseUrl) } : {}),
              ...(attribs.srcset ? { srcset: resolveMediaSrcset(attribs.srcset, mediaBaseUrl) } : {}),
              loading: attribs.loading || 'lazy',
              decoding: attribs.decoding || 'async',
            },
          }),
          source: (_tagName: string, attribs: Record<string, string>) => ({
            tagName: 'source',
            attribs: {
              ...attribs,
              ...(attribs.src ? { src: resolveMediaUrl(attribs.src, mediaBaseUrl) } : {}),
              ...(attribs.srcset ? { srcset: resolveMediaSrcset(attribs.srcset, mediaBaseUrl) } : {}),
            },
          }),
        },
      }
    : cmsOptions;

  return sanitizeHtml(value, options);
}

/** Sanitize short labels/search highlights while rejecting links and media. */
export function sanitizeInlineHtml(value: string): string {
  return sanitizeHtml(value, inlineOptions);
}
