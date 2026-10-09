'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFacebookF,
  faInstagram,
  faTiktok,
  faYoutube,
  type IconDefinition,
} from '@fortawesome/free-brands-svg-icons';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { EnvelopeIcon, MapPinIcon, PhoneIcon } from '@/components/ui/icons';
import type { Locale } from '@/types/ngon-ngu';
import type { SiteFooterData, SiteFooterLink } from '@/lib/wordpress/site-footer';
import type { SiteLogos } from '@/lib/wordpress/site-logo';
import type { SiteSocialLinks, SocialPlatform } from '@/lib/wordpress/site-social';

const UI_COPY = {
  vi: {
    address: 'Địa chỉ',
    email: 'Email',
    phone: 'Điện thoại',
    about: 'Giới thiệu',
    quick: 'Truy cập nhanh',
    social: 'Theo dõi TLU',
    map: 'Trường Đại học Thủy lợi',
    mapTitle: 'Bản đồ Trường Đại học Thủy lợi',
    copyright: (year: number) => `Bản quyền © ${year} Trường Đại học Thủy lợi. Phát triển bởi Trung tâm Tin học TLU.`,
  },
  en: {
    address: 'Address',
    email: 'Email',
    phone: 'Phone',
    about: 'About us',
    quick: 'Quick links',
    social: 'Follow TLU',
    map: 'Thuyloi University',
    mapTitle: 'Map of Thuyloi University',
    copyright: (year: number) => `Copyright © ${year} Thuyloi University. Developed by IT Center TLU.`,
  },
} as const;

const SOCIAL_PLATFORMS: ReadonlyArray<{
  id: SocialPlatform;
  label: string;
  icon: IconDefinition;
}> = [
  { id: 'facebook', label: 'Facebook', icon: faFacebookF },
  { id: 'instagram', label: 'Instagram', icon: faInstagram },
  { id: 'youtube', label: 'YouTube', icon: faYoutube },
  { id: 'tiktok', label: 'TikTok', icon: faTiktok },
];

interface FooterProps {
  logos: SiteLogos | null;
  footer: SiteFooterData | null;
  social: SiteSocialLinks | null;
}

function ColumnHeading({ children }: { children: string }) {
  return (
    <h3 className="mb-9 text-base font-bold uppercase text-white sm:text-lg">
      {children}
      <span className="mt-3 block h-[3px] w-8 bg-white/35" aria-hidden />
    </h3>
  );
}

function FooterNavigationLink({ item }: { item: SiteFooterLink }) {
  const className = 'transition-colors hover:text-yellow-300';

  return item.external ? (
    <a href={item.url} target="_blank" rel="noopener noreferrer" className={className}>
      {item.label}
    </a>
  ) : (
    <Link href={item.url} className={className}>
      {item.label}
    </Link>
  );
}

function LinkColumn({ title, items }: { title: string; items: SiteFooterLink[] }) {
  if (items.length === 0) return null;

  return (
    <section>
      <ColumnHeading>{title}</ColumnHeading>
      <ul className="space-y-4 text-base text-white">
        {items.map((item) => (
          <li key={`${item.label}-${item.url}`}>
            <FooterNavigationLink item={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ContactItem({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
  if (!value) return null;

  const content = href ? (
    <a href={href} className="break-words transition-colors hover:text-yellow-300">
      {value}
    </a>
  ) : value;

  return (
    <div className="flex min-w-0 items-start gap-2 text-sm font-semibold leading-6 text-white sm:text-base">
      <span className="mt-1 shrink-0" aria-hidden>{icon}</span>
      <div className="min-w-0">
        <p>{label}:</p>
        <p>{content}</p>
      </div>
    </div>
  );
}

export default function Footer({ logos, footer, social }: FooterProps) {
  const pathname = usePathname();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [shouldLoadMap, setShouldLoadMap] = useState(false);
  const locale: Locale = pathname === '/en' || pathname.startsWith('/en/') ? 'en' : 'vi';
  const copy = UI_COPY[locale];
  const content = footer?.locales[locale] ?? null;
  const logo = logos?.footer[locale] ?? null;
  const socialItems = SOCIAL_PLATFORMS.flatMap((platform) => {
    const url = social?.[platform.id];
    return url ? [{ ...platform, url }] : [];
  });
  const year = new Date().getFullYear();

  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container || !footer?.mapEmbedUrl) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setShouldLoadMap(true);
        observer.disconnect();
      }
    }, { rootMargin: '250px 0px' });

    observer.observe(container);
    return () => observer.disconnect();
  }, [footer?.mapEmbedUrl]);

  return (
    <footer className="bg-[#1907dc] text-white">
      <div className="mx-auto max-w-[1180px] px-5 pb-4 pt-10 sm:px-6 sm:pt-12 lg:px-0">
        <div className="grid gap-x-12 gap-y-8 pb-16 sm:grid-cols-2 lg:grid-cols-[1.35fr_1fr_1fr_1fr] lg:items-center lg:pb-24">
          {logo && (
            <div className="relative h-[105px] w-[280px] max-w-full sm:h-[115px] sm:w-[300px]">
              <Image
                src={logo.url}
                alt={logo.alt}
                fill
                className="object-contain object-left"
                sizes="300px"
              />
            </div>
          )}

          {content?.address && (
            <ContactItem
              icon={<MapPinIcon className="h-4 w-4" />}
              label={copy.address}
              value={content.address}
            />
          )}

          {footer?.email && (
            <ContactItem
              icon={<EnvelopeIcon className="h-4 w-4" />}
              label={copy.email}
              value={footer.email}
              href={`mailto:${footer.email}`}
            />
          )}

          {footer?.phone && footer.phoneHref && (
            <ContactItem
              icon={<PhoneIcon className="h-4 w-4" />}
              label={copy.phone}
              value={footer.phone}
              href={`tel:${footer.phoneHref}`}
            />
          )}
        </div>

        <div className="grid gap-x-12 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          <LinkColumn title={copy.about} items={content?.aboutLinks ?? []} />
          <LinkColumn title={copy.quick} items={content?.quickLinks ?? []} />

          {socialItems.length > 0 && (
            <section>
              <ColumnHeading>{copy.social}</ColumnHeading>
              <ul className="space-y-4 text-base text-white">
                {socialItems.map((item) => (
                  <li key={item.id}>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 transition-colors hover:text-yellow-300"
                    >
                      <FontAwesomeIcon icon={item.icon} className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {footer?.mapEmbedUrl && (
            <section>
              <ColumnHeading>{copy.map}</ColumnHeading>
              <div ref={mapContainerRef} className="h-[152px] w-full">
                {shouldLoadMap ? (
                  <iframe
                    title={copy.mapTitle}
                    src={footer.mapEmbedUrl}
                    className="h-full w-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setShouldLoadMap(true)}
                    className="flex h-full w-full items-center justify-center rounded border border-white/30 bg-white/10 px-3 text-center text-sm font-semibold text-white hover:bg-white/20"
                    aria-label={locale === 'en' ? 'Load university map' : 'Tải bản đồ trường'}
                  >
                    {locale === 'en' ? 'Load interactive map' : 'Tải bản đồ tương tác'}
                  </button>
                )}
              </div>
            </section>
          )}
        </div>

        <p className="pt-8 text-center text-sm font-semibold text-white sm:pt-10 sm:text-base">
          {copy.copyright(year)}
        </p>
      </div>
    </footer>
  );
}
