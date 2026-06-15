// ─────────────────────────────────────────
//  하루 그림일기 — Supabase 클라이언트 설정
//
//  사용처:
//    - 일기 저장 / 공개 피드 조회  (diaries 테이블)
//    - 그림 이미지 업로드           (diary-images 스토리지)
//
//  음성 기능(SpeechRecognition / speechSynthesis)은
//  브라우저 내장 API를 직접 사용하므로 이 파일과 무관합니다.
//
//  ※ index.html 은 <script type="module"> 없이 동적 import()로
//    Supabase를 로드합니다. 이 파일은 외부 모듈 방식으로
//    사용할 때 참조용으로 유지합니다.
// ─────────────────────────────────────────

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://nxinbugzcvpahjjejyzv.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
  'eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54aW5idWd6Y3ZwYWhqamVqeXp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNDY4MDUsImV4cCI6MjA5NDcyMjgwNX0.' +
  '-ro7X9dMxxJJNartwY_npgaFn_qG6qAC55oXXWXfF2w';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── 테이블 구조 참고 ─────────────────────
// diaries
//   id            uuid  (PK, auto)
//   drawing_url   text  (Storage 공개 URL)
//   text_content  text  (일기 본문)
//   privacy       text  ('공개' | '비공개')
//   diary_date    date
//   created_at    timestamptz (auto)
//
// Storage bucket: diary-images  (public)
