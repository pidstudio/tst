import { useEffect, useState } from 'react';

export default function Countdown({ endsAt, onEnd }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const ms = Math.max(0, endsAt - now);
  useEffect(() => {
    if (ms === 0) onEnd?.();
  }, [ms === 0]); // eslint-disable-line

  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  const urgent = ms > 0 && ms < 60_000;

  return (
    <span className={`countdown ${urgent ? 'urgent' : ''} ${ms === 0 ? 'ended' : ''}`}>
      {ms === 0 ? 'ปิดประมูล' : `${h > 0 ? h + ':' : ''}${pad(m)}:${pad(sec)}`}
    </span>
  );
}
