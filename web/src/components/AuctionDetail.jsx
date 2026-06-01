import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { socket } from '../socket.js';
import { haptic, showAlert } from '../telegram.js';
import Countdown from './Countdown.jsx';

export default function AuctionDetail({ id, me, onBack }) {
  const [auction, setAuction] = useState(null);
  const [bids, setBids] = useState([]);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const data = await api.auction(id);
    setAuction(data.auction);
    setBids(data.bids);
  }

  useEffect(() => {
    load();
    socket.emit('watch', id);
    const onBid = ({ auction: a, amount, bidder }) => {
      setAuction(a);
      setBids((prev) => [
        { amount, first_name: bidder, created_at: Date.now() },
        ...prev,
      ]);
      haptic('light');
    };
    const onEnded = (a) => setAuction(a);
    socket.on('bid', onBid);
    socket.on('ended', onEnded);
    return () => {
      socket.emit('unwatch', id);
      socket.off('bid', onBid);
      socket.off('ended', onEnded);
    };
  }, [id]);

  if (!auction) return <div className="loading">กำลังโหลด…</div>;

  const ended = auction.status !== 'live';
  const minNext =
    auction.bid_count === 0
      ? auction.start_price
      : auction.current_price + auction.min_increment;
  const leading = auction.current_bidder === me?.id;

  async function submitBid(value) {
    if (busy) return;
    setBusy(true);
    try {
      const { auction: a } = await api.bid(id, value);
      setAuction(a);
      setAmount('');
      haptic('medium');
    } catch (e) {
      showAlert(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="detail">
      <button className="back" onClick={onBack}>‹ กลับ</button>

      <div className="detail-img">
        {auction.image_url ? (
          <img src={auction.image_url} alt={auction.title} />
        ) : (
          <div className="placeholder big">🃏</div>
        )}
      </div>

      <div className="detail-body">
        <div className="row-between">
          <span className="cat-pill">{auction.category_name}</span>
          {auction.grade && <span className="cat-pill grade">{auction.grade}</span>}
        </div>
        <h2>{auction.title}</h2>
        {auction.description && <p className="desc">{auction.description}</p>}

        <div className="bid-status">
          <div>
            <div className="label">ราคาปัจจุบัน</div>
            <div className="big-price">฿{auction.current_price.toLocaleString()}</div>
            <div className="sub">{auction.bid_count} การเสนอราคา</div>
          </div>
          <div className="right">
            <div className="label">เหลือเวลา</div>
            <div className="big-timer">
              {ended ? <span className="ended">ปิดแล้ว</span> : <Countdown endsAt={auction.ends_at} onEnd={load} />}
            </div>
          </div>
        </div>

        {leading && !ended && <div className="leading-banner">🏆 คุณเป็นผู้นำการประมูลอยู่</div>}
        {ended && leading && <div className="won-banner">🎉 คุณชนะการประมูลนี้!</div>}

        {!ended && (
          <div className="bid-controls">
            <div className="quick">
              {[0, auction.min_increment, auction.min_increment * 2, auction.min_increment * 5].map(
                (inc, i) => {
                  const v = minNext + inc;
                  return (
                    <button key={i} disabled={busy} onClick={() => submitBid(v)}>
                      ฿{v.toLocaleString()}
                    </button>
                  );
                }
              )}
            </div>
            <div className="custom">
              <input
                type="number"
                inputMode="numeric"
                placeholder={`≥ ${minNext}`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <button
                className="primary"
                disabled={busy || !amount}
                onClick={() => submitBid(Math.floor(Number(amount)))}
              >
                เสนอราคา
              </button>
            </div>
          </div>
        )}

        <h4 className="bids-title">ประวัติการเสนอราคา</h4>
        <ul className="bid-list">
          {bids.length === 0 && <li className="empty">ยังไม่มีการเสนอราคา — เป็นคนแรกเลย!</li>}
          {bids.map((b, i) => (
            <li key={i}>
              <span>{b.first_name || b.username || 'ผู้ใช้'}</span>
              <strong>฿{b.amount.toLocaleString()}</strong>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
