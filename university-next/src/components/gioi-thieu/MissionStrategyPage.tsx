'use client';

import { useState } from 'react';
import Image from 'next/image';
import Breadcrumb from '@/components/ui/Breadcrumb';
import { sanitizeCmsHtml } from '@/lib/security/html';
import { getHomePath } from '@/constants/duong-dan';
import type { MissionStrategyContent } from '@/lib/wordpress/static-pages';
import type { Locale } from '@/types/ngon-ngu';

export default function MissionStrategyPage({
  locale,
  content,
}: {
  locale: Locale;
  content: MissionStrategyContent;
}) {
  const isEn = locale === 'en';
  const tabs = [
    { key: 'overview', label: content.overviewLabel, html: content.overviewHtml },
    { key: 'strategy', label: content.strategyLabel, html: content.strategyHtml },
  ];
  const [activeKey, setActiveKey] = useState(tabs[0].key);
  const activeTab = tabs.find((tab) => tab.key === activeKey) ?? tabs[0];

  return (
    <main className="min-h-screen bg-white">
      <section className="relative isolate flex min-h-[310px] items-center overflow-hidden sm:min-h-[390px]">
        <Image
          src={content.heroImageUrl}
          alt=""
          fill
          priority
          sizes="100vw"
          className="-z-20 object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0118d8]/90 via-[#043f91]/75 to-slate-950/35" />
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-blue-100">
            {isEn ? 'About Thuyloi University' : 'Giới thiệu Trường Đại học Thủy lợi'}
          </p>
          <h1 className="max-w-4xl font-heading text-3xl font-extrabold uppercase leading-tight text-white drop-shadow-sm sm:text-5xl">
            {content.heroTitle}
          </h1>
        </div>
      </section>

      <div className="border-b border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <Breadcrumb
            items={[
              { label: isEn ? 'Home' : 'Trang chủ', href: getHomePath(locale) },
              { label: content.pageTitle },
            ]}
          />
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-12 lg:px-8 lg:py-14">
        <div
          className="flex gap-2 overflow-x-auto lg:block lg:space-y-2"
          role="tablist"
          aria-label={isEn ? 'Mission and strategy sections' : 'Các phần sứ mạng và chiến lược'}
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeKey === tab.key}
              aria-controls={`mission-panel-${tab.key}`}
              onClick={() => setActiveKey(tab.key)}
              className={`min-w-[250px] rounded-lg border px-5 py-4 text-left text-sm font-bold uppercase leading-6 transition lg:w-full ${
                activeKey === tab.key
                  ? 'border-[#0118d8] bg-[#0118d8] text-white shadow-md'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-[#0118d8]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <article
          id={`mission-panel-${activeTab.key}`}
          role="tabpanel"
          className="min-w-0 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-8 lg:p-10"
        >
          <div
            className="cms-static-content text-[16px] leading-8 text-slate-700 [&_h2]:mb-5 [&_h2]:mt-10 [&_h2]:border-l-4 [&_h2]:border-[#0118d8] [&_h2]:pl-4 [&_h2]:font-heading [&_h2]:text-2xl [&_h2]:font-extrabold [&_h2]:uppercase [&_h2]:text-[#0118d8] [&_h2:first-child]:mt-0 [&_h3]:mb-3 [&_h3]:mt-7 [&_h3]:font-heading [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-slate-900 [&_li]:mb-2 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6 [&_p]:mb-5 [&_p]:text-justify [&_strong]:font-bold [&_strong]:text-slate-900 [&_ul]:my-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6"
            dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(activeTab.html) }}
          />
        </article>
      </div>
    </main>
  );
}
