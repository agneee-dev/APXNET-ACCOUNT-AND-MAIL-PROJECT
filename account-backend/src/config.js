import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5101', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgres://apxnet:apxnet_strong_pw_123@postgres:5432/apxnet_accounts',
  accessSecret: process.env.JWT_ACCESS_SECRET || 'dev_access_secret_change_me',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_change_me',
  accessTtl: process.env.ACCESS_TOKEN_TTL || '15m',
  refreshTtlDays: parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || '7', 10),
  seedAdminEmail: process.env.SEED_ADMIN_EMAIL || 'control@apxnet.lab',
  seedAdminPassword: process.env.SEED_ADMIN_PASSWORD || 'control',
  serviceKey: process.env.ACCOUNT_SERVICE_KEY || '',
  isProd: process.env.NODE_ENV === 'production'
};
