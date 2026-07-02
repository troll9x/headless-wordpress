import Link from 'next/link';
import SectionTitle from '@/components/ui/SectionTitle';
import { stripHtml } from '@/lib/utils/html';
import type { WPPost } from '@/types/wordpress';

interface TrainingUnitsSectionProps {
  posts: WPPost[];
}

export default function TrainingUnitsSection({ posts }: TrainingUnitsSectionProps) {
  return (
    <section className="bg-slate-50 py-12" aria-label="Các đơn vị đào tạo">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionTitle title="Các Đơn Vị Đào Tạo" href="/khoa-dao-tao" />
        {posts.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            Chưa có dữ liệu đơn vị đào tạo.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => {
              const titleText = stripHtml(post.title.rendered);
              return (
                <Link
                  key={post.id}
                  href={`/tin-tuc/${post.slug}`}
                  className="group flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800"
                >
                  <span
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-900 text-xs font-bold text-white"
                    aria-hidden="true"
                  >
                    {titleText.charAt(0).toUpperCase()}
                  </span>
                  <span className="line-clamp-1 flex-1">{titleText}</span>
                  <span
                    className="flex-shrink-0 text-slate-300 transition-colors group-hover:text-blue-600"
                    aria-hidden="true"
                  >
                    →
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
