// ✈️ Planeador de viajes: itinerario, maleta, gastos compartidos y notas
import { S, hooks, members, member, notify } from '../store.js';
import { esc, avatar, modal, toast, fmtDate, fmtShort, fmtTime, isoDate, parseDate, today0, daysBetween, memberPicker, money, confirmBox } from '../ui.js';
import { startCountdowns } from './home.js';

const rid = () => Math.random().toString(36).slice(2, 9);
const PACK_BASE = ['Identificación / pasaporte', 'Cargadores', 'Medicinas', 'Cepillo de dientes', 'Ropa cómoda', 'Traje de baño', 'Bloqueador', 'Lentes de sol', 'Chamarra', 'Snacks para el camino'];
let tab = 'itinerario';

function tripForm(t = null) {
  modal({
    title: t ? 'Editar viaje' : '✈️ Nuevo viaje',
    body: `<div class="frow"><div class="field"><label>Nombre del viaje</label><input class="input" name="title" required value="${esc(t?.title || '')}" placeholder="Vacaciones en Oaxaca"></div>
      <div class="field"><label>Emoji</label><input class="input" name="emoji" value="${esc(t?.emoji || '✈️')}" maxlength="4"></div></div>
      <div class="field"><label>Destino</label><input class="input" name="destination" value="${esc(t?.destination || '')}" placeholder="Oaxaca, México"></div>
      <div class="frow"><div class="field"><label>Salida</label><input class="input" type="date" name="start" required value="${esc(t?.start || '')}"></div><div class="field"><label>Regreso</label><input class="input" type="date" name="end" required value="${esc(t?.end || '')}"></div></div>
      <div class="field"><label>Presupuesto total ($, opcional)</label><input class="input" type="number" name="budget" value="${t?.budget ?? ''}"></div>
      <div class="field"><label>¿Quiénes van?</label>${memberPicker('members', members(), t?.members || members().map(m => m.id))}</div>`,
    submit: async d => {
      if (!d.title.trim() || !d.start || !d.end) return false;
      if (d.end < d.start) { toast('El regreso debe ser después de la salida'); return false; }
      const data = { title: d.title.trim(), emoji: d.emoji || '✈️', destination: d.destination, start: d.start, end: d.end, budget: Number(d.budget) || 0, members: d.members || [] };
      const ev = { title: `${data.emoji} ${data.title}`, date: data.start, endDate: data.end, type: 'viaje', participants: data.members, location: data.destination };
      if (t) { await S.db.update('trips', t.id, data); if (t.eventId) await S.db.update('events', t.eventId, ev).catch(() => { }); }
      else {
        const eventId = await S.db.add('events', ev);
        const id = await S.db.add('trips', { ...data, eventId, itinerary: [], packing: PACK_BASE.map(text => ({ id: rid(), text, who: '', done: false })), costs: [], notes: '', createdBy: S.me.id });
        notify({ to: data.members, icon: data.emoji, title: `¡Nos vamos de viaje! ${data.title}`, body: `${fmtDate(data.start)} al ${fmtDate(data.end)} · ya está en la agenda`, link: 'viaje/' + id });
        hooks.go('viaje/' + id);
      }
      toast('✈️ Viaje guardado');
    },
    danger: t ? { label: '🗑️', confirm: '¿Eliminar este viaje?', action: async () => { if (t.eventId) await S.db.remove('events', t.eventId).catch(() => { }); await S.db.remove('trips', t.id); hooks.go('viajes'); } } : null
  });
}

