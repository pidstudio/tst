import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

export const db = new Database(path.join(dataDir, 'auction.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY,            -- Telegram user id
    username      TEXT,
    first_name    TEXT,
    photo_url     TEXT,
    is_admin      INTEGER NOT NULL DEFAULT 0,
    created_at    INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS categories (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    slug    TEXT UNIQUE NOT NULL,                 -- 'one-piece', 'pokemon', ...
    name    TEXT NOT NULL,
    icon    TEXT,
    sort    INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS auctions (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id    INTEGER NOT NULL REFERENCES categories(id),
    title          TEXT NOT NULL,
    description    TEXT,
    image_url      TEXT,
    grade          TEXT,                          -- เช่น PSA 10, NM, รหัสการ์ด OP01-...
    start_price    INTEGER NOT NULL,              -- หน่วยเป็นบาท (จำนวนเต็ม)
    min_increment  INTEGER NOT NULL DEFAULT 10,
    current_price  INTEGER NOT NULL,
    current_bidder INTEGER REFERENCES users(id),
    bid_count      INTEGER NOT NULL DEFAULT 0,
    status         TEXT NOT NULL DEFAULT 'live',  -- 'live' | 'ended' | 'cancelled'
    ends_at        INTEGER NOT NULL,              -- epoch ms
    anti_snipe_sec INTEGER NOT NULL DEFAULT 30,   -- ต่อเวลาเมื่อบิดช่วงท้าย
    created_by     INTEGER REFERENCES users(id),
    created_at     INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS bids (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    auction_id  INTEGER NOT NULL REFERENCES auctions(id),
    user_id     INTEGER NOT NULL REFERENCES users(id),
    amount      INTEGER NOT NULL,
    created_at  INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_bids_auction ON bids(auction_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_auctions_status ON auctions(status, ends_at);
`);

// ---- seed default categories (One Piece first, extensible) ----
const catCount = db.prepare('SELECT COUNT(*) c FROM categories').get().c;
if (catCount === 0) {
  const insert = db.prepare(
    'INSERT INTO categories (slug, name, icon, sort) VALUES (?, ?, ?, ?)'
  );
  insert.run('one-piece', 'One Piece Card Game', '🏴‍☠️', 0);
  insert.run('pokemon', 'Pokémon TCG', '⚡', 1);
  insert.run('dragon-ball', 'Dragon Ball Super', '🐉', 2);
  insert.run('other', 'อื่นๆ', '🃏', 99);
}

export default db;
