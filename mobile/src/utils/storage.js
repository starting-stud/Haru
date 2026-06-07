import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

// ── 일기 (Supabase) ───────────────────────────────────────────────

export async function getDiaries() {
  const { data, error } = await supabase
    .from('diaries')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(d => ({
    id: d.id,
    date: d.diary_date,
    text: d.text_content,
    image: d.drawing_url,
    privacy: d.privacy,
    created_at: d.created_at,
  }));
}

export async function saveDiary(diary) {
  // 1단계: 일기 레코드 삽입 → Supabase UUID 획득
  const { data: inserted, error: insertErr } = await supabase
    .from('diaries')
    .insert({
      text_content: diary.text || '',
      diary_date: new Date(diary.date).toISOString().split('T')[0],
      privacy: diary.privacy || '비공개',
    })
    .select()
    .single();

  if (insertErr) throw insertErr;
  const id = inserted.id;

  // 2단계: 이미지 업로드
  let drawing_url = null;
  if (diary.image) {
    try {
      const path = `diary_${id}.png`;
      const response = await fetch(diary.image);
      const blob = await response.blob();
      const { error: uploadErr } = await supabase.storage
        .from('diary-images')
        .upload(path, blob, { contentType: 'image/png', upsert: true });
      if (!uploadErr) {
        const { data } = supabase.storage.from('diary-images').getPublicUrl(path);
        drawing_url = data.publicUrl;
        await supabase.from('diaries').update({ drawing_url }).eq('id', id);
      }
    } catch {}
  }

  return {
    id,
    date: diary.date,
    text: diary.text || '',
    image: drawing_url,
    privacy: diary.privacy || '비공개',
  };
}

export async function deleteDiary(id) {
  await supabase.storage.from('diary-images').remove([`diary_${id}.png`]);
  const { error } = await supabase.from('diaries').delete().eq('id', id);
  if (error) throw error;
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
  const raw = await AsyncStorage.getItem(`chat_${diaryId}`);
  return raw ? JSON.parse(raw) : [];
}

export async function saveChatMsg(diaryId, role, content) {
  const key = `chat_${diaryId}`;
  const history = await getChatHistory(diaryId);
  history.push({ role, content, ts: Date.now() });
  await AsyncStorage.setItem(key, JSON.stringify(history));
}
