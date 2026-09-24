// ============================================================
//  NIDO · núcleo de la app (arranque, sesión, rutas, temas)
// ============================================================
import { createBackend, isDemo } from './db.js';
import { APP_NAME } from './config.js';
import { THEMES, seasonFor, renderScene, renderDeco } from './themes.js';
import { initFx, setFx, setIntensity, celebrate } from './fx.js';
import { S, hooks, clearSubs, runCleanups, members, guestPerson } from './store.js';
import { esc, toast, today0, parseDate, avatar, isoDate } from './ui.js';
import { openSOS } from './views/sos.js';
import * as notifCenter from './notifications.js';
import * as auth from './views/auth.js';

import home from './views/home.js';
import agenda from './views/agenda.js';
import { exchangesList, exchangeDetail } from './views/exchanges.js';
import { photosHome, albumView, bookView } from './views/photos.js';
import { shopping, chores } from './views/lists.js';
import dinero from './views/money.js';
import chat from './views/chat.js';
import { onMessages } from './views/chat.js';
import { notes, donde } from './views/notes.js';
import { familia, perfil } from './views/family.js';
import ajustes from './views/settings.js';
import mas from './views/more.js';
import avatarEditor, { resetAvatarDraft } from './views/avatar-editor.js';
import { recipesView, recipeDetail } from './views/recipes.js';
import capsula from './views/capsule.js';
import arbol from './views/tree.js';
import encuestas from './views/polls.js';
import { tripsList, tripDetail } from './views/trips.js';
import retos from './views/challenges.js';
import ubicacion, { syncLocationSharing } from './views/location.js';
import dmView from './views/dm.js';
import { petsList, petDetail } from './views/pets.js';
import { partiesList, partyDetail } from './views/parties.js';
import ruleta from './views/wheel.js';
import menuView from './views/menu.js';
import { billsView, billDetail } from './views/bills.js';
import { goalsView, goalDetail } from './views/goals.js';
import { wrappedView } from './views/wrapped.js';
import { docsView } from './views/docs.js';
import { huntsList, huntDetail } from './views/hunt.js';
import { memMap } from './views/memmap.js';
import { icon } from './icons.js';
import { openQuickAdd } from './quickadd.js';
import { openSearch } from './search.js';
import { initGestures } from './gestures.js';
import { animateView, playFor } from './motion.js';
import { maybeOnboard } from './onboarding.js';
import { ensureRecurring, agendaRows, quincena } from './debts.js';
import { unreadDMs } from './views/dm.js';
import { initSync, syncPill, syncInfo, paint as paintSync } from './sync.js';
import * as guest from './guest.js';
import { alertLocal } from './notifications.js';

