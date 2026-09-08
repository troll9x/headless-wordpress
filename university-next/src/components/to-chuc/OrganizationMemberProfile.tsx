import Image from 'next/image';
import { ArticleVoiceControls } from '@/components/bai-viet/ArticleActions';
import type { OrganizationMemberDetails } from '@/lib/wordpress/organizations';
import { stripHtml } from '@/lib/utils/html';
import { sanitizeCmsHtml } from '@/lib/security/html';
import type { Locale } from '@/types/ngon-ngu';

const PROFILE_BACKGROUND_URL =
  'https://tlu.edu.vn/wp-content/uploads/2025/07/Trong-Dong-6.webp';

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-5 text-center text-[25px] font-black uppercase leading-tight text-[#b70a0a] after:mx-auto after:mt-2.5 after:block after:h-[3px] after:w-[60px] after:bg-[#b70a0a]">
      {children}
    </h2>
  );
}

export default function OrganizationMemberProfile({
  member,
  locale,
}: {
  member: OrganizationMemberDetails;
  locale: Locale;
}) {
  const isEn = locale === 'en';
  const contentId = `organization-profile-${member.id}`;
  const currentTitle = member.primary_position || member.positions[0]?.value || '';
  const hasBiography = stripHtml(member.biography)
    .replace(/[\s\u00a0\u200b-\u200d\ufeff]/g, '')
    .length > 0;

  return (
    <main
      className="min-h-screen bg-[#ffe11a] bg-cover bg-center bg-no-repeat py-0 md:bg-fixed"
      style={{ backgroundImage: `url("${PROFILE_BACKGROUND_URL}")` }}
    >
      <article
        id={contentId}
        className="mx-auto max-w-[1000px] overflow-hidden rounded-[10px] bg-white/70 text-[#333] shadow-[0_4px_15px_rgba(0,0,0,0.1)]"
      >
        <header className="flex flex-wrap items-center gap-[30px] bg-[#f9f9f975] p-[30px] max-md:flex-col max-md:text-center">
          <div className="relative h-[400px] w-[350px] max-w-full shrink-0 overflow-hidden rounded-lg bg-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.15)] max-sm:h-auto max-sm:aspect-[7/8] max-sm:w-full">
            {member.avatar.url ? (
              <Image
                src={member.avatar.sizes.large || member.avatar.url}
                alt={member.avatar.alt || member.name}
                fill
                priority
                sizes="(max-width: 640px) calc(100vw - 60px), 350px"
                className="object-cover object-top"
              />
            ) : (
              <span className="flex h-full min-h-[400px] items-center justify-center bg-[#0118d8] text-8xl font-extrabold text-white">
                {member.initial}
              </span>
            )}
          </div>

          <div className="min-w-[250px] flex-1 text-left max-md:w-full max-md:min-w-0">
            {currentTitle && (
              <div className="mb-3 w-full rounded-[20px] bg-[#d71d24] px-5 py-2 text-center text-lg font-bold uppercase text-white shadow-[0_2px_5px_rgba(0,0,0,0.1)] max-sm:text-sm">
                {currentTitle}
              </div>
            )}
            <h1 className="my-[10px] text-[28px] font-bold leading-tight text-[#111] max-md:text-center max-sm:text-[25px]">
              {member.name}
            </h1>

            <ul className="mt-[10px] list-none space-y-2 p-0 text-base max-md:mx-auto max-md:max-w-md max-md:text-left">
              {member.birth_year && (
                <li>
                  <strong className="inline-block min-w-20 text-[#555]">
                    {isEn ? 'Year of birth:' : 'Năm sinh:'}
                  </strong>{' '}
                  {member.birth_year}
                </li>
              )}
              {member.hometown && (
                <li>
                  <strong className="inline-block min-w-20 text-[#555]">
                    {isEn ? 'Hometown:' : 'Quê quán:'}
                  </strong>{' '}
                  {member.hometown}
                </li>
              )}
              {member.qualification && (
                <li>
                  <strong className="inline-block min-w-20 text-[#555]">
                    {isEn ? 'Qualification:' : 'Trình độ:'}
                  </strong>{' '}
                  {member.qualification}
                </li>
              )}
            </ul>

            <div className="mt-5 max-md:flex max-md:justify-center" data-tts-exclude="true">
              <ArticleVoiceControls
                contentId={contentId}
                locale={locale}
                postId={member.id}
                postType="to-chuc"
                variant="organization"
              />
            </div>
          </div>
        </header>

        {member.positions.length > 0 && (
          <section className="bg-[#f9f9f975] p-[10px] pt-6">
            <SectionHeading>{isEn ? 'Positions' : 'Chức vụ'}</SectionHeading>
            <div className="flex flex-wrap justify-center gap-5 max-md:flex-col max-md:items-center">
              {member.positions.map((position, index) => (
                <div
                  key={`${position.type}-${index}`}
                  className="rounded-md border-2 border-[#d71d24] bg-[#fef2f2] px-5 py-[15px] text-center text-xl font-bold text-[#333] max-sm:text-[17px]"
                >
                  {position.value}
                </div>
              ))}
            </div>
          </section>
        )}

        {member.work_history.length > 0 && (
          <section className="bg-[#f9f9f975] p-[10px] pt-6">
            <SectionHeading>{isEn ? 'Work History' : 'Quá trình công tác'}</SectionHeading>
            <ol className="relative mx-auto max-w-[1000px] list-none py-1 before:absolute before:bottom-4 before:left-[7px] before:top-4 before:w-[3px] before:bg-[#b31b34] md:before:left-1/2 md:before:-translate-x-1/2">
              {member.work_history.map((item) => {
                const isRight = item.side === 'right';
                return (
                  <li
                    key={`${item.index}-${item.date}`}
                    className="relative my-10 pl-8 before:absolute before:left-0 before:top-1 before:z-[1] before:h-4 before:w-4 before:rounded-full before:border-4 before:border-[#b31b34] before:bg-white md:flex md:w-full md:items-center md:justify-between md:pl-0 md:before:left-1/2 md:before:top-1/2 md:before:-translate-x-1/2 md:before:-translate-y-1/2"
                  >
                    <time
                      className={`mb-2 block text-lg font-bold text-[#b31b34] md:mb-0 md:w-[45%] md:text-xl ${
                        isRight
                          ? 'md:order-2 md:pl-5 md:text-left'
                          : 'md:order-1 md:pr-5 md:text-right'
                      }`}
                    >
                      {item.date}
                    </time>
                    <div
                      className={`text-base leading-7 text-black md:w-[45%] md:text-lg ${
                        isRight
                          ? 'md:order-1 md:pr-5 md:text-right'
                          : 'md:order-2 md:pl-5 md:text-left'
                      }`}
                    >
                      {item.description}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {hasBiography && (
          <section className="bg-[#f9f9f975] p-[10px] pb-8 pt-6">
            <SectionHeading>{isEn ? 'Biography' : 'Tiểu sử'}</SectionHeading>
            <div
              className="rounded-md border-l-[5px] border-[#d71d24] bg-[#fff5f5] p-5 text-base leading-[1.6] text-[#444] [&_p]:mb-4 [&_p:last-child]:mb-0"
              dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(member.biography) }}
            />
          </section>
        )}
      </article>
    </main>
  );
}
