import { API_BASE } from '../constants/theme';

export async function fetchChat({ message, diaryText, diaryImage, history }) {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, diaryText, diaryImage, history }),
  });
  return res.json();
}

export async function fetchSpeech(uri) {
  const formData = new FormData();
  formData.append('audio', { uri, name: 'voice.m4a', type: 'audio/m4a' });
  const res = await fetch(`${API_BASE}/api/speech`, { method: 'POST', body: formData });
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
