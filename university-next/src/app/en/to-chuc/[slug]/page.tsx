import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import OrganizationMemberProfile from '@/components/to-chuc/OrganizationMemberProfile';
import { FRONTEND_URL } from '@/constants/api';
import { generateHeadlessMetadata } from '@/lib/seo/metadata';
import { getHeadlessSeoById } from '@/lib/wordpress/seo';
import { getOrganizationMember } from '@/lib/wordpress/organizations';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const member = await getOrganizationMember(slug, 'en');
  if (!member) return {};

  const seo = await getHeadlessSeoById(member.id, 'en');
  return generateHeadlessMetadata(seo, {
    title: member.name,
    description: member.primary_position || member.name,
    canonical: `${FRONTEND_URL}/en/to-chuc/${encodeURIComponent(slug)}`,
    locale: 'en',
    type: 'article',
    imageUrl: member.avatar.url || undefined,
    imageAlt: member.avatar.alt || member.name,
    publishedTime: member.date,
    modifiedTime: member.modified,
  });
}

export default async function EnglishOrganizationMemberPage({ params }: Props) {
  const member = await getOrganizationMember((await params).slug, 'en');
  if (!member) notFound();
  return <OrganizationMemberProfile member={member} locale="en" />;
}
