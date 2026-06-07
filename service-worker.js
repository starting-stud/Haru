// ─────────────────────────────────────────
//  하루 그림일기 — Service Worker
//  HTML: 하루그림일기.html (index.html)
//  버전을 바꾸면 구 캐시가 자동 삭제됩니다.
// ─────────────────────────────────────────
const CACHE_NAME = 'haru-diary-v5';

// 오프라인에서도 열리도록 사전 캐시할 파일 목록
const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon.svg',
];

// ── 설치: 사전 캐시 ──────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// ── 활성화: 구 캐시 삭제 ─────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── fetch 전략 ───────────────────────────
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // ① POST 등 GET 이외 요청 → 항상 네트워크
  if (event.request.method !== 'GET') {
    event.respondWith(fetch(event.request));
    return;
  }

  // ② 외부 도메인 (Supabase API, ESM CDN, Google Fonts 등) → 항상 네트워크
  //    음성 인식(SpeechRecognition)은 브라우저 내장이므로 SW가 관여하지 않음
  const origin = new URL(url).origin;
  if (origin !== location.origin) {
    event.respondWith(fetch(event.request));
    return;
  }

  // ③ HTML 내비게이션 → Network-First (최신 HTML 우선, 오프라인 시 캐시)
  if (
    event.request.mode === 'navigate' ||
    event.request.headers.get('accept')?.includes('text/html')
  ) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(event.request)
            .then((cached) => cached || caches.match('./index.html'))
        )
    );
    return;
  }

  // ④ JS / JSON / 이미지 / 폰트 등 정적 자산 → Cache-First (없으면 네트워크 후 캐시)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    }).catch(() => caches.match('./index.html'))
  );
});

// ── 푸시 알림 ────────────────────────────
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || '하루 그림일기', {
      body: data.body || '오늘 그림일기를 남겨볼까요?',
      icon: './icons/icon.svg',
      badge: './icons/icon.svg',
      vibrate: [200, 100, 200],
    })
  );
});

// ── 알림 클릭 ────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('./');
      return undefined;
    })
  );
});
