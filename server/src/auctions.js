import db from './db.js';

// EventEmitter-style hooks wired up in index.js (socket.io + bot notifications)
const listeners = { bid: [], end: [] };
export function on(event, fn) {
  listeners[event]?.push(fn);
}
function emit(event, payload) {
  for (const fn of listeners[event] || []) {
    try {
      fn(payload);
    } catch (e) {
      console.error(`listener error on ${event}:`, e);
    }
  }
}

export function getAuction(id) {
  return db
    .prepare(
      `SELECT a.*, c.name AS category_name, c.slug AS category_slug,
              u.username AS bidder_username, u.first_name AS bidder_name
       FROM auctions a
       JOIN categories c ON c.id = a.category_id
       LEFT JOIN users u ON u.id = a.current_bidder
       WHERE a.id = ?`
    )
    .get(id);
}

export function listAuctions({ category, status = 'live' } = {}) {
  let sql = `SELECT a.*, c.name AS category_name, c.slug AS category_slug
             FROM auctions a JOIN categories c ON c.id = a.category_id
             WHERE 1=1`;
  const args = [];
  if (status) {
    sql += ' AND a.status = ?';
    args.push(status);
  }
  if (category) {
    sql += ' AND c.slug = ?';
    args.push(category);
  }
  sql += ' ORDER BY a.ends_at ASC';
  return db.prepare(sql).all(...args);
}

export function getBids(auctionId, limit = 20) {
  return db
    .prepare(
      `SELECT b.amount, b.created_at, u.username, u.first_name, u.id AS user_id
       FROM bids b JOIN users u ON u.id = b.user_id
       WHERE b.auction_id = ? ORDER BY b.created_at DESC LIMIT ?`
    )
    .all(auctionId, limit);
}

export class BidError extends Error {}

/**
 * Place a bid. Runs in a transaction so two simultaneous bids can't both win.
 * Implements anti-snipe: a bid within `anti_snipe_sec` of the end extends the
 * auction by that many seconds.
 */
export const placeBid = db.transaction((auctionId, user, amount) => {
  const a = db.prepare('SELECT * FROM auctions WHERE id = ?').get(auctionId);
  if (!a) throw new BidError('ไม่พบรายการประมูล');
  if (a.status !== 'live') throw new BidError('รายการนี้ปิดประมูลแล้ว');

  const now = Date.now();
  if (now >= a.ends_at) throw new BidError('หมดเวลาประมูลแล้ว');
  if (a.current_bidder === user.id)
    throw new BidError('คุณเป็นผู้เสนอราคาสูงสุดอยู่แล้ว');

  const minNext =
    a.bid_count === 0 ? a.start_price : a.current_price + a.min_increment;
  if (amount < minNext)
    throw new BidError(`ต้องเสนอราคาอย่างน้อย ฿${minNext.toLocaleString()}`);

  db.prepare(
    'INSERT INTO bids (auction_id, user_id, amount, created_at) VALUES (?, ?, ?, ?)'
  ).run(auctionId, user.id, amount, now);

  // anti-snipe extension
  let endsAt = a.ends_at;
  const windowMs = a.anti_snipe_sec * 1000;
  if (a.ends_at - now < windowMs) endsAt = now + windowMs;

  db.prepare(
    `UPDATE auctions
     SET current_price = ?, current_bidder = ?, bid_count = bid_count + 1, ends_at = ?
     WHERE id = ?`
  ).run(amount, user.id, endsAt, auctionId);

  const updated = getAuction(auctionId);
  emit('bid', { auction: updated, bidder: user, amount });
  scheduleClose(updated);
  return updated;
});

// ---- auto-close scheduling ----
const timers = new Map();

export function scheduleClose(auction) {
  if (auction.status !== 'live') return;
  const existing = timers.get(auction.id);
  if (existing) clearTimeout(existing);
  const delay = Math.max(0, auction.ends_at - Date.now());
  const t = setTimeout(() => closeAuction(auction.id), delay);
  timers.set(auction.id, t);
}

export function closeAuction(id) {
  const a = db.prepare('SELECT * FROM auctions WHERE id = ?').get(id);
  if (!a || a.status !== 'live') return;
  if (Date.now() < a.ends_at) return scheduleClose(a); // extended meanwhile
  db.prepare("UPDATE auctions SET status = 'ended' WHERE id = ?").run(id);
  timers.delete(id);
  const finished = getAuction(id);
  emit('end', { auction: finished });
  console.log(`🔔 auction #${id} ended — winner: ${finished.current_bidder || 'none'}`);
}

/** Re-arm timers for all live auctions on startup. */
export function restoreSchedules() {
  const live = db.prepare("SELECT * FROM auctions WHERE status = 'live'").all();
  for (const a of live) {
    if (Date.now() >= a.ends_at) closeAuction(a.id);
    else scheduleClose(a);
  }
  console.log(`⏰ restored ${live.length} live auction timer(s)`);
}

export function createAuction(data, userId) {
  const now = Date.now();
  const info = db
    .prepare(
      `INSERT INTO auctions
       (category_id, title, description, image_url, grade, start_price,
        min_increment, current_price, status, ends_at, anti_snipe_sec, created_by, created_at)
       VALUES (@category_id, @title, @description, @image_url, @grade, @start_price,
        @min_increment, @current_price, 'live', @ends_at, @anti_snipe_sec, @created_by, @created_at)`
    )
    .run({
      category_id: data.category_id,
      title: data.title,
      description: data.description || null,
      image_url: data.image_url || null,
      grade: data.grade || null,
      start_price: data.start_price,
      min_increment: data.min_increment || 10,
      current_price: data.start_price,
      ends_at: data.ends_at,
      anti_snipe_sec: data.anti_snipe_sec ?? 30,
      created_by: userId,
      created_at: now,
    });
  const created = getAuction(info.lastInsertRowid);
  scheduleClose(created);
  return created;
}
