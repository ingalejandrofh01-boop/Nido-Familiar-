// 💬 Piezas compartidas del chat: reacciones, responder citando, menú del mensaje, gestos y scroll inteligente
import { S, member } from './store.js';
import { esc, avatar, modal, toast } from './ui.js';
import { haptic } from './motion.js';
import { sfx, soundOn } from './reveal.js';

export const QUICK = ['❤️', '😂', '👍', '😮', '😢', '🙏'];
const MORE = ['🔥', '🎉', '😍', '🤣', '👏', '😡', '🥺', '💯', '🤔', '😎', '🙌', '👀', '🫶', '🤗', '😴', '🥳', '💪', '✅'];

const firstName = (id) => id === S.me?.id ? 'Tú' : (member(id)?.name || '?');
const plain = (t) => (t || '').replace(/https?:\/\/\S+/g, '📍').replace(/\s+/g, ' ').trim();

// ---------- Reacciones ----------
export const reactionList = (m) => Object.entries(m.reactions || {}).filter(([, e]) => e);
export function reactionsHtml(m) {
  const r = reactionList(m); if (!r.length) return '';
  const groups = {}; r.forEach(([, e]) => { groups[e] = (groups[e] || 0) + 1; });
  const mine = r.some(([id]) => id === S.me?.id);
  return `<button class="reacts ${mine ? 'mine' : ''}" data-act="reacts" data-id="${m.id}" aria-label="Ver reacciones">${Object.entries(groups).sort((a, b) => b[1] - a[1]).map(([e, n]) => `<span>${e}${n > 1 ? `<b>${n}</b>` : ''}</span>`).join('')}</button>`;
}
// Quién reaccionó con qué (y quitar la tuya)
export function reactionsModal(m, onRemove) {
  const r = reactionList(m);
  modal({
    title: 'Reacciones', body: `<div class="react-tabs">${[...new Set(r.map(([, e]) => e))].map(e => `<span class="chip">${e} ${r.filter(x => x[1] === e).length}</span>`).join('')}</div>
      <div class="list mt">${r.map(([id, e]) => `<div class="item">${avatar(member(id), 'sm')}<div class="grow"><div class="bold">${esc(firstName(id))}</div>${id === S.me.id ? '<button type="button" class="link tiny" data-rm>Toca para quitar tu reacción</button>' : ''}</div><span style="font-size:24px">${e}</span></div>`).join('')}</div>`,
    foot: '<div class="modal-foot"><button type="button" class="btn primary" data-close>Listo</button></div>',
    onOpen: (f, close) => f.querySelector('[data-rm]')?.addEventListener('click', () => { onRemove(); close(); })
  });
}

// ---------- Responder citando ----------
export const makeQuote = (m, authorId) => ({ id: m.id, author: authorId, text: plain(m.text).slice(0, 110) });
export function quoteHtml(q) {
  if (!q) return '';
  const c = member(q.author)?.color || 'var(--accent)';
  return `<button class="quote" data-act="jump" data-id="${esc(q.id)}" style="--qc:${esc(c)}"><b>${esc(firstName(q.author))}</b><span>${esc(q.text)}</span></button>`;
}
export function replyBar(q) {
  if (!q) return '';
  return `<div class="reply-bar" style="--qc:${esc(member(q.author)?.color || 'var(--accent)')}"><span class="rb-ico">↩️</span><div class="grow" style="min-width:0"><div class="tiny bold">Respondiendo a ${esc(q.author === S.me.id ? 'ti' : firstName(q.author))}</div><div class="ellipsis small muted">${esc(q.text)}</div></div><button type="button" class="icon-btn" data-act="cancelReply" aria-label="Cancelar respuesta">✕</button></div>`;
}
export function jumpTo(id) {
  const el = document.querySelector(`[data-mid="${CSS.escape(id)}"]`);
  if (!el) { toast('Ese mensaje ya no está'); return; }
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
}

// ---------- Menú del mensaje (mantener presionado / botón ☺) ----------
let menuEl = null;
export function closeMenu() { if (!menuEl) return; const el = menuEl; menuEl = null; el.classList.add('out'); setTimeout(() => el.remove(), 180); }
addEventListener('hashchange', closeMenu);
addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