const ROUTES = {
  inicio: home, agenda, intercambios: exchangesList, intercambio: exchangeDetail,
  fotos: photosHome, album: albumView, libro: bookView, listas: shopping, tareas: chores,
  dinero, chat, notas: notes, donde, familia, perfil, ajustes, mas, avatar: avatarEditor,
  recetas: recipesView, receta: recipeDetail, capsula, arbol, encuestas, viajes: tripsList, viaje: tripDetail, retos, ubicacion, dm: dmView, mascotas: petsList, mascota: petDetail, fiestas: partiesList, fiesta: partyDetail, ruleta, menu: menuView, cuentas: billsView, cuenta: billDetail, metas: goalsView, meta: goalDetail, resumen: wrappedView, documentos: docsView, mapa: memMap,
  invitado: guest.guestHome,
  tesoro: { render: (p) => p[0] ? huntDetail.render(p) : huntsList.render(), after: (r, p) => { if (p[0]) huntDetail.after(r, p); }, actions: { ...huntsList.actions, ...huntDetail.actions } }
};
export const NAV = [
  { r: 'inicio', ico: '🏠', t: 'Inicio' },
  { r: 'cuentas', ico: '🤝', t: 'Cuentas claras' },
  { r: 'chat', ico: '💬', t: 'Chat' },
  { r: 'agenda', ico: '📅', t: 'Agenda' },
  { r: 'intercambios', ico: '🎁', t: 'Intercambios' },
  { r: 'fotos', ico: '📖', t: 'Libro familiar' },
  { sep: 'Juntos' },
  { r: 'fiestas', ico: '🎉', t: 'Fiestas y posadas' },
  { r: 'encuestas', ico: '🗳️', t: 'Encuestas' },
  { r: 'ruleta', ico: '🎡', t: 'Ruleta' },
  { r: 'retos', ico: '🏅', t: 'Retos' },
  { r: 'viajes', ico: '✈️', t: 'Viajes' },
  { r: 'recetas', ico: '🍲', t: 'Recetario' },
  { r: 'capsula', ico: '⏳', t: 'Cápsula del tiempo' },
  { r: 'mapa', ico: '🗺️', t: 'Mapa de recuerdos' },
  { r: 'tesoro', ico: '🏴‍☠️', t: 'Búsqueda del tesoro' },
  { r: 'arbol', ico: '🌳', t: 'Árbol genealógico' },
  { r: 'ubicacion', ico: '📍', t: '¿Dónde andamos?' },
  { sep: 'Casa' },
  { r: 'menu', ico: '🍽️', t: 'Menú semanal' },
  { r: 'listas', ico: '🛒', t: 'Compras' },
  { r: 'tareas', ico: '🧹', t: 'Tareas y puntos' },
  { r: 'mascotas', ico: '🐾', t: 'Mascotas' },
  { r: 'dinero', ico: '💰', t: 'Dinero' },
  { r: 'metas', ico: '🎯', t: 'Metas' },
  { r: 'documentos', ico: '🪪', t: 'Documentos' },
  { r: 'notas', ico: '📝', t: 'Notas' },
  { r: 'donde', ico: '🔎', t: '¿Dónde está?' },
  { sep: 'Nido' },
  { r: 'familia', ico: '👨‍👩‍👧‍👦', t: 'Familia' },
  { r: 'resumen', ico: '🎁', t: 'Resumen del año' },
  { r: 'ajustes', ico: '⚙️', t: 'Ajustes' }
];
const TABS = [['inicio', '🏠', 'Inicio'], ['cuentas', '🤝', 'Cuentas'], ['+', '＋', 'Agregar'], ['chat', '💬', 'Chat'], ['mas', '☰', 'Más']];

const $app = document.getElementById('app');
let familyUnsub = null, colUnsubs = [], recurT = null;
let currentTheme = null, pageTheme = null;

// ---------------- TEMAS ----------------
function birthdayToday() {
  const t = today0();
  return S.data.members.find(m => { if (!m.birthday || m.treeOnly) return false; const b = parseDate(m.birthday); return b.getMonth() === t.getMonth() && b.getDate() === t.getDate(); });
}
export function baseTheme() {
  const pref = localStorage_get('nido-theme-local') || S.family?.theme || 'auto';
  if (pref !== 'auto') return pref;
  if (birthdayToday()) return 'cumple';
  return seasonFor(new Date());
}
function localStorage_get(k) { try { return localStorage.getItem(k); } catch { return null; } }

