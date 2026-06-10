import { API_BASE } from '../constants/theme';

export async function fetchChat({ message, diaryText, history }) {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, diaryText, history }),
  });
  return res.json();
}

export async function fetchOutlines() {
  const res = await fetch(`${API_BASE}/api/outlines`);
  return res.json();
}

export async function fetchOutlinesSuggest(text) {
  const res = await fetch(`${API_BASE}/api/outlines/suggest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  return res.json();
}

export async function fetchQuickDraw(ko, n = 50) {
  const res = await fetch(`${API_BASE}/api/quickdraw?ko=${encodeURIComponent(ko)}&n=${n}`);
  return res.json();
}
