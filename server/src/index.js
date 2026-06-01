import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

import apiRouter from './routes/api.js';
import * as auctions from './auctions.js';
import { startBot, notify } from './bot.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => res.json({ ok: true, ts: Date.now() }));
app.use('/api', apiRouter);

// serve the built frontend if present
const webDist = path.join(__dirname, '..', '..', 'web', 'dist');
if (fs.existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get('*', (req, res) => res.sendFile(path.join(webDist, 'index.html')));
}

const server = http.createServer(app);
const io = new SocketServer(server, { cors: { origin: '*' } });

// clients join a room per auction to receive live updates
io.on('connection', (socket) => {
  socket.on('watch', (auctionId) => socket.join(`auction:${auctionId}`));
  socket.on('unwatch', (auctionId) => socket.leave(`auction:${auctionId}`));
});

// ---- wire auction events -> sockets + telegram ----
auctions.on('bid', ({ auction, bidder, amount }) => {
  io.to(`auction:${auction.id}`).emit('bid', { auction, amount, bidder: bidder.first_name || bidder.username });
  io.emit('auction:update', auction); // update list views too
});

auctions.on('end', ({ auction }) => {
  io.to(`auction:${auction.id}`).emit('ended', auction);
  io.emit('auction:update', auction);
  if (auction.current_bidder) {
    notify(
      auction.current_bidder,
      `🎉 ยินดีด้วย! คุณชนะการประมูล *${auction.title}*\nราคาสุดท้าย: ฿${auction.current_price.toLocaleString()}\n\nทีมงานจะติดต่อเรื่องการชำระเงินและจัดส่งเร็วๆ นี้`
    );
  }
});

auctions.restoreSchedules();
startBot();

server.listen(PORT, () => {
  console.log(`🚀 Auction server on http://localhost:${PORT}`);
});
