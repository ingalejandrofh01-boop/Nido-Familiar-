// 🎉 Organizador de fiestas y posadas: ¿quién trae qué?, confirmaciones y ubicación
import { S, hooks, members, member, notify } from '../store.js';
import { esc, avatar, modal, toast, fmtDate, fmtTime, isoDate, parseDate, today0, daysBetween, relDay, confirmBox } from '../ui.js';
import { startCountdowns } from './home.js';

export const PARTY_TYPES = {
  posada: ['🪅', 'Posada', ['Tamales', 'Ponche', 'Piñata', 'Colación y dulces', 'Velitas', 'Luces de bengala', 'Aguinaldos para los niños', 'Desechables', 'Hielo', 'Refrescos']],
  navidad: ['🎄', 'Cena de Navidad', ['Pierna o pavo', 'Bacalao', 'Romeritos', 'Ensalada de manzana', 'Ponche', 'Pan y bolillos', 'Postre', 'Sidra o vino', 'Hielo']],
  carne: ['🔥', 'Carne asada', ['Carne', 'Carbón', 'Tortillas', 'Salsas', 'Guacamole', 'Cebollitas y nopales', 'Refrescos', 'Hielo', 'Desechables']],
  cumple: ['🎂', 'Cumpleaños', ['Pastel', 'Velas', 'Piñata', 'Bolsitas de dulces', 'Botanas', 'Refrescos', 'Decoración', 'Desechables']],
  comida: ['🍲', 'Comida familiar', ['Plato fuerte', 'Arroz', 'Ensalada', 'Tortillas', 'Postre', 'Agua fresca', 'Desechables']],
  patrias: ['🇲🇽', 'Noche mexicana', ['Pozole', 'Tostadas', 'Crema y queso', 'Rábanos y lechuga', 'Tequila', 'Refrescos', 'Banderitas y adornos', 'Pambazos']],
  otro: ['🎉', 'Otra fiesta', []]
};
const RSVP = { si: ['✅', 'Voy'], quiza: ['🤔', 'Tal vez'], no: ['❌', 'No puedo'] };
const rid = () => Math.random().toString(36).slice(2, 8);
const party = (id) => (S.data.parties || []).find(p => p.id === id);
const mapsUrl = (p) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address || p.place || '')}`;
const wazeUrl = (p) => `https://waze.com/ul?q=${encodeURIComponent(p.address || p.place || '')}&navigate=yes`;
export const partyWhen = (p) => new Date(parseDate(p.date).getTime() + (p.time ? (+p.time.slice(0, 2) * 3600 + +p.time.slice(3) * 60) * 1000 : 0));
export function rsvpCount(p) {
  const r = p.rsvp || {}; let people = 0, yes = 0, maybe = 0, no = 0;
  for (const v of Object.values(r)) { if (v.s === 'si') { yes++; people += Math.max(1, v.n || 1); } else if (v.s === 'quiza') maybe++; else if (v.s === 'no') no++; }
  return { people, yes, maybe, no, pending: members().filter(m => !r[m.id]).length };
}
export const upcomingParties = () => (S.data.parties || []).filter(p => p.date >= isoDate()).sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''));

