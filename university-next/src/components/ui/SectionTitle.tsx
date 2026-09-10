import Link from 'next/link';

interface SectionTitleProps {
  title: string;
  href?: string;
  linkText?: string;
  light?: boolean;
  className?: string;
}

export default function SectionTitle({
  title,
  href,
  light = false,
  className = '',
}: SectionTitleProps) {
  const titleClass = `font-['Raleway',Arial,sans-serif] text-2xl font-extrabold uppercase leading-tight tracking-[-0.02em] sm:text-3xl lg:text-[34px] ${
    light ? 'text-white' : 'text-[#0118d8]'
  }`;

  return (
    <div className={`mb-8 text-center ${className}`}>
      {href ? (
        <Link href={href} className={`${titleClass} transition-opacity hover:opacity-75`}>
          {title}
        </Link>
      ) : (
        <h2 className={titleClass}>{title}</h2>
      )}
    </div>
  );
}
