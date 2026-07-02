const VI_LOCALE = 'vi-VN';

/**
 * Formats a WordPress ISO date string into a human-readable date.
 * e.g. "2024-01-15T10:30:00" → "15 tháng 1, 2024"
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(VI_LOCALE, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Returns a short date, e.g. "15/01/2024".
 */
export function formatDateShort(dateString: string): string {
  return new Date(dateString).toLocaleDateString(VI_LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Returns an ISO string suitable for the HTML <time datetime=""> attribute.
 */
export function toISODate(dateString: string): string {
  return new Date(dateString).toISOString();
}

/**
 * Splits a date into a numeric day and short month name for event date badges.
 * e.g. "2024-01-15T10:30:00" → { day: "15", month: "Th1" }
 */
export function formatEventDate(dateString: string): { day: string; month: string } {
  const date = new Date(dateString);
  return {
    day: String(date.getDate()),
    month: date.toLocaleDateString('vi-VN', { month: 'short' }),
  };
}
