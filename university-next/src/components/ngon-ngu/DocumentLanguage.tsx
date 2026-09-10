'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function DocumentLanguage() {
  const pathname = usePathname();
  const language = pathname === '/en' || pathname.startsWith('/en/') ? 'en' : 'vi';

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return null;
}