export function applyTheme(id, force = false) {
  id = THEMES[id] ? id : 'clasico';
  const t = THEMES[id];
  const bg = S.data.backgrounds.find(b => b.id === id);
  const key = id + '|' + (bg ? bg.updatedAt || 1 : 0);
  if (key === currentTheme && !force) return;
  const changed = !currentTheme || currentTheme.split('|')[0] !== id;
  currentTheme = key;
  const body = document.body;
  body.dataset.theme = id; body.dataset.mode = t.dark ? 'dark' : 'light';
  const r = document.documentElement.style;
  r.setProperty('--accent', t.accent); r.setProperty('--accent2', t.accent2); r.setProperty('--glow', t.glow);
  r.setProperty('--font-display', t.font);
  document.querySelector('meta[name=theme-color]').setAttribute('content', t.dark ? '#0b1026' : '#f3e8ff');
  const scene = document.getElementById('scene');
  scene.querySelector('.scene-svg').innerHTML = renderScene(id);
  scene.querySelector('.scene-deco').innerHTML = renderDeco(id);
  const ph = scene.querySelector('.scene-photo');
  if (bg && bg.data) { ph.style.backgroundImage = `url("${bg.data}")`; scene.classList.add('has-photo'); }
  else { ph.style.backgroundImage = ''; scene.classList.remove('has-photo'); }
  if (changed) {
    body.classList.remove('theme-fade'); void body.offsetWidth; body.classList.add('theme-fade');
    setFx(t);
  }
}
function refreshTheme() { applyTheme(pageTheme || baseTheme()); }
hooks.setPageTheme = (id) => { pageTheme = id; refreshTheme(); };
hooks.celebrate = (x, y, kind, colors) => celebrate(x, y, kind, colors);

// Tocar el fondo lanza una pequeña celebración según el tema
document.addEventListener('pointerdown', e => {
  if (e.target.closest('.card, a, button, input, textarea, select, label, .tabbar, .sidebar, .modal-bg, .lightbox, .book, .quick, .polaroid')) return;
  const t = THEMES[document.body.dataset.theme]; if (!t) return;
  const kind = t.tapKind || (t.fireworks ? 'spark' : null);
  if (kind) celebrate(e.clientX, e.clientY, kind, t.tapColors || (t.fireworks && t.fireworks.colors));
});
let rT; addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(() => { const id = document.body.dataset.theme; if (id) document.querySelector('#scene .scene-deco').innerHTML = renderDeco(id); }, 300); });

