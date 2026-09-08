import Image from 'next/image';
import Link from 'next/link';
import Breadcrumb from '@/components/ui/Breadcrumb';
import { getHomePath } from '@/constants/duong-dan';
import type { Locale } from '@/types/ngon-ngu';
import type { WPCategory } from '@/types/wordpress';

interface LandingLink {
  label: string;
  href: string;
}

interface LandingCard {
  title: string;
  href: string;
  imageUrl: string;
  imageAlt: string;
  description?: string;
  links: LandingLink[];
}

interface LandingContent {
  introduction: string[];
  cards: LandingCard[];
}

const PROGRAM_IMAGES = {
  undergraduate: 'https://tlu.edu.vn/wp-content/uploads/2025/07/Dao-tao-dai-hoc.webp',
  masters: 'https://tlu.edu.vn/wp-content/uploads/2025/07/Dao-tao-thac-si.webp',
  doctoral: 'https://tlu.edu.vn/wp-content/uploads/2025/07/Dao-tao-tien-si.webp',
} as const;

function getAdmissionsContent(locale: Locale): LandingContent {
  if (locale === 'en') {
    const sharedLinks: LandingLink[] = [
      { label: 'Admission results', href: '/en/admission-results' },
      { label: 'Admission scores', href: '/en/admission-scores' },
      { label: 'Admissions information', href: '/en/admissions-information' },
    ];

    return {
      introduction: [],
      cards: [
        {
          title: 'Undergraduate',
          href: '/en/undergraduate-admissions',
          imageUrl: PROGRAM_IMAGES.undergraduate,
          imageAlt: 'Undergraduate admissions',
          links: sharedLinks,
        },
        {
          title: "Master's",
          href: '/en/masters-admissions',
          imageUrl: PROGRAM_IMAGES.masters,
          imageAlt: "Master's admissions",
          description: 'Admissions information, programs and key dates for prospective master’s students.',
          links: sharedLinks,
        },
        {
          title: 'Doctoral',
          href: '/en/doctoral-admissions',
          imageUrl: PROGRAM_IMAGES.doctoral,
          imageAlt: 'Doctoral admissions',
          description: 'Admissions requirements and program information for prospective doctoral candidates.',
          links: sharedLinks,
        },
      ],
    };
  }
  const sharedLinks: LandingLink[] = [
    { label: 'Danh sách trúng tuyển', href: '/danh-sach-trung-tuyen' },
    { label: 'Điểm chuẩn', href: '/diem-chuan' },
    { label: 'Thông tin tuyển sinh', href: '/thong-tin-tuyen-sinh' },
  ];

  return {
    introduction: [],
    cards: [
      {
        title: 'Đại học',
        href: '/dai-hoc',
        imageUrl: PROGRAM_IMAGES.undergraduate,
        imageAlt: 'Tuyển sinh đại học',
        links: sharedLinks,
      },
      {
        title: 'Cao học',
        href: '/thac-si',
        imageUrl: PROGRAM_IMAGES.masters,
        imageAlt: 'Tuyển sinh cao học',
        description:
          'Thông tin tuyển sinh, chương trình và các mốc quan trọng dành cho học viên trình độ thạc sĩ.',
        links: sharedLinks,
      },
      {
        title: 'Nghiên Cứu Sinh',
        href: '/tien-si',
        imageUrl: PROGRAM_IMAGES.doctoral,
        imageAlt: 'Tuyển sinh nghiên cứu sinh',
        description:
          'Thông tin tuyển sinh, điều kiện dự tuyển và chương trình đào tạo trình độ tiến sĩ.',
        links: sharedLinks,
      },
    ],
  };
}

