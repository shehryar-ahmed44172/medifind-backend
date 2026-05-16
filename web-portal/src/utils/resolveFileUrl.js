/**
 * resolveFileUrl — converts any stored file URL to a fully-qualified URL
 * that the browser can load directly.
 *
 * The backend has historically stored two URL formats:
 *   • Absolute: "http://localhost:3000/uploads/documents/cnic-xxx.jpg"  (new format)
 *   • Relative: "/uploads/profile/image-xxx.jpg"                        (old format)
 *
 * Relative paths must be resolved against the backend origin, NOT the Vite
 * dev-server origin (localhost:5173), because the files live on the backend.
 */
const BACKEND_ORIGIN =
  import.meta.env.VITE_API_URL ||   // e.g. "https://api.medifind.app" in production
  'http://localhost:3000';           // local dev default

/**
 * @param {string | null | undefined} url  Raw URL as stored in the database
 * @returns {string | null}               Absolute URL ready for <img src> or window.open
 */
export function resolveFileUrl(url) {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  // Relative path — prepend backend origin
  const base = BACKEND_ORIGIN.replace(/\/$/, ''); // strip trailing slash
  const relative = url.startsWith('/') ? url : `/${url}`;
  return `${base}${relative}`;
}
