// Resolve the API base. Protocol + port come from NEXT_PUBLIC_API_URL, but in
// the browser the HOST follows whatever host the page itself was opened from
// (LAN IP, Tailscale IP, localhost, DNS name…). This keeps every request
// same-host as the page — required for the httpOnly auth cookies to be sent
// (SameSite) and for the backend's CSRF origin check to pass.
// Opt out with NEXT_PUBLIC_API_SAME_HOST=0 (e.g. API on a different machine).
function resolveApi() {
  const env = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.127:5101';
  if (typeof window === 'undefined') return env; // SSR/prerender
  if (process.env.NEXT_PUBLIC_API_SAME_HOST === '0') return env;
  try {
    const u = new URL(env);
    return `${u.protocol}//${window.location.hostname}${u.port ? `:${u.port}` : ''}`;
  } catch {
    return env;
  }
}
const API = resolveApi();

// Auth tokens (apx_access + apx_refresh) live exclusively in httpOnly cookies
// set by the backend. JavaScript never reads or writes them — no localStorage,
// no sessionStorage, no Authorization header. Cookies ride along automatically
// because every request uses credentials: 'include'.

let refreshing = null;
function refreshSession() {
  if (!refreshing) {
    refreshing = fetch(`${API}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      credentials: 'include'
    })
      .then((r) => r.ok)
      .catch(() => false)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

async function req(path, opts = {}, isRetry = false) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    credentials: 'include'
  });
  // Access cookie expired → silently renew the session (rotates the refresh
  // cookie) and replay the request once. This is what keeps the admin logged
  // in indefinitely until they hit Logout.
  if (
    res.status === 401 &&
    !isRetry &&
    !path.startsWith('/api/auth/') &&
    (await refreshSession())
  ) {
    return req(path, opts, true);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `request failed (${res.status})`);
  return data;
}
export const api = {
  base: API,
  login: (body) => req('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => req('/api/auth/logout', { method: 'POST', body: JSON.stringify({}) }),
  me: () => req('/api/me/me'),
  stats: () => req('/api/admin/stats'),
  listUsers: (qs = '') => req(`/api/admin/users${qs}`),
  createUser: (body) => req('/api/admin/users', { method: 'POST', body: JSON.stringify(body) }),
  updateUser: (id, body) => req(`/api/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  resetPw: (id, newPassword) => req(`/api/admin/users/${id}/reset-password`, { method: 'POST', body: JSON.stringify({ newPassword }) }),
  deleteUser: (id) => req(`/api/admin/users/${id}`, { method: 'DELETE' })
};
