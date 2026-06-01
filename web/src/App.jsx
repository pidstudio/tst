import { useEffect, useState } from 'react';
import { api } from './api.js';
import { socket } from './socket.js';
import AuctionCard from './components/AuctionCard.jsx';
import AuctionDetail from './components/AuctionDetail.jsx';
import AdminForm from './components/AdminForm.jsx';

export default function App() {
  const [me, setMe] = useState(null);
  const [categories, setCategories] = useState([]);
  const [activeCat, setActiveCat] = useState('one-piece');
  const [auctions, setAuctions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadAuctions(cat = activeCat) {
    const list = await api.auctions({ category: cat, status: 'live' });
    setAuctions(list);
  }

  useEffect(() => {
    (async () => {
      try {
        const [u, cats] = await Promise.all([api.me(), api.categories()]);
        setMe(u);
        setCategories(cats);
        await loadAuctions();
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();

    // keep list cards in sync with live updates
    const onUpdate = (a) =>
      setAuctions((prev) => {
        const i = prev.findIndex((x) => x.id === a.id);
        if (a.status !== 'live') return prev.filter((x) => x.id !== a.id);
        if (i === -1) return prev;
        const next = [...prev];
        next[i] = { ...next[i], ...a };
        return next;
      });
    socket.on('auction:update', onUpdate);
    return () => socket.off('auction:update', onUpdate);
  }, []);

  function pickCat(slug) {
    setActiveCat(slug);
    loadAuctions(slug);
  }

  if (loading) return <div className="loading">กำลังโหลด…</div>;
  if (error)
    return (
      <div className="loading error">
        <p>เกิดข้อผิดพลาด: {error}</p>
        <p className="hint">เปิดผ่านปุ่มในบอท Telegram หรือใช้ DEV_BYPASS_AUTH ตอนพัฒนา</p>
      </div>
    );

  if (selected)
    return (
      <AuctionDetail
        id={selected.id}
        me={me}
        onBack={() => {
          setSelected(null);
          loadAuctions();
        }}
      />
    );

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">🏴‍☠️ Card Auction</div>
        {me?.is_admin && (
          <button className="admin-btn" onClick={() => setShowAdmin(true)}>+ ลงประมูล</button>
        )}
      </header>

      <nav className="cats">
        {categories.map((c) => (
          <button
            key={c.id}
            className={activeCat === c.slug ? 'cat active' : 'cat'}
            onClick={() => pickCat(c.slug)}
          >
            {c.icon} {c.name}
          </button>
        ))}
      </nav>

      <main className="grid">
        {auctions.length === 0 && (
          <div className="empty-state">ยังไม่มีรายการประมูลในหมวดนี้</div>
        )}
        {auctions.map((a) => (
          <AuctionCard key={a.id} auction={a} onClick={setSelected} />
        ))}
      </main>

      {showAdmin && (
        <AdminForm
          categories={categories}
          onClose={() => setShowAdmin(false)}
          onCreated={() => {
            setShowAdmin(false);
            loadAuctions();
          }}
        />
      )}
    </div>
  );
}
