import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/requireAuth.js';
import { publicUser } from '../auth.js';

const router = Router();
router.use(requireAuth, requireAdmin);

// GET /api/admin/users?q=&role=&status=&page=&limit=
router.get('/users', async (req, res) => {
  const q = (req.query.q || '').toString().trim();
  const role = (req.query.role || '').toString();
  const status = (req.query.status || '').toString();
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
  const offset = (page - 1) * limit;

  const where = [];
  const params = [];
  if (q) {
    params.push(`%${q}%`);
    where.push(`(email ILIKE $${params.length} OR name ILIKE $${params.length})`);
  }
  if (role) {
    params.push(role);
    where.push(`role = $${params.length}`);
  }
  if (status) {
    params.push(status);
    where.push(`status = $${params.length}`);
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const { rows } = await pool.query(
    `SELECT * FROM users ${clause} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  const count = await pool.query(`SELECT COUNT(*) FROM users ${clause}`, params);
  res.json({
    users: rows.map(publicUser),
    total: parseInt(count.rows[0].count, 10),
    page,
    limit
  });
});

router.get('/users/:id', async (req, res) => {
  const { rows } = await pool.query(`SELECT * FROM users WHERE id=$1`, [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'not found' });
  res.json({ user: publicUser(rows[0]) });
});

router.post('/users', async (req, res) => {
  const { email, password, name, role } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ error: 'email and password required' });
  try {
    const hash = await bcrypt.hash(String(password), 12);
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, name, role) VALUES ($1,$2,$3,$4) RETURNING *`,
      [
        String(email).trim().toLowerCase(),
        hash,
        String(name || '').trim(),
        role === 'admin' ? 'admin' : 'user'
      ]
    );
    res.status(201).json({ user: publicUser(rows[0]) });
  } catch (e) {
    if (e.code === '23505')
      return res.status(409).json({ error: 'email already exists' });
    throw e;
  }
});

router.patch('/users/:id', async (req, res) => {
  const { name, role, status } = req.body || {};
  const { rows: cur } = await pool.query(`SELECT * FROM users WHERE id=$1`, [req.params.id]);
  if (!cur[0]) return res.status(404).json({ error: 'not found' });
  // prevent self-demotion lockout
  if (cur[0].id === req.user.sub && role && role !== 'admin')
    return res.status(400).json({ error: 'cannot remove your own admin role' });
  const { rows } = await pool.query(
    `UPDATE users SET
       name = COALESCE($1, name),
       role = COALESCE($2, role),
       status = COALESCE($3, status),
       updated_at = NOW()
     WHERE id=$4 RETURNING *`,
    [name ?? null, role ?? null, status ?? null, req.params.id]
  );
  if (status === 'suspended') {
    await pool.query(`DELETE FROM refresh_tokens WHERE user_id=$1`, [req.params.id]);
  }
  res.json({ user: publicUser(rows[0]) });
});

router.post('/users/:id/reset-password', async (req, res) => {
  const { newPassword } = req.body || {};
  if (!newPassword || String(newPassword).length < 8)
    return res.status(400).json({ error: 'newPassword must be >= 8 chars' });
  const hash = await bcrypt.hash(String(newPassword), 12);
  await pool.query(`UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2`, [
    hash,
    req.params.id
  ]);
  await pool.query(`DELETE FROM refresh_tokens WHERE user_id=$1`, [req.params.id]);
  res.json({ ok: true });
});

router.delete('/users/:id', async (req, res) => {
  if (req.params.id === req.user.sub)
    return res.status(400).json({ error: 'cannot delete yourself' });
  await pool.query(`DELETE FROM users WHERE id=$1`, [req.params.id]);
  res.json({ ok: true });
});

router.get('/stats', async (req, res) => {
  const total = await pool.query(`SELECT COUNT(*) FROM users`);
  const admins = await pool.query(`SELECT COUNT(*) FROM users WHERE role='admin'`);
  const suspended = await pool.query(`SELECT COUNT(*) FROM users WHERE status='suspended'`);
  const recent = await pool.query(`SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '7 days'`);
  res.json({
    total: parseInt(total.rows[0].count, 10),
    admins: parseInt(admins.rows[0].count, 10),
    suspended: parseInt(suspended.rows[0].count, 10),
    newLast7d: parseInt(recent.rows[0].count, 10)
  });
});

export default router;
