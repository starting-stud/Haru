import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import chatRouter from './routes/chat.js';
import outlinesRouter from './routes/outlines.js';
import quickdrawRouter from './routes/quickdraw.js';
import speechRouter from './routes/speech.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// ── API 라우트 ──
app.use('/api/chat', chatRouter);
app.use('/api/outlines', outlinesRouter);
app.use('/api/quickdraw', quickdrawRouter);
app.use('/api/speech', speechRouter);

// ── 헬스체크 ──
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    ai: !!process.env.OPENAI_API_KEY,
    supabase: !!process.env.SUPABASE_URL,
  });
});

// ── 프론트엔드 정적 파일 서빙 ──
const frontendDir = join(__dirname, '..', 'frontend');
app.use(express.static(frontendDir));

// SPA fallback
app.get('*', (_req, res) => {
  res.sendFile(join(frontendDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🌸 하루 서버 실행 중: http://localhost:${PORT}`);
  console.log(`   AI 챗봇: ${process.env.OPENAI_API_KEY ? '✅ 연결됨' : '⚠️  API 키 없음 (fallback 모드)'}`);
  console.log(`   Supabase: ${process.env.SUPABASE_URL ? '✅ 설정됨' : '⚠️  미설정'}\n`);
});
