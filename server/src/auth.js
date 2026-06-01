import crypto from 'crypto';
import db from './db.js';

const BOT_TOKEN = process.env.BOT_TOKEN || '';
const DEV_BYPASS = process.env.DEV_BYPASS_AUTH === 'true';
const ADMIN_IDS = (process.env.ADMIN_IDS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

/**
 * Verify Telegram WebApp initData per the official algorithm:
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 * Returns the parsed `user` object or null.
 */
export function verifyInitData(initData) {
  if (!initData) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('\n');

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(BOT_TOKEN)
    .digest();
  const computed = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  if (computed !== hash) return null;

  // reject stale payloads (older than 24h)
  const authDate = Number(params.get('auth_date')) * 1000;
  if (authDate && Date.now() - authDate > 24 * 60 * 60 * 1000) return null;

  try {
    return JSON.parse(params.get('user'));
  } catch {
    return null;
  }
}

/** Upsert the Telegram user into our DB and return the stored row. */
export function upsertUser(tgUser) {
  const isAdmin = ADMIN_IDS.includes(String(tgUser.id)) ? 1 : 0;
  db.prepare(
    `INSERT INTO users (id, username, first_name, photo_url, is_admin, created_at)
     VALUES (@id, @username, @first_name, @photo_url, @is_admin, @created_at)
     ON CONFLICT(id) DO UPDATE SET
       username = excluded.username,
       first_name = excluded.first_name,
       photo_url = excluded.photo_url,
       is_admin = excluded.is_admin`
  ).run({
    id: tgUser.id,
    username: tgUser.username || null,
    first_name: tgUser.first_name || null,
    photo_url: tgUser.photo_url || null,
    is_admin: isAdmin,
    created_at: Date.now(),
  });
  return db.prepare('SELECT * FROM users WHERE id = ?').get(tgUser.id);
}

/**
 * Express middleware. Reads initData from the `Authorization: tma <initData>`
 * header (or `x-init-data`), verifies it, and attaches req.user.
 */
export function authMiddleware(req, res, next) {
  const header = req.get('authorization') || '';
  let initData = req.get('x-init-data') || '';
  if (header.startsWith('tma ')) initData = header.slice(4);

  if (DEV_BYPASS && !initData) {
    // dev-only fake user
    req.user = upsertUser({ id: 1, first_name: 'Dev', username: 'dev' });
    return next();
  }

  const tgUser = verifyInitData(initData);
  if (!tgUser) return res.status(401).json({ error: 'unauthorized' });
  req.user = upsertUser(tgUser);
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user?.is_admin) return res.status(403).json({ error: 'admin only' });
  next();
}
