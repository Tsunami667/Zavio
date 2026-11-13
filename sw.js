/* Zavio : fonctionnement hors-ligne.
   Stratégie : on va chercher la dernière version sur le réseau (la mise à jour s'affiche dès l'ouverture).
   Si le réseau est absent ou lent (plus de 3 secondes), on sert la copie gardée en mémoire. */
const CACHE = 'zavio-v13';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => {}))))
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
  if (new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req, { ignoreSearch: true });
      const network = fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }).then((res) => {
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      });
      if (!cached) return network;
      const slow = new Promise((resolve) => setTimeout(() => resolve(cached), 3000));
      return Promise.race([network.catch(() => cached), slow]);
    })
  );
});