function partyForm(p = null) {
  const t0 = p?.type || 'posada';
  modal({
    title: p ? '✏️ Editar fiesta' : '🎉 Organizar una fiesta', wide: true,
    body: `<div class="field"><label>¿Qué vamos a celebrar?</label><div class="chips">${Object.entries(PARTY_TYPES).map(([k, [e, l]]) => `<label class="chip chip-btn"><input type="radio" name="type" value="${k}" ${t0 === k ? 'checked' : ''}> ${e} ${l}</label>`).join('')}</div></div>
      <div class="frow"><div class="field"><label>Nombre</label><input class="input" name="title" required value="${esc(p?.title || '')}" placeholder="Posada en casa de la abuela"></div><div class="field" style="max-width:90px"><label>Emoji</label><input class="input" name="emoji" value="${esc(p?.emoji || '')}" maxlength="4" placeholder="🪅"></div></div>
      <div class="frow"><div class="field"><label>Fecha</label><input class="input" type="date" name="date" required value="${esc(p?.date || '')}"></div><div class="field"><label>Hora</label><input class="input" type="time" name="time" value="${esc(p?.time || '')}"></div></div>
      <div class="frow"><div class="field"><label>Lugar</label><input class="input" name="place" value="${esc(p?.place || '')}" placeholder="Casa de la abuela Rosa"></div><div class="field"><label>¿Quién recibe?</label><select class="input" name="host">${members().map(m => `<option value="${m.id}" ${(p?.host || S.me.id) === m.id ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}</select></div></div>
      <div class="field"><label>Dirección (para abrir en Maps)</label><input class="input" name="address" value="${esc(p?.address || '')}" placeholder="Calle, número, colonia, ciudad"></div>
      <div class="field"><label>Tema, vestimenta o notas</label><input class="input" name="notes" value="${esc(p?.notes || '')}" placeholder="Ven con suéter navideño 🎅 · Traer algo para el intercambio"></div>
      ${p ? '' : '<label class="chip chip-btn"><input type="checkbox" name="tpl" checked> Llenar la lista de "¿quién trae qué?" con lo típico</label>'}`,
    danger: p ? { label: 'Borrar', confirm: '¿Borrar esta fiesta?', action: async () => { await S.db.remove('parties', p.id); hooks.go('fiestas'); } } : undefined,
    submit: async d => {
      if (!d.title.trim() || !d.date) { toast('Ponle nombre y fecha'); return false; }
      const [e] = PARTY_TYPES[d.type] || PARTY_TYPES.otro;
      const data = { title: d.title.trim(), type: d.type, emoji: d.emoji || e, date: d.date, time: d.time, place: d.place, address: d.address, host: d.host, notes: d.notes };
      if (p) { await S.db.update('parties', p.id, data); toast('✅ Guardado'); return; }
      const items = d.tpl ? (PARTY_TYPES[d.type] || PARTY_TYPES.otro)[2].map(name => ({ id: rid(), name, qty: '', by: '', done: false })) : [];
      const id = await S.db.add('parties', { ...data, items, rsvp: { [S.me.id]: { s: 'si', n: 1 } }, by: S.me.id });
      notify({ icon: data.emoji, title: `¡Estás invitado! ${data.title}`, body: `${fmtDate(data.date, { weekday: true })}${data.time ? ' · ' + fmtTime(data.time) : ''} · Confirma si vas y qué llevas`, link: 'fiesta/' + id });
      toast('🎉 ¡Fiesta creada! Ya les avisamos a todos'); hooks.go('fiesta/' + id);
    }
  });
}

// ---------------- LISTA ----------------
export const partiesList = {
  render() {
    const up = upcomingParties(), past = (S.data.parties || []).filter(p => p.date < isoDate()).sort((a, b) => b.date.localeCompare(a.date));
    const card = (p, old) => {
      const c = rsvpCount(p), items = p.items || [], cov = items.filter(i => i.by).length, mine = (p.rsvp || {})[S.me.id];
      return `<a class="card deco party-card ${old ? 'old' : ''}" href="#/fiesta/${p.id}">
        <div class="party-emoji">${esc(p.emoji || '🎉')}</div>
        <div class="grow" style="min-width:0"><div class="bold" style="font-size:18px">${esc(p.title)}</div>
          <div class="small muted bold">📅 ${fmtDate(p.date, { weekday: true })}${p.time ? ' · ' + fmtTime(p.time) : ''}${p.place ? ` · 📍 ${esc(p.place)}` : ''}</div>
          <div class="chips mt-s">${!old ? `<span class="chip accent">${relDay(p.date)}</span>` : ''}<span class="chip">👥 ${c.people} van</span>${items.length ? `<span class="chip">🧺 ${cov}/${items.length} cubierto</span>` : ''}${!old && !mine ? '<span class="chip danger">¿Vas? Confirma</span>' : ''}</div></div></a>`;
    };
    return `<div class="page-head"><div><h1>Fiestas y posadas</h1><p>¿Quién va, quién trae qué y dónde es? 🎉</p></div><button class="btn primary" data-act="newParty">＋ Organizar</button></div>
      ${up.length ? `<div class="grid g2">${up.map(p => card(p)).join('')}</div>` : `<div class="card empty"><div class="big">🪅</div><p class="bold">Organiza la posada, la carne asada o la cena de Navidad: cada quien confirma y apunta lo que va a llevar.</p><button class="btn primary" data-act="newParty">Organizar una fiesta</button></div>`}
      ${past.length ? `<div class="nav-group" style="margin:22px 4px 10px">Fiestas pasadas</div><div class="grid g2">${past.slice(0, 6).map(p => card(p, true)).join('')}</div>` : ''}`;
  },
  actions: { newParty() { partyForm(); } }
};

// ---------------- DETALLE ----------------
export const partyDetail = {
  render([id]) {
    const p = party(id);
    if (!p) return `<div class="card empty"><div class="big">🔍</div>No encontramos esta fiesta. <a class="link" href="#/fiestas">Volver</a></div>`;
    const when = partyWhen(p), future = when > Date.now(), c = rsvpCount(p), r = p.rsvp || {}, mine = r[S.me.id] || {};
    const items = p.items || [], cov = items.filter(i => i.by).length;
    const host = member(p.host);
    const group = (k) => members().filter(m => (r[m.id] || {}).s === k);
    const invite = `🎉 ${p.title}\n📅 ${fmtDate(p.date, { weekday: true })}${p.time ? ' · ' + fmtTime(p.time) : ''}${p.place ? `\n📍 ${p.place}` : ''}${p.address ? `\n🗺️ ${mapsUrl(p)}` : ''}${p.notes ? `\n✨ ${p.notes}` : ''}\n\nConfirma y apunta qué llevas en Nido 🪺`;
    return `<a class="link" href="#/fiestas">‹ Fiestas</a>
      <section class="card xhero deco mt">
        <div class="xhero-inner">
          <div class="row between wrap"><span class="chip accent">${esc(p.emoji || '🎉')} ${(PARTY_TYPES[p.type] || PARTY_TYPES.otro)[1]}</span><button class="btn sm" data-act="editParty" data-id="${p.id}">✏️ Editar</button></div>
          <div class="xhero-title mt">${esc(p.title)}</div>
          <div class="row wrap mt small bold" style="gap:14px"><span>📅 ${fmtDate(p.date, { weekday: true })}${p.time ? ' · ' + fmtTime(p.time) : ''}</span>${host ? `<span>🏠 Recibe ${esc(host.name)}</span>` : ''}</div>
          ${p.notes ? `<p class="bold mt">✨ ${esc(p.notes)}</p>` : ''}
          ${future ? `<div class="countdown" data-cd="${when.getTime()}">${['días', 'horas', 'min', 'seg'].map(l => `<div class="cd-box"><b>--</b><span>${l}</span></div>`).join('')}</div>` : daysBetween(today0(), parseDate(p.date)) === 0 ? '<p class="bold mt">🎉 ¡Es hoy!</p>' : ''}
          ${p.place || p.address ? `<div class="place-box mt"><div class="grow" style="min-width:0"><div class="bold">📍 ${esc(p.place || 'Ubicación')}</div>${p.address ? `<div class="small muted">${esc(p.address)}</div>` : ''}</div>
            ${p.address || p.place ? `<div class="row wrap" style="gap:8px"><a class="btn sm primary" href="${mapsUrl(p)}" target="_blank" rel="noopener">🗺️ Maps</a><a class="btn sm" href="${wazeUrl(p)}" target="_blank" rel="noopener">🚗 Waze</a></div>` : ''}</div>` : ''}
          <div class="row wrap mt" style="gap:8px"><a class="btn sm" href="https://wa.me/?text=${encodeURIComponent(invite)}" target="_blank" rel="noopener">💬 Invitar por WhatsApp</a></div>
        </div>
      </section>

      <div class="grid g2 mt">
        <section class="card deco"><div class="card-title"><h3>🙋 ¿Vas?</h3><span class="chip accent">👥 ${c.people} persona${c.people === 1 ? '' : 's'}</span></div>
          <div class="rsvp-btns">${Object.entries(RSVP).map(([k, [e, l]]) => `<button class="btn ${mine.s === k ? 'primary' : ''}" data-act="rsvp" data-id="${p.id}" data-s="${k}">${e} ${l}</button>`).join('')}</div>
          ${mine.s === 'si' ? `<div class="row mt" style="justify-content:center;gap:10px"><span class="small bold">¿Cuántos van contigo (contándote)?</span><div class="stepper"><button class="icon-btn" data-act="rsvpN" data-id="${p.id}" data-d="-1">−</button><b>${mine.n || 1}</b><button class="icon-btn" data-act="rsvpN" data-id="${p.id}" data-d="1">＋</button></div></div>` : ''}
          <div class="col mt" style="gap:10px">${Object.entries(RSVP).map(([k, [e, l]]) => { const g = group(k); return g.length ? `<div><div class="tiny bold muted mb">${e} ${l} (${g.length})</div><div class="row wrap" style="gap:8px">${g.map(m => `<span class="rsvp-p">${avatar(m, 'sm')}<span class="small bold">${esc(m.name.split(' ')[0])}${k === 'si' && (r[m.id].n || 1) > 1 ? ` +${r[m.id].n - 1}` : ''}</span></span>`).join('')}</div></div>` : ''; }).join('')}
            ${c.pending ? `<div><div class="tiny bold muted mb">⏳ Sin contestar (${c.pending})</div><div class="row wrap" style="gap:6px">${members().filter(m => !r[m.id]).map(m => avatar(m, 'sm')).join('')}</div>${S.me.id === p.by || S.me.id === p.host ? `<button class="link tiny mt-s" data-act="remind" data-id="${p.id}">📣 Recordarles que confirmen</button>` : ''}</div>` : ''}</div>
        </section>

        <section class="card deco"><div class="card-title"><h3>🧺 ¿Quién trae qué?</h3><span class="chip ${cov === items.length && items.length ? 'accent' : ''}">${cov}/${items.length}</span></div>
          ${items.length ? `<div class="progress" style="height:8px;margin-bottom:12px"><i style="width:${items.length ? cov / items.length * 100 : 0}%"></i></div>` : ''}
          <div class="list">${items.map(i => { const who = member(i.by), me = i.by === S.me.id; return `<div class="item bring ${i.by ? 'taken' : ''}">
            <span class="emoji">${i.by ? (i.done ? '✅' : '🙋') : '⬜'}</span>
            <div class="grow" style="min-width:0"><div class="bold small">${esc(i.name)}${i.qty ? ` <span class="muted">· ${esc(i.qty)}</span>` : ''}</div>${who ? `<div class="tiny muted">${me ? 'Tú lo llevas' : 'Lo lleva ' + esc(who.name)}${i.done ? ' · ya lo tiene 👍' : ''}</div>` : ''}</div>
            ${!i.by ? `<button class="btn sm" data-act="bring" data-id="${p.id}" data-i="${i.id}">🙋 Yo lo llevo</button>` : me ? `<button class="btn sm ${i.done ? 'primary' : 'ghost'}" data-act="bringDone" data-id="${p.id}" data-i="${i.id}" title="Ya lo tengo">${i.done ? '✅' : '🛍️'}</button><button class="link tiny" data-act="unbring" data-id="${p.id}" data-i="${i.id}">Soltar</button>` : avatar(who, 'sm')}
            <button class="link tiny faint" data-act="delItem" data-id="${p.id}" data-i="${i.id}" aria-label="Quitar">✕</button></div>`; }).join('') || '<div class="empty small">Agrega lo que hace falta y cada quien se apunta</div>'}</div>
          <form class="row mt" data-submit="addItem" data-id="${p.id}"><input class="input grow" id="bring-in" placeholder="Agregar: tostadas, hielo…" autocomplete="off"><input class="input" id="bring-qty" placeholder="Cant." style="max-width:80px"><button class="btn primary">＋</button></form>
          ${items.some(i => i.by === S.me.id && !i.done) ? `<button class="btn sm block mt" data-act="bringShop" data-id="${p.id}">🛒 Pasar lo que llevo a mi lista de compras</button>` : ''}
        </section>
      </div>`;
  },
  after(root) { startCountdowns(root); },
  actions: {
    editParty(el) { partyForm(party(el.dataset.id)); },
    async rsvp(el) {
      const p = party(el.dataset.id), cur = (p.rsvp || {})[S.me.id] || {};
      await S.db.update('parties', p.id, { [`rsvp.${S.me.id}`]: { s: el.dataset.s, n: cur.n || 1 } });
      if (el.dataset.s === 'si') { const r = el.getBoundingClientRect(); hooks.celebrate(r.left + r.width / 2, r.top, 'confetti'); }
      if (p.host && p.host !== S.me.id) notify({ to: [p.host], icon: RSVP[el.dataset.s][0], title: `${S.me.name}: ${RSVP[el.dataset.s][1]} a ${p.title}`, link: 'fiesta/' + p.id });
    },
    async rsvpN(el) { const p = party(el.dataset.id), cur = (p.rsvp || {})[S.me.id] || { s: 'si', n: 1 }; const n = Math.max(1, Math.min(30, (cur.n || 1) + +el.dataset.d)); await S.db.update('parties', p.id, { [`rsvp.${S.me.id}`]: { ...cur, n } }); },
    async remind(el) { const p = party(el.dataset.id); const pend = members().filter(m => !(p.rsvp || {})[m.id]).map(m => m.id); notify({ to: pend, icon: '📣', title: `¿Vas a ${p.title}?`, body: 'Confirma y apunta qué vas a llevar', link: 'fiesta/' + p.id }); toast(`📣 Les recordamos a ${pend.length}`); },
    async addItem(f) {
      const p = party(f.dataset.id), i = f.querySelector('#bring-in'), q = f.querySelector('#bring-qty'); const name = i.value.trim(); if (!name) return;
      await S.db.update('parties', p.id, { items: [...(p.items || []), { id: rid(), name, qty: q.value.trim(), by: '', done: false }] }); i.value = ''; q.value = '';
    },
    async bring(el) { await setItem(el, { by: S.me.id, done: false }); try { navigator.vibrate && navigator.vibrate(25); } catch { } toast('🙋 ¡Apuntado! Gracias'); },
    async unbring(el) { await setItem(el, { by: '', done: false }); },
    async bringDone(el) { const p = party(el.dataset.id), it = (p.items || []).find(x => x.id === el.dataset.i); await setItem(el, { done: !it.done }); },
    async delItem(el) { if (!(await confirmBox('¿Quitar este artículo de la lista?', 'Quitar'))) return; const p = party(el.dataset.id); await S.db.update('parties', p.id, { items: (p.items || []).filter(x => x.id !== el.dataset.i) }); },
    async bringShop(el) {
      const p = party(el.dataset.id); const mine = (p.items || []).filter(i => i.by === S.me.id && !i.done);
      const have = new Set(S.data.shopping.filter(s => !s.done).map(s => s.text.toLowerCase()));
      let n = 0; for (const i of mine) { const text = `${i.name}${i.qty ? ' (' + i.qty + ')' : ''} · ${p.title}`; if (have.has(text.toLowerCase())) continue; await S.db.add('shopping', { text, list: 'Súper', done: false, by: S.me.id, from: p.title }); n++; }
      toast(n ? `🛒 ${n} cosa${n > 1 ? 's' : ''} en tu lista de compras` : 'Ya estaban en la lista 👍');
    }
  }
};
async function setItem(el, patch) {
  const p = party(el.dataset.id);
  await S.db.update('parties', p.id, { items: (p.items || []).map(x => x.id === el.dataset.i ? { ...x, ...patch } : x) });
}
