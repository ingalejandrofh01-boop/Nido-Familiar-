// 💬 Chat familiar con avisos fijados y "¡Ya llegué!"
import { S, hooks, member, members, isAdmin, notify, useSub } from '../store.js';
import { esc, avatar, timeAgo, toast, modal } from '../ui.js';
import { dmList, unreadDMs } from './dm.js';
import { alertLocal } from '../notifications.js';
import { sfx, soundOn } from '../reveal.js';
import { reactionsHtml, reactionsModal, makeQuote, quoteHtml, replyBar, jumpTo, openMenu, copyText, bindBubbles, keepScroll } from '../chatkit.js';

let pinMode = false, ctab = 'familia', replyTo = null;
const linkify = (t) => esc(t).replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener" style="text-decoration:underline">$1</a>');

export function getLocation() {
  return new Promise((res) => {
    if (!navigator.geolocation) return res(null);
    navigator.geolocation.getCurrentPosition(p => res({ lat: p.coords.latitude, lng: p.coords.longitude }), () => res(null), { enableHighAccuracy: true, timeout: 10000 });
  });
}
// ---------- ✓✓ Visto por ----------
// Cada quien guarda en su perfil hasta cuándo leyó el chat (chatReadAt); con eso sabemos quién vio cada mensaje
export const chatReaders = (authorId) => members().filter(m => m.uid && !m.treeOnly && m.id !== authorId);
export const seenBy = (msg) => chatReaders(msg.author).filter(m => (m.chatReadAt || 0) >= (msg.createdAt || 0));
export const chatTab = () => ctab;
export const chatMuted = () => { try { return localStorage.getItem('nido-chat-mute') === '1'; } catch { return false; } };
const ticks = (seen, total) => `<span class="tick ${seen.length && seen.length >= total ? 'all' : ''}">${seen.length ? '✓✓' : '✓'}</span>`;
const names = (arr) => arr.length <= 2 ? arr.map(m => m.name.split(' ')[0]).join(' y ') : arr.slice(0, 2).map(m => m.name.split(' ')[0]).join(', ') + ` y ${arr.length - 2} más`;
let marking = false;
function markRead() {
  if (!S.me || document.hidden || ctab !== 'familia' || S.route.name !== 'chat') return;
  const last = [...S.data.messages].reverse().find(m => m.author !== S.me.id);
  if (!last || (S.me.chatReadAt || 0) >= (last.createdAt || 0) || marking) return;
  marking = true; const now = Date.now(); S.me.chatReadAt = now;
  S.db.update('members', S.me.id, { chatReadAt: now }).catch(() => { }).finally(() => { marking = false; });
}
addEventListener('visibilitychange', () => { if (!document.hidden && S.route?.name?.match(/^(chat|dm)$/)) hooks.rerender(); });

// ---------- "Escribiendo…" ----------
let lastTyping = 0, typingTimer = null;
export function typingPing(write) { const now = Date.now(); if (now - lastTyping < 3500) return; lastTyping = now; write(now); }
export function typingStop(write) { if (!lastTyping) return; lastTyping = 0; write(0); }
export function typingLine(list) {
  const who = list.filter(Boolean);
  clearTimeout(typingTimer); if (who.length) typingTimer = setTimeout(() => hooks.rerender(), 6500);
  return who.length ? `<div class="typing-line"><span class="dots"><i></i><i></i><i></i></span>${esc(names(who))} ${who.length > 1 ? 'están' : 'está'} escribiendo…</div>` : '';
}

