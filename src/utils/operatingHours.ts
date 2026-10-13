/**
 * Operating Hours Formatting Utility
 * Formats 24-hour time strings (e.g. '09:00', '19:00') into 12-hour AM/PM representations
 * and full operating hour ranges with safe fallbacks.
 */

/**
 * Formats a 24h 'HH:MM' time string to 12h AM/PM string.
 * Example:
 * - '09:00' -> '9:00 AM'
 * - '19:00' -> '7:00 PM'
 * - '00:00' -> '12:00 AM'
 * - '12:30' -> '12:30 PM'
 * - empty or invalid -> fallback (defaults to '9:00 AM')
 */
export function formatTime12h(time24: string | null | undefined, fallback: string = '9:00 AM'): string {
  if (!time24 || typeof time24 !== 'string' || !time24.includes(':')) {
    return fallback;
  }
  const parts = time24.split(':');
  if (parts.length < 2) return fallback;

  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
    return fallback;
  }

  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const minutePadded = m < 10 ? `0${m}` : `${m}`;
  return `${h12}:${minutePadded} ${ampm}`;
}

/**
 * Formats open and close operating hours into a unified display string.
 * Example:
 * - '09:00', '19:00' -> '9:00 AM to 7:00 PM'
 * - Empty or invalid values fall back to '9:00 AM to 7:00 PM'
 */
export function formatOperatingHours(
  open?: string | null,
  close?: string | null,
  fallback: string = '9:00 AM to 7:00 PM'
): string {
  if (!open && !close) return fallback;

  const openValid = Boolean(
    open &&
    typeof open === 'string' &&
    open.includes(':') &&
    !isNaN(parseInt(open.split(':')[0], 10)) &&
    parseInt(open.split(':')[0], 10) >= 0 &&
    parseInt(open.split(':')[0], 10) <= 23
  );

  const closeValid = Boolean(
    close &&
    typeof close === 'string' &&
    close.includes(':') &&
    !isNaN(parseInt(close.split(':')[0], 10)) &&
    parseInt(close.split(':')[0], 10) >= 0 &&
    parseInt(close.split(':')[0], 10) <= 23
  );

  if (!openValid && !closeValid) {
    return fallback;
  }

  const formattedOpen = formatTime12h(open, '9:00 AM');
  const formattedClose = formatTime12h(close, '7:00 PM');
  return `${formattedOpen} to ${formattedClose}`;
}
