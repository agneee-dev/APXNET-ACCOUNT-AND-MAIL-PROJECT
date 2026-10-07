// Central registry of APXNET apps that trust this portal for sign-in.
// The NAS portal lives on the SAME host as this page (LAN IP, Tailscale IP,
// localhost or DNS name — whatever the user opened), only the port differs.
// Override with NEXT_PUBLIC_NAS_APP_URL if the NAS app ever moves elsewhere.

export function nasAppBase() {
  const env = process.env.NEXT_PUBLIC_NAS_APP_URL;
  if (env) return String(env).replace(/\/+$/, '');
  if (typeof window === 'undefined') return 'http://192.168.0.127:3101';
  return `${window.location.protocol}//${window.location.hostname}:3101`;
}

/** Entry point of the NAS portal — its /login shows the ACCOUNT profile. */
export function nasLoginUrl() {
  return `${nasAppBase()}/login`;
}

/** Classify a ?next= destination so auth pages can explain where you land. */
export function describeNext(raw) {
  if (!raw || typeof window === 'undefined') return { kind: 'portal', label: 'your dashboard' };
  try {
    const url = new URL(raw, window.location.origin);
    const sameHost = url.hostname === window.location.hostname;
    const looksNas = url.pathname.startsWith('/nas-user') || url.port === '3101';
    if (sameHost && looksNas) return { kind: 'nas', label: 'NAS Files' };
    if (raw.startsWith('/') && !raw.startsWith('//')) return { kind: 'portal', label: 'your dashboard' };
    if (sameHost) return { kind: 'portal', label: 'your dashboard' };
  } catch {
    // fall through
  }
  return { kind: 'portal', label: 'your dashboard' };
}
