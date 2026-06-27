/* The Stickmen Hub service worker — installable + offline app shell.
 * Bump CACHE on any shell change so old caches purge. */
const CACHE = 'stickmen-v19';
const SHELL = [
  '/', '/manifest.webmanifest',
  '/shared/gamecenter.js',
  '/games/lavender-leap/index.html', '/games/lavender-leap/game.js?v=38', '/games/lavender-leap/styles.css',
  '/games/dont-look-down/dont_look_down.html',
  '/design/hub/background.png', '/design/hub/lavender-cover.png',
  '/design/hub/dontlookdown-cover.png', '/design/hub/journey-strip.png',
  '/assets/icons/icon-192.png', '/assets/icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.allSettled(SHELL.map((u) => c.add(u)));  // resilient: one 404 won't abort
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith('/api/')) return;       // never cache auth/scores — always live

  // Code/markup: NETWORK-FIRST so updates always show when online; cache is only
  // an offline fallback. (Prevents the stale-code problem during active dev.)
  const p = url.pathname;
  const codeLike = req.mode === 'navigate' || p.endsWith('.js') || p.endsWith('.css') || p.endsWith('.webmanifest');
  if (codeLike) {
    e.respondWith(
      fetch(req).then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); return r; })
                .catch(() => caches.match(req).then((m) => m || caches.match('/')))
    );
    return;
  }
  // images & other assets: cache-first (they rarely change), network fallback
  e.respondWith(
    caches.match(req).then((m) => m || fetch(req).then((r) => {
      if (r.ok) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); }
      return r;
    }))
  );
});
