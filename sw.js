// Service worker: permite instalar Nido como app y abrirla sin conexión
const CACHE = 'nido-v21';
const SHELL = [
  './', './index.html', './css/styles.css', './css/styles.css?v=21', './manifest.json',
  './js/app.js', './js/app.js?v=21', './js/notifications.js', './js/views/myfinance.js', './js/avatar.js', './js/avatar-species.js', './js/avatar-color.js', './js/views/avatar-editor.js', './js/config.js', './js/db.js', './js/demo-data.js', './js/events.js', './js/fx.js', './js/store.js', './js/themes.js', './js/ui.js', './js/reveal.js', './js/wishes.js', './js/sync.js', './js/backup.js', './js/debts.js', './js/icons.js', './js/quickadd.js', './js/search.js', './js/gestures.js', './js/motion.js', './js/onboarding.js', './js/voice.js', './js/scanner.js', './js/vendor/qrcode.js', './js/vendor/jsQR.js',
  './js/views/agenda.js', './js/views/recipes.js', './js/views/capsule.js', './js/views/tree.js', './js/views/polls.js', './js/views/trips.js', './js/views/challenges.js', './js/views/location.js', './js/views/dm.js', './js/views/pets.js', './js/views/parties.js', './js/views/wheel.js', './js/views/menu.js', './js/views/bills.js', './js/views/goals.js', './js/views/wrapped.js', './js/views/docs.js', './js/views/hunt.js', './js/views/memmap.js', './js/views/auth.js', './js/views/chat.js', './js/views/exchanges.js', './js/views/family.js', './js/views/home.js',
  './js/views/lists.js', './js/views/money.js', './js/views/more.js', './js/views/notes.js', './js/views/photos.js', './js/views/settings.js', './js/views/sos.js',
  './icons/icon-192.png', './icons/icon-512.png'
];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== EXT_CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
// Librerías externas que la app necesita para arrancar (Firebase, fuentes, mapa): se guardan para abrir sin señal
const EXT_CACHE = 'nido-ext-v1';
const EXT_OK = /(^|\.)gstatic\.com$|(^|\.)googleapis\.com$|cdnjs\.cloudflare\.com$|cdn\.jsdelivr\.net$/;
const EXT_SKIP = /firestore\.googleapis\.com|identitytoolkit|securetoken|firebaseinstallations|www\.googleapis\.com/;
const withTimeout = (p, ms) => new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('timeout')), ms); p.then(v => { clearTimeout(t); res(v); }, e => { clearTimeout(t); rej(e); }); });

self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) {
    // Firebase (datos y sesión) siempre directo; sus librerías y las fuentes, desde la caché si ya las tenemos
    if (!EXT_OK.test(url.hostname) || EXT_SKIP.test(url.href)) return;
    e.respondWith(caches.open(EXT_CACHE).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(r => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  // Archivos de la app: red primero, pero si la señal está lenta (más de 4 s) usamos la copia guardada
  // y la actualizamos en segundo plano para la próxima vez.
  const fromCache = () => caches.match(req, { ignoreSearch: req.mode === 'navigate' }).then(r => r || (req.mode === 'navigate' ? caches.match('./index.html') : undefined));
  const net = fetch(req, { cache: 'no-cache' }).then(r => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return r; });
  e.respondWith(withTimeout(net, 4000).catch(async () => (await fromCache()) || net));
});

// Al tocar una notificación del sistema, abre la app en la sección indicada
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const link = (e.notification.data && e.notification.data.link) || '';
  const url = new URL('./' + (link ? '#/' + link : ''), self.registration.scope).href;
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(ws => {
    for (const w of ws) { if ('focus' in w) { w.navigate ? w.navigate(url) : null; return w.focus(); } }
    return clients.openWindow(url);
  }));
});
