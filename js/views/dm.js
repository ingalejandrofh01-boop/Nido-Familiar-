// 🔒 Mensajes privados uno a uno (Firebase sólo deja leerlos a los dos participantes)
import { S, hooks, member, members, useSub, notify } from '../store.js';
import { esc, avatar, timeAgo, toast } from '../ui.js';

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
    return `<a class="link" href="#/chat">‹ Chat</a>
      <section class="card deco chat mt">
        <div class="row" style="padding-bottom:10px;border-bottom:1px solid var(--card-border)">${avatar(other)}<div class="grow"><div class="bold">${esc(other.name)}</div><div class="tiny muted">🔒 Conversación privada · sólo ustedes dos la ven</div></div></div>
        <div class="chat-msgs" id="msgs">${msgs.map(m => { const me = m.by === S.me.id; return `<div class="msg ${me ? 'me' : ''}">${me ? '' : avatar(other, 'sm')}<div class="bubble"><div>${esc(m.text)}</div><div class="when">${timeAgo(m.at)}${me && t?.readAt?.[mid] >= m.at ? ' · ✓✓' : ''}</div></div></div>`; }).join('') || '<div class="empty"><div class="big">🔒</div>Escribe el primer mensaje</div>'}</div>
        <form class="chat-input" data-submit="sendDm"><input class="input grow" id="dm-input" placeholder="Mensaje privado…" autocomplete="off"><button class="btn primary">Enviar</button></form>
      </section>`;
  },
  after(root, [mid]) {
    const m = root.querySelector('#msgs'); if (m) m.scrollTop = m.scrollHeight;
    const tid = threadId(S.me.id, mid); const t = S.data.dms.find(x => x.id === tid);
    if (t?.last && t.last.by !== S.me.id && (t.readAt?.[S.me.id] || 0) < t.last.at) S.db.update('dms', tid, { ['readAt.' + S.me.id]: Date.now() }).catch(() => { });
  },
  actions: {
    async sendDm(f) {
      const i = f.querySelector('input'); const text = i.value.trim(); if (!text) return; i.value = '';
      const mid = S.route.params[0], other = member(mid), tid = threadId(S.me.id, mid), now = Date.now();
      const exists = S.data.dms.find(x => x.id === tid);
      if (!exists) await S.db.set('dms', tid, { members: [S.me.id, mid].sort(), uids: [S.user.uid, other.uid], last: { text, at: now, by: S.me.id }, readAt: { [S.me.id]: now } });
      await S.db.add(`dms/${tid}/msgs`, { text, by: S.me.id, at: now });
      if (exists) await S.db.update('dms', tid, { last: { text, at: now, by: S.me.id }, ['readAt.' + S.me.id]: now });
      notify({ to: [mid], icon: '🔒', title: `${S.me.name} te mandó un mensaje privado`, body: 'Toca para leerlo', link: 'dm/' + S.me.id });
      document.getElementById('dm-input')?.focus();
    }
  }
};
