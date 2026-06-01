import Countdown from './Countdown.jsx';

export default function AuctionCard({ auction, onClick }) {
  const ended = auction.status !== 'live';
  return (
    <button className="card" onClick={() => onClick(auction)}>
      <div className="card-img">
        {auction.image_url ? (
          <img src={auction.image_url} alt={auction.title} loading="lazy" />
        ) : (
          <div className="card-img placeholder">🃏</div>
        )}
        {auction.grade && <span className="badge grade">{auction.grade}</span>}
        <span className={`badge timer ${ended ? 'ended' : ''}`}>
          {ended ? '✔ จบแล้ว' : <Countdown endsAt={auction.ends_at} />}
        </span>
      </div>
      <div className="card-body">
        <h3>{auction.title}</h3>
        <div className="card-meta">
          <span className="price">฿{auction.current_price.toLocaleString()}</span>
          <span className="bids">{auction.bid_count} bids</span>
        </div>
      </div>
    </button>
  );
}
