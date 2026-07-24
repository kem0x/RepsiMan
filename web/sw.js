const SHELL_CACHE = 'repsiman-shell-v1.0.0-13';
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/Pepsiman_Recompiled.js',
  '/Pepsiman_Recompiled.wasm',
  '/openbios.bin',
  '/openbios-fastboot.bin',
  '/OPENBIOS-LICENSE.txt',
  '/manifest.webmanifest',
  '/assets/title-logo-recompiled.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon-32.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(SHELL_CACHE)
    .then(cache => cache.addAll(SHELL_ASSETS))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys
      .filter(key => key.startsWith('repsiman-shell-') && key !== SHELL_CACHE)
      .map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  /* Private LAN test assets contain the user's disc. They must always
   * come directly from the Mac and must never enter the PWA cache. */
  if (url.pathname.startsWith('/__repsiman_assets__/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/index.html')));
    return;
  }

  /* Prefer the current runtime while online so a newly deployed HTML shell can
   * never be paired with an older cached JS/WASM ABI. The cache is strictly the
   * offline fallback. */
  event.respondWith(fetch(request)
    .then(response => {
      if (response.ok) {
        const copy = response.clone();
        event.waitUntil(caches.open(SHELL_CACHE).then(cache => cache.put(request, copy)));
      }
      return response;
    })
    .catch(() => caches.match(request)));
});
