import { initData } from './telegram.js';

const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `tma ${initData}`,
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  me: () => request('/me'),
  categories: () => request('/categories'),
  auctions: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/auctions${q ? `?${q}` : ''}`);
  },
  auction: (id) => request(`/auctions/${id}`),
  bid: (id, amount) =>
    request(`/auctions/${id}/bids`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }),
  myBids: () => request('/my/bids'),
  createAuction: (payload) =>
    request('/auctions', { method: 'POST', body: JSON.stringify(payload) }),
};