// ---------- 🔔 Avisos de mensajes nuevos ----------
const bootAt = Date.now(), alerted = new Set(), prevRx = new Map();
export function onMessages(rows) {
  if (!S.me) return;
  const viewingChat = () => S.route.name === 'chat' && ctab === 'familia' && !document.hidden;
  // Alguien reaccionó a TU mensaje
  for (const m of rows) {
    const now = m.reactions || {}, before = prevRx.get(m.id); prevRx.set(m.id, { ...now });
    if (!before || m.author !== S.me.id) continue;
    for (const [who, e] of Object.entries(now)) {
      if (!e || who === S.me.id || before[who] === e) continue;
      if (viewingChat()) { if (soundOn()) try { sfx.pop(); } catch { } continue; }
      alertLocal({ icon: e, from: who, title: `${member(who)?.name || 'Alguien'} reaccionó ${e}`, body: `a tu mensaje: "${m.text.replace(/https?:\/\/\S+/g, '📍').slice(0, 80)}"`, link: 'chat' });
    }
  }
  const fresh = rows.filter(m => !alerted.has(m.id)); rows.forEach(m => alerted.add(m.id));
  for (const m of fresh) {
    if (m.author === S.me.id || (m.createdAt || 0) < bootAt - 5000 || m.pinned) continue; // los avisos fijados ya mandan su propia notificación
    if (viewingChat()) { if (soundOn()) try { sfx.pop(); } catch { } continue; }
    const toMe = m.replyTo?.author === S.me.id; // si te responden a ti, te avisa aunque hayas silenciado el chat
    if (chatMuted() && !toMe) continue;
    const a = member(m.author);
    alertLocal({ icon: toMe ? '↩️' : m.kind === 'checkin' ? '📍' : '💬', from: m.author, title: toMe ? `${a?.name || 'Alguien'} te respondió` : `${a?.name || 'Alguien'} en el chat familiar`, body: m.text.replace(/https?:\/\/\S+/g, '📍').slice(0, 120), link: 'chat' });
  }
}

export const mapsLink = (l) => `https://maps.google.com/?q=${l.lat.toFixed(6)},${l.lng.toFixed(6)}`;

// ---------- Reacciones y respuestas ----------
function react(id, emoji, toggle) {
  const m = S.data.messages.find(x => x.id === id); if (!m) return;
  const cur = m.reactions?.[S.me.id] || '';
  const val = toggle && cur === emoji ? '' : emoji;
  m.reactions = { ...(m.reactions || {}), [S.me.id]: val }; hooks.rerender();
  S.db.update('messages', id, { ['reactions.' + S.me.id]: val }).catch(() => toast('No se pudo reaccionar'));
}
function startReply(id) {
  const m = S.data.messages.find(x => x.id === id); if (!m) return;
  replyTo = makeQuote(m, m.author); hooks.rerender();
  setTimeout(() => document.getElementById('chat-input')?.focus(), 60);
}
function msgMenu(id, bub) {
  const m = S.data.messages.find(x => x.id === id); if (!m || !bub) return;
  const mine = m.author === S.me.id, can = mine || isAdmin();
  const items = [
    { icon: '↩️', label: 'Responder', run: () => startReply(id) },
    { icon: '📋', label: 'Copiar texto', run: () => copyText(m.text) },
    ...(can ? [{ icon: '📌', label: m.pinned ? 'Quitar de fijados' : 'Fijar como aviso', run: () => S.db.update('messages', id, { pinned: !m.pinned }) }] : []),
    ...(mine ? [{ icon: 'ℹ️', label: '¿Quién lo vio?', run: () => chatView.actions.seen({ dataset: { id } }) }] : []),
    ...(can ? [{ icon: '🗑️', label: 'Borrar', danger: true, run: () => S.db.remove('messages', id) }] : [])
  ];
  openMenu(bub, { m, current: m.reactions?.[S.me.id] || '', items, onReact: (e) => react(id, e) });
}

