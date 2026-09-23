// 🔔 Centro de notificaciones: campanita, banners en tiempo real, avisos del sistema y recordatorios del día
import { S, hooks, member } from './store.js';
import { esc, avatar, timeAgo, today0, isoDate, nextBirthday, fmtTime, toast, parseDate } from './ui.js';
import { occurrences } from './events.js';

const bootTime = Date.now();
const shown = new Set();
let panel = null;

const mine = (rows) => rows.filter(n => (n.to === 'all' || (Array.isArray(n.to) && n.to.includes(S.me?.id))) && n.from !== S.me?.id);
const seenAt = () => Math.max(S.me?.notifSeen || 0, Number(lsGet('nido-notif-seen-' + (S.user?.uid || '')) || 0));
function lsGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch { } }

export function unread() { const s = seenAt(); return mine(S.data.notifications).filter(n => n.createdAt > s).length + todayItems().filter(i => !lsGet('nido-today-' + i.key)).length; }

export function updateBadges() {
  const n = unread();
  document.querySelectorAll('.notif-badge').forEach(b => { b.textContent = n > 9 ? '9+' : n; b.style.display = n ? '' : 'none'; });
}

// Llegan notificaciones nuevas (tiempo real)
export function onData(rows) {
  if (!S.me) { setTimeout(() => onData(rows), 800); return; }
  const fresh = mine(rows).filter(n => n.createdAt > bootTime - 5000 && n.createdAt > seenAt() && !shown.has(n.id));
  fresh.forEach(n => { shown.add(n.id); banner(n); systemNotify(n.title, n.body, n.link); });
  mine(rows).forEach(n => shown.add(n.id));
  updateBadges();
  if (panel && panel.isConnected) renderPanel();
}

// Banner dentro de la app
function banner(n) {
  const el = document.createElement('div');
  el.className = 'in-banner' + (n.type === 'urgent' ? ' urgent' : '');
  const who = member(n.from);
  el.innerHTML = `<div class="ib-ico">${who ? avatar(who, 'sm') : ''}<span>${esc(n.icon || '🔔')}</span></div><div class="grow"><div class="bold">${esc(n.title)}</div>${n.body ? `<div class="small muted">${esc(n.body)}</div>` : ''}</div><button class="icon-btn" aria-label="Cerrar">✕</button>`;
  el.onclick = (e) => { if (!e.target.closest('button') && n.link) hooks.go(n.link); el.classList.add('out'); setTimeout(() => el.remove(), 300); };
  document.body.appendChild(el);
  try { navigator.vibrate && navigator.vibrate(n.type === 'urgent' ? [200, 100, 200, 100, 300] : [40, 30, 40]); } catch { }
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, n.type === 'urgent' ? 12000 : 5500);
}

// Notificación del sistema (Android / iPhone con la app instalada)
export async function systemNotify(title, body, link) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if (!document.hidden && document.hasFocus()) return; // si estás viendo la app basta el banner
  const opts = { body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', data: { link: link || '' }, vibrate: [60, 40, 60], tag: 'nido-' + Date.now() };
  try { const reg = await navigator.serviceWorker?.getRegistration(); if (reg) return reg.showNotification(title, opts); } catch { }
  try { new Notification(title, opts); } catch { }
}
export async function askPermission() {
  if (!('Notification' in window)) { toast('Tu navegador no permite notificaciones. En iPhone instala la app primero (Compartir → Agregar a inicio).'); return; }
  const r = await Notification.requestPermission();
  toast(r === 'granted' ? '🔔 ¡Listo! Te avisaremos en tu teléfono' : 'No se activaron las notificaciones');
  if (r === 'granted') systemNotify('🔔 Notificaciones activadas', 'Así te van a llegar los avisos de la familia');
  renderPanel();
}

