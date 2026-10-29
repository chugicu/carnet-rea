/* Service worker de Carnet Réa — l'application s'ouvre même sans réseau.
   VERSION et FILES sont régénérés par tools/build.js : ne pas modifier à la main. */
const VERSION = '13de1e1d22';
const FILES = ["./","assets/apple-touch-icon.png","assets/fonts/jetbrains-mono-latin-500-normal.woff2","assets/fonts/jetbrains-mono-latin-700-normal.woff2","assets/fonts/sora-latin-400-normal.woff2","assets/fonts/sora-latin-600-normal.woff2","assets/fonts/sora-latin-700-normal.woff2","assets/fonts/sora-latin-ext-400-normal.woff2","assets/icon-192.png","assets/icon-512.png","assets/icon-maskable-512.png","assets/logo-full.png","assets/logo-mark.png","css/app.css","index.html","js/charts.js","js/config.js","js/defaults.js","js/echo.js","js/logic.js","js/main.js","js/nav.js","js/photo.js","js/store.js","js/theme.js","js/ui.js","js/unlock.js","js/util.js","js/views/admin-echo-contenu.js","js/views/admin-rules.js","js/views/admin-ui.js","js/views/admin-users.js","js/views/admin.js","js/views/auth.js","js/views/badges.js","js/views/bilan.js","js/views/dossier.js","js/views/echo-ui.js","js/views/etab-service.js","js/views/gestes.js","js/views/moi.js","js/views/promo.js","js/views/retours.js","js/views/soutien.js","js/views/suivi.js","js/views/trombi.js","manifest.webmanifest"];

const CACHE = 'carnet-rea-' + VERSION;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(FILES.map(f => c.add(f).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('carnet-rea-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}
async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  const net = fetch(req).then(res => { if (res.ok) cache.put(req, res.clone()); return res; });
  net.catch(() => {});
  try {
    return await Promise.race([net, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3500))]);
  } catch (e) {
    const hit = (await cache.match(req, { ignoreSearch: true })) || (req.mode === 'navigate' && (await cache.match('index.html') || await cache.match('./')));
    if (hit) return hit;
    return net;
  }
}
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // le serveur Apps Script n'est jamais mis en cache
  e.respondWith(/\/assets\//.test(url.pathname) ? cacheFirst(req) : networkFirst(req));
});
