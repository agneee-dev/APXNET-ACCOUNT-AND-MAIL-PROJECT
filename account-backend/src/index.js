import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import { config } from './config.js';
import { pool, initDb } from './db.js';
import authRoutes from './routes/auth.js';
import internalRoutes from './routes/internal.js';
import meRoutes from './routes/me.js';
import adminRoutes from './routes/admin.js';

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// CSRF guard for cookie-based auth. The auth cookies are SameSite=Lax, so
// browsers never attach them to cross-SITE requests — this guard is defence in
// depth on top of that: it rejects state-changing requests coming from a
// foreign site, while still allowing the normal cross-ORIGIN setups here
// (UI on :3102/:3103, API on :5101 — any IP/hostname/localhost, subdomains of
// the same zone, reverse proxies via X-Forwarded-Host).
// Requests without an Origin header (curl, server-to-server) are allowed.
// Add foreign sites explicitly with ALLOWED_ORIGINS (comma-separated origins
// or hostnames), e.g. ALLOWED_ORIGINS="http://other-box:3102,apps.example.com".
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim().replace(/\/+$/, '').toLowerCase())
  .filter(Boolean);

function hostnameOf(value) {
  if (!value) return '';
  const v = String(value).split(',')[0].trim().toLowerCase().replace(/\/+$/, '');
  if (!v) return '';
  try {
    return new URL(v.includes('://') ? v : `http://${v}`).hostname;
  } catch {
    return '';
  }
}

// "Site" per SameSite-cookie semantics, approximated: IPs (v4/v6) are their
// own site and must match exactly; otherwise the registrable domain (last two
// labels — e.g. sub.apxnet.lab + api.apxnet.lab → apxnet.lab) must match.
function siteOf(host) {
  if (!host) return '';
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':')) return host;
  const labels = host.split('.');
  return labels.length > 2 ? labels.slice(-2).join('.') : host;
}

app.use('/api', (req, res, next) => {
  const method = String(req.method).toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return next();

  const origin = req.headers.origin;
  if (!origin) return next(); // curl / server-to-server: no browser cookies involved

  const normalized = origin.toLowerCase().replace(/\/+$/, '');
  const originHost = hostnameOf(origin);
  const requestHost = hostnameOf(req.headers.host);
  const forwardedHost = hostnameOf(req.headers['x-forwarded-host']);
  const sameHost =
    !!originHost && (originHost === requestHost || originHost === forwardedHost);
  const sameSite =
    !!originHost && !!siteOf(originHost) && siteOf(originHost) === siteOf(requestHost);
  const inList = allowedOrigins.some((o) =>
    o.includes('://') ? o === normalized : o === originHost
  );

  if (sameHost || sameSite || inList) return next();

  console.warn(
    `[csrf] blocked ${method} ${req.url} origin=${origin} host=${req.headers.host || '-'}`
  );
  return res.status(403).json({
    error:
      'cross-origin request blocked: open the UI and the API from the same host ' +
      '(the frontend now follows the page host, port from NEXT_PUBLIC_API_URL), ' +
      'or list this origin in the backend ALLOWED_ORIGINS env'
  });
});

app.get('/health', (req, res) => res.json({ ok: true, service: 'apxnet-accounts' }));
app.use('/api/auth', authRoutes);
app.use('/api/internal', internalRoutes);
app.use('/api/me', meRoutes);
app.use('/api/admin', adminRoutes);

// 404
app.use((req, res) => res.status(404).json({ error: 'not found' }));
// error handler
// eslint-disable-next-line
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'internal error' });
});

async function seedAdmin() {
  const { rows } = await pool.query(`SELECT id FROM users WHERE email=$1`, [
    config.seedAdminEmail.toLowerCase()
  ]);
  if (rows.length) {
    console.log(`[seed] admin exists: ${config.seedAdminEmail}`);
    return;
  }
  const hash = await bcrypt.hash(config.seedAdminPassword, 12);
  await pool.query(
    `INSERT INTO users (email, password_hash, name, role, email_verified) VALUES ($1,$2,'Administrator','admin',TRUE)`,
    [config.seedAdminEmail.toLowerCase(), hash]
  );
  console.log(`[seed] admin created: ${config.seedAdminEmail}`);
}

initDb()
  .then(seedAdmin)
  .then(() => {
    app.listen(config.port, '0.0.0.0', () => {
      console.log(`[account-backend] listening on 0.0.0.0:${config.port}`);
    });
  })
  .catch((e) => {
    console.error('boot failed', e);
    process.exit(1);
  });
