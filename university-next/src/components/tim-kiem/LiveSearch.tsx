'use client';

import {
  FormEvent,
  KeyboardEvent,
  MouseEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { SearchIcon } from '@/components/ui/icons';
import { searchPosts, suggestPosts } from '@/services/search';
import type { LiveSearchItem } from '@/types/search';
import './live-search.css';

const MIN_CHARS = 2;
const DEBOUNCE_MS = 180;
const RESULT_LIMIT = 5;

interface LiveSearchProps {
  className?: string;
}

type SearchStatus = 'idle' | 'loading' | 'error' | 'ready';

function escapeHtml(value: string) {
  return value.replace(/[&<>"]/g, (char) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
    };
    return entities[char];
  });
}

function highlightText(text: string, query: string) {
  const escapedText = escapeHtml(text);
  const phrase = query.trim().replace(/\s+/g, ' ');
  if (!phrase) return escapedText;

  const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  try {
    const phrasePattern = new RegExp(`(${escapeRegExp(phrase)})`, 'gi');
    const highlighted = escapedText.replace(phrasePattern, '<span class="wpx-ft-hl">$1</span>');
    if (highlighted !== escapedText) return highlighted;
  } catch {
    return escapedText;
  }

  try {
    const words = phrase.split(/\s+/).filter(Boolean).map(escapeRegExp);
    if (!words.length) return escapedText;
    return escapedText.replace(new RegExp(`(${words.join('|')})`, 'gi'), '<span class="wpx-ft-hl">$1</span>');
  } catch {
    return escapedText;
  }
}

