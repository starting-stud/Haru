# 🌼 하루 그림일기

시니어를 위한 AI 그림일기 앱 (React Native / Expo + Express)

---

## 프로젝트 구조

```
haru/
├── backend/          # Express 서버 (포트 8000)
│   ├── routes/       # chat, outlines, quickdraw, speech
│   ├── server.js
│   └── .env          # API 키 설정 (직접 생성)
├── mobile/           # Expo (React Native) 앱
│   └── src/
├── frontend/         # 웹 PWA (정적 파일)
├── start.ps1         # 백엔드 + Expo 동시 실행 스크립트
└── package.json
```

---

## 설치

### 1. 전체 의존성 설치

```powershell
npm run install:all
```

또는 개별 설치:

```powershell
npm run install:backend   # 백엔드만
npm run install:mobile    # 모바일만
```

### 2. 환경 변수 설정

`backend/.env` 파일 생성:

```env
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
PORT=8000
```

---

## 실행

### 백엔드 + 모바일 앱 한번에 (권장)

```powershell
.\start.ps1
```

Wi-Fi IP를 자동으로 감지하고, 백엔드와 Expo를 각각 실행합니다.  
Expo Go 앱으로 QR 코드를 스캔하면 접속됩니다.

### 개별 실행

```powershell
# 백엔드만
cd backend
node server.js

# 모바일만 (별도 터미널)
cd mobile
npx expo start --lan
```

---

## 외부 서비스

| 서비스 | 용도 |
|---|---|
| OpenAI API | 챗봇 (GPT-4o-mini), 음성인식 (Whisper), 윤곽선 추천 |
| Supabase | 일기 저장, 이미지 스토리지 |
| Google Quick Draw | 윤곽선 예시 데이터 |

### Supabase 테이블 생성 (최초 1회)

Supabase 대시보드 → SQL Editor에서 실행:

```sql
CREATE TABLE diaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  text_content TEXT DEFAULT '',
  drawing_url TEXT,
  diary_date DATE NOT NULL,
  privacy TEXT DEFAULT '비공개',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Storage → `diary-images` 버킷 생성 (Public)

---

## 주요 기능

- 🎨 자유 그림 그리기 (펜, 굵은펜, 지우개)
- 📐 48종 윤곽선 라이브러리 + Google Quick Draw 연동
- 🎤 음성으로 윤곽선 검색 (OpenAI Whisper)
- 💬 AI 챗봇 하루 (GPT-4o-mini)
- 📖 그림일기 작성 및 Supabase 저장
- 🌍 커뮤니티 피드 (이웃 일기 구경)
- 📱 Expo Go로 즉시 실행 가능
