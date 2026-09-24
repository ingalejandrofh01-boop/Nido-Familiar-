// 🤝 Cuentas claras: cálculos de cuentas divididas, plazos (quincenas), abonos y saldos
import { S, member } from './store.js';
import { isoDate, parseDate, today0 } from './ui.js';

export const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
export const cash = (n) => { const v = r2(n); return (v < 0 ? '-$' : '$') + Math.abs(v).toLocaleString('es-MX', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 }); };

export const BILL_CATS = {
  renta: ['🏠', 'Renta / casa'], luz: ['💡', 'Luz'], agua: ['💧', 'Agua'], gas: ['🔥', 'Gas'], internet: ['📶', 'Internet / TV'], celular: ['📱', 'Celular'],
  super: ['🛒', 'Súper'], comida: ['🍔', 'Comida'], regalo: ['🎁', 'Regalo'], viaje: ['✈️', 'Viaje'], auto: ['🚗', 'Auto / gasolina'], salud: ['🏥', 'Salud'],
  escuela: ['🎓', 'Escuela'], tarjeta: ['💳', 'Tarjeta / crédito'], prestamo: ['🤝', 'Préstamo'], otro: ['📦', 'Otro']
};
export const SPLITS = { igual: 'Partes iguales', exacto: 'Montos exactos', porcentaje: 'Porcentaje', partes: 'Por partes' };
export const FREQS = { unico: 'Un solo pago', quincenal: 'Por quincenas', mensual: 'Cada mes', semanal: 'Cada semana' };
export const METHODS = { efectivo: '💵 Efectivo', transferencia: '🏦 Transferencia', tarjeta: '💳 Tarjeta', otro: '📝 Otro' };

// ---------------- Fechas: quincenas (15 y último día del mes) ----------------
const lastDay = (y, m) => new Date(y, m + 1, 0).getDate();
export function payday(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getDate() <= 15 ? new Date(x.getFullYear(), x.getMonth(), 15) : new Date(x.getFullYear(), x.getMonth(), lastDay(x.getFullYear(), x.getMonth())); }
export function nextPayday(d) { return d.getDate() === 15 ? new Date(d.getFullYear(), d.getMonth(), lastDay(d.getFullYear(), d.getMonth())) : new Date(d.getFullYear(), d.getMonth() + 1, 15); }
export function quincena(d = today0(), shift = 0) {
  let s = d.getDate() <= 15 ? new Date(d.getFullYear(), d.getMonth(), 1) : new Date(d.getFullYear(), d.getMonth(), 16);
  for (let i = 0; i < Math.abs(shift); i++) {
    if (shift > 0) s = s.getDate() === 1 ? new Date(s.getFullYear(), s.getMonth(), 16) : new Date(s.getFullYear(), s.getMonth() + 1, 1);
    else s = s.getDate() === 16 ? new Date(s.getFullYear(), s.getMonth(), 1) : new Date(s.getFullYear(), s.getMonth() - 1, 16);
  }
  const e = s.getDate() === 1 ? new Date(s.getFullYear(), s.getMonth(), 15) : new Date(s.getFullYear(), s.getMonth(), lastDay(s.getFullYear(), s.getMonth()));
  return { start: isoDate(s), end: isoDate(e), s, e };
}
export function addMonths(d, n, day = d.getDate()) { const y = d.getFullYear(), m = d.getMonth() + n; return new Date(y, m, Math.min(day, lastDay(y + Math.floor(m / 12), ((m % 12) + 12) % 12))); }
export function dueDates(plan = {}) {
  const n = Math.max(1, Math.min(48, Number(plan.n) || 1)); const start = parseDate(plan.start) || today0(); const out = [];
  if (plan.freq === 'quincenal') { let d = payday(start); for (let i = 0; i < n; i++) { out.push(isoDate(d)); d = nextPayday(d); } }
  else if (plan.freq === 'mensual') { for (let i = 0; i < n; i++) out.push(isoDate(addMonths(start, i, start.getDate()))); }
  else if (plan.freq === 'semanal') { for (let i = 0; i < n; i++) { const d = new Date(start); d.setDate(d.getDate() + 7 * i); out.push(isoDate(d)); } }
  else out.push(isoDate(start));
  return out;
}

// ---------------- División ----------------
// Reparte un total exacto a centavos entre pesos relativos (el último absorbe el redondeo)
export function allocate(total, weights) {
  const ids = Object.keys(weights).filter(k => Number(weights[k]) > 0); const W = ids.reduce((a, k) => a + Number(weights[k]), 0);
  const out = {}; if (!ids.length || !W) return out;
  let acc = 0; ids.forEach((k, i) => { const v = i === ids.length - 1 ? r2(total - acc) : r2(total * Number(weights[k]) / W); out[k] = v; acc = r2(acc + v); });
  return out;
}
export function computeShares(total, mode, people, inputs = {}) {
  if (mode === 'exacto') return Object.fromEntries(people.map(id => [id, r2(inputs[id])]).filter(([, v]) => v > 0));
  if (mode === 'porcentaje' || mode === 'partes') return allocate(total, Object.fromEntries(people.map(id => [id, Number(inputs[id]) || 0])));
  return allocate(total, Object.fromEntries(people.map(id => [id, 1])));
}

