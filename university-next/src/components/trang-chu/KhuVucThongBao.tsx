import Link from 'next/link';
import { sanitizeInlineHtml } from '@/lib/security/html';
import SectionTitle from '@/components/ui/SectionTitle';
import { buildPostUrl } from '@/constants/duong-dan';
import { formatDateShort, toISODate } from '@/lib/utils/date';
import type { Locale } from '@/types/ngon-ngu';
import type { WPPost } from '@/types/wordpress';

export default function KhuVucThongBao({ posts, locale }: { posts: WPPost[]; locale: Locale }) {
  const href = locale === 'en' ? '/en/announcements' : '/thong-bao';
  const title = locale === 'en' ? 'Announcements' : 'Thông Báo';

  return (
    <div>
      <SectionTitle title={title} href={href} />
      {posts.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">
          {locale === 'en' ? 'No announcements yet.' : 'Chưa có thông báo.'}
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-md bg-white shadow-[0_2px_16px_rgba(15,23,42,0.12)] md:space-y-3 md:overflow-visible md:bg-transparent md:shadow-none">
          {posts.slice(0, 5).map((post) => (
            <li key={post.id} className="px-4 py-4 md:rounded-md md:bg-white md:shadow-[0_2px_14px_rgba(15,23,42,0.11)]">
              <Link href={buildPostUrl(post.slug, locale, post.link)} className="line-clamp-2 text-sm font-semibold leading-[1.45] text-[#0118d8] hover:text-[#136aa0]">
                <span dangerouslySetInnerHTML={{ __html: sanitizeInlineHtml(post.title.rendered) }} />
              </Link>
              <time dateTime={toISODate(post.date)} className="mt-2 block text-[11px] text-slate-500">{formatDateShort(post.date, locale)}</time>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