// ---------------- RUTAS ----------------
const GUEST_ROUTES = ['invitado', 'intercambio', 'fiesta'];
function parseHash() {
  const h = location.hash.replace(/^#\/?/, '');
  const [name, ...params] = h.split('/').map(decodeURIComponent);
  // 🎟️ Un invitado sólo puede estar en sus invitaciones y en los eventos compartidos
  if (S.guest) return GUEST_ROUTES.includes(name) && (name === 'invitado' || params[0]) ? { name, params } : { name: 'invitado', params: [] };
  return { name: ROUTES[name] && name !== 'invitado' ? name : 'inicio', params };
}
hooks.go = (path) => { location.hash = '#/' + path; };
// Ir a una sección y ejecutar una de sus acciones (lo usa el botón ＋)
hooks.runAction = (route, act, ds = {}, pre) => {
  const mk = () => { const b = document.createElement('button'); Object.assign(b.dataset, ds); return b; };
  const doIt = () => { const V = ROUTES[route]; if (!V?.actions) return; if (pre && V.actions[pre]) V.actions[pre](mk()); setTimeout(() => V.actions[act] && V.actions[act](mk()), pre ? 150 : 0); };
  if (S.route.name === route) doIt(); else { location.hash = '#/' + route; setTimeout(doIt, 380); }
};

function guestShell() {
  $app.innerHTML = `
    ${S.isDemo ? `<div class="demo-banner" data-act="demoInfo">🧪 Modo demo · estás viendo como invitada</div>` : ''}
    <header class="mtop"><a href="#/invitado" class="mtop-me">${avatar(S.me, 'sm')}</a><div class="grow"><div class="brand-name" style="font-size:20px">${esc(APP_NAME)}</div><div class="brand-fam">🎟️ Invitado${S.family?.name ? ' · ' + esc(S.family.name) : ''}</div></div>${syncPill()}</header>
    <div class="shell guest-shell">
      <aside class="sidebar">
        <div class="brand"><span class="brand-logo">🪺</span><div class="grow"><div class="brand-name">${esc(APP_NAME)}</div><div class="brand-fam">🎟️ Invitado${S.family?.name ? ' · ' + esc(S.family.name) : ''}</div></div></div>
        <div class="side-sync">${syncPill()}</div>
        <a class="nav-link" data-r="invitado" href="#/invitado"><span class="ico">🎟️</span>Mis invitaciones</a>
        <div id="guest-nav"></div>
        <div class="nav-sep"></div>
        <a class="nav-link" data-act="guestProfile" href="#/invitado"><span class="ico">${avatar(S.me, 'sm')}</span>Mi perfil</a>
        ${S.myFamilyId ? '<a class="nav-link" data-act="goFamily" href="#/inicio"><span class="ico">🏠</span>Ir a mi familia</a>' : ''}
        <a class="nav-link" data-act="logout" href="#/invitado"><span class="ico">🚪</span>Cerrar sesión</a>
      </aside>
      <main class="main" id="view"></main>
    </div>`;
  paintGuestNav();
}
function paintGuestNav() {
  const box = document.getElementById('guest-nav'); if (!box) return;
  const items = [...S.data.exchanges.map(x => ['intercambio', x, '🎁']), ...S.data.parties.map(x => ['fiesta', x, x.emoji || '🎉'])].sort((a, b) => (a[1].date || '').localeCompare(b[1].date || ''));
  box.innerHTML = items.length ? `<div class="nav-group">Eventos</div>${items.map(([r, x, e]) => `<a class="nav-link ${S.route.name === r && S.route.params[0] === x.id ? 'active' : ''}" href="#/${r}/${x.id}"><span class="ico">${esc(e)}</span><span class="ellipsis">${esc(x.title)}</span></a>`).join('')}` : '';
}

function shell() {
  if (S.guest) return guestShell();
  const nav = NAV.filter(n => !n.adult || ['admin', 'adulto'].includes(S.me?.role));
  $app.innerHTML = `
    ${S.isDemo ? `<div class="demo-banner" data-act="demoInfo">🧪 Modo demo · toca para saber más</div>` : ''}
    <header class="mtop"><a href="#/perfil/${S.me?.id}" class="mtop-me">${avatar(S.me, 'sm')}</a><div class="grow"><div class="brand-name" style="font-size:20px">${esc(APP_NAME)}</div><div class="brand-fam">${esc(S.family?.name || '')}</div></div>${S.isDemo ? '<span class="chip" data-act="demoInfo" style="font-size:11px">🧪 Demo</span>' : ''}${syncPill()}<button class="bell" data-act="search" aria-label="Buscar">${icon('buscar')}</button><button class="bell" data-act="notifs" aria-label="Notificaciones">🔔<span class="notif-badge" style="display:none"></span></button></header>
    <div class="shell">
      <aside class="sidebar">
        <div class="brand"><span class="brand-logo">🪺</span><div class="grow"><div class="brand-name">${esc(APP_NAME)}</div><div class="brand-fam">${esc(S.family?.name || '')}</div></div><button class="bell" data-act="notifs" aria-label="Notificaciones">🔔<span class="notif-badge" style="display:none"></span></button></div>
        <div class="side-actions"><button class="btn primary side-add" data-act="quickAdd">${icon('mas_add')} Agregar</button><button class="bell" data-act="search" aria-label="Buscar" title="Buscar (Ctrl+K)">${icon('buscar')}</button></div>
        <div class="side-sync">${syncPill()}</div>
        ${nav.map(n => n.sep ? `<div class="nav-sep"></div><div class="nav-group">${n.sep}</div>` : `<a class="nav-link" data-r="${n.r}" href="#/${n.r}"><span class="ico">${icon(n.r) || n.ico}</span>${n.t}<b class="tab-badge side" data-tb="${n.r}" hidden></b></a>`).join('')}
        ${(S.guestOf || []).length ? `<div class="nav-sep"></div><a class="nav-link" data-act="goGuest" href="#/inicio"><span class="ico">🎟️</span>Invitaciones de otras familias</a>` : ''}
      </aside>
      <main class="main" id="view"></main>
    </div>
    <nav class="tabbar">${TABS.map(([r, i, t]) => r === '+' ? `<button class="tab tab-add" data-act="quickAdd" aria-label="Agregar"><span class="ico">${icon('mas_add')}</span></button>` : `<a class="tab" data-r="${r}" href="#/${r}"><span class="ico">${icon(r) || i}<b class="tab-badge" data-tb="${r}" hidden></b></span>${t}</a>`).join('')}</nav>
    <button class="sos-fab" data-act="sos" aria-label="Emergencia">SOS</button>`;
}

function updateTabBadges() {
  if (!S.me) return;
  const t = isoDate(today0()), q = quincena();
  const rows = agendaRows().filter(r => r.from === S.me.id && r.due <= q.end);
  const late = rows.some(r => r.due < t);
  let seen = 0; try { seen = +localStorage.getItem('nido-chat-seen') || 0; } catch { }
  seen = Math.max(seen, S.me.chatReadAt || 0);
  const chat = S.route.name === 'chat' ? 0 : S.data.messages.filter(m => m.author !== S.me.id && (m.createdAt || 0) > seen).length + unreadDMs();
  const set = (r, n, cls = '') => document.querySelectorAll(`[data-tb="${r}"]`).forEach(b => { b.hidden = !n; b.textContent = n > 9 ? '9+' : n; b.className = 'tab-badge ' + (b.classList.contains('side') ? 'side ' : '') + cls; });
  set('cuentas', rows.length, late ? 'late' : ''); set('chat', chat);
}
function markNav(name) {
  const groups = { intercambio: 'intercambios', album: 'fotos', libro: 'fotos', perfil: 'familia', avatar: 'familia', receta: 'recetas', viaje: 'viajes', dm: 'chat', mascota: 'mascotas', fiesta: 'fiestas', cuenta: 'cuentas', meta: 'metas' };
  const active = groups[name] || name;
  const inMore = !TABS.some(t => t[0] === active);
  document.querySelectorAll('.nav-link').forEach(a => a.classList.toggle('active', a.dataset.r === active));
  document.querySelectorAll('.tab').forEach(a => a.classList.toggle('active', a.dataset.r === active || (inMore && a.dataset.r === 'mas')));
}

let renderQueued = false, lastRouteKey = '', routeChanged = true;
function render() {
  const view = document.getElementById('view'); if (!view) return;
  const { name, params } = S.route; const V = ROUTES[name];
  // conservar el foco/valor de un campo activo
  const act = document.activeElement; let keep = null;
  if (act && act.id && view.contains(act)) keep = { id: act.id, v: act.value, s: act.selectionStart, e: act.selectionEnd };
  runCleanups();
  pageTheme = V.theme ? V.theme(params) : null;
  refreshTheme();
  try { view.innerHTML = V.render(params); }
  catch (e) { console.error(e); view.innerHTML = `<div class="card empty"><div class="big">😵</div>Algo salió mal al mostrar esta sección.<br><small class="faint">${esc(e.message)}</small></div>`; }
  if (keep) { const el = document.getElementById(keep.id); if (el) { el.value = keep.v; el.focus(); try { el.setSelectionRange(keep.s, keep.e); } catch { } } }
  V.after && V.after(view, params);
  animateView(view, routeChanged); routeChanged = false;
  if (name === 'chat') { try { localStorage.setItem('nido-chat-seen', String(Date.now())); } catch { } }
  if (S.guest) paintGuestNav(); else { updateTabBadges(); notifCenter.updateBadges(); }
  const me = document.querySelector('.mtop-me'); if (me && S.me) me.innerHTML = avatar(S.me, 'sm');
}
hooks.rerender = () => { if (renderQueued) return; renderQueued = true; requestAnimationFrame(() => { renderQueued = false; render(); }); };

function onRoute() {
  if (!S.me) return;
  S.route = parseHash();
  if (S.guest && S.route.name === 'invitado' && !/^#\/invitado/.test(location.hash)) history.replaceState(null, '', '#/invitado');
  const key = S.route.name + '/' + S.route.params.join('/');
  if (key !== lastRouteKey) {
    clearSubs(); lastRouteKey = key; markNav(S.route.name); routeChanged = true;
    if (S.route.name !== 'avatar') resetAvatarDraft();
    const v = document.getElementById('view');
    if (v) { v.classList.remove('view-enter'); void v.offsetWidth; v.classList.add('view-enter'); }
    window.scrollTo({ top: 0 });
  }
  render();
}
addEventListener('hashchange', onRoute);

// ---------------- Delegación de eventos ----------------
const globalActions = {
  sos: () => openSOS(),
  notifs: () => notifCenter.openPanel(),
  demoInfo: () => auth.demoInfo(),
  syncInfo: () => syncInfo(),
  quickAdd: () => openQuickAdd(),
  search: () => openSearch(),
  goGuest: () => { const g = (S.guestOf || [])[0]; if (g) startGuest(g.fid); },
  goFamily: () => { try { sessionStorage.removeItem('nido-mode'); } catch { } if (S.myFamilyId) { S.db.setFamily(S.myFamilyId); location.hash = '#/inicio'; startFamily(); } },
  switchGuest: (el) => startGuest(el.dataset.fid),
  guestProfile: (el, e) => { e?.preventDefault(); guest.editGuestProfile(); },
  invite: (el) => guest.openInvite(el.dataset.col, el.dataset.id),
  inviteImage: async (el) => { const m = await import('./invitecard.js'); m.openInviteImage(el.dataset.col, el.dataset.id); },
  addCal: (el) => { const x = (S.data[el.dataset.col] || []).find(d => d.id === el.dataset.id); if (x) guest.addToCalendar(el.dataset.col, x); },
  remindSent: (el) => guest.markReminder(el)
};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const act = el.dataset.act;
  const V = ROUTES[S.route.name];
  const fn = (V && V.actions && V.actions[act]) || globalActions[act] || auth.actions[act];
  // los links reales (WhatsApp, correo) sí deben abrirse aunque tengan acción
  const realLink = el.tagName === 'A' && /^(https?:|mailto:)/.test(el.getAttribute('href') || '');
  if (fn) { if (!realLink) e.preventDefault(); playFor(act, el); fn(el, e); }
});
document.addEventListener('change', e => {
  const el = e.target.closest('[data-change]'); if (!el) return;
  const V = ROUTES[S.route.name]; const fn = V && V.actions && V.actions[el.dataset.change];
  fn && fn(el, e);
});
document.addEventListener('submit', e => {
  const f = e.target.closest('form[data-submit]'); if (!f) return;
  e.preventDefault();
  const V = ROUTES[S.route.name]; const fn = (V && V.actions && V.actions[f.dataset.submit]) || auth.actions[f.dataset.submit];
  fn && fn(f, e);
});

