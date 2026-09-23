// 💬 Chat familiar con avisos fijados y "¡Ya llegué!"
import { S, hooks, member, isAdmin } from '../store.js';
import { esc, avatar, timeAgo, toast } from '../ui.js';

let pinMode = false;
const linkify = (t) => esc(t).replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener" style="text-decoration:underline">$1</a>');

export function getLocation() {
  return new Promise((res) => {
    if (!navigator.geolocation) return res(null);
    navigator.geolocation.getCurrentPosition(p => res({ lat: p.coords.latitude, lng: p.coords.longitude }), () => res(null), { enableHighAccuracy: true, timeout: 10000 });
  });
}
export const mapsLink = (l) => `https://maps.google.com/?q=${l.lat.toFixed(6)},${l.lng.toFixed(6)}`;

export default {
  render() {
    const msgs = S.data.messages;
    const pinned = msgs.filter(m => m.pinned);
    return `
      <div class="page-head"><div><h1>Chat familiar</h1><p>Platicar, avisar y saber que todos llegaron bien</p></div></div>
      <section class="card deco chat">
        ${pinned.map(p => `<div class="pinned">📌 <span class="grow">${linkify(p.text)}</span><span class="tiny muted">${esc(member(p.author)?.name || '')}</span>${p.author === S.me.id || isAdmin() ? `<button class="link tiny" data-act="pin" data-id="${p.id}">Quitar</button>` : ''}</div>`).join('')}
        <div class="chat-msgs" id="msgs">${msgs.map(m => {
          const mine = m.author === S.me.id; const a = member(m.author);
          return `<div class="msg ${mine ? 'me' : ''} ${m.kind === 'checkin' ? 'checkin' : ''}">${mine ? '' : avatar(a, 'sm')}
            <div class="bubble">${mine ? '' : `<div class="who">${esc(a?.name || '?')}</div>`}<div>${m.pinned ? '📌 ' : ''}${linkify(m.text)}</div>
            <div class="when">${timeAgo(m.createdAt)}${mine || isAdmin() ? ` · <button class="link tiny" style="color:inherit" data-act="pin" data-id="${m.id}">${m.pinned ? 'desfijar' : 'fijar'}</button> · <button class="link tiny" style="color:inherit" data-act="del" data-id="${m.id}">borrar</button>` : ''}</div></div></div>`;
        }).join('') || '<div class="empty"><div class="big">💬</div>¡Manda el primer mensaje!</div>'}</div>
        <div class="chips" style="margin:8px 0">
          <button class="chip chip-btn" data-act="checkin" data-t="🏠 Llegué a casa">🏠 Llegué a casa</button>
          <button class="chip chip-btn" data-act="checkin" data-t="💼 Llegué al trabajo">💼 Llegué al trabajo</button>
          <button class="chip chip-btn" data-act="checkin" data-t="🏫 Llegué a la escuela">🏫 Llegué a la escuela</button>
          <button class="chip chip-btn" data-act="checkin" data-t="🚗 Voy en camino" data-loc="1">🚗 Voy en camino</button>
          <button class="chip chip-btn" data-act="checkin" data-t="📍 Aquí estoy" data-loc="1">📍 Compartir ubicación</button>
        </div>
        <form class="chat-input" data-submit="send">
          <button type="button" class="icon-btn" data-act="pinMode" title="Enviar como aviso importante" style="${pinMode ? 'background:var(--accent);color:#fff' : ''}">📌</button>
          <input class="input grow" id="chat-input" name="t" placeholder="${pinMode ? 'Escribe un aviso importante…' : 'Escribe un mensaje…'}" autocomplete="off">
          <button class="btn primary">Enviar</button>
        </form>
      </section>`;
  },
  after(root) { const m = root.querySelector('#msgs'); if (m) m.scrollTop = m.scrollHeight; },
  actions: {
    async send(f) {
      const i = f.querySelector('input'); const text = i.value.trim(); if (!text) return;
      i.value = '';
      await S.db.add('messages', { text, author: S.me.id, pinned: pinMode, createdAt: Date.now() });
      if (pinMode) { pinMode = false; toast('📌 Aviso fijado para todos'); }
      document.getElementById('chat-input')?.focus();
    },
    pinMode() { pinMode = !pinMode; hooks.rerender(); },
    async pin(el) { const m = S.data.messages.find(x => x.id === el.dataset.id); await S.db.update('messages', m.id, { pinned: !m.pinned }); },
    async del(el) { await S.db.remove('messages', el.dataset.id); },
    async checkin(el) {
      let text = el.dataset.t;
      if (el.dataset.loc) { toast('📍 Obteniendo ubicación…'); const l = await getLocation(); if (l) text += ' ' + mapsLink(l); else toast('No se pudo obtener la ubicación'); }
      await S.db.add('messages', { text, author: S.me.id, kind: 'checkin', createdAt: Date.now() });
    }
  }
};
