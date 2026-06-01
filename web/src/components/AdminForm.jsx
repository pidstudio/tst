import { useState } from 'react';
import { api } from '../api.js';
import { showAlert } from '../telegram.js';

export default function AdminForm({ categories, onCreated, onClose }) {
  const [f, setF] = useState({
    category_id: categories[0]?.id || '',
    title: '',
    grade: '',
    description: '',
    image_url: '',
    start_price: 100,
    min_increment: 50,
    duration_min: 60,
    anti_snipe_sec: 30,
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit() {
    if (!f.title) return showAlert('กรอกชื่อการ์ดก่อน');
    setBusy(true);
    try {
      await api.createAuction({
        category_id: Number(f.category_id),
        title: f.title,
        grade: f.grade,
        description: f.description,
        image_url: f.image_url,
        start_price: Number(f.start_price),
        min_increment: Number(f.min_increment),
        anti_snipe_sec: Number(f.anti_snipe_sec),
        ends_at: Date.now() + Number(f.duration_min) * 60 * 1000,
      });
      onCreated();
    } catch (e) {
      showAlert(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal">
      <div className="modal-card">
        <h3>เพิ่มรายการประมูล</h3>
        <label>หมวดหมู่
          <select value={f.category_id} onChange={set('category_id')}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
        </label>
        <label>ชื่อการ์ด<input value={f.title} onChange={set('title')} placeholder="Monkey D. Luffy — Leader" /></label>
        <label>เกรด / รหัส<input value={f.grade} onChange={set('grade')} placeholder="OP01-001 · PSA 10" /></label>
        <label>ลิงก์รูป<input value={f.image_url} onChange={set('image_url')} placeholder="https://…" /></label>
        <label>รายละเอียด<textarea value={f.description} onChange={set('description')} rows={2} /></label>
        <div className="grid2">
          <label>ราคาเริ่ม (฿)<input type="number" value={f.start_price} onChange={set('start_price')} /></label>
          <label>บิดขั้นต่ำ (฿)<input type="number" value={f.min_increment} onChange={set('min_increment')} /></label>
          <label>ระยะเวลา (นาที)<input type="number" value={f.duration_min} onChange={set('duration_min')} /></label>
          <label>Anti-snipe (วิ)<input type="number" value={f.anti_snipe_sec} onChange={set('anti_snipe_sec')} /></label>
        </div>
        <div className="modal-actions">
          <button onClick={onClose}>ยกเลิก</button>
          <button className="primary" disabled={busy} onClick={submit}>สร้างรายการ</button>
        </div>
      </div>
    </div>
  );
}
