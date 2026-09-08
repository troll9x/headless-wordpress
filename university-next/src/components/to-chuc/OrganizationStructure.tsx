'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { sanitizeCmsHtml } from '@/lib/security/html';
import type { FacultySliderItem } from '@/types/homepage';
import type { Locale } from '@/types/ngon-ngu';
import type { OrganizationData, OrganizationMember } from '@/lib/wordpress/organizations';
import type { OrganizationStaticSections } from '@/lib/wordpress/static-pages';
import { tabbedContentStyles } from '@/styles/tlu-template-recipes';

interface UnitLink {
  name: string;
  url?: string;
}

const ADMINISTRATIVE_UNITS_VI: UnitLink[] = [
  { name: 'Phòng Hành chính – Tổng hợp' },
  { name: 'Phòng Tổ chức cán bộ' },
  { name: 'Phòng Đào tạo' },
  { name: 'Phòng Khảo thí và Đảm bảo chất lượng' },
  { name: 'Phòng Chính trị và Công tác sinh viên' },
  { name: 'Phòng Khoa học công nghệ và Hợp tác quốc tế' },
  { name: 'Phòng Tài chính – Kế toán' },
  { name: 'Phòng Quản trị – Thiết bị' },
  { name: 'Trung tâm Nội trú' },
  { name: 'Trung tâm Tin học' },
  { name: 'Thư viện' },
  { name: 'Trạm Y tế' },
];

const ADMINISTRATIVE_UNITS_EN: UnitLink[] = [
  { name: 'Administration and General Affairs Office' },
  { name: 'Personnel Office' },
  { name: 'Academic Affairs Office' },
  { name: 'Testing and Quality Assurance Office' },
  { name: 'Political and Student Affairs Office' },
  { name: 'Science, Technology and International Cooperation Office' },
  { name: 'Finance and Accounting Office' },
  { name: 'Facilities and Equipment Office' },
  { name: 'Residential Services Center' },
  { name: 'Information Technology Center' },
  { name: 'Library' },
  { name: 'Health Station' },
];

const SCIENCE_UNITS_VI: UnitLink[] = [
  { name: 'Viện Đào tạo và Khoa học ứng dụng Miền Trung', url: 'https://vienmientrung.edu.vn/' },
  { name: 'Trung tâm Khoa học và Triển khai kỹ thuật Thủy lợi', url: 'https://cra.tlu.edu.vn/' },
  { name: 'Văn phòng Tư vấn thẩm định thiết kế & Giám định chất lượng công trình xây dựng' },
  { name: 'Viện Kỹ thuật Công trình', url: 'https://ce.tlu.edu.vn/vien-ky-thuat-cong-trinh' },
  { name: 'Viện Kỹ thuật Tài nguyên nước', url: 'https://iwe.tlu.edu.vn/' },
  { name: 'Viện Thủy văn Môi trường và Biến đổi khí hậu', url: 'https://tvmt.tlu.edu.vn/' },
  { name: 'Viện Thủy lợi và Môi trường', url: 'https://www.iwer.vn/' },
  { name: 'Viện Nghiên cứu ứng dụng công nghệ và Hợp tác doanh nghiệp', url: 'https://www.facebook.com/iartep.tlu' },
];

const SCIENCE_UNITS_EN: UnitLink[] = [
  { name: 'Institute of Training and Applied Science for Central Vietnam', url: 'https://vienmientrung.edu.vn/' },
  { name: 'Center for Water Resources Science and Engineering', url: 'https://cra.tlu.edu.vn/' },
  { name: 'Office of Design Appraisal Consultancy and Construction Quality Inspection' },
  { name: 'Institute of Civil Engineering', url: 'https://ce.tlu.edu.vn/vien-ky-thuat-cong-trinh' },
  { name: 'Institute of Water Resources Engineering', url: 'https://iwe.tlu.edu.vn/' },
  { name: 'Institute of Hydrology, Environment and Climate Change', url: 'https://tvmt.tlu.edu.vn/' },
  { name: 'Institute for Water and Environment Research', url: 'https://www.iwer.vn/' },
  { name: 'Institute of Applied Technology Research and Enterprise Cooperation', url: 'https://www.facebook.com/iartep.tlu' },
];

