/** 发新版本时把这个数字加 1，激活时会删掉旧缓存。 */
const CACHE_VERSION = 16;
const CACHE = `jelly-brawl-v${CACHE_VERSION}`;

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './assets/loading-bg.jpg',
  './src/loading.js',
  './src/main.js',
  './src/config.js',
  './src/game.js',
  './src/input.js',
  './src/physics.js',
  './src/render.js',
  './src/ui.js',
  './src/rng.js',
  './src/ai.js',
  './src/growth.js',
  './src/events.js',
  './src/round.js',
  './src/hud.js',
  './src/look.js',
  './src/fx.js',
  './src/faces.js',
  './src/audio.js',
  './src/items.js',
  './src/ghost.js',
  './src/match.js',
  './src/charge.js',
  './src/board.js',
  './src/net.js',
  './src/online.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(
      ASSETS.map((url) => new Request(url, { cache: 'reload' }))
    ))
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