// ---------------- Datos de la familia ----------------
const COLS = {
  members: {}, events: {}, exchanges: {}, albums: {}, photos: { orderBy: ['createdAt', 'asc'] },
  shopping: {}, chores: {}, expenses: {}, messages: { orderBy: ['createdAt', 'desc'], limit: 150 },
  notes: {}, inventory: {}, backgrounds: {}, rewards: {}, notifications: { orderBy: ['createdAt', 'desc'], limit: 80 },
  recipes: {}, capsules: {}, polls: {}, trips: {}, challenges: {}, locations: {}, pets: {}, parties: {}, wheels: {}, spins: { orderBy: ['at', 'desc'], limit: 60 }, menus: {}, bills: {}, famgoals: {}, docs: {}, hunts: {}, places: {}
};
// Colecciones privadas: families/{fid}/private/{uid}/...
const PRIVATE = { myEvents: 'events', myNotes: 'notes', accounts: 'accounts', txns: 'txns', myCats: 'categories', budgets: 'budgets', goals: 'goals', myDocs: 'docs' };
function stopFamily() { familyUnsub && familyUnsub(); colUnsubs.forEach(u => u()); colUnsubs = []; familyUnsub = null; clearSubs(); }

async function startFamily() {
  stopFamily(); S.guest = false; try { sessionStorage.removeItem('nido-mode'); } catch { }
  let membersLoaded = false, famLoaded = false, started = false;
  const maybeStart = () => {
    if (!membersLoaded || !famLoaded) return;
    S.me = S.data.members.find(m => m.uid === S.user.uid) || null;
    if (!S.me) { auth.claimProfile(); started = false; return; }
    if (!started) { started = true; shell(); paintSync(); initGestures(); setTimeout(maybeOnboard, 1200); setTimeout(() => guest.checkDueReminders(alertLocal), 3500); lastRouteKey = ''; onRoute(); notifCenter.updateBadges(); notifCenter.dailyCheck(); syncLocationSharing(); }
    else hooks.rerender();
  };
  familyUnsub = S.db.watchFamily(f => {
    if (f.denied) { stopFamily(); toast('🔒 Ya no tienes acceso a esa familia'); auth.renderFamilySetup(); return; }
    const prevEff = S.family?.effects;
    S.family = f; famLoaded = true;
    if (f.effects !== prevEff) setIntensity(Number(localStorage_get('nido-effects-local') ?? f.effects ?? 1));
    const bn = document.querySelector('.brand-fam'); if (bn) bn.textContent = f.name || '';
    maybeStart(); refreshTheme();
  });
  for (const [name, opts] of Object.entries(COLS)) {
    colUnsubs.push(S.db.watch(name, opts, rows => {
      if (name === 'messages') { rows = rows.reverse(); onMessages(rows); }
      S.data[name] = rows;
      if (name === 'members') { membersLoaded = true; const had = !!S.me; maybeStart(); if (had) return; return; }
      if (name === 'backgrounds') refreshTheme();
      if (name === 'notifications') notifCenter.onData(rows);
      if (name === 'locations' && S.me) syncLocationSharing();
      if (name === 'bills' && S.me) { clearTimeout(recurT); recurT = setTimeout(() => ensureRecurring().catch(e => console.warn('recurring', e)), 1500); }
      if (started) hooks.rerender();
    }));
  }
  colUnsubs.push(S.db.watch('dms', { where: ['uids', 'array-contains', S.user.uid] }, rows => { S.data.dms = rows; notifCenter.updateBadges(); if (started) hooks.rerender(); }));
  for (const [key, col] of Object.entries(PRIVATE)) {
    colUnsubs.push(S.db.watch(`private/${S.user.uid}/${col}`, {}, rows => { S.data[key] = rows; if (started) hooks.rerender(); }));
  }
}
export async function enterFamily() { await startFamily(); }