const chatView = {
  render() {
    const msgs = S.data.messages;
    const pinned = msgs.filter(m => m.pinned);
    const u = unreadDMs();
    const typing = ctab === 'familia' ? (useSub('typing', 'typing') || []) : [];
    // Dónde se quedó leyendo cada quien (cabecitas estilo Messenger)
    const headsAt = {};
    for (const r of chatReaders(S.me.id)) { let k = -1; msgs.forEach((m, i) => { if ((m.createdAt || 0) <= (r.chatReadAt || 0)) k = i; }); if (k >= 0 && k < msgs.length - 0) (headsAt[k] = headsAt[k] || []).push(r); }
    let lastMineIdx = -1; msgs.forEach((m, i) => { if (m.author === S.me.id) lastMineIdx = i; });
    const tabs = `<div class="page-head"><div><h1>Chat</h1><p>${ctab === 'familia' ? 'Platicar, avisar y saber que todos llegaron bien' : 'Conversaciones uno a uno, sólo las ven ustedes dos'}</p></div>
      <button class="btn ghost sm" data-act="mute" title="Avisos de mensajes nuevos del chat familiar">${chatMuted() ? '🔕 Silenciado' : '🔔 Avisos'}</button></div>
      <div class="seg mb"><button class="${ctab === 'familia' ? 'on' : ''}" data-act="ctab" data-t="familia">👨‍👩‍👧‍👦 Familia</button><button class="${ctab === 'privados' ? 'on' : ''}" data-act="ctab" data-t="privados">🔒 Privados${u ? ` <span class="dm-count">${u}</span>` : ''}</button></div>`;
    if (ctab === 'privados') return tabs + `<section class="card deco">${dmList()}</section>`;
    return tabs + `
      <section class="card deco chat">
        ${pinned.map(p => `<div class="pinned">📌 <span class="grow">${linkify(p.text)}</span><span class="tiny muted">${esc(member(p.author)?.name || '')}</span>${p.author === S.me.id || isAdmin() ? `<button class="link tiny" data-act="pin" data-id="${p.id}">Quitar</button>` : ''}</div>`).join('')}
        <div class="chat-msgs" id="msgs">${msgs.map((m, idx) => {
          const mine = m.author === S.me.id; const a = member(m.author);
          const seen = mine ? seenBy(m) : [], total = mine ? chatReaders(m.author).length : 0;
          const heads = (headsAt[idx] || []);
          const isLastMine = mine && idx === lastMineIdx;
          const rx = reactionsHtml(m);
          return `<div class="msg ${mine ? 'me' : ''} ${m.kind === 'checkin' ? 'checkin' : ''} ${rx ? 'has-rx' : ''}" data-mid="${m.id}">${mine ? '' : avatar(a, 'sm')}
            <div class="bubble">${mine ? '' : `<div class="who">${esc(a?.name || '?')}</div>`}${quoteHtml(m.replyTo)}<div>${m.pinned ? '📌 ' : ''}${linkify(m.text)}</div>
            <div class="when">${timeAgo(m.createdAt)}${mine ? ` <button class="tick-btn" data-act="seen" data-id="${m.id}" aria-label="¿Quién lo vio?">${ticks(seen, total)}</button>` : ''}</div>${rx}</div>
            <button class="msg-more" data-act="msgMenu" data-id="${m.id}" aria-label="Reaccionar o responder">☺</button></div>
            ${isLastMine && total ? `<button class="seen-line" data-act="seen" data-id="${m.id}">${seen.length >= total ? '👀 Visto por todos' : seen.length ? `👀 Visto por ${esc(names(seen))}` : '✓ Enviado · nadie lo ha visto aún'}</button>` : ''}
            ${heads.length ? `<div class="read-heads" title="Leyeron hasta aquí">${heads.map(h => `<span title="${esc(h.name)} leyó hasta aquí">${avatar(h, 'xs')}</span>`).join('')}</div>` : ''}`;
        }).join('') || '<div class="empty"><div class="big">💬</div>¡Manda el primer mensaje!</div>'}</div>
        ${typingLine(typing.filter(t => t.id !== S.me.id && t.where === 'familia' && t.at > Date.now() - 6500).map(t => member(t.id)))}
        <div class="chips" style="margin:8px 0">
          <button class="chip chip-btn" data-act="checkin" data-t="🏠 Llegué a casa">🏠 Llegué a casa</button>
          <button class="chip chip-btn" data-act="checkin" data-t="💼 Llegué al trabajo">💼 Llegué al trabajo</button>
          <button class="chip chip-btn" data-act="checkin" data-t="🏫 Llegué a la escuela">🏫 Llegué a la escuela</button>
          <button class="chip chip-btn" data-act="checkin" data-t="🚗 Voy en camino" data-loc="1">🚗 Voy en camino</button>
          <button class="chip chip-btn" data-act="checkin" data-t="📍 Aquí estoy" data-loc="1">📍 Compartir ubicación</button>
        </div>
        ${replyBar(replyTo)}
        <form class="chat-input" data-submit="send">
          <button type="button" class="icon-btn" data-act="pinMode" title="Enviar como aviso importante" style="${pinMode ? 'background:var(--accent);color:#fff' : ''}">📌</button>
          <input class="input grow" id="chat-input" name="t" placeholder="${pinMode ? 'Escribe un aviso importante…' : 'Escribe un mensaje…'}" autocomplete="off">
          <button class="btn primary">Enviar</button>
        </form>
      </section>`;
  },
  after(root) {
    const box = root.querySelector('#msgs'), ms = S.data.messages;
    keepScroll(box, 'familia', ms.length, ms.at(-1)?.author === S.me.id);
    bindBubbles(box, { menu: (id, bub) => msgMenu(id, bub), reply: (id) => startReply(id), heart: (id) => react(id, '❤️', true) });
    markRead();
    const inp = root.querySelector('#chat-input');
    if (inp) inp.addEventListener('input', () => { const w = (at) => S.db.set('typing', S.me.id, { at, where: 'familia' }).catch(() => { }); inp.value.trim() ? typingPing(w) : typingStop(w); });
  },
  actions: {
    async send(f) {
      const i = f.querySelector('input'); const text = i.value.trim(); if (!text) return;
      i.value = '';
      typingStop((at) => S.db.set('typing', S.me.id, { at, where: 'familia' }).catch(() => { }));
      if (soundOn()) try { sfx.send(); } catch { }
      const rt = replyTo; replyTo = null;
      await S.db.add('messages', { text, author: S.me.id, pinned: pinMode, createdAt: Date.now(), ...(rt ? { replyTo: rt } : {}) });
      if (rt) hooks.rerender();
      if (pinMode) { pinMode = false; toast('📌 Aviso fijado para todos'); notify({ icon: '📌', title: `Aviso de ${S.me.name}`, body: text, link: 'chat' }); }
      document.getElementById('chat-input')?.focus();
    },
    pinMode() { pinMode = !pinMode; hooks.rerender(); },
    msgMenu(el) { msgMenu(el.dataset.id, el.closest('.msg').querySelector('.bubble')); },
    reacts(el) { const m = S.data.messages.find(x => x.id === el.dataset.id); if (m) reactionsModal(m, () => react(m.id, '')); },
    jump(el) { jumpTo(el.dataset.id); },
    cancelReply() { replyTo = null; hooks.rerender(); },
    mute() { const on = !chatMuted(); try { localStorage.setItem('nido-chat-mute', on ? '1' : '0'); } catch { } toast(on ? '🔕 Ya no te avisaremos de cada mensaje del chat familiar (los privados y avisos 📌 sí)' : '🔔 Te avisaremos cuando llegue un mensaje'); hooks.rerender(); },
    seen(el) {
      const m = S.data.messages.find(x => x.id === el.dataset.id); if (!m) return;
      const all = chatReaders(m.author), yes = seenBy(m), no = all.filter(x => !yes.includes(x));
      const row = (p, ok) => `<div class="item">${avatar(p, 'sm')}<div class="grow"><div class="bold">${esc(p.name)}</div><div class="tiny muted">${ok ? 'Lo vio · última vez en el chat ' + timeAgo(p.chatReadAt) : p.chatReadAt ? 'Entró al chat ' + timeAgo(p.chatReadAt) : 'Aún no entra al chat'}</div></div><span class="tick ${ok ? 'all' : ''}" style="font-size:15px">${ok ? '✓✓' : '✓'}</span></div>`;
      const kids = members().filter(x => !x.uid && !x.treeOnly && x.id !== m.author);
      modal({ title: 'Info del mensaje', body: `<div class="bubble-prev">${linkify(m.text)}<div class="tiny faint mt">Enviado ${timeAgo(m.createdAt)}</div></div>
        <div class="nav-group mt">👀 Visto por (${yes.length})</div><div class="list">${yes.map(p => row(p, true)).join('') || '<div class="tiny muted">Nadie todavía</div>'}</div>
        ${no.length ? `<div class="nav-group mt">⏳ Aún no lo ven (${no.length})</div><div class="list">${no.map(p => row(p, false)).join('')}</div>` : ''}
        ${kids.length ? `<p class="tiny faint mt">${esc(kids.map(k => k.name).join(', '))} no tienen cuenta propia, por eso no aparecen.</p>` : ''}`, foot: '<div class="modal-foot"><button type="button" class="btn primary" data-close>Listo</button></div>' });
    },
    ctab(el) { ctab = el.dataset.t; hooks.rerender(); },
    async pin(el) { const m = S.data.messages.find(x => x.id === el.dataset.id); await S.db.update('messages', m.id, { pinned: !m.pinned }); },
    async del(el) { await S.db.remove('messages', el.dataset.id); },
    async checkin(el) {
      let text = el.dataset.t;
      if (el.dataset.loc) { toast('📍 Obteniendo ubicación…'); const l = await getLocation(); if (l) text += ' ' + mapsLink(l); else toast('No se pudo obtener la ubicación'); }
      await S.db.add('messages', { text, author: S.me.id, kind: 'checkin', createdAt: Date.now() });
    }
  }
};
export default chatView;
