import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

// ── 현재 로그인 유저 ─────────────────────────────────────────────

async function getCurrentUserName() {
  const raw = await AsyncStorage.getItem('haruAutoLogin');
  if (!raw) return null;
  return JSON.parse(raw).name;
}

function diaryKey(userName) {
  return `haruDiaries_${userName}`;
}

// ── 일기 (AsyncStorage + Supabase Storage) ────────────────────────

export async function getDiaries() {
  const userName = await getCurrentUserName();
  if (!userName) return [];
  const raw = await AsyncStorage.getItem(diaryKey(userName));
  return raw ? JSON.parse(raw) : [];
}

export async function saveDiary(diary) {
  const userName = await getCurrentUserName();
  if (!userName) throw new Error('로그인 필요');

  const id = `diary_${Date.now()}`;

  // 이미지 → Supabase Storage 업로드
  let imageUrl = diary.image || null;
  if (diary.image && diary.image.startsWith('file')) {
    try {
      const path = `${id}.png`;
      const response = await fetch(diary.image);
      const blob = await response.blob();
      const { error: uploadErr } = await supabase.storage
        .from('diary-images')
        .upload(path, blob, { contentType: 'image/png', upsert: true });
      if (!uploadErr) {
        const { data } = supabase.storage.from('diary-images').getPublicUrl(path);
        imageUrl = data.publicUrl;
      }
    } catch {}
  }

  // 공개 일기는 Supabase diaries 테이블에도 동기화 (커뮤니티 피드용)
  let remoteId = null;
  if (diary.privacy === '공개') {
    try {
      const { data } = await supabase.from('diaries').insert({
        text_content: diary.text || '',
        diary_date: new Date(diary.date).toISOString().split('T')[0],
        privacy: '공개',
        drawing_url: imageUrl,
      }).select('id').single();
      if (data) remoteId = data.id;
    } catch {}
  }

  const saved = {
    id,
    remoteId,
    date: diary.date,
    text: diary.text || '',
    image: imageUrl,
    privacy: diary.privacy || '비공개',
    created_at: new Date().toISOString(),
  };

  // AsyncStorage에 저장
  const existing = await getDiaries();
  existing.unshift(saved);
  await AsyncStorage.setItem(diaryKey(userName), JSON.stringify(existing));

  return saved;
}

export async function deleteDiary(id) {
  const userName = await getCurrentUserName();
  if (!userName) return;

  const existing = await getDiaries();
  const target = existing.find(d => d.id === id);

  // Supabase Storage 이미지 삭제
  try {
    await supabase.storage.from('diary-images').remove([`${id}.png`]);
  } catch {}

  // 공개 일기면 Supabase diaries 테이블에서도 삭제
  if (target?.remoteId) {
    try {
      await supabase.from('diaries').delete().eq('id', target.remoteId);
    } catch {}
  }

  // AsyncStorage에서 삭제
  const updated = existing.filter(d => d.id !== id);
  await AsyncStorage.setItem(diaryKey(userName), JSON.stringify(updated));
}

// ── 즐겨찾기 (AsyncStorage) ───────────────────────────────────────

export async function getFavorites() {
  const raw = await AsyncStorage.getItem('outlineFavorites');
  return raw ? JSON.parse(raw) : [];
}

export async function toggleFavorite(name) {
  const favs = await getFavorites();
  const idx = favs.indexOf(name);
  if (idx >= 0) favs.splice(idx, 1);
  else favs.unshift(name);
  await AsyncStorage.setItem('outlineFavorites', JSON.stringify(favs));
  return favs;
}

// ── 채팅 기록 (AsyncStorage) ──────────────────────────────────────

export async function getChatHistory(diaryId) {
  const userName = await getCurrentUserName();
  const key = userName ? `chat_${userName}_${diaryId}` : `chat_${diaryId}`;
  const raw = await AsyncStorage.getItem(key);
  return raw ? JSON.parse(raw) : [];
}

export async function saveChatMsg(diaryId, role, content) {
  const userName = await getCurrentUserName();
  const key = userName ? `chat_${userName}_${diaryId}` : `chat_${diaryId}`;
  const history = await getChatHistory(diaryId);
  history.push({ role, content, ts: Date.now() });
  await AsyncStorage.setItem(key, JSON.stringify(history));
}

export async function overwriteChatHistory(diaryId, messages) {
  const userName = await getCurrentUserName();
  const key = userName ? `chat_${userName}_${diaryId}` : `chat_${diaryId}`;
  await AsyncStorage.setItem(key, JSON.stringify(messages));
}
