import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from './config.js';

export function signAccess(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, status: user.status },
    config.accessSecret,
    { expiresIn: config.accessTtl }
  );
}

export function signRefresh(user) {
  return jwt.sign({ sub: user.id, v: 1 }, config.refreshSecret, {
    expiresIn: `${config.refreshTtlDays}d`
  });
}

export function verifyAccess(token) {
  return jwt.verify(token, config.accessSecret);
}

export function verifyRefresh(token) {
  return jwt.verify(token, config.refreshSecret);
}

export function sha256(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

export function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    status: u.status,
    email_verified: u.email_verified,
    created_at: u.created_at,
    updated_at: u.updated_at
  };
}
