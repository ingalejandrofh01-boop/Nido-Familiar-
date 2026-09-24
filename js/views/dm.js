// 🔒 Mensajes privados uno a uno (Firebase sólo deja leerlos a los dos participantes)
import { S, hooks, member, members, useSub, notify } from '../store.js';
import { esc, avatar, timeAgo, toast } from '../ui.js';
import { typingPing, typingStop, typingLine } from './chat.js';
import { sfx, soundOn } from '../reveal.js';
import { reactionsHtml, reactionsModal, makeQuote, quoteHtml, replyBar, jumpTo, openMenu, copyText, bindBubbles, keepScroll } from '../chatkit.js';

let replyTo = null, replyTid = null, lastMsgs = [];
const curTid = () => threadId(S.me.id, S.route.params[0]);
function react(id, emoji, toggle) {
  const m = lastMsgs.find(x => x.id === id); if (!m) return;
  const cur = m.reactions?.[S.me.id] || '', val = toggle && cur === emoji ? '' : emoji, tid = curTid(), mid = S.route.params[0];
  m.reactions = { ...(m.reactions || {}), [S.me.id]: val }; hooks.rerender();
  S.db.update(`dms/${tid}/msgs`, id, { ['reactions.' + S.me.id]: val }).catch(() => toast('No se pudo reaccionar'));
  // aviso sin contenido: las notificaciones las puede leer la familia, lo privado se queda en el chat
  if (val && m.by !== S.me.id) notify({ to: [mid], icon: val, title: `${S.me.name} reaccionó ${val} a tu mensaje privado`, body: 'Toca para verlo', link: 'dm/' + S.me.id });
}
function startReply(id) {
  const m = lastMsgs.find(x => x.id === id); if (!m) return;
  replyTo = makeQuote(m, m.by); replyTid = curTid(); hooks.rerender();
  setTimeout(() => document.getElementById('dm-input')?.focus(), 60);
}
function msgMenu(id, bub) {
  const m = lastMsgs.find(x => x.id === id); if (!m || !bub) return;
  const items = [
    { icon: '↩️', label: 'Responder', run: () => startReply(id) },
    { icon: '📋', label: 'Copiar texto', run: () => copyText(m.text) },
    ...(m.by === S.me.id ? [{ icon: '🗑️', label: 'Borrar', danger: true, run: () => S.db.remove(`dms/${curTid()}/msgs`, id) }] : [])
  ];
  openMenu(bub, { m, current: m.reactions?.[S.me.id] || '', items, onReact: (e) => react(id, e) });
}

export const threadId = (a, b) => [a, b].sort().join('_');
export const unreadDMs = () => S.data.dms.filter(t => t.last && t.last.by !== S.me?.id && (t.readAt?.[S.me?.id] || 0) < t.last.at).length;

export function dmList() {
  const people = members().filter(m => m.uid && m.id !== S.me.id);
  const th = (m) => S.data.dms.find(t => t.id === threadId(S.me.id, m.id));
  const sorted = people.sort((a, b) => (th(b)?.last?.at || 0) - (th(a)?.last?.at || 0));
  return `<div class="list">${sorted.map(m => { const t = th(m); const unread = t?.last && t.last.by !== S.me.id && (t.readAt?.[S.me.id] || 0) < t.last.at;
    return `<a class="item clickable" href="#/dm/${m.id}" style="text-decoration:none">${avatar(m)}<div class="grow"><div class="bold">${esc(m.name)}</div><div class="tiny muted ellipsis">${t?.last ? (t.last.by === S.me.id ? 'Tú: ' : '') + esc(t.last.text) : 'Empieza una conversación privada'}</div></div>
      <div class="col" style="align-items:flex-end;gap:4px"><span class="tiny faint">${t?.last ? timeAgo(t.last.at) : ''}</span>${unread ? '<span class="dm-dot"></span>' : ''}</div></a>`; }).join('') || '<div class="empty small">Cuando tu familia entre con su cuenta, aquí podrán platicar en privado 🔒</div>'}</div>`;
}

