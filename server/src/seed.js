import 'dotenv/config';
import db from './db.js';
import { createAuction } from './auctions.js';

// ensure a demo admin user exists so created_by FK is satisfied
db.prepare(
  `INSERT INTO users (id, username, first_name, is_admin, created_at)
   VALUES (1, 'seed_admin', 'Seed Admin', 1, ?)
   ON CONFLICT(id) DO UPDATE SET is_admin = 1`
).run(Date.now());

const onePiece = db.prepare("SELECT id FROM categories WHERE slug = 'one-piece'").get();
const H = 60 * 60 * 1000;

const samples = [
  {
    title: 'Monkey D. Luffy — Leader (Parallel)',
    grade: 'OP01-001 · PSA 10',
    description: 'การ์ดลีดเดอร์ลูฟี่ลายพาราเรล สภาพสวยเกรด PSA 10 หายากมาก',
    image_url: 'https://placehold.co/600x840/1e293b/f8fafc?text=Luffy+Leader',
    start_price: 1500,
    min_increment: 100,
    ends_at: Date.now() + 2 * H,
  },
  {
    title: 'Roronoa Zoro — Super Rare',
    grade: 'OP01-025 · NM',
    description: 'โซโลซุปเปอร์แรร์ สภาพ Near Mint',
    image_url: 'https://placehold.co/600x840/14532d/f8fafc?text=Zoro+SR',
    start_price: 400,
    min_increment: 50,
    ends_at: Date.now() + 30 * 60 * 1000,
  },
  {
    title: 'Shanks — Secret Rare (Manga Art)',
    grade: 'OP06-118 · PSA 9',
    description: 'แชงค์สลายมังงะ Secret Rare ของสะสมระดับท็อป',
    image_url: 'https://placehold.co/600x840/7f1d1d/f8fafc?text=Shanks+SEC',
    start_price: 3000,
    min_increment: 200,
    ends_at: Date.now() + 5 * H,
  },
];

for (const s of samples) {
  createAuction({ ...s, category_id: onePiece.id }, 1);
  console.log('seeded:', s.title);
}
console.log('✅ done');
process.exit(0);
