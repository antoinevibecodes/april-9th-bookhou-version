// Task #1: All dates/times must display in the location's local timezone

/**
 * Convert a UTC date to a specific timezone string
 */
export function toLocalTime(date: Date, timezone: string): string {
  return date.toLocaleString('en-US', { timeZone: timezone });
}

/**
 * Format a date for display in a specific timezone
 */
export function formatLocalDateTime(
  date: Date,
  timezone: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const defaults: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: timezone,
  };
  return date.toLocaleString('en-US', { ...defaults, ...options });
}

/**
 * Format date only (no time) in a specific timezone
 */
export function formatLocalDate(date: Date, timezone: string): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: timezone,
  });
}

/**
 * Get the current time in a specific timezone
 */
export function nowInTimezone(timezone: string): Date {
  const now = new Date();
  const localString = now.toLocaleString('en-US', { timeZone: timezone });
  return new Date(localString);
}
