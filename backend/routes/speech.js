import { Router } from 'express';
import OpenAI, { toFile } from 'openai';
import multer from 'multer';
import fs from 'fs';
import os from 'os';

const router = Router();
const upload = multer({ dest: os.tmpdir() });

router.post('/', upload.single('audio'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '음성 파일이 없어요' });

  if (!process.env.OPENAI_API_KEY) {
    fs.unlinkSync(req.file.path);
    return res.status(503).json({ error: 'OpenAI API 키가 없어요' });
  }

  const tmp = req.file.path;
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const result = await client.audio.transcriptions.create({
      file: await toFile(fs.createReadStream(tmp), 'voice.m4a', { type: 'audio/m4a' }),
      model: 'whisper-1',
      language: 'ko',
    });
    res.json({ text: result.text });
  } catch (err) {
    console.error('speech error:', err.message);
    res.status(500).json({ error: '음성 인식에 실패했어요' });
  } finally {
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  }
});

export default router;
