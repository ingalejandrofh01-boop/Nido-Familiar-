// 🔎 Buscador global: personas, eventos, recetas, notas, fotos, cuentas, metas, compras…
import { S, hooks, members, allEvents, allNotes } from './store.js';
import { esc, avatar, fmtDate } from './ui.js';
import { icon } from './icons.js';
import { cash } from './debts.js';

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
let last = '';

function sources() {
  return [
    ['Personas', members().map(m => ({ t: m.name, s: [m.relation, m.phone].filter(Boolean).join(' · '), ico: avatar(m, 'sm'), go: 'perfil/' + m.id, k: m.name + ' ' + (m.relation || '') }))],
    ['Mascotas', (S.data.pets || []).map(p => ({ t: p.name, s: p.breed || '', e: '🐾', go: 'mascota/' + p.id, k: p.name + ' ' + (p.breed || '') }))],
    ['Eventos', allEvents().map(e => ({ t: e.title, s: fmtDate(e.date) + (e.location ? ' · ' + e.location : ''), e: '📅', go: 'agenda', k: e.title + ' ' + (e.location || '') + ' ' + (e.notes || '') }))],
    ['Fiestas', (S.data.parties || []).map(p => ({ t: p.title, s: fmtDate(p.date) + (p.place ? ' · ' + p.place : ''), e: p.emoji || '🎉', go: 'fiesta/' + p.id, k: p.title + ' ' + (p.place || '') + ' ' + (p.items || []).map(i => i.name).join(' ') }))],
    ['Intercambios', S.data.exchanges.map(x => ({ t: x.title, s: fmtDate(x.date), e: '🎁', go: 'intercambio/' + x.id, k: x.title }))],
    ['Cuentas', (S.data.bills || []).map(b => ({ t: b.title, s: cash(b.total) + ' · ' + fmtDate(b.date), e: '🤝', go: 'cuenta/' + b.id, k: b.title + ' ' + (b.notes || '') }))],
    ['Metas', [...(S.data.famgoals || []), ...(S.data.goals || [])].map(g => ({ t: g.name, s: cash(g.target), e: g.emoji || '🎯', go: 'meta/' + g.id, k: g.name }))],
    ['Recetas', S.data.recipes.map(r => ({ t: r.title, s: r.author ? 'De ' + r.author : '', e: r.emoji || '🍲', go: 'receta/' + r.id, k: r.title + ' ' + (r.author || '') + ' ' + (r.ingredients || []).join(' ') }))],
    ['Notas', allNotes().map(n => ({ t: n.title, s: (n._private ? '🔒 ' : '') + (n.category || ''), e: '📝', go: 'notas', k: n.title + ' ' + (n.hidden ? '' : n.body || '') }))],
    ['¿Dónde está?', S.data.inventory.map(i => ({ t: i.name || i.title, s: i.place || i.location || '', e: '🔎', go: 'donde', k: (i.name || i.title || '') + ' ' + (i.place || i.location || '') }))],
    ['Fotos', S.data.photos.filter(p => p.caption).map(p => ({ t: p.caption, s: S.data.albums.find(a => a.id === p.albumId)?.title || '', img: p.thumb, go: 'album/' + p.albumId, k: p.caption }))],
    ['Compras', S.data.shopping.filter(s => !s.done).map(s => ({ t: s.text, s: s.list || '', e: '🛒', go: 'listas', k: s.text }))],
    ['Tareas', S.data.chores.map(c => ({ t: c.title, s: '', e: '🧹', go: 'tareas', k: c.title }))],
    ['Viajes', (S.data.trips || []).map(t => ({ t: t.title, s: fmtDate(t.start), e: t.emoji || '✈️', go: 'viaje/' + t.id, k: t.title + ' ' + (t.place || '') }))],
    ['Chat', S.data.messages.filter(m => m.text).slice(-150).map(m => ({ t: m.text, s: members().find(x => x.id === m.author)?.name || '', e: '💬', go: 'chat', k: m.text }))]
  ];
}
const SECTIONS = [['Cuentas claras', 'cuentas', '🤝'], ['Metas', 'metas', '🎯'], ['Menú semanal', 'menu', '🍽️'], ['Ruleta', 'ruleta', '🎡'], ['Resumen del año', 'resumen', '🎁'], ['Ajustes', 'ajustes', '⚙️'], ['Familia', 'familia', '👨‍👩‍👧'], ['Árbol genealógico', 'arbol', '🌳'], ['Mascotas', 'mascotas', '🐾'], ['Fiestas', 'fiestas', '🎉'], ['Dinero', 'dinero', '💰'], ['Recetario', 'recetas', '🍲'], ['Retos', 'retos', '🏅'], ['Cápsula del tiempo', 'capsula', '⏳'], ['Encuestas', 'encuestas', '🗳️'], ['Viajes', 'viajes', '✈️'], ['¿Dónde andamos?', 'ubicacion', '📍'], ['Libro familiar', 'fotos', '📖'], ['Compras', 'listas', '🛒'], ['Tareas', 'tareas', '🧹'], ['Notas', 'notas', '📝'], ['Chat', 'chat', '💬'], ['Agenda', 'agenda', '📅'], ['Intercambios', 'intercambios', '🎁']];