export function openMenu(bubble, { m, current, items, onReact }) {
  closeMenu(); haptic([8, 20, 8]);
  const ov = document.createElement('div'); ov.className = 'msg-menu-ov';
  const r = bubble.getBoundingClientRect(), mine = bubble.closest('.msg')?.classList.contains('me');
  ov.innerHTML = `<div class="msg-menu ${mine ? 'right' : ''}" role="menu">
      <div class="mm-react">${QUICK.map(e => `<button data-e="${e}" class="${current === e ? 'on' : ''}" aria-label="Reaccionar ${e}">${e}</button>`).join('')}<button data-more class="mm-plus" aria-label="Más emojis">＋</button></div>
      <div class="mm-more" hidden>${MORE.map(e => `<button data-e="${e}" class="${current === e ? 'on' : ''}">${e}</button>`).join('')}</div>
      <div class="mm-list">${items.map((it, i) => `<button data-i="${i}" class="${it.danger ? 'danger' : ''}"><span>${it.icon}</span>${esc(it.label)}</button>`).join('')}</div>
    </div>`;
  // la burbuja elegida "flota" nítida sobre el fondo borroso
  const ghost = bubble.cloneNode(true); ghost.classList.add('bubble-ghost'); if (mine) ghost.classList.add('me');
  ghost.querySelectorAll('.heart-pop').forEach(x => x.remove());
  Object.assign(ghost.style, { top: r.top + 'px', left: r.left + 'px', width: r.width + 'px' });
  ov.prepend(ghost);
  document.body.appendChild(ov); menuEl = ov;
  const box = ov.querySelector('.msg-menu');
  // Posición: junto a la burbuja, sin salirse de la pantalla (respeta la cámara / Dynamic Island)
  requestAnimationFrame(() => {
    const h = box.offsetHeight, w = box.offsetWidth, vh = innerHeight, vw = innerWidth;
    const safeT = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-t')) || 0;
    let top = r.bottom + 8; if (top + h > vh - 16) top = Math.max(safeT + 12, r.top - h - 8);
    let left = mine ? r.right - w : r.left; left = Math.min(Math.max(12, left), vw - w - 12);
    box.style.top = top + 'px'; box.style.left = left + 'px'; box.classList.add('in');
  });
  // el "clic" que llega al soltar el dedo del toque largo no debe cerrar el menú: sólo cuentan toques que empiezan aquí
  let downHere = false;
  ov.addEventListener('pointerdown', () => { downHere = true; });
  ov.addEventListener('click', e => {
    if (!downHere) return; downHere = false;
    if (e.target === ov) return closeMenu();
    const eb = e.target.closest('[data-e]');
    if (eb) { const emo = eb.dataset.e; closeMenu(); if (soundOn()) try { sfx.pop(); } catch { } haptic(12); onReact(current === emo ? '' : emo); return; }
    if (e.target.closest('[data-more]')) { ov.querySelector('.mm-more').hidden = false; e.target.closest('[data-more]').remove(); return; }
    const ib = e.target.closest('[data-i]'); if (ib) { closeMenu(); items[+ib.dataset.i].run(); }
  });
}
export async function copyText(t) {
  try { await navigator.clipboard.writeText(t); toast('📋 Copiado'); } catch { toast('No se pudo copiar'); }
}