function MemberAvatar({ member, leader = false }: { member: OrganizationMember; leader?: boolean }) {
  const sizeClass = leader ? 'h-[120px] w-[120px]' : 'h-20 w-20';
  return (
    <div className={`relative mx-auto shrink-0 overflow-hidden rounded-full bg-slate-100 ${sizeClass}`}>
      {member.avatar.url ? (
        <Image
          src={member.avatar.sizes.medium || member.avatar.url}
          alt={member.avatar.alt || member.name}
          fill
          sizes={leader ? '120px' : '80px'}
          className="object-cover"
        />
      ) : (
        <span className={`flex h-full items-center justify-center font-bold text-slate-500 ${leader ? 'text-5xl' : 'text-2xl'}`}>
          {member.initial}
        </span>
      )}
    </div>
  );
}

function LeadershipPanel({ data, locale }: { data: OrganizationData; locale: Locale }) {
  const isEn = locale === 'en';
  const memberPath = (slug: string) => `${isEn ? '/en' : ''}/to-chuc/${slug}`;

  return (
    <div className="mx-auto max-w-[1200px] px-0 py-5">
      {data.category.description && (
        <div className="mx-auto mb-8 max-w-3xl text-center leading-7 text-slate-600" dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(data.category.description) }} />
      )}
      {data.leader && (
        <Link
          href={data.leader.link || memberPath(data.leader.slug)}
          className="mx-auto mb-10 block w-full cursor-pointer overflow-hidden rounded-[15px] border border-[#e0e0e0] bg-white p-[30px] text-center text-black transition duration-300 hover:-translate-y-[5px] hover:shadow-[0_15px_35px_rgba(44,85,48,0.3)] md:w-1/2"
        >
          <MemberAvatar member={data.leader} leader />
          <div className="mt-4">
            <p className="mb-[5px] text-base font-normal text-[#555]">{data.leader.position}</p>
            <h2 className="mb-[15px] text-xl font-bold text-black">{data.leader.name}</h2>
            {data.leader.description && <p className="text-sm leading-6 text-[#666]">{data.leader.description}</p>}
          </div>
        </Link>
      )}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">
        {data.members.map((member) => (
          <Link
            key={member.id || member.slug}
            href={member.link || memberPath(member.slug)}
            className="group block cursor-pointer rounded-[10px] border border-[#e0e0e0] bg-white p-5 text-center transition duration-300 hover:-translate-y-[3px] hover:shadow-[0_8px_25px_rgba(0,0,0,0.1)]"
          >
            <MemberAvatar member={member} />
            <p className="mt-[15px] text-base font-normal text-[#555]">{member.position}</p>
            <h3 className="mt-[5px] text-xl font-bold text-[#333]">{member.name}</h3>
          </Link>
        ))}
      </div>
      {!data.leader && data.members.length === 0 && (
        <p className="rounded-xl bg-slate-50 py-10 text-center text-slate-500">
          {isEn ? 'No member information is available.' : 'Chưa có dữ liệu thành viên.'}
        </p>
      )}
    </div>
  );
}

function FacultyPanel({ faculties }: { faculties: FacultySliderItem[] }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {faculties.map((faculty) => {
        const card = (
          <>
            <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
              {faculty.imageUrl && <Image src={faculty.imageUrl} alt={faculty.imageAlt} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />}
            </div>
            <div className="p-5">
              <h3 className="font-heading text-lg font-bold uppercase text-[#0118d8]">{faculty.title}</h3>
              {faculty.description && <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{faculty.description}</p>}
            </div>
          </>
        );
        return faculty.websiteUrl ? (
          <a key={faculty.id} href={faculty.websiteUrl} target="_blank" rel="noopener noreferrer" className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">{card}</a>
        ) : (
          <article key={faculty.id} className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">{card}</article>
        );
      })}
    </div>
  );
}

