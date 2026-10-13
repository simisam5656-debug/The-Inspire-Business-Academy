/**
 * Utility functions for safe URL validation and transformations.
 * - Enforces HTTPS only.
 * - Extracts and validates Google Maps embed URLs from pasted iframe codes or bare links.
 * - Converts YouTube links to privacy-friendly embed URLs (youtube-nocookie.com).
 * - Live image URL validation.
 */
import { extractYouTubeVideoId, getYouTubeEmbedUrl } from './youtube';

export function isSafeHttpsUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Extracts and sanitizes Google Maps embed URL.
 * If user pastes `<iframe src="https://www.google.com/maps/embed?..." ...></iframe>`,
 * extracts strictly the `src` attribute.
 * Only permits URLs starting with `https://www.google.com/maps/embed`.
 */
export function extractGoogleMapsEmbedUrl(input: string | null | undefined): string | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // 1. If iframe tag is supplied, extract src using regex
  const iframeMatch = trimmed.match(/src=["'](https:\/\/(?:www\.)?google\.com\/maps\/embed[^"']*)["']/i);
  if (iframeMatch && iframeMatch[1]) {
    return iframeMatch[1];
  }

  // 2. Direct URL supplied
  try {
    const url = new URL(trimmed);
    if (
      url.protocol === 'https:' &&
      (url.hostname === 'www.google.com' || url.hostname === 'google.com') &&
      url.pathname.startsWith('/maps/embed')
    ) {
      return url.toString();
    }
  } catch {
    // invalid url
  }

  return null;
}

/**
 * Validates and converts any YouTube input (watch, youtu.be, shorts, embed)
 * to a safe youtube-nocookie.com embed URL.
 */
export function getSafeYouTubeEmbedUrl(input: string | null | undefined): string | null {
  const videoId = extractYouTubeVideoId(input);
  if (!videoId) return null;
  return getYouTubeEmbedUrl(videoId);
}

export { formatTime12h, formatOperatingHours } from './operatingHours';
