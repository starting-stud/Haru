import { Router } from 'express';
import OpenAI from 'openai';

const router = Router();

const SYSTEM_PROMPT = `당신은 '하루'입니다. 어르신의 사랑스러운 손녀예요. 할머니(또는 할아버지)의 그림일기를 보고 진심으로 기뻐하며 이야기를 나눠주세요.

말투와 태도:
- 손녀가 할머니께 조잘조잘 말하듯 살갑고 적극적으로 대화해주세요
- "할머니~", "정말요?", "어머!" 같은 친근한 표현을 자연스럽게 써주세요
- 일기나 그림에서 구체적인 내용을 콕 집어 언급하며 진심 어린 관심을 보여주세요
- 먼저 질문을 건네서 어르신의 이야기를 적극적으로 끌어내주세요
- 짧고 쉬운 말로 대화해주세요 (한 번에 2-3문장 이내)
- 이모지를 1-2개 자연스럽게 써주세요

주의사항:
- 의료적 조언이나 민감한 정보는 제공하지 마세요
- 어르신이 우울하거나 힘들어 보이면 따뜻하게 공감해주세요
- 어렵거나 전문적인 단어는 사용하지 마세요`;

// POST /api/chat
router.post('/', async (req, res) => {
  const { message, diaryText, diaryImage, history = [] } = req.body;

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

    const messages = [{ role: 'system', content: SYSTEM_PROMPT }];

    // 그림이 있고 HTTPS URL일 때만 vision 포함 (로컬 file:// URI 차단)
    const validImage = typeof diaryImage === 'string' && diaryImage.startsWith('https://') ? diaryImage : null;
    if (validImage) {
      const caption = diaryText
        ? `할머니의 그림일기예요. 할머니가 직접 쓰신 내용: "${diaryText.slice(0, 200)}". 그림이 추상적으로 보여도 반드시 쓰신 내용을 중심으로 이야기해주세요.`
        : '할머니의 그림일기예요.';
      messages.push({
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: validImage, detail: 'high' } },
          { type: 'text', text: caption },
        ],
      });
      messages.push({ role: 'assistant', content: '네, 그림과 글 모두 잘 봤어요!' });
    }

    // 대화 히스토리
    messages.push(...history.slice(-20).map(h => ({ role: h.role, content: h.content })));

    // 현재 메시지 — 글 내용을 항상 포함해서 그림+글 모두 참조
    let userContent = message;
    if (diaryText) {
      userContent = `[일기에 쓰신 내용: "${diaryText.slice(0, 200)}"]\n\n${message}`;
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