// ---------------- 🎟️ Modo invitado ----------------
const EMPTY = () => Object.fromEntries(Object.entries(S.data).map(([k, v]) => [k, Array.isArray(v) ? [] : v]));
function startGuest(fid, focus) {
  stopFamily();
  S.guest = true; S.db.setFamily(fid); S.data = EMPTY();
  try { sessionStorage.setItem('nido-mode', 'guest:' + fid); } catch { }
  const entry = (S.guestOf || []).find(g => g.fid === fid);
  S.family = { id: fid, name: entry?.familyName || '', theme: 'auto' };
  const uid = S.user.uid, prof = guest.savedProfile() || {};
  let got = { x: false, p: false }, started = false; const prev = {};
  const build = () => {
    // Personas visibles: sólo la copia pública que trae cada evento (nombre, emoji, color, avatar)
    const people = new Map();
    for (const d of [...S.data.exchanges, ...S.data.parties]) for (const [id, p] of Object.entries(d.people || {})) people.set(id, { id, ...p });
    S.data.members = [...people.values()];
    const mine = [...S.data.exchanges, ...S.data.parties].map(d => d.guests?.[uid]).find(Boolean) || prof;
    S.me = { ...guestPerson(uid, { name: mine.name || S.user.name, emoji: mine.emoji, color: mine.color }), role: 'invitado' };
    const fn = [...S.data.exchanges, ...S.data.parties].map(d => d.familyName).find(Boolean); if (fn) S.family.name = fn;
  };
  const onRows = (key) => (rows) => {
    // Avisos locales: el sorteo ya se hizo / se reveló
    if (key === 'exchanges') for (const x of rows) { const was = prev[x.id]; prev[x.id] = x.status; if (was && was !== x.status && x.status !== 'open') alertLocal({ icon: x.status === 'revealed' ? '🎊' : '🎲', title: x.status === 'revealed' ? `¡Gran revelación! ${x.title}` : `¡Ya se hizo el sorteo! ${x.title}`, body: x.status === 'revealed' ? 'Entra a ver quién le regaló a quién' : 'Entra y descubre a quién le regalas 🤫', link: 'intercambio/' + x.id }); }
    S.data[key] = rows; got[key === 'exchanges' ? 'x' : 'p'] = true;
    if (!got.x || !got.p) return;
    build();
    if (!started) {
      started = true; shell(); paintSync(); initGestures(); lastRouteKey = '';
      if (focus) location.hash = `#/${guest.KIND[focus.k].route}/${focus.id}`;
      onRoute();
    } else hooks.rerender();
  };
  colUnsubs.push(S.db.watch('exchanges', { where: ['guestUids', 'array-contains', uid] }, onRows('exchanges')));
  colUnsubs.push(S.db.watch('parties', { where: ['guestUids', 'array-contains', uid] }, onRows('parties')));
}
auth.setEnterFamily(enterFamily);

