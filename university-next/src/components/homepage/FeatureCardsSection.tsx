import Link from 'next/link';

const FEATURE_CARDS = [
  {
    key: 'dao-tao',
    title: 'Đào Tạo',
    description: 'Chương trình đại học và sau đại học với hơn 75 ngành đào tạo chất lượng cao',
    href: '/dao-tao',
    gradient: 'from-blue-950 to-blue-800',
    initial: 'ĐT',
  },
  {
    key: 'sinh-vien',
    title: 'Sinh Viên',
    description: 'Hỗ trợ và phát triển toàn diện: học bổng, hoạt động ngoại khoá, nghiên cứu khoa học',
    href: '/sinh-vien',
    gradient: 'from-blue-900 to-indigo-800',
    initial: 'SV',
  },
  {
    key: 'cuu-sinh-vien',
    title: 'Cựu Sinh Viên',
    description: 'Mạng lưới kết nối hơn 100.000 cựu sinh viên TLU trên toàn quốc và quốc tế',
    href: '/cuu-sinh-vien',
    gradient: 'from-slate-800 to-blue-900',
    initial: 'CSV',
  },
] as const;

/*
 * TODO: Replace gradient backgrounds with WordPress featured images.
 * Fetch pages by slug: 'dao-tao', 'sinh-vien', 'cuu-sinh-vien'.
 * Use page._embedded?.['wp:featuredmedia']?.[0] as the card background image.
 * Optional ACF fields: card_title, card_description per page.
 */
export default function FeatureCardsSection() {
  return (
    <section className="bg-white py-12" aria-label="Đào tạo, Sinh viên, Cựu sinh viên">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-5 sm:grid-cols-3">
          {FEATURE_CARDS.map((card) => (
            <Link
              key={card.key}
              href={card.href}
              className={`group relative flex min-h-52 flex-col justify-end overflow-hidden rounded-xl bg-gradient-to-br ${card.gradient} p-6 text-white transition-all hover:-translate-y-0.5 hover:shadow-2xl`}
            >
              <span
                className="absolute right-4 top-4 select-none text-6xl font-extrabold text-white/10"
                aria-hidden="true"
              >
                {card.initial}
              </span>
              <h3 className="text-xl font-extrabold uppercase tracking-wide">{card.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-white/70">{card.description}</p>
              <span className="mt-4 inline-block text-xs font-semibold uppercase tracking-widest text-white/50 transition-colors group-hover:text-amber-300">
                Tìm hiểu thêm →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
