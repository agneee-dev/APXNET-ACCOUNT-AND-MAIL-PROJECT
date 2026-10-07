// URL of the NAS user portal on this same host (ports may differ).
// Central place so every Accounts page links to the same destination.
export function nasAppUrl() {
  if (typeof window === 'undefined') return 'http://192.168.0.127:3101';
  const env = process.env.NEXT_PUBLIC_NAS_APP_URL;
  if (env) return env.replace(/\/+$/, '');
  return `\${window.location.protocol}//\${window.location.hostname}:3101`;
}

/** Reads the ?next= query parameter from the current URL (client-side only). */
export function readNextParam() {
  if (typeof window === 'undefined') return null;
  try {
    return new URLSearchParams(window.location.search).get('next');
  } catch {
    return null;
  }
}

/** Returns a destination we are willing to navigate to, or '/dashboard'. */
export function resolveNext(raw) {
  if (!raw || typeof window === 'undefined') return '/dashboard';
  // Same-origin relative path -- reject protocol-relative "//evil.com".
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw;
  try {
    const url = new URL(raw);
    const http = url.protocol === 'http:' || url.protocol === 'https:';
    // Absolute URLs are only accepted for the host we are currently on
    // (ports may differ -- e.g. the NAS portal on :3101). Blocks open redirects.
    if (http && url.hostname === window.location.hostname) return url.toString();
  } catch {
    // fall through
  }
  return '/dashboard';
}

export function goTo(router, raw) {
  const target = resolveNext(raw);
  if (/^https?:\/\//.test(target)) window.location.assign(target);
  else router.push(target);
}
