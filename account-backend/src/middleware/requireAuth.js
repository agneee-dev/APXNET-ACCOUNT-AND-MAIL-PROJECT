import { verifyAccess } from '../auth.js';

export function requireAuth(req, res, next) {
  const h = req.headers.authorization || '';
  const bearer = h.startsWith('Bearer ') ? h.slice(7) : null;
  // Browsers authenticate via the httpOnly apx_access cookie (no token is ever
  // exposed to JS); the Bearer header stays supported for API/scripts.
  const token = bearer || req.cookies?.apx_access || null;
  if (!token) return res.status(401).json({ error: 'missing access token' });
  try {
    const payload = verifyAccess(token);
    if (payload.status === 'suspended')
      return res.status(403).json({ error: 'account suspended' });
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'invalid or expired token' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin')
    return res.status(403).json({ error: 'admin only' });
  next();
}
