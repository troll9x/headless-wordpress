import SectionTitle from '@/components/ui/SectionTitle';
import NewsCard from '@/components/ui/NewsCard';
import type { WPPost } from '@/types/wordpress';

interface CommunitySectionProps {
  posts: WPPost[];
}

export default function CommunitySection({ posts }: CommunitySectionProps) {
  return (
    <section className="bg-slate-50 py-12" aria-label="Vì cộng đồng">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionTitle title="Vì Cộng Đồng" href="/cong-dong" />
        {posts.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">Chưa có tin tức cộng đồng.</p>
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
