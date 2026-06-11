import { useState, useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchChat } from '../utils/api';
import { saveChatMsg, getChatHistory } from '../utils/storage';
import * as Speech from 'expo-speech';

export function useChatbot() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [ready, setReady] = useState(false);
  const recentDiaryRef = useRef(null);

  const speak = (text) => {
    Speech.stop();
    const clean = text.replace(/\p{Emoji}/gu, '').trim();
    Speech.speak(clean, { language: 'ko-KR', rate: 0.85, pitch: 1.0 });
  };

  const addMsg = useCallback((role, content) => {
    setMessages(prev => [...prev, { role, content, id: Date.now() + Math.random() }]);
    if (role === 'assistant') speak(content);
  }, []);

  const appendAssistant = useCallback(async (content) => {
    const msg = { role: 'assistant', content, id: Date.now() };
    setMessages(prev => [...prev, msg]);
    setHistory(prev => [...prev, { role: 'assistant', content }]);
    speak(content);
    await saveChatMsg('general', 'assistant', content);
  }, []);

  useEffect(() => {
    (async () => {
      // 1. 기존 채팅 기록 로드
      const saved = await getChatHistory('general');
      const base = saved.map((m, i) => ({ role: m.role, content: m.content, id: i }));
      const baseHistory = saved.map(m => ({ role: m.role, content: m.content }));

      // 2. 최근 일기 로드 (GPT 컨텍스트용)
      try {
        const loginRaw = await AsyncStorage.getItem('haruAutoLogin');
        if (loginRaw) {
          const { name } = JSON.parse(loginRaw);
          const diariesRaw = await AsyncStorage.getItem(`haruDiaries_${name}`);
          const diaries = diariesRaw ? JSON.parse(diariesRaw) : [];
          if (diaries[0]) recentDiaryRef.current = diaries[0];
        }
      } catch {}

      // 3. 선톡 대기 메시지
      const unread = await AsyncStorage.getItem('haruUnread');
      if (unread) {
        base.push({ role: 'assistant', content: unread, id: Date.now() });
        baseHistory.push({ role: 'assistant', content: unread });
        speak(unread);
        await saveChatMsg('general', 'assistant', unread);
        await AsyncStorage.removeItem('haruUnread');
      }

      setMessages(base);
      setHistory(baseHistory);
      setReady(true);

      // 4. 새 일기 완성 직후: 하루가 그림 보고 반응
      const newDiaryRaw = await AsyncStorage.getItem('haruNewDiary');
      if (newDiaryRaw) {
        await AsyncStorage.removeItem('haruNewDiary');
        const newDiary = JSON.parse(newDiaryRaw);
        recentDiaryRef.current = newDiary;
        setLoading(true);
        try {
          const data = await fetchChat({
            message: '할머니가 방금 그림일기를 완성하셨어요! 손녀로서 그림과 일기 내용을 보고 기쁘게 반응하며 구체적으로 이야기해주세요.',
            diaryText: newDiary.text,
            diaryImage: newDiary.image,
            history: baseHistory.slice(-20),
          });
          if (data.reply) await appendAssistant(data.reply);
        } catch {}
        setLoading(false);
      }

      // 5. 특정 일기에 대해 이야기하고 싶을 때 (나 탭 → 하루와 이야기하기)
      const focusRaw = await AsyncStorage.getItem('haruFocusDiary');
      if (focusRaw && !newDiaryRaw) {
        await AsyncStorage.removeItem('haruFocusDiary');
        const focusDiary = JSON.parse(focusRaw);
        recentDiaryRef.current = focusDiary;
        setLoading(true);
        try {
          const data = await fetchChat({
            message: '할머니가 예전에 그린 그림일기를 가져오셨어요. 그림과 일기 내용을 보고 따뜻하게 반응하며 이야기를 시작해주세요.',
            diaryText: focusDiary.text,
            diaryImage: focusDiary.image,
            history: baseHistory.slice(-20),
          });
          if (data.reply) await appendAssistant(data.reply);
        } catch {}
        setLoading(false);
      }
    })();
  }, []);

  const initGreeting = useCallback(async () => {
    const hour = new Date().getHours();
    const timeCtx = hour < 12 ? '오전' : hour < 17 ? '낮' : hour < 21 ? '저녁' : '밤';
    const diary = recentDiaryRef.current;
    const prompt = diary
      ? `손녀로서 할머니께 ${timeCtx} 인사를 건네주세요. 최근 그림일기를 언급하며 구체적으로 이야기하고 질문으로 끝내주세요. 2-3문장.`
      : `손녀로서 할머니께 ${timeCtx} 인사를 건네주세요. 일상적인 이야기를 꺼내며 대화를 시작해주세요. 2-3문장.`;

    setLoading(true);
    try {
      const data = await fetchChat({
        message: prompt,
        diaryText: diary?.text,
        diaryImage: diary?.image,
        history: [],
      });
      if (data.reply) {
        setMessages([{ role: 'assistant', content: data.reply, id: 0 }]);
        setHistory([{ role: 'assistant', content: data.reply }]);
        speak(data.reply);
        await saveChatMsg('general', 'assistant', data.reply);
      }
    } catch {}
    setLoading(false);
  }, []);

  const send = useCallback(async (msg) => {
    if (!msg.trim() || loading) return;
    addMsg('user', msg);
    const newHistory = [...history, { role: 'user', content: msg }];
    setHistory(newHistory);
    saveChatMsg('general', 'user', msg);
    setLoading(true);
    const diary = recentDiaryRef.current;
    try {
      const data = await fetchChat({
        message: msg,
        diaryText: diary?.text,
        diaryImage: diary?.image,
        history: newHistory.slice(-20),
      });
      if (data.reply) {
        addMsg('assistant', data.reply);
        setHistory(prev => [...prev, { role: 'assistant', content: data.reply }]);
        saveChatMsg('general', 'assistant', data.reply);
      } else {
        addMsg('assistant', '잠깐 연결이 안 됐어요. 다시 말해줄래요? 🌸');
      }
    } catch {
      addMsg('assistant', '잠깐 연결이 안 됐어요. 다시 말해줄래요? 🌸');
    }
    setLoading(false);
  }, [history, loading]);

  return { messages, loading, send, initGreeting, ready };
}
