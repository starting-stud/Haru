import { useState, useCallback } from 'react';
import { fetchChat } from '../utils/api';
import { saveChatMsg } from '../utils/storage';
import * as Speech from 'expo-speech';

export function useChatbot(diaryId, diaryText) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  const speak = (text) => {
    Speech.stop();
    Speech.speak(text, { language: 'ko-KR', rate: 0.85, pitch: 1.0 });
  };

  const addMsg = useCallback((role, content) => {
    setMessages(prev => [...prev, { role, content, id: Date.now() + Math.random() }]);
    if (role === 'assistant') speak(content);
  }, []);

  const initGreeting = useCallback(async (greeting) => {
    setMessages([{ role: 'assistant', content: greeting, id: 0 }]);
    setHistory([{ role: 'assistant', content: greeting }]);
    speak(greeting);
    if (diaryId) saveChatMsg(diaryId, 'assistant', greeting);

    // 하루가 자동으로 첫 질문 시작
    setLoading(true);
    try {
      const data = await fetchChat({
        message: '일기 내용을 보고 어르신께 따뜻한 질문 하나만 자연스럽게 건네줘. 짧게.',
        diaryText,
        history: [{ role: 'assistant', content: greeting }],
      });
      if (data.reply) {
        const autoMsg = { role: 'assistant', content: data.reply, id: 1 };
        setMessages(prev => [...prev, autoMsg]);
        setHistory(prev => [...prev, { role: 'assistant', content: data.reply }]);
        speak(data.reply);
        if (diaryId) saveChatMsg(diaryId, 'assistant', data.reply);
      }
    } catch {}
    setLoading(false);
  }, [diaryId, diaryText]);

  const send = useCallback(async (msg) => {
    if (!msg.trim() || loading) return;
    addMsg('user', msg);
    const newHistory = [...history, { role: 'user', content: msg }];
    setHistory(newHistory);
    if (diaryId) saveChatMsg(diaryId, 'user', msg);
    setLoading(true);
    try {
      const data = await fetchChat({ message: msg, diaryText, history: newHistory.slice(-10) });
      if (data.reply) {
        addMsg('assistant', data.reply);
        setHistory(prev => [...prev, { role: 'assistant', content: data.reply }]);
        if (diaryId) saveChatMsg(diaryId, 'assistant', data.reply);
      }
    } catch {
      addMsg('assistant', '잠깐 연결이 안 됐어요. 다시 말해줄래요? 🌸');
    }
    setLoading(false);
  }, [history, loading, diaryId, diaryText]);

  return { messages, loading, send, initGreeting };
}