export const tripsList = {
  render() {
    const t0 = isoDate(today0());
    const list = [...S.data.trips].sort((a, b) => (a.end < t0) - (b.end < t0) || a.start.localeCompare(b.start));
    return `<div class="page-head"><div><h1>Viajes</h1><p>Planeen juntos: itinerario, maleta y gastos 🧳</p></div><button class="btn primary" data-act="new">＋ Nuevo viaje</button></div>
      ${list.length ? `<div class="grid auto">${list.map(t => { const days = daysBetween(today0(), parseDate(t.start)); const past = t.end < t0, now = t.start <= t0 && t.end >= t0;
        const packed = (t.packing || []).filter(p => p.done).length;
        return `<a class="card deco trip-card" href="#/viaje/${t.id}" style="text-decoration:none"><div class="trip-emoji">${esc(t.emoji || '✈️')}</div>
          <div class="bold" style="font-size:18px">${esc(t.title)}</div><div class="small muted">📍 ${esc(t.destination || '')}</div>
          <div class="small bold mt-s">${fmtShort(t.start)} → ${fmtShort(t.end)}</div>
          <div class="row between mt"><div class="avatars">${(t.members || []).map(member).filter(Boolean).slice(0, 6).map(m => avatar(m, 'sm')).join('')}</div>
          <span class="chip ${past ? '' : 'accent'}">${past ? '✔️ Recuerdo' : now ? '🌴 ¡En curso!' : `⏳ ${days} días`}</span></div>
          <div class="tiny muted mt-s">🧳 ${packed}/${(t.packing || []).length} empacado · 🗓️ ${(t.itinerary || []).length} actividades</div></a>`; }).join('')}</div>`
        : `<div class="card empty"><div class="big">🧳</div><p class="bold">¿Cuál es el próximo destino de la familia?</p><button class="btn primary" data-act="new">Planear un viaje</button></div>`}`;
  },
  actions: { new() { tripForm(); } }
};

function tripDays(t) { const out = []; for (let d = parseDate(t.start); d <= parseDate(t.end); d.setDate(d.getDate() + 1)) out.push(isoDate(d)); return out; }
function costBalances(t) {
  const net = {};
  for (const c of t.costs || []) { const sp = (c.split && c.split.length) ? c.split : t.members; const share = c.amount / sp.length; net[c.paidBy] = (net[c.paidBy] || 0) + c.amount; sp.forEach(id => net[id] = (net[id] || 0) - share); }
  const cred = Object.entries(net).filter(([, v]) => v > .5).map(([id, v]) => ({ id, v })), debt = Object.entries(net).filter(([, v]) => v < -.5).map(([id, v]) => ({ id, v: -v }));
  const out = []; let i = 0, j = 0;
  while (i < debt.length && j < cred.length) { const x = Math.min(debt[i].v, cred[j].v); out.push({ from: debt[i].id, to: cred[j].id, amount: Math.round(x) }); debt[i].v -= x; cred[j].v -= x; if (debt[i].v < .5) i++; if (cred[j].v < .5) j++; }
  return out;
}

