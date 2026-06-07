# 하루 그림일기

시니어를 위한 AI 그림일기 PWA — 그리고, 기록하고, 나눠요.

---

## 프로젝트 구조

```
haru-diary/
├── index.html            ← 앱 본체 (수정 금지)
├── manifest.json         ← PWA 매니페스트
├── service-worker.js     ← 오프라인 캐시 / 푸시 알림
├── supabase.js           ← Supabase 클라이언트 (외부 모듈 참조용)
├── server.ps1            ← 로컬 개발 서버 (PowerShell)
├── icons/
│   └── icon.svg          ← 앱 아이콘
└── scratch/
    └── check_profiles.js ← Supabase 연결 확인 스크립트
```

---

## 로컬 실행 방법

### 방법 1 — PowerShell 서버 (권장, 음성 기능 정상 작동)

```powershell
cd <프로젝트 폴더>
.\server.ps1
```

브라우저에서 `http://localhost:8080` 접속

### 방법 2 — Python 서버

```bash
python -m http.server 8080
```

브라우저에서 `http://localhost:8080` 접속

> **음성 기능 주의사항**
> `SpeechRecognition`(음성 인식)과 `speechSynthesis`(TTS 읽어주기)는
> **`localhost` 또는 `HTTPS`** 환경에서만 동작합니다.
> 파일을 `file://`로 직접 열면 음성 기능이 비활성화됩니다.

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| 🔐 계정 시스템 | 이름 + PIN 4자리 로그인 / 회원가입 |
| ✏️ 그림 그리기 | 캔버스 자유 그리기 (펜, 굵은펜, 지우개) |
| 🔲 윤곽선 라이브러리 | 35종 SVG 윤곽선, 즐겨찾기 |
| 🎤 음성 윤곽선 검색 | 말하면 윤곽선 자동 배치 |
| ⛶ 크게 그리기 | 가로 모드 전체 화면 캔버스 |
| 🎤 가로 모드 음성 검색 | 우측 하단 오버레이 버튼 |
| 📔 그림일기 저장 | 계정별 localStorage + Supabase 백업 |
| 🌍 커뮤니티 피드 | 공개 일기를 "우리" 탭에서 공유 |
| 💬 AI 챗봇 | 하루와 대화, TTS 읽어주기 (이모지 제외) |
| 🎤 챗봇 음성 입력 | 말하면 자동 전송 |
| 👤 닉네임 / 프로필 | 로그인명과 별개 닉네임, 프로필 사진 |
| 📖 책 만들기 | 이번 달 일기 모음 (준비 중) |
| 👧 보호자 연결 | 알림 설정 화면 |
| 📱 PWA | 홈 화면 추가, 오프라인 지원 |

---

## Supabase 설정

### 테이블: `diaries`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | uuid | PK (자동 생성) |
| `drawing_url` | text | 그림 이미지 공개 URL |
| `text_content` | text | 일기 본문 |
| `privacy` | text | `'공개'` 또는 `'비공개'` |
| `diary_date` | date | 일기 날짜 |
| `created_at` | timestamptz | 생성 시각 (자동) |

### 스토리지 버킷: `diary-images`

- 접근 정책: **Public** (공개 URL 발급용)

### 연결 확인

```bash
node --experimental-vm-modules scratch/check_profiles.js
```

---

## 음성 기능 목록

모든 음성 기능은 브라우저 내장 Web Speech API를 사용합니다.
Supabase나 서버와 무관하며, `localhost` 또는 `HTTPS`에서 자동 활성화됩니다.

| 기능 | 버튼 위치 | API |
|------|-----------|-----|
| 윤곽선 음성 검색 | 그리기 화면 캔버스 우측 하단 🎤 | SpeechRecognition |
| 가로 모드 음성 검색 | 크게 그리기 → 우측 사이드바 하단 🎤 | SpeechRecognition |
| 챗봇 음성 입력 | 하루 탭 → 입력창 위 🎤 버튼 | SpeechRecognition |
| TTS 읽어주기 | 챗봇 응답, 안내 메시지 자동 재생 | speechSynthesis |

---

## 배포

GitHub Pages, Netlify, Vercel 등 정적 호스팅 서비스에 업로드하면 됩니다.
`index.html`, `manifest.json`, `service-worker.js`, `icons/` 폴더를 함께 배포하세요.

HTTPS가 자동 제공되어 음성 기능이 정상 동작합니다.