// Recordatorios calculados del día (no se guardan)
export function todayItems() {
  if (!S.me) return [];
  const t0 = today0(), tIso = isoDate(t0), items = [];
  for (const m of S.data.members) {
    if (m.treeOnly) continue;
    const nb = nextBirthday(m); if (!nb) continue;
    if (nb.days === 0) items.push({ key: `bd-${m.id}-${tIso}`, icon: '🎂', title: m.id === S.me.id ? '¡Feliz cumpleaños! 🥳' : `Hoy cumple ${m.name}`, body: m.id === S.me.id ? 'Toda la familia te celebra' : `${nb.age} años · ¡felicítalo!`, link: 'perfil/' + m.id });
    else if (nb.days === 1) items.push({ key: `bd1-${m.id}-${tIso}`, icon: '🎁', title: `Mañana cumple ${m.name}`, body: '¿Ya tienes su regalo?', link: 'perfil/' + m.id });
  }
  for (const o of occurrences(t0, t0)) {
    if (o.type === 'cumple' && o.pet) { items.push({ key: `pbd-${o.pet.id}-${tIso}`, icon: '🐾', title: `¡Hoy cumple ${o.pet.name}!`, body: `${o.years ? o.years + ' año' + (o.years > 1 ? 's' : '') + ' · ' : ''}dale un premio 🎂`, link: 'mascota/' + o.pet.id }); continue; }
    if (o.party) { items.push({ key: `pty-${o.party.id}-${tIso}`, icon: o.party.emoji || '🎉', title: `¡Hoy es ${o.party.title}!`, body: `${o.time ? fmtTime(o.time) + ' · ' : ''}${o.party.place || ''}`, link: 'fiesta/' + o.party.id }); continue; }
    if (o.pet) { items.push({ key: `pv-${o.pet.id}-${o.title}-${tIso}`, icon: '💉', title: `Hoy: ${o.title}`, body: 'Llévalo al veterinario', link: 'mascota/' + o.pet.id }); continue; }
    if (o.type === 'cumple') continue;
    const ps = o.ev?.participants || [];
    if (o.ev && ps.length && !ps.includes(S.me.id)) continue;
    items.push({ key: `ev-${o.ev?.id || o.exchange?.id}-${tIso}`, icon: o.type === 'intercambio' ? '🎁' : '📅', title: `Hoy: ${o.title}`, body: o.time ? fmtTime(o.time) : 'Todo el día', link: o.exchange ? 'intercambio/' + o.exchange.id : 'agenda' });
  }
  for (const c of S.data.capsules || []) {
    if (c.openAt === tIso && (c.to === 'all' || (c.to || []).includes(S.me.id))) items.push({ key: `cap-${c.id}`, icon: '⏳', title: `¡Hoy se abre una cápsula del tiempo!`, body: c.title, link: 'capsula' });
  }
  for (const p of S.data.pets || []) {
    const f = p.food; if (f && f.bagKg && f.dailyG && f.boughtAt) { const left = Math.round(f.bagKg * 1000 / f.dailyG - (t0 - parseDate(f.boughtAt)) / 864e5); if (left <= 3) items.push({ key: `pf-${p.id}-${f.boughtAt}-${left <= 0 ? 0 : 3}`, icon: '🍖', title: left <= 0 ? `¡Se acabó la comida de ${p.name}!` : `A ${p.name} le quedan ${left} día${left > 1 ? 's' : ''} de comida`, body: 'Agrégala a la lista de compras', link: 'mascota/' + p.id }); }
    const overdue = (p.vaccines || []).filter(v => v.next && v.next < tIso);
    if (overdue.length) items.push({ key: `pvo-${p.id}-${overdue.map(v => v.next).join()}`, icon: '💉', title: `${p.name} tiene ${overdue.length === 1 ? 'una vacuna vencida' : overdue.length + ' vacunas vencidas'}`, body: overdue.map(v => v.name).join(', '), link: 'mascota/' + p.id });
  }
  const chores = S.data.chores.filter(c => c.assignee === S.me.id && !c.done && (c.due || tIso) <= tIso);
  if (chores.length) items.push({ key: `ch-${tIso}-${chores.length}`, icon: '🧹', title: `Tienes ${chores.length} tarea${chores.length > 1 ? 's' : ''} para hoy`, body: chores.map(c => c.title).slice(0, 3).join(', '), link: 'tareas' });
  return items;
}
// Una vez al día, avisa en el teléfono los recordatorios
export function dailyCheck() {
  const k = 'nido-daily-' + isoDate();
  if (lsGet(k)) return; lsSet(k, '1');
  const items = todayItems(); if (!items.length) return;
  setTimeout(() => {
    if (document.hidden) systemNotify(items[0].title, items.length > 1 ? `y ${items.length - 1} aviso(s) más` : items[0].body, items[0].link);
    else banner({ icon: items[0].icon, title: items[0].title, body: items.length > 1 ? `${items[0].body} · y ${items.length - 1} más en 🔔` : items[0].body, link: items[0].link });
  }, 2500);
}

