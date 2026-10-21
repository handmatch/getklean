// Getklean Work service worker: keeps the app shell available on weak signal.
const CACHE = 'gkw-v1';
const SHELL = ['./', './index.html', './worker.css', './js/app.js', './js/data.js', './js/config.js', './manifest.webmanifest', './icons/icon-192.png', './icons/logo-on-blue.svg'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
// Network first for our own files (so updates arrive right away), cache as fallback when offline.
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html'))));
});
