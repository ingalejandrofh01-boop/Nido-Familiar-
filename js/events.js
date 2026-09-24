// Lógica de eventos: repeticiones, cumpleaños e intercambios en el calendario
import { S, allEvents } from './store.js';
import { isoDate, parseDate } from './ui.js';
import { agendaRows, cash } from './debts.js';

export const EVENT_TYPES = {
  familiar: { e: '👨‍👩‍👧', c: '#8b5cf6', t: 'Familiar' },
  cita: { e: '🩺', c: '#0ea5e9', t: 'Cita' },
  reunion: { e: '🤝', c: '#f59e0b', t: 'Reunión' },
  escuela: { e: '🎒', c: '#22c55e', t: 'Escuela' },
  trabajo: { e: '💼', c: '#64748b', t: 'Trabajo' },
  viaje: { e: '✈️', c: '#06b6d4', t: 'Viaje' },
  fiesta: { e: '🎉', c: '#d946ef', t: 'Fiesta' },
  aniversario: { e: '💍', c: '#e11d48', t: 'Fecha importante' },
  recordatorio: { e: '⏰', c: '#f97316', t: 'Recordatorio' },
  cumple: { e: '🎂', c: '#ec4899', t: 'Cumpleaños' },
  intercambio: { e: '🎁', c: '#ef4444', t: 'Intercambio' }
};
export const REPEATS = { none: 'No se repite', daily: 'Cada día', weekly: 'Cada semana', monthly: 'Cada mes', yearly: 'Cada año' };

// Devuelve [{date, title, type, ev, virtual}] entre dos fechas (Date), ordenado
export function occurrences(from, to) {
  const out = [];
  const add = (d, item) => { if (d >= from && d <= to) out.push({ ...item, date: isoDate(d) }); };
  for (const ev of allEvents()) {
    const start = parseDate(ev.date); if (!start) continue;
    const base = { title: ev.title, type: ev.type || 'familiar', ev, time: ev.time };
    const rep = ev.repeat || 'none';
    if (rep === 'yearly') {
      for (let y = from.getFullYear(); y <= to.getFullYear(); y++) {
        const d = new Date(y, start.getMonth(), start.getDate());
        if (d >= start || ev.type === 'aniversario') add(d, { ...base, years: y - start.getFullYear() });
      }
    } else if (rep === 'daily' || rep === 'weekly') {
      const step = rep === 'daily' ? 1 : 7;
      let d = new Date(Math.max(start, from));
      if (rep === 'weekly') { const diff = Math.round((d - start) / 864e5) % 7; if (diff) d.setDate(d.getDate() + (7 - diff)); }
      for (; d <= to; d.setDate(d.getDate() + step)) if (d >= start) add(new Date(d), base);
    } else if (rep === 'monthly') {
      for (let d = new Date(from.getFullYear(), from.getMonth(), start.getDate()); d <= to; d = new Date(d.getFullYear(), d.getMonth() + 1, start.getDate()))
        if (d >= start) add(d, base);
    } else if (ev.endDate && ev.endDate > ev.date) {
      const end = parseDate(ev.endDate);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) add(new Date(d), { ...base, span: true });
    } else add(start, base);
  }
  for (const m of S.data.members) {
    if (!m.birthday || m.treeOnly) continue; const b = parseDate(m.birthday);
    for (let y = from.getFullYear(); y <= to.getFullYear(); y++)
      add(new Date(y, b.getMonth(), b.getDate()), { title: `Cumpleaños de ${m.name}`, type: 'cumple', member: m, virtual: true, years: y - b.getFullYear() });
  }
  // 🐾 Mascotas: cumpleaños y próximas vacunas
  for (const p of S.data.pets || []) {
    if (p.birthday) { const b = parseDate(p.birthday); for (let y = from.getFullYear(); y <= to.getFullYear(); y++) { const d = new Date(y, b.getMonth(), b.getDate()); if (d > b) add(d, { title: `Cumpleaños de ${p.name} 🐾`, type: 'cumple', pet: p, virtual: true, years: y - b.getFullYear() }); } }
    for (const v of p.vaccines || []) { const d = parseDate(v.next); if (d) add(d, { title: `${v.kind === 'desparasitacion' ? 'Desparasitar' : 'Vacuna'} de ${p.name}: ${v.name}`, type: 'recordatorio', pet: p, virtual: true }); }
  }
  for (const p of S.data.parties || []) { const d = parseDate(p.date); if (d) add(d, { title: p.title, type: 'fiesta', party: p, virtual: true, time: p.time }); }
  // 🤝 Pagos pendientes de Cuentas claras (sólo los míos: lo que pago o me pagan)
  if (S.me) for (const r of agendaRows()) { const d = parseDate(r.due); const other = S.data.members.find(m => m.id === (r.from === S.me.id ? r.to : r.from)); add(d, { title: r.from === S.me.id ? `💸 Pagar ${cash(r.left)} a ${other?.name || '?'} · ${r.bill.title}` : `💰 ${other?.name || '?'} te paga ${cash(r.left)} · ${r.bill.title}`, type: 'recordatorio', bill: r.bill, people: [r.from, r.to], virtual: true }); }
  // 🪪 Vencimientos de documentos
  for (const d of [...(S.data.docs || []), ...(S.data.myDocs || [])]) { const dd = parseDate(d.expires); if (!dd) continue; const o = S.data.members.find(m => m.id === d.owner); add(dd, { title: `🪪 Vence: ${d.title || d.type}${o ? ' de ' + o.name.split(' ')[0] : ''}`, type: 'recordatorio', doc: d, virtual: true }); }
  for (const x of S.data.exchanges) {
    const d = parseDate(x.date); if (d) add(d, { title: x.title, type: 'intercambio', exchange: x, virtual: true, time: x.time });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || (a.time || '99').localeCompare(b.time || '99'));
}
