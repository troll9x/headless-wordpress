'use client';

import CountUp from 'react-countup';
import SectionTitle from '@/components/ui/SectionTitle';
import type { SiteStatistic } from '@/types/homepage';
import type { Locale } from '@/types/ngon-ngu';

interface KhuVucThongKeProps {
  stats: SiteStatistic[];
  locale: Locale;
}

interface ParsedStatistic {
  prefix: string;
  suffix: string;
  target: number;
  fractionDigits: number;
  useGrouping: boolean;
}

function parseStatistic(value: string): ParsedStatistic | null {
  const match = value.trim().match(/^(.*?)(-?[\d][\d.,\s]*)(.*?)$/);
  if (!match) return null;

  const token = match[2].replace(/\s/g, '');
  const dots = [...token.matchAll(/\./g)].length;
  const commas = [...token.matchAll(/,/g)].length;
  const lastDot = token.lastIndexOf('.');
  const lastComma = token.lastIndexOf(',');
  let decimalSeparator = '';
  let groupingSeparator = '';

  if (dots > 0 && commas > 0) {
    decimalSeparator = lastDot > lastComma ? '.' : ',';
    groupingSeparator = decimalSeparator === '.' ? ',' : '.';
  } else if (dots > 0 || commas > 0) {
    const separator = dots > 0 ? '.' : ',';
    const occurrences = separator === '.' ? dots : commas;
    const trailingDigits = token.length - token.lastIndexOf(separator) - 1;

    if (occurrences > 1 || trailingDigits === 3) {
      groupingSeparator = separator;
    } else {
      decimalSeparator = separator;
    }
  }

  let normalized = token;
  if (groupingSeparator) {
    normalized = normalized.replace(new RegExp(`\\${groupingSeparator}`, 'g'), '');
  }
  if (decimalSeparator) {
    normalized = normalized.replace(decimalSeparator, '.');
  }
  const target = Number.parseFloat(normalized);
  if (!Number.isFinite(target)) return null;

  return {
    prefix: match[1],
    suffix: match[3],
    target,
    fractionDigits: decimalSeparator
      ? token.length - token.lastIndexOf(decimalSeparator) - 1
      : 0,
    useGrouping: Boolean(groupingSeparator),
  };
}

function CountUpValue({ value, locale }: { value: string; locale: Locale }) {
  const parsed = parseStatistic(value);
  if (!parsed) return <>{value}</>;

  return (
    <span aria-label={value} data-countup-target={parsed.target}>
      <CountUp
        end={parsed.target}
        duration={1.8}
        delay={0}
        decimals={parsed.fractionDigits}
        decimal={locale === 'en' ? '.' : ','}
        separator={parsed.useGrouping ? (locale === 'en' ? ',' : '.') : ''}
        prefix={parsed.prefix}
        suffix={parsed.suffix}
        enableScrollSpy
        scrollSpyOnce
        scrollSpyDelay={100}
        preserveValue
      >
        {({ countUpRef }) => <span ref={countUpRef} aria-hidden="true" />}
      </CountUp>
    </span>
  );
}

export default function KhuVucThongKe({ stats, locale }: KhuVucThongKeProps) {
  if (stats.length === 0) return null;
  const title = locale === 'en' ? 'Impressive Figures' : 'Những Con Số Ấn Tượng';

  return (
    <section id="stats" className="bg-white py-12 sm:py-14" aria-label={title}>
      <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-8">
        <SectionTitle title={title} className="mb-9" />
        <dl className="grid w-full grid-cols-2 gap-y-9 text-center min-[850px]:grid-cols-5 min-[850px]:gap-y-0">
          {stats.slice(0, 5).map((stat, index) => (
            <div
              key={`${stat.label}-${stat.value}`}
              className={`flex min-w-0 flex-col items-center px-3 sm:px-5 ${
                index === 0 ? 'col-span-2 min-[850px]:col-span-1' : ''
              }`}
            >
              <dt className="order-2 mt-5 max-w-[190px] text-sm font-semibold leading-snug text-slate-950 sm:text-base lg:text-lg">
                {stat.label}
              </dt>
              <dd className="order-1 text-3xl font-extrabold tabular-nums text-[#0118d8] sm:text-4xl lg:text-5xl">
                <CountUpValue value={stat.value} locale={locale} />
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
