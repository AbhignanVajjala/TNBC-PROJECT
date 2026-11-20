export function scientificBackendUrl(env = process.env): string | null {
  const configured = env.EXORANK_BACKEND_URL?.trim();
  if (!configured && env.NODE_ENV === 'production') return null;
  const url = new URL(configured || 'http://127.0.0.1:8000/api');
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname.replace(/\/$/, '') !== '/api') {
    throw new Error('EXORANK_BACKEND_URL must be an HTTP(S) API base URL ending in /api.');
  }
  return url.href.replace(/\/$/, '');
}
