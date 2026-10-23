// Rezeptkartei – Offline-Cache
const CORE = 'rk-core-v2';
const EXT = 'rk-ext';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CORE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CORE && k !== EXT).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname === 'api.anthropic.com') return;
  if (url.origin === location.origin) {
    // Netz zuerst, damit Updates ankommen; offline aus dem Cache
    e.respondWith(fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CORE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then(m => m || caches.match('./index.html'))));
    return;
  }
  if (/(^|\.)(fonts\.googleapis\.com|fonts\.gstatic\.com|www\.gstatic\.com|cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net)$/.test(url.hostname)) {
    // Schriften und Bibliotheken: einmal laden, dann aus dem Cache
    e.respondWith(caches.match(req).then(m => m || fetch(req).then(res => {
      if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(EXT).then(c => c.put(req, copy)); }
      return res;
    })));
  }
});
