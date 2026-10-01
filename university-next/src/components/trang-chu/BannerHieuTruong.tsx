import Image from 'next/image';
import type { SiteStaticImage } from '@/lib/wordpress/site-static-image';

export default function BannerHieuTruong({ image }: { image: SiteStaticImage | null }) {
  if (!image) return null;

  return (
    <section className="relative aspect-[1020/392] w-full overflow-hidden bg-[#0118d8]">
      <Image
        src={image.url}
        alt={image.alt}
        fill
        className="object-cover"
        sizes="100vw"
      />
    </section>
  );
}
