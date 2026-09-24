// Service worker: permite instalar Nido como app y abrirla sin conexión
const CACHE = 'nido-v17';
const SHELL = [
  './', './index.html', './css/styles.css', './css/styles.css?v=17', './manifest.json',
  './js/app.js', './js/app.js?v=17', './js/notifications.js', './js/views/myfinance.js', './js/avatar.js', './js/avatar-species.js', './js/avatar-color.js', './js/views/avatar-editor.js', './js/config.js', './js/db.js', './js/demo-data.js', './js/events.js', './js/fx.js', './js/store.js', './js/themes.js', './js/ui.js', './js/reveal.js', './js/wishes.js', './js/sync.js', './js/backup.js', './js/debts.js', './js/icons.js', './js/quickadd.js', './js/search.js', './js/gestures.js', './js/motion.js', './js/onboarding.js',
  './js/views/agenda.js', './js/views/recipes.js', './js/views/capsule.js', './js/views/tree.js', './js/views/polls.js', './js/views/trips.js', './js/views/challenges.js', './js/views/location.js', './js/views/dm.js', './js/views/pets.js', './js/views/parties.js', './js/views/wheel.js', './js/views/menu.js', './js/views/bills.js', './js/views/goals.js', './js/views/wrapped.js', './js/views/auth.js', './js/views/chat.js', './js/views/exchanges.js', './js/views/family.js', './js/views/home.js',
  './js/views/lists.js', './js/views/money.js', './js/views/more.js', './js/views/notes.js', './js/views/photos.js', './js/views/settings.js', './js/views/sos.js',
  './icons/icon-192.png', './icons/icon-512.png'
];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // Firebase y fuentes van directo
  // Red primero (para ver siempre la última versión), caché si no hay internet
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: e.request.mode === 'navigate' }).then(r => r || (e.request.mode === 'navigate' ? caches.match('./index.html') : undefined))));
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
