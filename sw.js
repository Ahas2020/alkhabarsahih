// ═══════════════════════════════════════════════════════════
//  Service Worker — الخبر الصحيح v2.0
//  alkhabarsahih.com
//  PWA offline support + intelligent caching
// ═══════════════════════════════════════════════════════════

const CACHE_VERSION = 'khabar-v2.0.0';
const STATIC_CACHE  = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;

// Files to precache on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/analyze.html',
  '/pricing.html',
  '/about.html',
  '/manifest.json',
];

// ── Install: precache static shell ────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: clean old caches ────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: cache strategy ─────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Don't cache API calls or Netlify functions
  if (
    url.pathname.startsWith('/.netlify/') ||
    url.pathname.startsWith('/api/') ||
    url.hostname !== self.location.hostname
  ) {
    // Network-only for API calls
    event.respondWith(
      fetch(request).catch(() =>
        new Response(
          JSON.stringify({ error: 'أنت غير متصل بالإنترنت' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        )
      )
    );
    return;
  }

  // Cache-first for static HTML pages
  if (
    request.method === 'GET' &&
    (url.pathname.endsWith('.html') || url.pathname === '/')
  ) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then(cache => cache.put(request, clone));
          }
          return response;
        }).catch(() => caches.match('/index.html'));
      })
    );
    return;
  }

  // Stale-while-revalidate for other assets
  event.respondWith(
    caches.match(request).then(cached => {
      const networkFetch = fetch(request).then(response => {
        if (response.ok && request.method === 'GET') {
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then(cache => cache.put(request, clone));
        }
        return response;
      }).catch(() => cached || new Response('', { status: 503 }));

      return cached || networkFetch;
    })
  );
});

// ── Background sync placeholder ───────────────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'khabar-sync') {
    console.log('[SW] Background sync triggered');
  }
});

// ── Push notifications placeholder ───────────────────────
self.addEventListener('push', event => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'الخبر الصحيح', {
      body: data.body || 'إشعار جديد',
      icon: '/assets/icon-192.png',
      badge: '/assets/icon-192.png',
      dir: 'rtl',
      lang: 'ar',
      tag: 'khabar-notification',
      data: { url: data.url || '/' }
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});
