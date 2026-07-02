import SectionTitle from '@/components/ui/SectionTitle';
import type { SiteStatistic } from '@/types/homepage';

interface StatsSectionProps {
  stats: SiteStatistic[];
}

export default function StatsSection({ stats }: StatsSectionProps) {
  if (stats.length === 0) return null;

  return (
    <section className="bg-slate-900 py-14" aria-label="Những con số ấn tượng">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionTitle title="Những Con Số Ấn Tượng" light className="mb-10" />
        <dl
          className={`grid gap-8 text-center ${
            stats.length <= 3
              ? `grid-cols-${stats.length}`
              : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
          }`}
        >
          {stats.map((stat, idx) => (
            <div key={idx} className="flex flex-col items-center">
              <dt className="mt-2 text-xs font-medium text-slate-400 sm:text-sm">{stat.label}</dt>
              <dd className="text-3xl font-extrabold text-amber-400 sm:text-4xl lg:text-5xl">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
