'use client';

import { useEffect } from 'react';

/**
 * Locks document.body overflow while `locked` is true.
 * Automatically restores scroll on unmount.
 */
export function useScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previous;
    };
  }, [locked]);
}