export const tripDetail = {
  render([id]) {
    const t = S.data.trips.find(x => x.id === id);
    if (!t) return `<div class="card empty">Viaje no encontrado. <a class="link" href="#/viajes">Volver</a></div>`;
    const future = parseDate(t.start) > today0();
    const spent = (t.costs || []).reduce((a, c) => a + Number(c.amount || 0), 0);
    let body = '';
    if (tab === 'itinerario') {
      body = tripDays(t).map((d, i) => { const acts = (t.itinerary || []).filter(a => a.day === d).sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
        return `<div class="it-day"><div class="it-head"><b>Día ${i + 1}</b><span class="muted small">${fmtDate(d, { weekday: true })}</span><button class="link small" data-act="addAct" data-d="${d}" style="margin-left:auto">＋ Actividad</button></div>
          ${acts.map(a => `<div class="it-item"><span class="it-time">${a.time ? fmtTime(a.time) : '—'}</span><div class="grow"><div class="bold">${esc(a.text)}</div>${a.place ? `<a class="tiny link" target="_blank" rel="noopener" href="https://maps.google.com/?q=${encodeURIComponent(a.place)}">📍 ${esc(a.place)}</a>` : ''}</div><button class="link tiny" data-act="delAct" data-a="${a.id}">✕</button></div>`).join('') || '<div class="tiny muted" style="padding:6px 0 4px 2px">Día libre 😎</div>'}</div>`; }).join('');
    } else if (tab === 'maleta') {
      const pk = t.packing || []; const done = pk.filter(p => p.done).length;
      body = `<div class="progress mb"><i style="width:${pk.length ? done / pk.length * 100 : 0}%"></i></div><div class="small bold muted mb">${done} de ${pk.length} listo</div>
        <form class="row mb" data-submit="addPack"><input class="input grow" id="pack-in" placeholder="Agregar a la maleta…" autocomplete="off"><button class="btn primary">＋</button></form>
        <div class="list">${pk.map(p => `<div class="item"><span class="check ${p.done ? 'on' : ''}" data-act="togglePack" data-p="${p.id}">${p.done ? '✓' : ''}</span><span class="grow ${p.done ? 'done-text' : ''}">${esc(p.text)}</span>
          <select class="input" style="width:auto;padding:6px 8px;font-size:13px" data-change="packWho" data-p="${p.id}"><option value="">¿Quién?</option>${(t.members || []).map(member).filter(Boolean).map(m => `<option value="${m.id}" ${p.who === m.id ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}</select>
          <button class="link tiny" data-act="delPack" data-p="${p.id}">✕</button></div>`).join('')}</div>`;
    } else if (tab === 'gastos') {
      const bal = costBalances(t);
      body = `<div class="grid g3 mb"><div class="stat"><span class="l">Gastado</span><span class="v">${money(spent)}</span></div><div class="stat"><span class="l">Presupuesto</span><span class="v">${t.budget ? money(t.budget) : '—'}</span></div><div class="stat"><span class="l">Por persona</span><span class="v">${money(spent / Math.max(1, (t.members || []).length))}</span></div></div>
        ${t.budget ? `<div class="progress mb"><i style="width:${Math.min(100, spent / t.budget * 100)}%;${spent > t.budget ? 'background:#e34948' : ''}"></i></div>` : ''}
        <button class="btn primary mb" data-act="addCost">＋ Gasto del viaje</button>
        ${bal.length ? `<div class="card-title"><h3>🤝 Cuentas claras</h3></div><div class="list mb">${bal.map(b => `<div class="item">${avatar(member(b.from), 'sm')}<span class="grow small"><b>${esc(member(b.from)?.name || '?')}</b> le debe <b>${money(b.amount)}</b> a <b>${esc(member(b.to)?.name || '?')}</b></span>${avatar(member(b.to), 'sm')}</div>`).join('')}</div>` : ''}
        <div class="list">${(t.costs || []).slice().reverse().map(c => `<div class="item"><span class="emoji">💸</span><div class="grow"><div class="bold">${esc(c.text)}</div><div class="tiny muted">pagó ${esc(member(c.paidBy)?.name || '?')}${c.split?.length ? ` · entre ${c.split.length}` : ' · entre todos'}</div></div><b>${money(c.amount)}</b><button class="link tiny" data-act="delCost" data-c="${c.id}">✕</button></div>`).join('') || '<div class="empty small">Registra hotel, gasolina, comidas… y la app calcula quién le debe a quién</div>'}</div>`;
    } else {
      body = `<textarea class="input" id="trip-notes" rows="12" placeholder="Reservaciones, números de confirmación, teléfonos del hotel, ideas…" data-change="saveNotes">${esc(t.notes || '')}</textarea><p class="tiny muted mt-s">Se guarda al salir del cuadro de texto.</p>`;
    }
    return `<a class="link" href="#/viajes">‹ Viajes</a>
      <section class="card deco hero mt"><div class="hero-emoji">${esc(t.emoji || '✈️')}</div><div class="row between"><span class="chip accent">📍 ${esc(t.destination || 'Destino')}</span><button class="btn sm" data-act="edit">✏️ Editar</button></div>
        <div class="hero-greet mt" style="font-size:clamp(30px,6vw,48px)">${esc(t.title)}</div><div class="hero-sub">${fmtDate(t.start, { weekday: true })} → ${fmtDate(t.end, { weekday: true })} · ${tripDays(t).length} días</div>
        ${future ? `<div class="countdown" data-cd="${parseDate(t.start).getTime()}">${['días', 'horas', 'min', 'seg'].map(l => `<div class="cd-box"><b>--</b><span>${l}</span></div>`).join('')}</div>` : ''}
        <div class="avatars mt">${(t.members || []).map(member).filter(Boolean).map(m => avatar(m)).join('')}</div></section>
      <div class="seg mt mb">${[['itinerario', '🗓️ Itinerario'], ['maleta', '🧳 Maleta'], ['gastos', '💸 Gastos'], ['notas', '📝 Notas']].map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-act="tab" data-t="${k}">${l}</button>`).join('')}</div>
      <section class="card deco">${body}</section>`;
  },
  after(root) { startCountdowns(root); },
  actions: {
    tab(el) { tab = el.dataset.t; hooks.rerender(); },
    edit() { tripForm(S.data.trips.find(x => x.id === S.route.params[0])); },
    addAct(el) {
      const t = S.data.trips.find(x => x.id === S.route.params[0]);
      modal({ title: `＋ Actividad · ${fmtDate(el.dataset.d, { weekday: true })}`, body: `<div class="field"><label>¿Qué haremos?</label><input class="input" name="text" required placeholder="Visitar Hierve el Agua, comer tlayudas…"></div><div class="frow"><div class="field"><label>Hora</label><input class="input" type="time" name="time"></div><div class="field"><label>Lugar (opcional)</label><input class="input" name="place" placeholder="Para abrir en Maps"></div></div>`,
        submit: async d => { if (!d.text.trim()) return false; await S.db.update('trips', t.id, { itinerary: [...(t.itinerary || []), { id: rid(), day: el.dataset.d, time: d.time, text: d.text.trim(), place: d.place }] }); } });
    },
    async delAct(el) { const t = S.data.trips.find(x => x.id === S.route.params[0]); await S.db.update('trips', t.id, { itinerary: t.itinerary.filter(a => a.id !== el.dataset.a) }); },
    async addPack(f) { const i = f.querySelector('input'); const v = i.value.trim(); if (!v) return; i.value = ''; const t = S.data.trips.find(x => x.id === S.route.params[0]); await S.db.update('trips', t.id, { packing: [...(t.packing || []), { id: rid(), text: v, who: '', done: false }] }); },
    async togglePack(el) { const t = S.data.trips.find(x => x.id === S.route.params[0]); await S.db.update('trips', t.id, { packing: t.packing.map(p => p.id === el.dataset.p ? { ...p, done: !p.done } : p) }); },
    async packWho(el) { const t = S.data.trips.find(x => x.id === S.route.params[0]); await S.db.update('trips', t.id, { packing: t.packing.map(p => p.id === el.dataset.p ? { ...p, who: el.value } : p) }); },
    async delPack(el) { const t = S.data.trips.find(x => x.id === S.route.params[0]); await S.db.update('trips', t.id, { packing: t.packing.filter(p => p.id !== el.dataset.p) }); },
    addCost() {
      const t = S.data.trips.find(x => x.id === S.route.params[0]); const ms = (t.members || []).map(member).filter(Boolean);
      modal({ title: '💸 Gasto del viaje', body: `<div class="frow"><div class="field"><label>Concepto</label><input class="input" name="text" required placeholder="Hotel, gasolina, cena…"></div><div class="field"><label>Monto</label><input class="input" type="number" inputmode="decimal" name="amount" required></div></div>
        <div class="field"><label>¿Quién pagó?</label><select class="input" name="paidBy">${ms.map(m => `<option value="${m.id}" ${m.id === S.me.id ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}</select></div>
        <div class="field"><label>¿Entre quiénes se divide? (vacío = todos)</label>${memberPicker('split', ms, [])}</div>`,
        submit: async d => { const amount = Number(d.amount); if (!d.text.trim() || !amount) return false; await S.db.update('trips', t.id, { costs: [...(t.costs || []), { id: rid(), text: d.text.trim(), amount, paidBy: d.paidBy, split: d.split || [] }] }); } });
    },
    async delCost(el) { const t = S.data.trips.find(x => x.id === S.route.params[0]); if (await confirmBox('¿Borrar este gasto?')) await S.db.update('trips', t.id, { costs: t.costs.filter(c => c.id !== el.dataset.c) }); },
    async saveNotes(el) { await S.db.update('trips', S.route.params[0], { notes: el.value }); toast('📝 Notas guardadas'); }
  }
};
