import SectionTitle from '@/components/ui/SectionTitle';
import NewsCard from '@/components/ui/NewsCard';
import type { WPPost } from '@/types/wordpress';

interface CooperationSectionProps {
  posts: WPPost[];
}

export default function CooperationSection({ posts }: CooperationSectionProps) {
  return (
    <section className="bg-white py-12" aria-label="Hợp tác quốc tế">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionTitle title="Hợp Tác Quốc Tế" href="/hop-tac-quoc-te" />
        {posts.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">Chưa có tin tức hợp tác quốc tế.</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {posts.map((post) => (
              <NewsCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