function UnitsPanel({ units }: { units: UnitLink[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {units.map((unit, index) => {
        const content = (
          <>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-extrabold text-[#0118d8]">{String(index + 1).padStart(2, '0')}</span>
            <span className="font-semibold leading-6 text-slate-800">{unit.name}</span>
          </>
        );
        return unit.url ? (
          <a key={unit.name} href={unit.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 rounded-xl border border-slate-200 p-4 transition hover:border-[#0118d8] hover:bg-blue-50">{content}</a>
        ) : (
          <div key={unit.name} className="flex items-center gap-4 rounded-xl border border-slate-200 p-4">{content}</div>
        );
      })}
    </div>
  );
}

function CmsUnitsPanel({ html, fallback }: { html: string; fallback: ReactNode }) {
  if (!html) return <>{fallback}</>;

  return (
    <div
      className="cms-organization-content overflow-x-auto text-[16px] leading-7 text-[#555] [&_.col-inner]:h-full [&_.col]:w-full [&_.col]:px-[15px] [&_.row]:-mx-[15px] [&_.row]:flex [&_.row]:flex-row [&_.row]:flex-wrap md:[&_.medium-4]:w-1/3 md:[&_.medium-4]:basis-1/3 [&_a]:text-[#0118d8] [&_a]:underline-offset-4 [&_a:hover]:underline [&_h2]:mb-[0.6em] [&_h2]:mt-[1.2em] [&_h2]:text-[1.6em] [&_h2]:font-bold [&_h2]:leading-[1.3] [&_h2]:text-[#0118d8] [&_h2:first-child]:mt-0 [&_li]:mb-1 [&_ol]:mb-[1.3em] [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-[1.3em] [&_strong]:font-bold [&_strong]:text-inherit [&_table]:min-w-[720px] [&_table]:w-full [&_table]:border-collapse [&_table]:border [&_table]:border-black [&_td]:border [&_td]:border-black [&_td]:p-[6px] [&_th]:border [&_th]:border-black [&_th]:p-[6px] [&_ul]:mb-[1.3em] [&_ul]:list-disc [&_ul]:pl-6"
      dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(html) }}
    />
  );
}

function getLeadershipLabel(data: OrganizationData, locale: Locale): string {
  const labels: Record<Locale, Record<string, string>> = {
    vi: {
      'dang-uy': 'Đảng ủy trường',
      'ban-giam-hieu': 'Ban giám hiệu',
      'hoi-dong-truong': 'Hội đồng trường',
    },
    en: {
      'presidential-board': 'Presidential Board',
    },
  };
  return labels[locale][data.category.slug] ?? data.category.name;
}

export default function OrganizationStructure({
  locale,
  leadership,
  faculties,
  staticSections,
}: {
  locale: Locale;
  leadership: OrganizationData[];
  faculties: FacultySliderItem[];
  staticSections?: OrganizationStaticSections;
}) {
  const isEn = locale === 'en';
  const tabs = [
    ...leadership.map((data) => ({ key: data.category.slug, label: getLeadershipLabel(data, locale), content: <LeadershipPanel data={data} locale={locale} /> })),
    {
      key: 'training-units',
      label: isEn ? 'Faculties, Academic Units' : 'Các đơn vị đào tạo',
      content: (
        <CmsUnitsPanel
          html={staticSections?.trainingHtml ?? ''}
          fallback={<FacultyPanel faculties={faculties} />}
        />
      ),
    },
    {
      key: 'administrative-units',
      label: isEn ? 'Departments – Centers' : 'Các phòng – trung tâm',
      content: (
        <CmsUnitsPanel
          html={staticSections?.administrativeHtml ?? ''}
          fallback={<UnitsPanel units={isEn ? ADMINISTRATIVE_UNITS_EN : ADMINISTRATIVE_UNITS_VI} />}
        />
      ),
    },
    {
      key: 'science-units',
      label: isEn ? 'Science and Technology Units' : 'Các đơn vị KHCN',
      content: (
        <CmsUnitsPanel
          html={staticSections?.scienceHtml ?? ''}
          fallback={<UnitsPanel units={isEn ? SCIENCE_UNITS_EN : SCIENCE_UNITS_VI} />}
        />
      ),
    },
  ];
  const [activeKey, setActiveKey] = useState(tabs[0]?.key ?? 'training-units');
  const activeTab = tabs.find((tab) => tab.key === activeKey) ?? tabs[0];

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-[1200px] px-5 py-10 sm:py-14">
        <h1 className="mb-9 text-center text-4xl font-bold uppercase text-[#0118d8]">
          {isEn ? 'Organizational Structure' : 'Cơ Cấu Tổ Chức'}
        </h1>
        <div className={tabbedContentStyles.root}>
          <div
            className={tabbedContentStyles.navigation}
            role="tablist"
            aria-label={isEn ? 'Organization groups' : 'Nhóm cơ cấu tổ chức'}
          >
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={activeKey === tab.key}
                onClick={() => setActiveKey(tab.key)}
                className={`${tabbedContentStyles.tabLink} w-full text-left text-base font-bold uppercase tracking-[0.02em] ${
                  activeKey === tab.key
                    ? tabbedContentStyles.activeTabLink
                    : ''
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className={tabbedContentStyles.panels} role="tabpanel">
            {activeTab?.content}
          </div>
        </div>
      </div>
    </main>
  );
}
