import { FRONTEND_URL, SITE_NAME } from '@/constants/api';
import { UNIVERSITY } from '@/constants/site';
import { buildPostUrl } from '@/constants/duong-dan';
import type { WPPost } from '@/types/wordpress';
import type { Locale } from '@/types/ngon-ngu';

export function buildArticleSchema(post: WPPost, locale: Locale): object {
  const title = post.title.rendered.replace(/<[^>]+>/g, '');
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    datePublished: post.date,
    dateModified: post.modified,
    url: `${FRONTEND_URL}${buildPostUrl(post.slug, locale)}`,
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: FRONTEND_URL,
    },
  };
}

export function buildOrganizationSchema(): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: UNIVERSITY.fullName,
    alternateName: UNIVERSITY.shortName,
    url: FRONTEND_URL,
    address: {
      '@type': 'PostalAddress',
      streetAddress: UNIVERSITY.address,
    },
    telephone: UNIVERSITY.phone,
    email: UNIVERSITY.email,
  };
}
