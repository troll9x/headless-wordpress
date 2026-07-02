import { UNIVERSITY } from '@/constants/site';

export default function RectorBanner() {
  return (
    <section className="bg-blue-900 py-14" aria-label="Sứ mệnh và giá trị cốt lõi">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-2">

          {/* Left — rector */}
          <div className="flex items-center gap-6">
            {/*
             * TODO: Replace placeholder with <Image> from WordPress page (slug "hieu-truong").
             * Required ACF fields: rector_photo (image), rector_name (text), rector_title (text).
             * Example:
             *   <Image src={rectorPage.acf.rector_photo.url} alt={rectorPage.acf.rector_name}
             *          width={128} height={160} className="rounded-lg object-cover" />
             */}
            <div
              className="flex h-40 w-32 flex-shrink-0 flex-col items-end justify-end rounded-lg bg-blue-800 p-2"
              role="img"
              aria-label="Ảnh hiệu trưởng — cần cấu hình từ ACF"
            >
              <span className="text-right text-[10px] leading-tight text-blue-600">
                TODO: rector photo via ACF
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-blue-300">
                Hiệu trưởng
              </p>
              {/* TODO: rector_name from ACF on page "hieu-truong" */}
              <p className="mt-1 text-lg font-bold text-white">GS.TS Nguyễn Trung Việt</p>
            </div>
          </div>

          {/* Right — slogan & core values */}
          <div className="text-center lg:text-left">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
              {UNIVERSITY.fullName}
            </p>
            <h2 className="mt-3 text-2xl font-extrabold leading-tight text-white sm:text-3xl">
              {UNIVERSITY.slogan}
            </h2>
            <div className="mt-6 flex flex-wrap justify-center gap-3 lg:justify-start">
              {UNIVERSITY.values.map((value) => (
                <span
                  key={value}
                  className="rounded-full border border-blue-600 px-4 py-1.5 text-sm font-medium text-blue-200"
                >
                  {value}
                </span>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
