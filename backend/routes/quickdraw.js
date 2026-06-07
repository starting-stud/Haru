import { Router } from 'express';
import OpenAI from 'openai';

const router = Router();

// Quick Draw 카테고리 한국어 → 영어 매핑 (자주 쓰는 단어 우선 캐시)
const KO_TO_QD = {
  '꽃': 'flower',
  '나무': 'tree',
  '강아지': 'dog',
  '고양이': 'cat',
  '새': 'bird',
  '물고기': 'fish',
  '나비': 'butterfly',
  '토끼': 'rabbit',
  '집': 'house',
  '자동차': 'car',
  '자전거': 'bicycle',
  '버스': 'bus',
  '태양': 'sun',
  '구름': 'cloud',
  '산': 'mountain',
  '별': 'star',
  '달': 'moon',
  '눈사람': 'snowman',
  '무지개': 'rainbow',
  '하트': 'heart',
  '사과': 'apple',
  '커피': 'coffee cup',
  '생일케이크': 'birthday cake',
  '안경': 'eyeglasses',
  '우산': 'umbrella',
  '바다': 'ocean',
  '선물': 'gift',
  '편지': 'envelope',
  '나뭇잎': 'leaf',
  '문어': 'octopus',
  '사자': 'lion',
  '코끼리': 'elephant',
  '곰': 'bear',
  '오리': 'duck',
  '피자': 'pizza',
  '아이스크림': 'ice cream',
  '케이크': 'cake',
  '딸기': 'strawberry',
  '포도': 'grapes',
};

// 번역 캐시 (한국어 → 영어)
const _translateCache = new Map();

// Quick Draw 실제 카테고리 목록 (345개 중 주요 항목)
const QD_CATEGORIES = `airplane, ambulance, angel, ant, apple, axe, backpack, banana, barn, baseball bat, basket, basketball, bat, bathtub, beach, bear, bed, bee, belt, bench, bicycle, bird, birthday cake, book, bowtie, bracelet, bread, bridge, broccoli, broom, bucket, bus, butterfly, cactus, cake, calculator, calendar, camel, camera, campfire, candle, canoe, car, carrot, castle, cat, ceiling fan, cell phone, chair, church, clock, cloud, coffee cup, compass, computer, cookie, couch, cow, crab, crayon, crocodile, crown, cup, diamond, dog, dolphin, door, dragon, dresser, drum, duck, ear, elephant, envelope, eraser, eye, eyeglasses, face, feather, fence, finger, fish, flamingo, flashlight, flower, foot, fork, frog, frying pan, giraffe, golf club, grapes, grass, guitar, hamburger, hammer, hand, hat, headphones, hedgehog, helicopter, horse, hospital, hot air balloon, hot dog, hourglass, house, ice cream, jacket, kangaroo, key, keyboard, knife, ladder, lantern, laptop, leaf, light bulb, lighthouse, lightning, lion, lobster, mailbox, map, microphone, monkey, moon, motorbike, mountain, mouse, mouth, mug, mushroom, nail, necklace, nose, ocean, octopus, onion, oven, owl, paintbrush, palm tree, panda, pants, parachute, parrot, pear, pencil, penguin, piano, pig, pizza, police car, pond, popsicle, potato, purse, rabbit, raccoon, rain, rainbow, rake, rhinoceros, river, sailboat, sandwich, saxophone, scissors, scorpion, sea turtle, shark, sheep, shoe, shovel, sink, skateboard, skull, snail, snake, snowflake, snowman, soccer ball, sock, spider, spoon, stairs, star, steak, strawberry, sun, swan, sweater, sword, t-shirt, table, teapot, teddy bear, telephone, television, tennis racquet, tent, tiger, toilet, tooth, toothbrush, tornado, tractor, traffic light, train, tree, triangle, trombone, truck, trumpet, umbrella, van, vase, violin, watermelon, whale, windmill, wine glass, zebra, smiley face, string bean, stop sign, streetlight, swimming pool, toaster, wristwatch`;

async function translateToEn(ko) {
  if (_translateCache.has(ko)) return _translateCache.get(ko);
  if (!process.env.OPENAI_API_KEY) return ko;

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const res = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 10,
      messages: [{
        role: 'user',
        content: `From this Google Quick Draw category list, pick the single closest match to the Korean word "${ko}". Reply with ONLY that exact category name, nothing else.\n\nCategories: ${QD_CATEGORIES}`,
      }],
    });
    const en = res.choices[0].message.content.trim().toLowerCase();
    _translateCache.set(ko, en);
    return en;
  } catch {
    return ko;
  }
}

// 드로잉 캐시 (영어 단어 → 드로잉 배열)
const _cache = new Map();

async function fetchFromQuickDraw(enWord, count) {
  const cacheKey = `${enWord}:${count}`;
  if (_cache.has(cacheKey)) return _cache.get(cacheKey);

  const url = `https://storage.googleapis.com/quickdraw_dataset/full/simplified/${encodeURIComponent(enWord)}.ndjson`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Quick Draw: '${enWord}' 카테고리 없음 (${res.status})`);

  // NDJSON 스트림에서 recognized 드로잉만 count개 파싱
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const drawings = [];

  try {
    while (drawings.length < count) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // 미완성 라인은 버퍼에 유지
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const d = JSON.parse(line);
          if (d.recognized) {
            drawings.push(d.drawing);
            if (drawings.length >= count) break;
          }
        } catch { /* 파싱 실패 라인 건너뜀 */ }
      }
    }
  } finally {
    reader.cancel();
  }

  _cache.set(cacheKey, drawings);
  return drawings;
}

// GET /api/quickdraw/categories  →  지원 카테고리 목록
router.get('/categories', (_req, res) => {
  res.json({ categories: Object.keys(KO_TO_QD) });
});

// GET /api/quickdraw?ko=꽃&n=6  →  드로잉 스트로크 반환
router.get('/', async (req, res) => {
  const ko = req.query.ko || '꽃';
  const n = Math.min(parseInt(req.query.n) || 6, 12);
  const en = KO_TO_QD[ko] || await translateToEn(ko);

  try {
    const drawings = await fetchFromQuickDraw(en, n);
    if (!drawings.length) return res.status(404).json({ error: `'${ko}' 드로잉을 찾을 수 없어요` });
    res.json({ ko, en, drawings });
  } catch (err) {
    console.error('[QuickDraw]', err.message);
    res.status(500).json({ error: `'${ko}' 불러오기 실패: ${err.message}` });
  }
});

export default router;
