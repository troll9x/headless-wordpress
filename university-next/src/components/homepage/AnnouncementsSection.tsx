import Link from 'next/link';
import SectionTitle from '@/components/ui/SectionTitle';
import { formatDateShort, toISODate } from '@/lib/utils/date';
import type { WPPost } from '@/types/wordpress';

interface AnnouncementsSectionProps {
  posts: WPPost[];
}

export default function AnnouncementsSection({ posts }: AnnouncementsSectionProps) {
  if (posts.length === 0) {
    return (
      <div>
        <SectionTitle title="Thông Báo" href="/thong-bao" />
        <p className="py-6 text-center text-sm text-slate-400">Chưa có thông báo.</p>
      </div>
    );
  }

  return (
    <div>
      <SectionTitle title="Thông Báo" href="/thong-bao" />
      <ul className="divide-y divide-slate-100">
        {posts.map((post) => (
          <li
            key={post.id}
            className="group flex items-start gap-3 py-3 first:pt-0 last:pb-0"
          >
            <time
              dateTime={toISODate(post.date)}
              className="flex-shrink-0 rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700"
            >
              {formatDateShort(post.date)}
            </time>
            <Link
              href={`/tin-tuc/${post.slug}`}
              className="line-clamp-2 text-sm text-slate-700 transition-colors group-hover:text-blue-800"
            >
              <span dangerouslySetInnerHTML={{ __html: post.title.rendered }} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
