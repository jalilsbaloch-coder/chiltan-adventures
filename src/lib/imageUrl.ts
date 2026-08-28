/**
 * Client-Side Image URL Normalizer
 * Handles:
 * - Static assets: /images/...
 * - Local uploads: /uploads/...
 * - Full URLs: https://... or http://...
 * - Persistent Data URIs: data:image/...
 * - Safe fallbacks
 */
export function normalizeImageUrl(
  url: string | null | undefined, 
  fallback: string = '/images/fallback-tour.jpg'
): string {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return fallback;
  }

  const clean = url.trim();

  // If already a Data URI or external URL, return as-is
  if (
    clean.startsWith('data:image/') || 
    clean.startsWith('http://') || 
    clean.startsWith('https://') || 
    clean.startsWith('blob:')
  ) {
    // Strip accidental localhost:3000 if prepended in some development states
    const stripped = clean.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i, '');
    if (stripped.startsWith('http://') || stripped.startsWith('https://') || stripped.startsWith('data:image/')) {
      return stripped;
    }
    return stripped.replace(/^\/+/, '/');
  }

  // Deduplicate leading slashes
  const pathWithoutDupeSlashes = clean.replace(/^\/+/, '/');
  return pathWithoutDupeSlashes.startsWith('/') ? pathWithoutDupeSlashes : `/${pathWithoutDupeSlashes}`;
}

export default normalizeImageUrl;
