import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import OrganizationMemberProfile from '@/components/to-chuc/OrganizationMemberProfile';
import { FRONTEND_URL } from '@/constants/api';
import { generateHeadlessMetadata } from '@/lib/seo/metadata';
import { getOrganizationMember } from '@/lib/wordpress/organizations';
import { getHeadlessSeoById } from '@/lib/wordpress/seo';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const member = await getOrganizationMember(slug, 'vi');
  if (!member) return {};

  const seo = await getHeadlessSeoById(member.id, 'vi');
  return generateHeadlessMetadata(seo, {
    title: member.name,
    description: member.primary_position || member.name,
    canonical: `${FRONTEND_URL}/to-chuc/${encodeURIComponent(slug)}`,
    locale: 'vi',
    type: 'article',
    imageUrl: member.avatar.url || undefined,
    imageAlt: member.avatar.alt || member.name,
    publishedTime: member.date,
    modifiedTime: member.modified,
  });
}

export default async function OrganizationMemberPage({ params }: Props) {
  const member = await getOrganizationMember((await params).slug, 'vi');
  if (!member) notFound();
  return <OrganizationMemberProfile member={member} locale="vi" />;
}
