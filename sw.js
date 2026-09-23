// Service worker: permite instalar Nido como app y abrirla sin conexión
const CACHE = 'nido-v2';
const SHELL = [
  './', './index.html', './css/styles.css', './manifest.json',
  './js/app.js', './js/avatar.js', './js/views/avatar-editor.js', './js/config.js', './js/db.js', './js/demo-data.js', './js/events.js', './js/fx.js', './js/store.js', './js/themes.js', './js/ui.js',
  './js/views/agenda.js', './js/views/auth.js', './js/views/chat.js', './js/views/exchanges.js', './js/views/family.js', './js/views/home.js',
  './js/views/lists.js', './js/views/money.js', './js/views/more.js', './js/views/notes.js', './js/views/photos.js', './js/views/settings.js', './js/views/sos.js',
  './icons/icon-192.png', './icons/icon-512.png'
];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // Firebase y fuentes van directo
  // Red primero (para ver siempre la última versión), caché si no hay internet
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request)));
});