// ---------------- Estado de cada persona ----------------
export const debtors = (b) => Object.keys(b.shares || {}).filter(id => id !== b.to && (b.shares[id] || 0) > 0);
export function schedule(b, mid) {
  const share = r2((b.shares || {})[mid]); const dates = dueDates(b.plan); const n = dates.length;
  const each = r2(share / n); return dates.map((due, i) => ({ i, due, amount: i === n - 1 ? r2(share - each * (n - 1)) : each }));
}
export const paymentsOf = (b, mid) => (b.payments || []).filter(p => p.from === mid);
export function personStatus(b, mid) {
  const pays = paymentsOf(b, mid); const paid = r2(pays.reduce((a, p) => a + Number(p.amount || 0), 0));
  const unconfirmed = r2(pays.filter(p => !p.confirmed).reduce((a, p) => a + Number(p.amount || 0), 0));
  const share = r2((b.shares || {})[mid]); const t = isoDate();
  let left = paid; const inst = schedule(b, mid).map(x => { const ap = r2(Math.min(left, x.amount)); left = r2(left - ap); const rest = r2(x.amount - ap); return { ...x, paid: ap, left: rest, status: rest <= 0 ? 'pagado' : x.due < t ? 'vencido' : ap > 0 ? 'parcial' : 'pendiente' }; });
  const remaining = r2(Math.max(0, share - paid));
  return { share, paid, unconfirmed, remaining, extra: r2(Math.max(0, paid - share)), inst, next: inst.find(x => x.left > 0), overdue: r2(inst.filter(x => x.status === 'vencido').reduce((a, x) => a + x.left, 0)), done: remaining <= 0 };
}
export function billStatus(b) {
  const ds = debtors(b); let owed = 0, paid = 0, overdue = 0;
  ds.forEach(id => { const s = personStatus(b, id); owed = r2(owed + s.share); paid = r2(paid + Math.min(s.paid, s.share)); overdue = r2(overdue + s.overdue); });
  return { owed, paid, remaining: r2(owed - paid), overdue, pct: owed ? paid / owed : 1, done: owed - paid <= 0.004, people: ds.length };
}
export const planLabel = (p = {}) => p.freq === 'unico' || !p.freq ? 'Un solo pago' : `${p.n} pago${p.n > 1 ? 's' : ''} ${p.freq === 'quincenal' ? 'quincenales' : p.freq === 'mensual' ? 'mensuales' : 'semanales'}`;

// ---------------- Agenda: todos los pagos pendientes ----------------
export function agendaRows({ all = false } = {}) {
  const me = S.me?.id, rows = [];
  for (const b of S.data.bills || []) {
    if (b.archived) continue;
    for (const mid of debtors(b)) {
      if (!all && mid !== me && b.to !== me) continue;
      const st = personStatus(b, mid);
      for (const x of st.inst) if (x.left > 0) rows.push({ bill: b, from: mid, to: b.to, due: x.due, left: x.left, amount: x.amount, status: x.status, n: x.i + 1, of: st.inst.length });
    }
  }
  return rows.sort((a, b) => a.due.localeCompare(b.due));
}
export function periodTotals(meId = S.me?.id) {
  const q0 = quincena(), q1 = quincena(today0(), 1), t = isoDate();
  const res = { pay: { overdue: 0, now: 0, next: 0, total: 0 }, get: { overdue: 0, now: 0, next: 0, total: 0 }, q0, q1 };
  for (const r of agendaRows()) {
    const k = r.from === meId ? 'pay' : r.to === meId ? 'get' : null; if (!k) continue;
    res[k].total = r2(res[k].total + r.left);
    if (r.due < t) res[k].overdue = r2(res[k].overdue + r.left);
    else if (r.due <= q0.end) res[k].now = r2(res[k].now + r.left);
    else if (r.due <= q1.end) res[k].next = r2(res[k].next + r.left);
  }
  return res;
}
// Saldos entre pares (lo que falta por pagar), neteados A↔B
export function pairBalances() {
  const net = {};
  for (const b of S.data.bills || []) { if (b.archived) continue; for (const mid of debtors(b)) { const rem = personStatus(b, mid).remaining; if (rem <= 0) continue; const k = [mid, b.to].sort().join('|'); const sign = mid < b.to ? 1 : -1; net[k] = r2((net[k] || 0) + sign * rem); } }
  return Object.entries(net).filter(([, v]) => Math.abs(v) > 0.004).map(([k, v]) => { const [a, b] = k.split('|'); return v > 0 ? { from: a, to: b, amount: v } : { from: b, to: a, amount: -v }; }).sort((x, y) => y.amount - x.amount);
}

// ---------------- Cuentas que se repiten cada mes ----------------
const made = new Set();
export async function ensureRecurring() {
  if (!S.db || !S.me) return;
  const now = today0(), ym = isoDate(now).slice(0, 7);
  for (const tpl of S.data.bills || []) {
    if (!tpl.recurring?.monthly || tpl.recurring.parentId) continue;
    const start = parseDate(tpl.date); if (!start) continue;
    const months = (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth();
    for (let k = 1; k <= months; k++) {
      const d = addMonths(start, k, start.getDate()); const key = isoDate(d).slice(0, 7); if (key > ym) break;
      const id = `${tpl.id}-${key}`;
      if (made.has(id) || (tpl.recurring.skip || []).includes(key) || (S.data.bills || []).some(b => b.id === id)) continue;
      if (k < months - 1) continue; // sólo el mes actual y el anterior (no llenar historial viejo)
      made.add(id);
      const ps = parseDate(tpl.plan?.start) || start; const shift = (d - start);
      const { id: _i, payments, createdAt, ...rest } = tpl;
      await S.db.set('bills', id, { ...rest, date: isoDate(d), plan: { ...(tpl.plan || {}), start: isoDate(addMonths(ps, k, ps.getDate())) }, payments: [], recurring: { monthly: true, parentId: tpl.id }, createdAt: Date.now(), auto: true });
    }
  }
}
export const personName = (id) => member(id)?.name?.split(' ')[0] || '?';
