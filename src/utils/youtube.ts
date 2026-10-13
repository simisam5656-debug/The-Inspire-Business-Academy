/**
 * Safe YouTube Video ID extraction & validation
 * Supports:
 * - standard watch URLs: https://www.youtube.com/watch?v=dQw4w9WgXcQ
 * - shortened URLs: https://youtu.be/dQw4w9WgXcQ
 * - embed URLs: https://www.youtube.com/embed/dQw4w9WgXcQ
 * - bare 11-char IDs: dQw4w9WgXcQ
 *
 * Explicit Security Notice:
 * In accordance with PRD Section 6 & 8: Unlisted YouTube videos provide obfuscation,
 * NOT Digital Rights Management (DRM). Access control is enforced at the LMS route level.
 */

export function extractYouTubeVideoId(input: string | undefined | null): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Exact 11-character alphanumeric with _ or -
  const canonicalIdRegex = /^[a-zA-Z0-9_-]{11}$/;
  if (canonicalIdRegex.test(trimmed)) {
    return trimmed;
  }

  try {
    // If not matching canonical ID, try parsing URL
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const hostname = url.hostname.toLowerCase();

    // 1. youtu.be/<id>
    if (hostname === 'youtu.be' || hostname.endsWith('.youtu.be')) {
      const id = url.pathname.replace(/^\//, '').split('/')[0];
      if (canonicalIdRegex.test(id)) return id;
    }

    // 2. youtube.com/watch?v=<id>
    if (hostname.includes('youtube.com')) {
      const v = url.searchParams.get('v');
      if (v && canonicalIdRegex.test(v)) return v;

      // 3. youtube.com/embed/<id>
      if (url.pathname.includes('/embed/')) {
        const parts = url.pathname.split('/embed/');
        if (parts[1]) {
          const id = parts[1].split('/')[0].split('?')[0];
          if (canonicalIdRegex.test(id)) return id;
        }
      }

      // 4. youtube.com/v/<id>
      if (url.pathname.includes('/v/')) {
        const parts = url.pathname.split('/v/');
        if (parts[1]) {
          const id = parts[1].split('/')[0].split('?')[0];
          if (canonicalIdRegex.test(id)) return id;
        }
      }

      // 5. youtube.com/shorts/<id>
      if (url.pathname.includes('/shorts/')) {
        const parts = url.pathname.split('/shorts/');
        if (parts[1]) {
          const id = parts[1].split('/')[0].split('?')[0];
          if (canonicalIdRegex.test(id)) return id;
        }
      }
    }
  } catch {
    // Not a valid URL, fallback to regex search for 11-char pattern
    const match = trimmed.match(/(?:v=|\/embed\/|\/17\/|\/v\/|https:\/\/youtu\.be\/|\/shorts\/)([a-zA-Z0-9_-]{11})/);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

export function isValidYouTubeInput(input: string | undefined | null): boolean {
  if (!input || !input.trim()) return true; // empty is allowed for lessons without video yet
  return extractYouTubeVideoId(input) !== null;
}

export function getYouTubeEmbedUrl(videoId: string): string {
  // Uses youtube-nocookie.com for privacy and sandboxed unlisted embedding
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`;
}
