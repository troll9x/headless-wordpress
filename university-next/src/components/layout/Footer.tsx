import Link from 'next/link';
import { getMenuTree } from '@/lib/api/menus';
import { SITE_NAME } from '@/constants/api';
import { UNIVERSITY, SOCIAL_LINKS } from '@/constants/site';
import {
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  FacebookIcon,
  YouTubeIcon,
  TwitterIcon,
} from '@/components/ui/icons';
import type { WPMenuItemWithChildren } from '@/types/wordpress';

function SocialIconComponent({ icon }: { icon: string }) {
  if (icon === 'facebook') return <FacebookIcon className="h-4 w-4" />;
  if (icon === 'youtube') return <YouTubeIcon className="h-4 w-4" />;
  return <TwitterIcon className="h-4 w-4" />;
}

/**
 * Footer menu column — renders a top-level item as a section heading
 * with its children as links. Falls back to a flat link if no children.
 */
function FooterMenuSection({ item }: { item: WPMenuItemWithChildren }) {
  if (item.children.length > 0) {
    return (
      <div>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
          <span dangerouslySetInnerHTML={{ __html: item.title.rendered }} />
        </h3>
        <ul className="space-y-2.5">
          {item.children.map((child) => (
            <li key={child.id}>
              <Link
                href={child.url}
                className="text-sm text-slate-400 transition-colors hover:text-white"
                target={child.target === '_blank' ? '_blank' : undefined}
                rel={child.target === '_blank' ? 'noopener noreferrer' : undefined}
              >
                <span dangerouslySetInnerHTML={{ __html: child.title.rendered }} />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // Flat item — render as standalone link
  return (
    <Link
      href={item.url}
      className="text-sm text-slate-400 transition-colors hover:text-white"
    >
      <span dangerouslySetInnerHTML={{ __html: item.title.rendered }} />
    </Link>
  );
}

export default async function Footer() {
  const footerMenu = await getMenuTree('footer');
  const year = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-slate-300">
      {/* ── Main columns ─────────────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">

          {/* Column 1 — University identity */}
          <div className="col-span-1">
            <Link href="/" className="mb-4 inline-flex items-center gap-3 group">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-700 text-white font-bold text-base transition-colors group-hover:bg-blue-600">
                {UNIVERSITY.shortName.charAt(0)}
              </div>
              <div className="leading-tight">
                <p className="font-bold text-white">{SITE_NAME}</p>
                <p className="text-xs text-slate-400">{UNIVERSITY.fullName}</p>
              </div>
            </Link>

            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              {UNIVERSITY.tagline}
            </p>

            {/* Social links */}
            <div className="mt-6 flex gap-3">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.icon}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-400 transition-colors hover:bg-blue-700 hover:text-white"
                >
                  <SocialIconComponent icon={social.icon} />
                </a>
              ))}
            </div>
          </div>

          {/* Columns 2–3 — WordPress footer menu sections (up to 2 columns) */}
          {footerMenu.slice(0, 2).map((section) => (
            <div key={section.id} className="col-span-1">
              <FooterMenuSection item={section} />
            </div>
          ))}

          {/* If footer menu has fewer than 2 top-level sections, fill with spacer */}
          {footerMenu.length === 0 && (
            <>
              <div className="col-span-1" />
              <div className="col-span-1" />
            </>
          )}
          {footerMenu.length === 1 && <div className="col-span-1" />}

          {/* Column 4 — Contact info */}
          <div className="col-span-1">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
              Liên hệ
            </h3>
            <address className="not-italic space-y-3 text-sm text-slate-400">
              <p className="flex items-start gap-2">
                <MapPinIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500" />
                {UNIVERSITY.address}
              </p>
              <p className="flex items-center gap-2">
                <PhoneIcon className="h-4 w-4 flex-shrink-0 text-slate-500" />
                <a href={`tel:${UNIVERSITY.phone.replace(/\s/g, '')}`} className="hover:text-white transition-colors">
                  {UNIVERSITY.phone}
                </a>
              </p>
              <p className="flex items-center gap-2">
                <EnvelopeIcon className="h-4 w-4 flex-shrink-0 text-slate-500" />
                <a href={`mailto:${UNIVERSITY.email}`} className="hover:text-white transition-colors">
                  {UNIVERSITY.email}
                </a>
              </p>
            </address>
          </div>
        </div>
      </div>

      {/* ── Bottom bar ───────────────────────────────────────────────── */}
      <div className="border-t border-slate-800">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 sm:flex-row sm:px-6 lg:px-8">
          <p className="text-xs text-slate-500">
            © {year} {SITE_NAME} — {UNIVERSITY.fullName}
          </p>
          {/* Remaining footer menu items (3rd+) displayed flat in the bottom bar */}
          {footerMenu.length > 2 && (
            <nav aria-label="Footer bottom navigation">
              <ul className="flex flex-wrap gap-x-5 gap-y-1">
                {footerMenu.slice(2).map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.url}
                      className="text-xs text-slate-500 transition-colors hover:text-slate-300"
                    >
                      <span dangerouslySetInnerHTML={{ __html: item.title.rendered }} />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
      </div>
    </footer>
  );
}
