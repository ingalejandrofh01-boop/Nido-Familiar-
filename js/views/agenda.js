// 📅 Agenda: calendario, cumpleaños, fechas importantes y recordatorios
import { S, hooks, members, member, priv, findEvent, notify } from '../store.js';
import { esc, avatar, fmtDate, fmtTime, today0, isoDate, parseDate, modal, memberPicker, toast, MONTHS, relDay } from '../ui.js';
import { occurrences, EVENT_TYPES, REPEATS } from '../events.js';

let cursor = null;   // primer día del mes visible
let selected = null; // 'YYYY-MM-DD'
let filter = 'all';

export function openEventForm(ev = null, presetDate = null) {
  const e = ev || { date: presetDate || selected || isoDate(), type: 'familiar', repeat: 'none', participants: S.me ? [S.me.id] : [] };
  const types = Object.entries(EVENT_TYPES).filter(([k]) => k !== 'cumple' && k !== 'intercambio');
  modal({
    title: ev ? 'Editar evento' : 'Nuevo evento',
    body: `
      <div class="field"><label>¿Qué pasa?</label><input class="input" name="title" required value="${esc(e.title || '')}" placeholder="Cena familiar, dentista, viaje…"></div>
      <div class="field"><label>Tipo</label><div class="chips">${types.map(([k, t]) => `<label class="chip chip-btn"><input type="radio" name="type" value="${k}" ${e.type === k ? 'checked' : ''} style="accent-color:${t.c}"> ${t.e} ${t.t}</label>`).join('')}</div></div>
      <div class="frow"><div class="field"><label>Fecha</label><input class="input" type="date" name="date" required value="${esc(e.date)}"></div>
      <div class="field"><label>Hora (opcional)</label><input class="input" type="time" name="time" value="${esc(e.time || '')}"></div></div>
      <div class="frow"><div class="field"><label>Termina (viajes, varios días)</label><input class="input" type="date" name="endDate" value="${esc(e.endDate || '')}"></div>
      <div class="field"><label>Se repite</label><select class="input" name="repeat">${Object.entries(REPEATS).map(([k, v]) => `<option value="${k}" ${e.repeat === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div></div>
      <div class="field"><label>¿Quiénes participan?</label>${memberPicker('participants', members(), e.participants || [])}</div>
      <div class="field"><label>Lugar</label><input class="input" name="location" value="${esc(e.location || '')}" placeholder="Opcional"></div>
      <div class="field"><label>Notas</label><textarea class="input" name="notes" placeholder="Opcional">${esc(e.notes || '')}</textarea></div>
      <label class="toggle"><input type="checkbox" name="private" ${e._private ? 'checked' : ''}> 🔒 Sólo yo lo veo (evento privado)</label>`,
    submit: async (d) => {
      const data = { title: d.title.trim(), type: d.type || 'familiar', date: d.date, time: d.time || '', endDate: d.endDate || '', repeat: d.repeat, participants: d.participants || [], location: d.location, notes: d.notes };
      if (!data.title || !data.date) { toast('Escribe un título y fecha'); return false; }
      const isPriv = !!d.private, path = isPriv ? priv('events') : 'events';
      if (ev && !!ev._private === isPriv) await S.db.update(path, ev.id, data);
      else {
        if (ev) await S.db.remove(ev._private ? priv('events') : 'events', ev.id);
        await S.db.add(path, { ...data, createdBy: S.me.id });
        if (!ev && !isPriv) notify({ to: data.participants.length ? data.participants : 'all', icon: (EVENT_TYPES[data.type] || {}).e || '📅', title: `Nuevo evento: ${data.title}`, body: `${fmtDate(data.date, { weekday: true })}${data.time ? ' · ' + fmtTime(data.time) : ''}`, link: 'agenda' });
      }
      toast(ev ? '✅ Evento actualizado' : isPriv ? '🔒 Evento privado agregado' : '📅 Evento agregado');
    },
    danger: ev ? { label: '🗑️ Eliminar', confirm: '¿Eliminar este evento?', action: () => S.db.remove(ev._private ? priv('events') : 'events', ev.id) } : null
  });
}

export default {
  render() {
    const t0 = today0();
    if (!cursor) cursor = new Date(t0.getFullYear(), t0.getMonth(), 1);
    if (!selected) selected = isoDate(t0);
    const first = new Date(cursor); const start = new Date(first); start.setDate(1 - ((first.getDay() + 6) % 7)); // lunes
    const end = new Date(start); end.setDate(start.getDate() + 41);
    const all = occurrences(start, end).filter(o => filter === 'all' || (filter === 'mine' ? (o.ev?.participants || o.people || [o.member?.id]).includes(S.me.id) : o.type === filter));
    const byDay = {}; all.forEach(o => (byDay[o.date] = byDay[o.date] || []).push(o));
    const todayIso = isoDate(t0);

    let cells = '';
    for (let i = 0; i < 42; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i); const k = isoDate(d);
      const evs = (byDay[k] || []).filter(o => o.ev?.repeat !== 'daily');
      cells += `<div class="day ${d.getMonth() !== cursor.getMonth() ? 'out' : ''} ${k === todayIso ? 'today' : ''} ${k === selected ? 'sel' : ''}" data-act="pick" data-d="${k}">
        <span class="n">${d.getDate()}</span><div class="evs">${evs.slice(0, 3).map(o => `<span class="ev ${o.type}" style="--c:${(EVENT_TYPES[o.type] || EVENT_TYPES.familiar).c}" title="${esc(o.title)}"><i class="e">${(EVENT_TYPES[o.type] || {}).e || ''}</i> ${esc(o.type === 'cumple' && (o.member || o.pet) ? String((o.member || o.pet).name || '').split(' ')[0] + (o.pet ? ' 🐾' : '') : o.title)}</span>`).join('')}${evs.length > 3 ? `<span class="tiny muted">+${evs.length - 3}</span>` : ''}</div></div>`;
    }
    const dayList = (byDay[selected] || []);
    const horizon = new Date(t0); horizon.setDate(horizon.getDate() + 60);
    const important = occurrences(t0, new Date(t0.getFullYear() + 1, t0.getMonth(), t0.getDate() - 1)).filter(o => o.type === 'cumple' || o.type === 'aniversario' || o.type === 'intercambio').slice(0, 10);

    const row = (o) => {
      const T = EVENT_TYPES[o.type] || EVENT_TYPES.familiar;
      const people = (o.ev?.participants || (o.member ? [o.member.id] : [])).map(member).filter(Boolean);
      const attrs = o.ev ? `data-act="edit" data-id="${o.ev.id}"` : o.exchange ? `onclick="location.hash='#/intercambio/${o.exchange.id}'"` : o.member ? `onclick="location.hash='#/perfil/${o.member.id}'"` : o.pet ? `onclick="location.hash='#/mascota/${o.pet.id}'"` : o.party ? `onclick="location.hash='#/fiesta/${o.party.id}'"` : o.bill ? `onclick="location.hash='#/cuenta/${o.bill.id}'"` : '';
      return `<div class="item clickable" ${attrs}><span class="ev-dot" style="--c:${T.c}"></span><span class="emoji">${T.e}</span>
        <div class="grow"><div class="bold ellipsis">${o.ev?._private ? '🔒 ' : ''}${esc(o.title)}${o.years && (o.type === 'cumple' || o.type === 'aniversario') ? ` · ${o.years} ${o.type === 'cumple' ? 'años' : 'aniversario'}` : ''}</div>
        <div class="small muted">${o.time ? fmtTime(o.time) : 'Todo el día'}${o.ev?.repeat && o.ev.repeat !== 'none' ? ' · 🔁 ' + REPEATS[o.ev.repeat] : ''}${o.ev?.location ? ' · 📍 ' + esc(o.ev.location) : ''}</div></div>
        <div class="avatars">${people.slice(0, 5).map(p => avatar(p, 'sm')).join('')}</div></div>`;
    };

    return `
    <div class="page-head"><div><h1>Agenda familiar</h1><p>Citas, cumpleaños, viajes y fechas que no se olvidan</p></div>
      <button class="btn primary" data-act="new">＋ Nuevo evento</button></div>
    <div class="chips mb">${[['all', '✨ Todo'], ['mine', '🙋 Míos'], ['cumple', '🎂 Cumpleaños'], ['cita', '🩺 Citas'], ['escuela', '🎒 Escuela'], ['viaje', '✈️ Viajes'], ['recordatorio', '⏰ Recordatorios']].map(([k, l]) => `<button class="chip chip-btn ${filter === k ? 'sel' : ''}" data-act="filter" data-f="${k}">${l}</button>`).join('')}</div>
    <div class="grid" style="grid-template-columns:minmax(0,1.6fr) minmax(0,1fr)" id="agenda-grid">
      <section class="card deco">
        <div class="cal-head"><button class="icon-btn" data-act="prev">‹</button><h2>${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}</h2><div class="row"><button class="btn sm" data-act="today">Hoy</button><button class="icon-btn" data-act="next">›</button></div></div>
        <div class="cal">${['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(d => `<div class="dow">${d}</div>`).join('')}${cells}</div>
      </section>
      <div class="col" style="gap:16px">
        <section class="card deco"><div class="card-title"><h3>${relDay(selected) === 'Hoy' ? 'Hoy' : fmtDate(selected, { weekday: true })}</h3><button class="link" data-act="new">＋ Agregar</button></div>
          <div class="list">${dayList.length ? dayList.map(row).join('') : '<div class="empty"><div class="big">🗓️</div>Día libre</div>'}</div></section>
        <section class="card deco"><div class="card-title"><h3>⭐ Fechas importantes</h3></div>
          <div class="list">${important.map(o => `<div class="item clickable" ${o.ev ? `data-act="edit" data-id="${o.ev.id}"` : o.exchange ? `onclick="location.hash='#/intercambio/${o.exchange.id}'"` : o.pet ? `onclick="location.hash='#/mascota/${o.pet.id}'"` : o.party ? `onclick="location.hash='#/fiesta/${o.party.id}'"` : o.bill ? `onclick="location.hash='#/cuenta/${o.bill.id}'"` : `onclick="location.hash='#/perfil/${o.member?.id}'"`}><span class="emoji">${EVENT_TYPES[o.type].e}</span><div class="grow"><div class="bold ellipsis">${esc(o.title)}</div><div class="small muted">${fmtDate(o.date, { weekday: true })}</div></div><span class="chip">${relDay(o.date)}</span></div>`).join('')}</div></section>
      </div>
    </div>
    <style>@media(max-width:900px){#agenda-grid{grid-template-columns:minmax(0,1fr)!important}}</style>`;
  },
  actions: {
    pick(el) { selected = el.dataset.d; hooks.rerender(); },
    prev() { cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1); hooks.rerender(); },
    next() { cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1); hooks.rerender(); },
    today() { const t = today0(); cursor = new Date(t.getFullYear(), t.getMonth(), 1); selected = isoDate(t); hooks.rerender(); },
    filter(el) { filter = el.dataset.f; hooks.rerender(); },
    new() { openEventForm(null, selected); },
    edit(el) { openEventForm(findEvent(el.dataset.id)); }
  }
};