// ---------------- Instalar como app ----------------
addEventListener('beforeinstallprompt', e => { e.preventDefault(); S.installPrompt = e; hooks.rerender(); });
addEventListener('appinstalled', () => { S.installPrompt = null; toast('📲 ¡Nido quedó instalada!'); });

// ---------------- Arranque ----------------
async function boot() {
  initFx(document.getElementById('fx'));
  S.isDemo = isDemo;
  applyTheme(baseTheme());
  try { S.db = await createBackend(); initSync(S.db); }
  catch (e) {
    console.error(e);
    $app.innerHTML = `<div class="auth"><div class="card auth-card"><div class="auth-logo">⚠️</div><h2>No se pudo conectar con Firebase</h2><p class="muted">Revisa <b>js/config.js</b> y tu conexión a internet.</p><p class="faint small">${esc(e.message)}</p></div></div>`;
    return;
  }
  S.db.onAuth(async user => {
    S.user = user; S.me = null;
    if (!user) { stopFamily(); S.family = null; S.guest = false; auth.renderLogin(); return; }
    try {
      const info = await S.db.getUserInfo();
      const fid = info.familyId; S.myFamilyId = fid; S.guestOf = info.guestOf || [];
      const goHome = () => { if (fid) { S.db.setFamily(fid); startFamily(); } else if (S.guestOf.length) startGuest(S.guestOf[0].fid); else auth.renderFamilySetup(); };
      // 🎟️ Llegó con un link de invitación
      const inv = guest.pendingInvite();
      if (inv) {
        if (fid && inv.fid === fid) { guest.clearInvite(); location.hash = `#/${guest.KIND[inv.k].route}/${inv.id}`; S.db.setFamily(fid); await startFamily(); return; }
        guest.renderJoin(inv, { onJoined: (i) => startGuest(i.fid, i), onCancel: goHome });
        return;
      }
      let mode = null; try { mode = sessionStorage.getItem('nido-mode'); } catch { }
      const gf = mode?.startsWith('guest:') ? mode.slice(6) : null;
      if (gf && S.guestOf.some(g => g.fid === gf)) { startGuest(gf); return; }
      goHome();
    } catch (e) { console.error(e); toast('⚠️ ' + e.message); auth.renderFamilySetup(); }
  });
}
boot();
