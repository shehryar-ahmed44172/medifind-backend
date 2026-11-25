/**
 * Which browser origins may call the API and open a socket.
 *
 * CORS_ORIGINS is a comma-separated list, for example
 *   https://medifind.clientorahq.com,https://medifind-portal.vercel.app
 * When it is not set every origin is allowed, which keeps local development and
 * the old deployments working. The mobile app is not affected either way: native
 * requests carry no Origin header, and CORS only applies to browsers.
 */
export function allowedOrigins(): string | string[] {
  const list = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map(o => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  return list.length ? list : '*';
}

/** Public address of the web portal, used to build links in emails. */
export function frontendUrl(): string {
  return (process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3100').replace(/\/+$/, '');
}
