import pg from 'pg';
import { config } from './config.js';

const { Pool } = pg;
export const pool = new Pool({ connectionString: config.databaseUrl });

export async function initDb() {
  // retry loop — postgres container may take a few seconds
  for (let i = 0; i < 30; i++) {
    try {
      await pool.query('SELECT 1');
      break;
    } catch (e) {
      console.log(`[db] waiting for postgres... (${i + 1}/30)`);
      await new Promise((r) => setTimeout(r, 2000));
      if (i === 29) throw e;
    }
  }

  await pool.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);
  await pool.query(`CREATE EXTENSION IF NOT EXISTS citext;`).catch(() => {});
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email CITEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
      email_verified BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `);
  console.log('[db] schema ready');
}