export function openSearch() {
  if (document.querySelector('.search-ov')) return;
  const ov = document.createElement('div'); ov.className = 'search-ov';
  ov.innerHTML = `<div class="search-box"><div class="search-bar">${icon('buscar')}<input id="gsearch" type="search" placeholder="Buscar en Nido: personas, recetas, cuentas…" autocomplete="off" enterkeyhint="search" value="${esc(last)}"><button class="icon-btn sm" data-x aria-label="Cerrar">✕</button></div><div class="search-res"></div></div>`;
  document.body.appendChild(ov); document.documentElement.classList.add('modal-open');
  const inp = ov.querySelector('input'), res = ov.querySelector('.search-res');
  const close = () => { ov.classList.add('out'); document.documentElement.classList.remove('modal-open'); setTimeout(() => ov.remove(), 200); removeEventListener('keydown', key); };
  const go = (r) => { close(); hooks.go(r); };
  const paint = () => {
    const q = norm(inp.value.trim()); last = inp.value;
    if (!q) { res.innerHTML = `<div class="sr-h">Ir a…</div><div class="sr-chips">${SECTIONS.slice(0, 12).map(([t, r, e]) => `<button class="chip chip-btn" data-go="${r}">${e} ${t}</button>`).join('')}</div>`; return; }
    const terms = q.split(/\s+/); const hit = (k) => { const n = norm(k); return terms.every(t => n.includes(t)); };
    const secs = SECTIONS.filter(([t]) => hit(t)).map(([t, r, e]) => ({ t, s: 'Sección', e, go: r }));
    const groups = [['Secciones', secs], ...sources().map(([g, rows]) => [g, rows.filter(r => hit(r.k)).slice(0, 6)])].filter(([, r]) => r.length);
    res.innerHTML = groups.length ? groups.map(([g, rows]) => `<div class="sr-h">${g}</div>${rows.map(r => `<button class="sr-i" data-go="${esc(r.go)}">${r.ico || (r.img ? `<i class="sr-img" style="background-image:url('${r.img}')"></i>` : `<span class="sr-e">${r.e || '•'}</span>`)}<span class="grow" style="min-width:0"><b class="ellipsis">${esc(r.t)}</b>${r.s ? `<span class="tiny muted ellipsis">${esc(r.s)}</span>` : ''}</span><span class="muted">›</span></button>`).join('')}`).join('')
      : `<div class="empty"><div class="big">🔍</div>No encontramos “${esc(inp.value)}”</div>`;
  };
  ov.addEventListener('click', e => { if (e.target === ov || e.target.closest('[data-x]')) return close(); const g = e.target.closest('[data-go]'); if (g) go(g.dataset.go); });
  inp.addEventListener('input', paint);
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { const f = res.querySelector('[data-go]'); if (f && inp.value.trim()) go(f.dataset.go); } });
  const key = (e) => { if (e.key === 'Escape') close(); };
  addEventListener('keydown', key);
  paint(); setTimeout(() => { inp.focus(); inp.select(); }, 60);
}
// Atajo: Ctrl/⌘ + K o "/"
addEventListener('keydown', e => {
  if (!S.me) return;
  const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '');
  if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing)) { e.preventDefault(); openSearch(); }
});
