// Lógica de eventos: repeticiones, cumpleaños e intercambios en el calendario
import { S } from './store.js';
import { isoDate, parseDate } from './ui.js';

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
  for (const ev of S.data.events) {
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
    if (!m.birthday) continue; const b = parseDate(m.birthday);
    for (let y = from.getFullYear(); y <= to.getFullYear(); y++)
      add(new Date(y, b.getMonth(), b.getDate()), { title: `Cumpleaños de ${m.name}`, type: 'cumple', member: m, virtual: true, years: y - b.getFullYear() });
  }
  for (const x of S.data.exchanges) {
    const d = parseDate(x.date); if (d) add(d, { title: x.title, type: 'intercambio', exchange: x, virtual: true, time: x.time });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || (a.time || '99').localeCompare(b.time || '99'));
}