export default function LiveSearch({ className = '' }: LiveSearchProps) {
  const inputId = useId();
  const pathname = usePathname();
  const router = useRouter();
  const rootRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef(0);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<LiveSearchItem[]>([]);
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

   const trimmedQuery = query.trim();
   const locale = pathname.startsWith('/en') ? 'en' : 'vi';
   const searchPath = locale === 'en' ? '/en/search' : '/tim-kiem';
   const viewAllHref = (() => {
     if (!trimmedQuery) return '#';

     const params = new URLSearchParams();
     params.set('q', trimmedQuery);
     return `${searchPath}?${params.toString()}`;
   })();
   const showDropdown = isOpen && (status === 'loading' || status === 'error' || items.length > 0);

  const highlightedItems = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        highlightedTitle: highlightText(item.title, trimmedQuery),
        highlightedExcerpt: highlightText(item.excerpt, trimmedQuery),
      })),
    [items, trimmedQuery]
  );

  function updateQuery(value: string) {
    setQuery(value);

    if (!value.trim()) {
      setItems([]);
      setStatus('idle');
      setIsOpen(false);
      setActiveIndex(0);
    }
  }

  useEffect(() => {
    const controller = new AbortController();

    if (!trimmedQuery) {
      requestIdRef.current += 1;
      return () => controller.abort();
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    const timer = window.setTimeout(async () => {
      setItems([]);
      setActiveIndex(0);
      setStatus('loading');
      setIsOpen(true);

      try {
        const results =
          trimmedQuery.length >= MIN_CHARS
            ? await searchPosts(trimmedQuery, RESULT_LIMIT, controller.signal)
            : await suggestPosts(trimmedQuery, controller.signal);

        if (controller.signal.aborted || requestIdRef.current !== requestId) return;

        setItems(results);
        setActiveIndex(0);
        setStatus('ready');
        setIsOpen(results.length > 0);
      } catch (error) {
        const isAbortError =
          error instanceof Error && error.name === 'AbortError';

        if (isAbortError || controller.signal.aborted || requestIdRef.current !== requestId) {
          return;
        }

        setItems([]);
        setActiveIndex(0);
        setStatus('error');
        setIsOpen(true);
      }
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [trimmedQuery]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  function submitSearch() {
    if (!trimmedQuery) return;
    setIsOpen(false);
    // Route search không tồn tại (/en/search, /tim-kiem)
    // Không điều hướng đến route giả - chờ implement search result page
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitSearch();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setIsOpen(false);
      return;
    }

    if (!showDropdown || !highlightedItems.length) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % highlightedItems.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? highlightedItems.length - 1 : index - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const item = highlightedItems[activeIndex];
      if (item) {
        setIsOpen(false);
        router.push(item.url);
      } else {
        submitSearch();
      }
    }
  }

  function handleResultMouseDown(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
  }

  return (
    <form
      ref={rootRef}
      onSubmit={handleSubmit}
      role="search"
      className={`live-search relative ${className}`}
    >
      <label htmlFor={inputId} className="sr-only">
        Tìm kiếm
      </label>
       <input
         ref={inputRef}
         id={inputId}
         type="search"
         value={query}
         onChange={(event) => updateQuery(event.target.value)}
         onFocus={() => {
           if (items.length > 0 || status === 'error') setIsOpen(true);
         }}
         onKeyDown={handleKeyDown}
         placeholder="Tìm kiếm..."
         className="h-[50px] w-full rounded-full bg-[#f2f2f2] pl-5 pr-14 text-[17px] text-slate-700 shadow-[inset_0_2px_5px_rgba(0,0,0,0.22),0_1px_2px_rgba(255,255,255,0.9)] outline-none ring-1 ring-black/10 transition focus:bg-white focus:ring-2 focus:ring-[#1600d8]/45"
         role="combobox"
         autoComplete="off"
         aria-autocomplete="list"
         aria-controls={`${inputId}-results`}
         aria-haspopup="listbox"
         aria-expanded={showDropdown}
         aria-activedescendant={
           showDropdown && highlightedItems[activeIndex]
             ? `${inputId}-result-${activeIndex}`
             : undefined
         }
       />
      <button
        type="submit"
        className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-black transition-colors hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1600d8]"
        aria-label="Tìm kiếm"
      >
        <SearchIcon className="h-5 w-5" />
      </button>

      {showDropdown && (
        <div id={`${inputId}-results`} className="wpx-ft-dd" role="listbox">
          {status === 'loading' && <div className="wpx-ft-item">Đang tìm...</div>}

          {status === 'error' && <div className="wpx-ft-item">Lỗi tìm kiếm</div>}

           {status === 'ready' &&
             highlightedItems.map((item, index) => (
               <div
                 key={`${item.url}-${index}`}
                 id={`${inputId}-result-${index}`}
                 className={`wpx-ft-item${index === activeIndex ? ' is-active' : ''}`}
                 role="option"
                 aria-selected={index === activeIndex}
               >
                <a
                  href={item.url}
                  onMouseDown={handleResultMouseDown}
                  onClick={(event) => {
                    event.preventDefault();
                    setIsOpen(false);
                    router.push(item.url);
                  }}
                >
                  {item.thumb && (
                    <Image
                      className="wpx-ft-thumb"
                      src={item.thumb}
                      alt={item.title}
                      width={48}
                      height={48}
                    />
                  )}
                  <span className="wpx-ft-body">
                    <span
                      className="wpx-ft-title"
                      dangerouslySetInnerHTML={{ __html: item.highlightedTitle }}
                    />
                    {item.excerpt && (
                      <span
                        className="wpx-ft-exc"
                        dangerouslySetInnerHTML={{ __html: item.highlightedExcerpt }}
                      />
                    )}
                  </span>
                </a>
              </div>
            ))}

          {status === 'ready' && highlightedItems.length > 0 && (
            <div className="wpx-ft-more">
              <a
                href={viewAllHref}
                onMouseDown={handleResultMouseDown}
                onClick={(event) => {
                  event.preventDefault();
                  submitSearch();
                }}
              >
                Xem tất cả kết quả
              </a>
            </div>
          )}
        </div>
      )}
    </form>
  );
}
