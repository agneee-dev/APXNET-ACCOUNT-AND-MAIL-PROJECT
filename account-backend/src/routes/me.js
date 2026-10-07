import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { publicUser } from '../auth.js';
import { clearAuthCookies } from './auth.js';

const router = Router();
router.use(requireAuth);

router.get('/me', async (req, res) => {
  const { rows } = await pool.query(`SELECT * FROM users WHERE id=$1`, [req.user.sub]);
  if (!rows[0]) return res.status(404).json({ error: 'not found' });
  res.json({ user: publicUser(rows[0]) });
});

router.patch('/me', async (req, res) => {
  const { name } = req.body || {};
  const { rows } = await pool.query(
    `UPDATE users SET name=$1, updated_at=NOW() WHERE id=$2 RETURNING *`,
    [String(name ?? '').trim(), req.user.sub]
  );
  res.json({ user: publicUser(rows[0]) });
});

router.post('/change-password', async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!newPassword || String(newPassword).length < 8)
    return res.status(400).json({ error: 'new password must be >= 8 chars' });
  const { rows } = await pool.query(`SELECT * FROM users WHERE id=$1`, [req.user.sub]);
  const u = rows[0];
  const ok = await bcrypt.compare(String(currentPassword || ''), u.password_hash);
  if (!ok) return res.status(400).json({ error: 'current password incorrect' });
  const hash = await bcrypt.hash(String(newPassword), 12);
  await pool.query(`UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2`, [
    hash,
    req.user.sub
  ]);
  await pool.query(`DELETE FROM refresh_tokens WHERE user_id=$1`, [req.user.sub]);
  // Drop this browser's auth cookies as well — every session is now dead and
  // the user must log in again on all devices.
  clearAuthCookies(res);
  res.json({ ok: true, message: 'password changed, please login again' });
});

export default router;
