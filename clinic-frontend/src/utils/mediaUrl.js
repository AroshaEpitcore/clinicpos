/**
 * Convert a backend-relative path (/uploads/...) to a full URL.
 * If the path is already absolute (starts with http), return as-is.
 * Usage: mediaUrl(clinic.logo_url) → "http://localhost:4000/uploads/..."
 */
const API_ORIGIN = (
  (import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1')
    .replace('/api/v1', '')
);

export function mediaUrl(path) {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return API_ORIGIN + path;
}
