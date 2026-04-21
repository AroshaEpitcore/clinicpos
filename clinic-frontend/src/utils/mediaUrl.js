/**
 * Convert a backend-relative path (/uploads/...) to a full URL.
 * Uses the current window origin so it works on any subdomain in production
 * and via the Vite /uploads proxy in local dev.
 */
export function mediaUrl(path) {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return window.location.origin + path;
}
