# 🏴‍☠️ Card Auction — Telegram Mini App

ระบบ **ประมูลการ์ดแบบเรียลไทม์** บน Telegram Mini App เริ่มที่ **One Piece Card Game**
ออกแบบให้ขยายไปการ์ดอื่นได้ (Pokémon, Dragon Ball ฯลฯ) ผ่านระบบหมวดหมู่

## ✨ ฟีเจอร์

- 🔴 **ประมูลเรียลไทม์** — ราคาขยับสดผ่าน WebSocket (Socket.io) ทุกคนเห็นพร้อมกัน
- ⏰ **Anti-snipe** — บิดในวินาทีสุดท้าย เวลาจะต่อให้อัตโนมัติ กันยิงปิดท้าย
- 🔐 **ล็อกอินผ่าน Telegram** — verify `initData` ด้วย HMAC-SHA256 ตามสเปคทางการ
- 🤖 **บอท Telegram** — เปิดแอป + แจ้งเตือนผู้ชนะอัตโนมัติ
- 🛠️ **หน้า Admin** — สร้าง/ปิดรายการประมูล (เฉพาะ user id ที่อยู่ใน `ADMIN_IDS`)
- 📂 **หมวดหมู่** — เพิ่มเกมการ์ดใหม่ได้ง่าย
- 🗄️ **SQLite** — ไม่ต้องตั้ง DB server, ข้อมูลอยู่ที่ `server/data/auction.db`

## 🏗️ โครงสร้าง

```
server/   Node + Express + Socket.io + better-sqlite3 + บอท Telegram
web/      React + Vite + Telegram WebApp SDK
```

## 🚀 เริ่มใช้งาน (dev)

```bash
# 1) ตั้งค่า
cp .env.example .env        # ใส่ BOT_TOKEN, ADMIN_IDS, WEBAPP_URL
#    ตอน dev ในเบราว์เซอร์ปกติ ให้ตั้ง DEV_BYPASS_AUTH=true

# 2) backend
cd server && npm install && npm run seed   # seed = ใส่การ์ดวันพีชตัวอย่าง
npm run dev                                # http://localhost:3000

# 3) frontend (อีก terminal)
cd web && npm install && npm run dev       # http://localhost:5173
```

เปิด http://localhost:5173 — Vite จะ proxy `/api` และ WebSocket ไป backend ให้อัตโนมัติ

## 📦 Production

```bash
cd web && npm install && npm run build     # สร้าง web/dist
cd ../server && npm install && npm start    # เสิร์ฟทั้ง API + เว็บที่ build แล้ว
```

ตั้งค่าใน [@BotFather](https://t.me/BotFather):
1. สร้างบอท เอา `BOT_TOKEN`
2. ตั้ง Mini App / Menu Button ชี้ไปที่ `WEBAPP_URL` (ต้องเป็น HTTPS)
3. ใส่ Telegram user id ของคุณใน `ADMIN_IDS` เพื่อให้ลงประมูลได้

## 🔌 API ย่อ

| Method | Path | คำอธิบาย |
|---|---|---|
| GET | `/api/me` | ข้อมูลผู้ใช้ปัจจุบัน |
| GET | `/api/categories` | หมวดหมู่ทั้งหมด |
| GET | `/api/auctions?category=one-piece` | รายการประมูล |
| GET | `/api/auctions/:id` | รายละเอียด + ประวัติบิด |
| POST | `/api/auctions/:id/bids` | เสนอราคา `{ amount }` |
| GET | `/api/my/bids` | รายการที่ฉันร่วมประมูล |
| POST | `/api/auctions` | (admin) สร้างรายการ |
| POST | `/api/auctions/:id/cancel` | (admin) ยกเลิก |

## 🛣️ ต่อยอดได้

- ระบบชำระเงิน: Telegram Stars / TON / PromptPay
- อัปโหลดรูปการ์ดจริง (ตอนนี้ใช้ลิงก์ภาพ)
- Proxy/auto-bid (ตั้งราคาสูงสุดให้ระบบบิดให้)
- ระบบรีวิว/เรตติ้งผู้ขาย, escrow
