import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { publicUser } from '../auth.js';
import { config } from '../config.js';

const router = Router();

// Server-to-server guard: NAS backend (and future services) must send this.
function requireServiceKey(req, res, next) {
  if (!config.serviceKey) return res.status(500).json({ error: 'service key not configured' });
  const key = req.headers['x-service-key'];
  if (key !== config.serviceKey) return res.status(403).json({ error: 'bad service key' });
  next();
}
router.use(requireServiceKey);

// POST /api/internal/verify { identifier, password } -> 200 { user } | 401 | 403(suspended)
router.post('/verify', async (req, res) => {
  const { identifier, password } = req.body || {};
  if (!identifier || !password)
    return res.status(400).json({ error: 'identifier and password required' });
  const { rows } = await pool.query(`SELECT * FROM users WHERE email=$1`, [
    String(identifier).trim().toLowerCase()
  ]);
  const u = rows[0];
  if (!u) return res.status(401).json({ error: 'invalid credentials' });
  if (u.status === 'suspended') return res.status(403).json({ error: 'account suspended' });
  const ok = await bcrypt.compare(String(password), u.password_hash);
  if (!ok) return res.status(401).json({ error: 'invalid credentials' });
  res.json({ user: publicUser(u) });
});

// GET /api/internal/users -> 200 { users: [...] } (for NAS share-grant checklist)
router.get('/users', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, email, name, role, status, created_at FROM users ORDER BY email ASC`
  );
  res.json({ users: rows.map(publicUser) });
});

// GET /api/internal/user?email= -> 200 { user } | 404
router.get('/user', async (req, res) => {
  const email = String(req.query.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'email required' });
  const { rows } = await pool.query(`SELECT * FROM users WHERE email=$1`, [email]);
  if (!rows[0]) return res.status(404).json({ error: 'not found' });
  res.json({ user: publicUser(rows[0]) });
});

// POST /api/internal/upsert { email, password?, name?, role?, status? }
// Creates the user if missing, otherwise updates supplied fields.
// Used by NAS backend to mirror centrally-managed users.
router.post('/upsert', async (req, res) => {
  const { email, password, name, role, status } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email required' });
  const em = String(email).trim().toLowerCase();
  if (password && String(password).length < 8)
    return res.status(400).json({ error: 'password must be >= 8 chars' });
  const { rows: existing } = await pool.query(`SELECT * FROM users WHERE email=$1`, [em]);
  try {
    if (!existing.length) {
      if (!password) return res.status(400).json({ error: 'password required for new user' });
      const hash = await bcrypt.hash(String(password), 12);
      const { rows } = await pool.query(
        `INSERT INTO users (email, password_hash, name, role, status) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [
          em,
          hash,
          String(name ?? em.split('@')[0]).trim(),
          role === 'admin' ? 'admin' : 'user',
          status === 'suspended' ? 'suspended' : 'active'
        ]
      );
      return res.status(201).json({ user: publicUser(rows[0]), created: true });
    }
    const u = existing[0];
    const hash = password ? await bcrypt.hash(String(password), 12) : null;
    const { rows } = await pool.query(
      `UPDATE users SET
         password_hash = COALESCE($1, password_hash),
         name = COALESCE($2, name),
         role = COALESCE($3, role),
         status = COALESCE($4, status),
         updated_at = NOW()
       WHERE email=$5 RETURNING *`,
      [
        hash,
        name != null ? String(name).trim() : null,
        role != null ? (role === 'admin' ? 'admin' : 'user') : null,
        status != null ? (status === 'suspended' ? 'suspended' : 'active') : null,
        em
      ]
    );
    // If a user was suspended centrally, kill their sessions.
    if (status === 'suspended') {
      await pool.query(`DELETE FROM refresh_tokens WHERE user_id=$1`, [rows[0].id]);
    }
    res.json({ user: publicUser(rows[0]), created: false });
  } catch (e) {
    console.error('[internal/upsert]', e);
    res.status(500).json({ error: 'upsert failed' });
  }
});

export default router;