// ---------- Gestos sobre las burbujas ----------
// Mantener presionado → menú · doble toque → ❤️ · deslizar a la derecha → responder · clic derecho → menú
// Los escuchas viven en el documento (una sola vez) para que un redibujo a mitad del gesto no lo pierda
let lastTap = { id: null, t: 0 }, press = null, H = null, bound = false, lastHeart = 0;
const bubOf = (id) => document.querySelector(`[data-mid="${CSS.escape(id)}"] .bubble`);
export function bindBubbles(box, handlers) {
  H = handlers; if (bound) return; bound = true;
  const idOf = (el) => el.closest('[data-mid]')?.dataset.mid;
  document.addEventListener('pointerdown', e => {
    const bub = e.target.closest?.('.chat-msgs .bubble'); if (!bub || !H || e.button || e.target.closest('a, button')) return;
    press = { id: idOf(bub), x0: e.clientX, y0: e.clientY, dx: 0, sw: false, long: false, touch: e.pointerType !== 'mouse' };
    press.timer = setTimeout(() => { if (!press || press.sw) return; press.long = true; const b = bubOf(press.id); if (!b) return; b.classList.add('pressed'); H.menu(press.id, b); setTimeout(() => b.classList.remove('pressed'), 250); }, 430);
  });
  document.addEventListener('pointermove', e => {
    if (!press) return;
    const dx = e.clientX - press.x0, dy = e.clientY - press.y0;
    if (!press.sw && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) clearTimeout(press.timer);
    if (!press.touch) return;
    if (!press.sw) { if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { clearTimeout(press.timer); press = null; return; } if (dx > 12) press.sw = true; else return; }
    press.dx = Math.max(0, Math.min(dx, 90));
    const row = bubOf(press.id)?.closest('.msg'); if (!row) return;
    row.classList.add('swiping'); row.style.setProperty('--sx', press.dx + 'px');
    const armed = press.dx > 60; row.classList.toggle('armed', armed); if (armed !== press.armed) { press.armed = armed; if (armed) haptic(10); }
  });
  const end = (e) => {
    if (!press) return; const p = press; press = null; clearTimeout(p.timer);
    if (p.sw) {
      const row = bubOf(p.id)?.closest('.msg');
      if (row) { row.classList.remove('swiping', 'armed'); row.classList.add('sw-back'); row.style.setProperty('--sx', '0px'); setTimeout(() => { row.classList.remove('sw-back'); row.style.removeProperty('--sx'); }, 220); }
      if (p.dx > 60 && H) H.reply(p.id); return;
    }
    if (p.long || e.type === 'pointercancel' || !p.touch) return;
    const now = Date.now();
    if (lastTap.id === p.id && now - lastTap.t < 350) { lastTap = { id: null, t: 0 }; lastHeart = now; const b = bubOf(p.id); if (b) heartPop(b); H?.heart(p.id); }
    else lastTap = { id: p.id, t: now };
  };
  document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end);
  document.addEventListener('dblclick', e => { const bub = e.target.closest?.('.chat-msgs .bubble'); if (!bub || !H || e.target.closest('a, button')) return; getSelection()?.removeAllRanges(); if (Date.now() - lastHeart < 700) return; lastHeart = Date.now(); heartPop(bub); H.heart(idOf(bub)); });
  document.addEventListener('contextmenu', e => { const bub = e.target.closest?.('.chat-msgs .bubble'); if (!bub || !H) return; e.preventDefault(); if (!bub.classList.contains('pressed') && !menuEl) H.menu(idOf(bub), bub); });
  addEventListener('hashchange', () => { if (!/^#\/(chat|dm)/.test(location.hash)) H = null; });
}
function heartPop(bub) { const h = document.createElement('span'); h.className = 'heart-pop'; h.textContent = '❤️'; bub.appendChild(h); setTimeout(() => h.remove(), 800); haptic([10, 30, 10]); }

// ---------- Scroll: no brincar al fondo cada vez que alguien reacciona ----------
const scrolls = {};
export function keepScroll(box, key, count, lastIsMine) {
  if (!box) return;
  const st = scrolls[key] || (scrolls[key] = { top: 0, stick: true, count: 0, fresh: true });
  const grew = count > st.count;
  if (st.fresh || st.stick || (grew && lastIsMine)) box.scrollTop = box.scrollHeight;
  else {
    box.scrollTop = st.top;
    if (grew) st.pending = true;
    if (st.pending) { const pill = document.createElement('button'); pill.type = 'button'; pill.className = 'new-pill'; pill.textContent = '⬇ Mensajes nuevos'; pill.onclick = () => { box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' }); pill.remove(); }; box.parentElement.style.position = 'relative'; box.after(pill); }
  }
  if (box.scrollTop === box.scrollHeight - box.clientHeight || box.scrollHeight - box.scrollTop - box.clientHeight < 70) st.pending = false;
  st.count = count; st.fresh = false;
  box.addEventListener('scroll', () => { st.top = box.scrollTop; st.stick = box.scrollHeight - box.scrollTop - box.clientHeight < 70; if (st.stick) { st.pending = false; box.parentElement.querySelector('.new-pill')?.remove(); } }, { passive: true });
}
addEventListener('hashchange', () => Object.values(scrolls).forEach(s => { s.fresh = true; s.pending = false; }));
