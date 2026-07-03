// Service worker — Allenamento Aureo
// Strategia:
//  - index.html: PRIMA LA RETE (online vedi sempre l'ultima versione), cache come ripiego offline
//  - tutto il resto (Tailwind, font, icone): PRIMA LA CACHE, aggiornamento silenzioso in background
const CACHE = 'aureo-shell-v1';
const PRECACHE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './icon-180.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const isHTML = req.mode === 'navigate' || new URL(req.url).pathname.endsWith('/index.html');

  if (isHTML) {
    // Rete prima: niente versioni vecchie quando sei online. Offline: la copia salvata.
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Cache prima: l'app resta veloce e funziona offline; la rete rinfresca in background.
  e.respondWith(
    caches.match(req).then((hit) => {
      const refresh = fetch(req)
        .then((res) => {
          if (res && (res.ok || res.type === 'opaque')) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || refresh;
    })
  );
});
