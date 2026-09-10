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

/** Sanitize trusted-editor CMS markup against an explicit HTML allowlist. */
export function sanitizeCmsHtml(value: string): string {
  return sanitizeHtml(value, cmsOptions);
}

/** Sanitize short labels/search highlights while rejecting links and media. */
export function sanitizeInlineHtml(value: string): string {
  return sanitizeHtml(value, inlineOptions);
}
