import { Router } from 'express';
import db from '../db.js';
import { authMiddleware, requireAdmin } from '../auth.js';
import {
  listAuctions,
  getAuction,
  getBids,
  placeBid,
  createAuction,
  BidError,
} from '../auctions.js';

const router = Router();

// everything below requires a verified Telegram user
router.use(authMiddleware);

// current user
router.get('/me', (req, res) => res.json(req.user));

// categories
router.get('/categories', (req, res) => {
  res.json(db.prepare('SELECT * FROM categories ORDER BY sort, name').all());
});

// list auctions (optionally by ?category=one-piece&status=live)
router.get('/auctions', (req, res) => {
  const { category, status } = req.query;
  res.json(listAuctions({ category, status }));
});

// auction detail + recent bids
router.get('/auctions/:id', (req, res) => {
  const auction = getAuction(Number(req.params.id));
  if (!auction) return res.status(404).json({ error: 'not found' });
  res.json({ auction, bids: getBids(auction.id) });
});

// place a bid
router.post('/auctions/:id/bids', (req, res) => {
  const amount = Math.floor(Number(req.body?.amount));
  if (!Number.isFinite(amount) || amount <= 0)
    return res.status(400).json({ error: 'จำนวนเงินไม่ถูกต้อง' });
  try {
    const auction = placeBid(Number(req.params.id), req.user, amount);
    res.json({ ok: true, auction });
  } catch (e) {
    if (e instanceof BidError) return res.status(400).json({ error: e.message });
    console.error(e);
    res.status(500).json({ error: 'server error' });
  }
});

// my activity: auctions I'm leading / won
router.get('/my/bids', (req, res) => {
  const rows = db
    .prepare(
      `SELECT a.*, c.name AS category_name,
              (a.current_bidder = @uid) AS leading
       FROM auctions a JOIN categories c ON c.id = a.category_id
       WHERE a.id IN (SELECT auction_id FROM bids WHERE user_id = @uid)
       ORDER BY a.ends_at ASC`
    )
    .all({ uid: req.user.id });
  res.json(rows);
});

// ---- admin ----
router.post('/auctions', requireAdmin, (req, res) => {
  const b = req.body || {};
  if (!b.category_id || !b.title || !b.start_price || !b.ends_at)
    return res.status(400).json({ error: 'ข้อมูลไม่ครบ (category_id, title, start_price, ends_at)' });
  const auction = createAuction(b, req.user.id);
  res.json({ ok: true, auction });
});

router.post('/auctions/:id/cancel', requireAdmin, (req, res) => {
  db.prepare("UPDATE auctions SET status = 'cancelled' WHERE id = ?").run(
    Number(req.params.id)
  );
  res.json({ ok: true });
});

export default router;
