# 하루 그림일기

## 파일구조

```
haru/
├── backend/          # Express 서버 (포트 8000)
│   ├── routes/       # chat, outlines, quickdraw, speech
│   └── server.js
├── mobile/           # Expo (React Native) 앱
│   └── src/
├── frontend/         # 웹 PWA
└── start.ps1
```

## 실행방법

```powershell
npm run install:all
.\start.ps1
```

`start.ps1`이 백엔드와 Expo를 함께 실행합니다. Expo Go로 QR 코드를 스캔하면 접속됩니다.

## 주요 기능

- 자유 그림 그리기 (펜, 굵은펜, 지우개)
- 윤곽선 라이브러리 + Google Quick Draw 연동
- 음성으로 윤곽선 검색 (OpenAI Whisper)
- AI 챗봇 하루 (GPT-4o-mini)
- 그림일기 작성 및 Supabase 저장
- 커뮤니티 피드
