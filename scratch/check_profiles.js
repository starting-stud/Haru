// ─────────────────────────────────────────
//  하루 그림일기 — Supabase 연결 및 스키마 확인 스크립트
//
//  실행: node --experimental-vm-modules check_profiles.js
//  (또는 ESM 지원 환경에서 실행)
//
//  확인 항목:
//    1. diaries 테이블 접근 가능 여부
//    2. diary-images 스토리지 버킷 존재 여부
//    3. 공개 일기 조회 (커뮤니티 피드 기능 검증)
// ─────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nxinbugzcvpahjjejyzv.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
  'eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54aW5idWd6Y3ZwYWhqamVqeXp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNDY4MDUsImV4cCI6MjA5NDcyMjgwNX0.' +
  '-ro7X9dMxxJJNartwY_npgaFn_qG6qAC55oXXWXfF2w';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function check() {
  console.log('=== 하루 그림일기 Supabase 연결 확인 ===\n');

  // 1. diaries 테이블 — 최근 1건 조회
  console.log('[1] diaries 테이블 조회...');
  const { data: diaries, error: diaryErr } = await supabase
    .from('diaries')
    .select('id, drawing_url, text_content, privacy, diary_date, created_at')
    .order('created_at', { ascending: false })
    .limit(1);

  if (diaryErr) {
    console.error('  ❌ diaries 오류:', diaryErr.message);
  } else {
    console.log('  ✅ diaries 접근 성공. 최신 레코드:', diaries);
  }

  // 2. 공개 일기 조회 (커뮤니티 피드 = "우리" 탭)
  console.log('\n[2] 공개 일기(커뮤니티 피드) 조회...');
  const { data: publicDiaries, error: publicErr } = await supabase
    .from('diaries')
    .select('id, drawing_url, text_content, privacy, created_at')
    .eq('privacy', '공개')
    .order('created_at', { ascending: false })
    .limit(5);

  if (publicErr) {
    console.error('  ❌ 공개 일기 조회 오류:', publicErr.message);
  } else {
    console.log(`  ✅ 공개 일기 ${publicDiaries.length}건 조회됨`);
    publicDiaries.forEach((d, i) => {
      console.log(`     [${i + 1}] ${d.created_at?.slice(0, 10)} — ${(d.text_content || '').slice(0, 30)}...`);
    });
  }

  // 3. diary-images 스토리지 버킷 확인
  console.log('\n[3] diary-images 스토리지 버킷 확인...');
  const { data: buckets, error: bucketErr } = await supabase.storage.listBuckets();

  if (bucketErr) {
    console.error('  ❌ 스토리지 오류:', bucketErr.message);
  } else {
    const hasBucket = buckets.some((b) => b.name === 'diary-images');
    if (hasBucket) {
      console.log('  ✅ diary-images 버킷 존재 확인');
    } else {
      console.warn('  ⚠️  diary-images 버킷 없음. Supabase 대시보드에서 생성하세요.');
      console.log('     현재 버킷:', buckets.map((b) => b.name).join(', ') || '없음');
    }
  }

  console.log('\n=== 확인 완료 ===');
  console.log('※ 음성 인식(SpeechRecognition)은 브라우저 내장 API로 Supabase와 무관합니다.');
  console.log('  localhost 또는 HTTPS 환경에서 index.html을 열면 정상 동작합니다.');
}

check().catch(console.error);