// ---------- Panel ----------
export function openPanel() {
  panel?.remove();
  panel = document.createElement('div'); panel.className = 'notif-bg';
  panel.innerHTML = '<aside class="notif-panel"></aside>';
  panel.addEventListener('click', e => {
    if (e.target === panel || e.target.closest('[data-nclose]')) return closePanel();
    const it = e.target.closest('[data-link]'); if (it) { if (it.dataset.key) lsSet('nido-today-' + it.dataset.key, '1'); closePanel(); hooks.go(it.dataset.link); }
    if (e.target.closest('[data-perm]')) askPermission();
    if (e.target.closest('[data-readall]')) { todayItems().forEach(i => lsSet('nido-today-' + i.key, '1')); markSeen(); renderPanel(); }
  });
  document.body.appendChild(panel); renderPanel();
  const esc_ = e => { if (!panel?.isConnected) return removeEventListener('keydown', esc_); if (e.key === 'Escape') closePanel(); }; addEventListener('keydown', esc_);
  setTimeout(markSeen, 1500);
}
function closePanel() { panel?.classList.add('out'); setTimeout(() => panel?.remove(), 250); markSeen(); }
function markSeen() {
  const now = Date.now(); lsSet('nido-notif-seen-' + (S.user?.uid || ''), String(now));
  if (S.me && (!S.me.notifSeen || now - S.me.notifSeen > 5000)) S.db.update('members', S.me.id, { notifSeen: now }).catch(() => { });
  updateBadges();
}
function renderPanel() {
  const box = panel?.querySelector('.notif-panel'); if (!box) return;
  const s = seenAt(); const list = mine(S.data.notifications).slice(0, 50); const today = todayItems();
  const perm = 'Notification' in window ? Notification.permission : 'unsupported';
  box.innerHTML = `<div class="row between"><h2 style="font-size:22px;font-weight:900">🔔 Notificaciones</h2><div class="row"><button class="link small" data-readall>Marcar leídas</button><button class="icon-btn" data-nclose>✕</button></div></div>
    ${perm !== 'granted' ? `<div class="perm-card"><div class="grow"><div class="bold">📲 Avisos en tu teléfono</div><div class="tiny muted">${perm === 'denied' ? 'Los bloqueaste; actívalos en los ajustes del navegador para este sitio.' : perm === 'unsupported' ? 'En iPhone: instala la app (Compartir → Agregar a inicio) y ábrela desde ahí.' : 'Recibe avisos aunque tengas la app en segundo plano.'}</div></div>${perm === 'default' ? '<button class="btn sm primary" data-perm>Activar</button>' : ''}</div>` : ''}
    ${today.length ? `<div class="nsec">Hoy</div>${today.map(i => `<div class="nitem ${lsGet('nido-today-' + i.key) ? '' : 'unread'}" data-link="${esc(i.link)}" data-key="${esc(i.key)}"><span class="nico">${i.icon}</span><div class="grow"><div class="bold">${esc(i.title)}</div><div class="tiny muted">${esc(i.body || '')}</div></div></div>`).join('')}` : ''}
    <div class="nsec">Actividad de la familia</div>
    ${list.map(n => { const who = member(n.from); return `<div class="nitem ${n.createdAt > s ? 'unread' : ''} ${n.type === 'urgent' ? 'urgent' : ''}" data-link="${esc(n.link || 'inicio')}"><span class="nico">${who ? avatar(who, 'sm') : ''}<i>${esc(n.icon || '🔔')}</i></span><div class="grow"><div class="bold">${esc(n.title)}</div>${n.body ? `<div class="tiny muted">${esc(n.body)}</div>` : ''}<div class="tiny faint">${who ? esc(who.name) + ' · ' : ''}${timeAgo(n.createdAt)}</div></div></div>`; }).join('') || '<div class="empty small">Sin notificaciones todavía</div>'}`;
}
