import { Router } from 'express';
import OpenAI from 'openai';

const router = Router();

const SYSTEM_PROMPT = `당신은 '하루'입니다. 시니어 어르신들의 그림일기를 도와주는 따뜻하고 다정한 AI 친구예요.

역할:
- 어르신의 일기와 그림에 대해 진심 어린 공감과 칭찬을 전해주세요
- 짧고 쉬운 말로 대화해주세요 (한 번에 2-3문장 이내)
- 어르신이 더 이야기하고 싶도록 자연스럽게 질문을 덧붙여주세요
- 존댓말을 쓰되, 딱딱하지 않고 따뜻한 말투로 해주세요
- 이모지를 1-2개 정도 자연스럽게 사용해주세요

주의사항:
- 의료적 조언이나 민감한 정보는 제공하지 마세요
- 어르신이 우울하거나 힘들어 보이면 따뜻하게 공감해주세요
- 어렵거나 전문적인 단어는 사용하지 마세요`;

// POST /api/chat
router.post('/', async (req, res) => {
  const { message, diaryText, history = [] } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'message 필드가 필요합니다' });
  }

  if (!process.env.OPENAI_API_KEY) {
    const fallbacks = [
      '정말요? 더 자세히 들려주세요 😊',
      '따뜻한 하루를 보내셨군요 🌷',
      '그 이야기를 들으니 저도 기분이 좋아지네요 🌷',
      '소중한 추억이네요. 예전에도 그런 일이 있으셨나요?',
      '오늘도 멋진 하루를 보내셨군요. 내일은 어떤 그림을 그리고 싶으세요?',
      '그 마음이 그림에서도 느껴져요. 참 따뜻하세요 ❤️',
    ];
    const reply = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    return res.json({ reply });
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.slice(-10).map(h => ({ role: h.role, content: h.content })),
    ];

    // 일기 맥락을 첫 번째 user 메시지에 포함
    let userContent = message;
    if (diaryText && history.length === 0) {
      userContent = `[오늘 일기 내용: "${diaryText.slice(0, 200)}"]\n\n${message}`;
    }
    messages.push({ role: 'user', content: userContent });

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 200,
      messages,
    });

    const reply = response.choices[0].message.content.trim();
    res.json({ reply });
  } catch (err) {
    console.error('chat error:', err.message);
    res.status(500).json({ error: '대화 중 오류가 생겼어요. 잠시 후 다시 시도해주세요.' });
  }
});

export default router;
