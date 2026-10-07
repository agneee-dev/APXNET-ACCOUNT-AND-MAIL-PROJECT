import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { signAccess, signRefresh, verifyRefresh, sha256, publicUser } from '../auth.js';
import { config } from '../config.js';

const router = Router();

// Both tokens live in httpOnly cookies — JavaScript (and therefore any XSS)
// can never read them. Nothing is stored in localStorage/sessionStorage.
// Sessions are persistent (sliding): the refresh cookie + its DB row are
// re-issued with a full TTL on every refresh, so a user stays logged in
// until they explicitly log out (or their password changes / they get suspended).
const sessionMaxAgeMs = () => config.refreshTtlDays * 24 * 3600 * 1000;

function cookieOpts(path) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProd,
    path,
    maxAge: sessionMaxAgeMs()
  };
}

function setRefreshCookie(res, token) {
  res.cookie('apx_refresh', token, cookieOpts('/api/auth'));
}

// Short-lived JWT (ACCESS_TOKEN_TTL), but the cookie carrying it persists for
// the whole session; the frontend transparently refreshes once it expires.
function setAccessCookie(res, token) {
  res.cookie('apx_access', token, cookieOpts('/api'));
}

export function clearAuthCookies(res) {
  res.clearCookie('apx_refresh', { path: '/api/auth' });
  res.clearCookie('apx_access', { path: '/api' });
}

router.post('/register', async (req, res) => {
  const { email, password, name } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ error: 'email and password required' });
  if (String(password).length < 8)
    return res.status(400).json({ error: 'password must be >= 8 chars' });
  try {
    const hash = await bcrypt.hash(String(password), 12);
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, name) VALUES ($1,$2,$3) RETURNING *`,
      [String(email).trim().toLowerCase(), hash, String(name || '').trim()]
    );
    const user = publicUser(rows[0]);
    const access = signAccess(rows[0]);
    const refresh = signRefresh(rows[0]);
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1,$2,NOW() + ($3 || ' days')::interval)`,
      [rows[0].id, sha256(refresh), String(config.refreshTtlDays)]
    );
    setRefreshCookie(res, refresh);
    setAccessCookie(res, access);
    res.status(201).json({ user, accessToken: access });
  } catch (e) {
    if (e.code === '23505')
      return res.status(409).json({ error: 'email already registered' });
    console.error(e);
    res.status(500).json({ error: 'register failed' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ error: 'email and password required' });
  const { rows } = await pool.query(`SELECT * FROM users WHERE email=$1`, [
    String(email).trim().toLowerCase()
  ]);
  const u = rows[0];
  if (!u) return res.status(401).json({ error: 'invalid credentials' });
  if (u.status === 'suspended')
    return res.status(403).json({ error: 'account suspended' });
  const ok = await bcrypt.compare(String(password), u.password_hash);
  if (!ok) return res.status(401).json({ error: 'invalid credentials' });
  const access = signAccess(u);
  const refresh = signRefresh(u);
  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1,$2,NOW() + ($3 || ' days')::interval)`,
    [u.id, sha256(refresh), String(config.refreshTtlDays)]
  );
  setRefreshCookie(res, refresh);
  setAccessCookie(res, access);
  res.json({ user: publicUser(u), accessToken: access });
});

router.post('/refresh', async (req, res) => {
  const cookieToken = req.cookies?.apx_refresh;
  const bodyToken = req.body?.refreshToken;
  const token = cookieToken || bodyToken;
  if (!token) return res.status(401).json({ error: 'no refresh token' });
  try {
    const payload = verifyRefresh(token);
    const { rows } = await pool.query(
      `SELECT rt.*, u.* FROM refresh_tokens rt JOIN users u ON u.id=rt.user_id WHERE rt.token_hash=$1 AND rt.expires_at > NOW()`,
      [sha256(token)]
    );
    const found = rows[0];
    if (!found || found.user_id !== payload.sub)
      return res.status(401).json({ error: 'refresh revoked' });
    if (found.status === 'suspended')
      return res.status(403).json({ error: 'account suspended' });
    // rotate
    await pool.query(`DELETE FROM refresh_tokens WHERE token_hash=$1`, [sha256(token)]);
    const access = signAccess(found);
    const refresh = signRefresh(found);
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1,$2,NOW() + ($3 || ' days')::interval)`,
      [found.user_id, sha256(refresh), String(config.refreshTtlDays)]
    );
    setRefreshCookie(res, refresh);
    setAccessCookie(res, access);
    res.json({
      user: publicUser(found),
      accessToken: access,
      refreshToken: bodyToken ? refresh : undefined
    });
  } catch {
    return res.status(401).json({ error: 'invalid refresh token' });
  }
});

router.post('/logout', async (req, res) => {
  const token = req.cookies?.apx_refresh || req.body?.refreshToken;
  if (token) {
    await pool
      .query(`DELETE FROM refresh_tokens WHERE token_hash=$1`, [sha256(token)])
      .catch(() => {});
  }
  clearAuthCookies(res);
  res.json({ ok: true });
});

export default router;