export default {
  render([mid]) {
    const other = member(mid);
    if (!other || !other.uid) return `<div class="card empty">Esta persona aún no tiene cuenta. <a class="link" href="#/chat">Volver</a></div>`;
    const tid = threadId(S.me.id, mid);
    const msgs = useSub('dm-' + tid, `dms/${tid}/msgs`, { orderBy: ['at', 'asc'], limit: 300 }) || [];
    const t = S.data.dms.find(x => x.id === tid);
    lastMsgs = msgs; const rq = replyTid === tid ? replyTo : null;
    return `<a class="link" href="#/chat">‹ Chat</a>
      <section class="card deco chat mt">
        <div class="row" style="padding-bottom:10px;border-bottom:1px solid var(--card-border)">${avatar(other)}<div class="grow"><div class="bold">${esc(other.name)}</div><div class="tiny muted">${(t?.typing?.[mid] || 0) > Date.now() - 6500 ? '<span style="color:var(--accent)">escribiendo…</span>' : t?.readAt?.[mid] ? 'Activo en el chat ' + timeAgo(t.readAt[mid]) + ' · 🔒 privado' : '🔒 Conversación privada · sólo ustedes dos la ven'}</div></div></div>
        <div class="chat-msgs" id="msgs">${msgs.map((m, i) => { const me = m.by === S.me.id, read = (t?.readAt?.[mid] || 0) >= m.at;
          const lastMine = me && !msgs.slice(i + 1).some(x => x.by === S.me.id);
          const rx = reactionsHtml(m);
          return `<div class="msg ${me ? 'me' : ''} ${rx ? 'has-rx' : ''}" data-mid="${m.id}">${me ? '' : avatar(other, 'sm')}<div class="bubble">${quoteHtml(m.replyTo)}<div>${esc(m.text)}</div><div class="when">${timeAgo(m.at)}${me ? ` <span class="tick ${read ? 'all' : ''}">${read ? '✓✓' : '✓'}</span>` : ''}</div>${rx}</div><button class="msg-more" data-act="msgMenu" data-id="${m.id}" aria-label="Reaccionar o responder">☺</button></div>
            ${lastMine ? `<div class="seen-line static">${read ? `👀 Visto ${timeAgo(t.readAt[mid])}` : '✓ Enviado'}</div>` : ''}`; }).join('') || '<div class="empty"><div class="big">🔒</div>Escribe el primer mensaje</div>'}</div>
        ${typingLine((t?.typing?.[mid] || 0) > Date.now() - 6500 ? [other] : [])}
        ${replyBar(rq)}
        <form class="chat-input" data-submit="sendDm"><input class="input grow" id="dm-input" placeholder="Mensaje privado…" autocomplete="off"><button class="btn primary">Enviar</button></form>
      </section>`;
  },
  after(root, [mid]) {
    const tid = threadId(S.me.id, mid);
    const box = root.querySelector('#msgs');
    keepScroll(box, 'dm-' + tid, lastMsgs.length, lastMsgs.at(-1)?.by === S.me.id);
    bindBubbles(box, { menu: msgMenu, reply: startReply, heart: (id) => react(id, '❤️', true) }); const t = S.data.dms.find(x => x.id === tid);
    if (!document.hidden && t?.last && t.last.by !== S.me.id && (t.readAt?.[S.me.id] || 0) < t.last.at) { t.readAt = { ...(t.readAt || {}), [S.me.id]: Date.now() }; S.db.update('dms', tid, { ['readAt.' + S.me.id]: Date.now() }).catch(() => { }); }
    const inp = root.querySelector('#dm-input');
    if (inp && t) inp.addEventListener('input', () => { const w = (at) => S.db.update('dms', tid, { ['typing.' + S.me.id]: at }).catch(() => { }); inp.value.trim() ? typingPing(w) : typingStop(w); });
  },
  actions: {
    msgMenu(el) { msgMenu(el.dataset.id, el.closest('.msg').querySelector('.bubble')); },
    reacts(el) { const m = lastMsgs.find(x => x.id === el.dataset.id); if (m) reactionsModal(m, () => react(m.id, '')); },
    jump(el) { jumpTo(el.dataset.id); },
    cancelReply() { replyTo = null; hooks.rerender(); },
    async sendDm(f) {
      const i = f.querySelector('input'); const text = i.value.trim(); if (!text) return; i.value = '';
      const mid = S.route.params[0], other = member(mid), tid = threadId(S.me.id, mid), now = Date.now();
      const exists = S.data.dms.find(x => x.id === tid);
      if (soundOn()) try { sfx.send(); } catch { }
      if (!exists) await S.db.set('dms', tid, { members: [S.me.id, mid].sort(), uids: [S.user.uid, other.uid], last: { text, at: now, by: S.me.id }, readAt: { [S.me.id]: now } });
      const rt = replyTid === tid ? replyTo : null; replyTo = null; replyTid = null;
      await S.db.add(`dms/${tid}/msgs`, { text, by: S.me.id, at: now, ...(rt ? { replyTo: rt } : {}) });
      if (rt) hooks.rerender();
      if (exists) { typingStop(() => { }); await S.db.update('dms', tid, { last: { text, at: now, by: S.me.id }, ['readAt.' + S.me.id]: now, ['typing.' + S.me.id]: 0 }); }
      notify({ to: [mid], icon: '🔒', title: `🔒 ${S.me.name} te mandó un mensaje privado`, body: 'Toca para leerlo', link: 'dm/' + S.me.id });
      document.getElementById('dm-input')?.focus();
    }
  }
};