function getEducationContent(locale: Locale): LandingContent {
  if (locale === 'en') {
    return {
      introduction: [
        'Education is one of the key missions of Thuyloi University. The University continuously improves training quality to meet society’s growing demand for highly qualified human resources.',
        'Its education programs build on TLU’s established strengths in engineering and technology while supporting innovation and sustainable socio-economic development.',
      ],
      cards: [
        {
          title: 'Undergraduate Programs',
          href: '/en/undergraduate-programs',
          imageUrl: PROGRAM_IMAGES.undergraduate,
          imageAlt: 'Undergraduate programs',
          links: [
            { label: 'Program outcome standards', href: '/en/chuan-dau-ra' },
            { label: 'Training programs', href: '/en/chuong-trinh-dao-tao' },
            { label: 'Graduation list', href: '/en/danh-sach-tot-nghiep' },
            { label: 'Training plan', href: '/en/ke-hoach-dao-tao' },
          ],
        },
        {
          title: "Master's Programs",
          href: '/en/masters-programs',
          imageUrl: PROGRAM_IMAGES.masters,
          imageAlt: "Master's programs",
          description:
            'Full-time and part-time programs provide flexible pathways for advanced professional and research development.',
          links: [
            { label: 'Program outcome standards', href: '/en/chuan-dau-ra-thac-si' },
            { label: 'Training programs', href: '/en/chuong-trinh-dao-tao-thac-si' },
            { label: 'Graduation list', href: '/en/danh-sach-tot-nghiep-thac-si' },
            { label: 'Training plan', href: '/en/ke-hoach-dao-tao-thac-si' },
          ],
        },
        {
          title: 'Doctoral Programs',
          href: '/en/doctoral-programs',
          imageUrl: PROGRAM_IMAGES.doctoral,
          imageAlt: 'Doctoral programs',
          description:
            'Doctoral candidates undertake concentrated study and research under the University’s doctoral training regulations.',
          links: [
            { label: 'Program outcome standards', href: '/en/chuan-dau-ra-tien-si' },
            { label: 'Training programs', href: '/en/chuong-trinh-dao-tao-tien-si' },
            { label: 'Graduation list', href: '/en/danh-sach-tot-nghiep-tien-si' },
            { label: 'Training plan', href: '/en/ke-hoach-dao-tao-tien-si' },
          ],
        },
      ],
    };
  }

  return {
    introduction: [
      'Đào tạo là một trong những nhiệm vụ trọng tâm của Trường Đại học Thủy lợi. Nhà trường không ngừng đổi mới chương trình và nâng cao chất lượng để đáp ứng nhu cầu ngày càng cao của xã hội.',
      'Các chương trình phát huy thế mạnh về kỹ thuật và công nghệ, góp phần đào tạo nguồn nhân lực chất lượng cao phục vụ phát triển kinh tế – xã hội.',
    ],
    cards: [
      {
        title: 'Đại học',
        href: '/dai-hoc-chinh-quy',
        imageUrl: PROGRAM_IMAGES.undergraduate,
        imageAlt: 'Đào tạo đại học',
        links: [
          {
            label: 'Chuẩn đầu ra & Chương trình đào tạo',
            href: '/chuan-dau-ra-va-chuong-trinh-dao-tao-dhcq',
          },
          { label: 'Danh sách tốt nghiệp', href: '/danh-sach-tot-nghiep' },
          { label: 'Quy chế, quy định', href: '/quy-che-quy-dinh' },
        ],
      },
      {
        title: 'Cao học',
        href: '/thac-si',
        imageUrl: PROGRAM_IMAGES.masters,
        imageAlt: 'Đào tạo thạc sĩ',
        description:
          'Chương trình thạc sĩ gồm hình thức chính quy và vừa làm vừa học, đáp ứng nhu cầu học tập và phát triển chuyên môn.',
        links: [
          {
            label: 'Chuẩn đầu ra',
            href: '/quyet-dinh-ban-hanh-chuan-dau-ra-trinh-do-thac-si-41355',
          },
          { label: 'Chương trình đào tạo', href: '/chuong-trinh-dao-tao-ths' },
          { label: 'Quy chế, quy định', href: '/quy-che-quy-dinh-ths' },
        ],
      },
      {
        title: 'Nghiên Cứu Sinh',
        href: '/tien-si',
        imageUrl: PROGRAM_IMAGES.doctoral,
        imageAlt: 'Đào tạo tiến sĩ',
        description:
          'Nghiên cứu sinh học tập tập trung và thực hiện nghiên cứu theo quy định của chương trình đào tạo tiến sĩ.',
        links: [
          { label: 'Quy chế, quy định', href: '/quy-che-quy-dinh-ts' },
          { label: 'Chương trình đào tạo', href: '/chuong-trinh-dao-tao-ts' },
          { label: 'Thông tin luận án', href: '/thong-tin-luan-an-ts' },
        ],
      },
    ],
  };
}

function ProgramCard({ card }: { card: LandingCard }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl bg-white shadow-[0_5px_22px_rgba(15,23,42,0.10)]">
      <Link href={card.href} className="relative block aspect-[16/10] overflow-hidden bg-slate-100">
        <Image
          src={card.imageUrl}
          alt={card.imageAlt}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </Link>
      <div className="flex flex-1 flex-col p-6">
        <h2 className="text-2xl font-extrabold uppercase text-[#0118d8]">
          <Link href={card.href} className="transition-colors hover:text-[#007cba]">
            {card.title}
          </Link>
        </h2>
        {card.description && (
          <p className="mt-3 text-sm leading-6 text-slate-600">{card.description}</p>
        )}
        <ul className="mt-5 space-y-3 border-t border-slate-100 pt-5">
          {card.links.map((item) => (
            <li key={`${item.href}-${item.label}`}>
              <Link
                href={item.href}
                className="flex items-start gap-3 text-sm font-semibold leading-5 text-[#0118d8] transition-colors hover:text-[#007cba]"
              >
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#0118d8] text-[10px] text-white">
                  ›
                </span>
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

export default function CategoryLanding({
  category,
  locale,
}: {
  category: WPCategory;
  locale: Locale;
}) {
  const content = ['tuyen-sinh', 'admission', 'admissions'].includes(category.slug)
    ? getAdmissionsContent(locale)
    : getEducationContent(locale);

  return (
    <main className="min-h-screen bg-white">
      <div className="border-b border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <Breadcrumb
            items={[
              { label: locale === 'en' ? 'Home' : 'Trang chủ', href: getHomePath(locale) },
              { label: category.name },
            ]}
          />
        </div>
      </div>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <h1 className="text-center text-3xl font-extrabold uppercase text-[#0118d8] sm:text-4xl">
          {category.name}
        </h1>
        {content.introduction.length > 0 && (
          <div className="mx-auto mt-7 max-w-5xl space-y-4 text-center text-base leading-7 text-slate-700">
            {content.introduction.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
        )}

        <div className="mt-10 grid items-stretch gap-7 md:grid-cols-3">
          {content.cards.map((card) => <ProgramCard key={card.title} card={card} />)}
        </div>
      </section>
    </main>
  );
}
