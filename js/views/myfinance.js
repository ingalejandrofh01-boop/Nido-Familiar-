// 🙋 Mis finanzas: dinero personal y privado de cada integrante
import { S, hooks, priv } from '../store.js';
import { esc, isoDate, modal, toast, MONTHS, fmtShort, confirmBox } from '../ui.js';

// Paleta categórica validada (orden fijo). Claro / oscuro.
const PAL_L = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];
const PAL_D = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];
const pal = () => document.body.dataset.mode === 'light' ? PAL_L : PAL_D;

export const ACC_TYPES = { efectivo: ['💵', 'Efectivo'], debito: ['💳', 'Débito'], credito: ['🏦', 'Tarjeta de crédito'], ahorro: ['🐷', 'Ahorro'], inversion: ['📈', 'Inversión'], vales: ['🎟️', 'Vales'] };
const ACC_GRADS = [['#4f46e5', '#7c3aed'], ['#0ea5e9', '#2563eb'], ['#10b981', '#047857'], ['#f59e0b', '#ea580c'], ['#ec4899', '#be185d'], ['#334155', '#0f172a'], ['#14b8a6', '#0e7490'], ['#a855f7', '#6d28d9']];
const DEF_CATS = {
  gasto: [['Comida', '🍔'], ['Súper', '🛒'], ['Transporte', '🚗'], ['Casa', '🏠'], ['Servicios', '💡'], ['Salud', '💊'], ['Ropa', '👕'], ['Diversión', '🎉'], ['Suscripciones', '📺'], ['Educación', '🎓'], ['Regalos', '🎁'], ['Otros', '📦']],
  ingreso: [['Sueldo', '💼'], ['Extra', '💸'], ['Ventas', '🏷️'], ['Regalo', '🎁'], ['Rendimientos', '📈'], ['Otros ingresos', '💰']]
};
// Palabras que ayudan a adivinar categoría y emoji
const HINTS = [
  [/uber|didi|gasolin|taxi|metro|caseta|estacionam|pemex|camion/, 'Transporte', '🚗'],
  [/walmart|soriana|chedraui|costco|bodega|super|la comer|heb|sams/, 'Súper', '🛒'],
  [/oxxo|tacos|restaur|comida|pizza|cafe|starbucks|burger|sushi|antojo|rappi|didi food|uber eats/, 'Comida', '🍔'],
  [/netflix|spotify|disney|hbo|max|prime|youtube|apple|icloud|xbox|playstation/, 'Suscripciones', '📺'],
  [/cfe|luz|agua|internet|telmex|izzi|totalplay|megacable|gas|telcel|at&t|movistar|celular/, 'Servicios', '💡'],
  [/farmacia|doctor|medic|dentista|hospital|consulta|similares/, 'Salud', '💊'],
  [/renta|hipoteca|predial|mantenimiento|mueble|ferreter/, 'Casa', '🏠'],
  [/cine|concierto|bar|fiesta|boliche|viaje|hotel|vuelo/, 'Diversión', '🎉'],
  [/ropa|zapato|tenis|zara|liverpool|shein|h&m/, 'Ropa', '👕'],
  [/escuela|colegiatura|curso|libro|udemy|universidad/, 'Educación', '🎓'],
  [/regalo|cumple/, 'Regalos', '🎁'],
  [/sueldo|nomina|quincena|salario/, 'Sueldo', '💼']
];
const EMOJI_GUESS = [[/mascota|perro|gato|veterin/, '🐾'], [/gym|gimnasio|deporte/, '🏋️'], [/bebe|pañal/, '🍼'], [/auto|coche|carro|taller/, '🔧'], [/ahorro/, '🐷'], [/inver/, '📈'], [/viaje/, '✈️'], [/belleza|uñas|corte|barber/, '💅'], [/tecnolog|compu|celular/, '📱'], [/credito|deuda|prestamo/, '🏦'], [/caf/, '☕']];

let hide = (() => { try { return localStorage.getItem('nido-hide-money') === '1'; } catch { return false; } })();
let ym = null;
const M = (n) => hide ? '$•••' : '$' + Number(n || 0).toLocaleString('es-MX', { maximumFractionDigits: 2, minimumFractionDigits: Number(n) % 1 ? 2 : 0 });
const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// ---------- cálculos ----------
export function categories(kind) {
  const map = new Map();
  DEF_CATS[kind].forEach(([n, e]) => map.set(n, { name: n, emoji: e }));
  S.data.myCats.filter(c => (c.kind || 'gasto') === kind).forEach(c => map.set(c.name, { name: c.name, emoji: c.emoji || '🏷️', id: c.id }));
  S.data.txns.filter(t => t.kind === kind && t.category && !map.has(t.category)).forEach(t => map.set(t.category, { name: t.category, emoji: '🏷️' }));
  return [...map.values()];
}
const catEmoji = (name, kind = 'gasto') => (categories(kind).find(c => c.name === name) || {}).emoji || '🏷️';
function guessCategory(desc) {
  const d = norm(desc); if (!d) return null;
  const prev = [...S.data.txns].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).find(t => norm(t.note) === d && t.category);
  if (prev) return prev.category;
  const h = HINTS.find(([re]) => re.test(d)); return h ? h[1] : null;
}
const guessEmoji = (name) => { const n = norm(name); const h = HINTS.find(([re, c]) => norm(c) === n || re.test(n)); if (h) return h[2]; const e = EMOJI_GUESS.find(([re]) => re.test(n)); return e ? e[1] : '🏷️'; };

export function balances() {
  const b = {}; S.data.accounts.forEach(a => b[a.id] = Number(a.initial || 0));
  for (const t of S.data.txns) {
    const v = Number(t.amount || 0);
    if (t.kind === 'ingreso' && b[t.accountId] != null) b[t.accountId] += v;
    if (t.kind === 'gasto' && b[t.accountId] != null) b[t.accountId] -= v;
    if (t.kind === 'transfer') { if (b[t.accountId] != null) b[t.accountId] -= v; if (b[t.toAccountId] != null) b[t.toAccountId] += v; }
  }
  return b;
}
const monthTx = (ymKey) => S.data.txns.filter(t => (t.date || '').startsWith(ymKey));
const sumKind = (list, k) => list.filter(t => t.kind === k).reduce((a, t) => a + Number(t.amount || 0), 0);
const shiftYm = (key, n) => { const [y, m] = key.split('-').map(Number); return isoDate(new Date(y, m - 1 + n, 1)).slice(0, 7); };

// ---------- formularios ----------
async function ensureCategory(name, kind) {
  if (!name) return;
  if (categories(kind).some(c => norm(c.name) === norm(name))) return;
  await S.db.add(priv('categories'), { name, kind, emoji: guessEmoji(name) });
  toast(`🏷️ Nueva categoría: ${name}`);
}

export function txForm(kind = 'gasto', t = null) {
  if (!S.data.accounts.length) { accountForm(null, () => txForm(kind, t)); toast('Primero crea una cuenta (efectivo, tarjeta…)'); return; }
  const k0 = t?.kind || kind;
  const accOpts = (sel) => S.data.accounts.map(a => `<option value="${a.id}" ${sel === a.id ? 'selected' : ''}>${ACC_TYPES[a.type]?.[0] || '💳'} ${esc(a.name)}</option>`).join('');
  modal({
    title: t ? 'Editar movimiento' : 'Nuevo movimiento',
    body: `<div class="seg mb" id="kseg">${[['gasto', '💸 Gasto'], ['ingreso', '💰 Ingreso'], ['transfer', '↔️ Transferir']].map(([k, l]) => `<button type="button" data-k="${k}" class="${k0 === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      <input type="hidden" name="kind" value="${k0}">
      <div class="field"><label>Monto</label><input class="input" name="amount" type="number" inputmode="decimal" step="0.01" min="0" required value="${t?.amount ?? ''}" style="font-size:28px;font-weight:900;text-align:center" placeholder="$0"></div>
      <div class="field"><label>¿En qué? (descripción)</label><input class="input" name="note" value="${esc(t?.note || '')}" placeholder="Uber, Oxxo, quincena, Netflix…" autocomplete="off"></div>
      <div class="field" id="catf"><label>Categoría <span class="tiny muted">(escribe una nueva y se crea sola)</span></label>
        <input class="input" name="category" list="catlist" value="${esc(t?.category || '')}" autocomplete="off" placeholder="Comida, Súper, Gasolina…"><datalist id="catlist"></datalist>
        <div class="chips mt-s" id="catchips"></div></div>
      <div class="frow"><div class="field"><label id="acclbl">${k0 === 'ingreso' ? 'Entra a' : k0 === 'transfer' ? 'Sale de' : 'Pagado con'}</label><select class="input" name="accountId">${accOpts(t?.accountId || S.data.accounts[0]?.id)}</select></div>
      <div class="field" id="tof" style="${k0 === 'transfer' ? '' : 'display:none'}"><label>Llega a</label><select class="input" name="toAccountId">${accOpts(t?.toAccountId || S.data.accounts[1]?.id)}</select></div>
      <div class="field"><label>Fecha</label><input class="input" type="date" name="date" value="${esc(t?.date || isoDate())}"></div></div>`,
    onOpen(f) {
      const kin = f.querySelector('[name=kind]'), cat = f.querySelector('[name=category]'), note = f.querySelector('[name=note]');
      let userCat = !!t?.category;
      const fillCats = () => {
        const k = kin.value; const cats = categories(k === 'ingreso' ? 'ingreso' : 'gasto');
        f.querySelector('#catlist').innerHTML = cats.map(c => `<option value="${esc(c.name)}">`).join('');
        const used = {}; S.data.txns.filter(x => x.kind === k).forEach(x => used[x.category] = (used[x.category] || 0) + 1);
        const top = [...cats].sort((a, b) => (used[b.name] || 0) - (used[a.name] || 0)).slice(0, 8);
        f.querySelector('#catchips').innerHTML = top.map(c => `<button type="button" class="chip chip-btn ${cat.value === c.name ? 'sel' : ''}" data-c="${esc(c.name)}">${c.emoji} ${esc(c.name)}</button>`).join('');
        f.querySelector('#catf').style.display = k === 'transfer' ? 'none' : '';
        f.querySelector('#tof').style.display = k === 'transfer' ? '' : 'none';
        f.querySelector('#acclbl').textContent = k === 'ingreso' ? 'Entra a' : k === 'transfer' ? 'Sale de' : 'Pagado con';
      };
      f.querySelector('#kseg').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (!b) return; kin.value = b.dataset.k; f.querySelectorAll('#kseg button').forEach(x => x.classList.toggle('on', x === b)); fillCats(); });
      f.querySelector('#catchips').addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (!b) return; cat.value = b.dataset.c; userCat = true; fillCats(); });
      cat.addEventListener('input', () => { userCat = !!cat.value; });
      note.addEventListener('input', () => { if (userCat) return; const g = guessCategory(note.value); if (g) { cat.value = g; fillCats(); } });
      fillCats();
    },
    submit: async d => {
      const amount = Number(d.amount); if (!amount || amount <= 0) { toast('Escribe un monto'); return false; }
      const kind = d.kind;
      if (kind === 'transfer' && d.accountId === d.toAccountId) { toast('Elige cuentas distintas'); return false; }
      const category = kind === 'transfer' ? '' : (d.category || '').trim() || (kind === 'ingreso' ? 'Otros ingresos' : 'Otros');
      const data = { kind, amount, note: (d.note || '').trim(), category, accountId: d.accountId, toAccountId: kind === 'transfer' ? d.toAccountId : '', date: d.date || isoDate() };
      if (kind !== 'transfer') await ensureCategory(category, kind);
      if (t) await S.db.update(priv('txns'), t.id, data); else await S.db.add(priv('txns'), data);
      toast(kind === 'gasto' ? '💸 Gasto registrado' : kind === 'ingreso' ? '💰 Ingreso registrado' : '↔️ Transferencia hecha');
      checkBudget(category, kind);
    },
    danger: t ? { label: '🗑️', confirm: '¿Eliminar este movimiento?', action: () => S.db.remove(priv('txns'), t.id) } : null
  });
}
function checkBudget(cat, kind) {
  if (kind !== 'gasto') return;
  const b = S.data.budgets.find(x => x.category === cat); if (!b) return;
  setTimeout(() => {
    const spent = sumKind(monthTx(isoDate().slice(0, 7)).filter(t => t.category === cat), 'gasto');
    if (spent > b.amount) toast(`⚠️ Te pasaste del presupuesto de ${cat} (${M(spent)} de ${M(b.amount)})`);
    else if (spent > b.amount * .8) toast(`🟡 Llevas ${Math.round(spent / b.amount * 100)}% del presupuesto de ${cat}`);
  }, 400);
}

export function accountForm(a = null, after) {
  modal({
    title: a ? 'Editar cuenta' : 'Nueva cuenta',
    body: `<div class="field"><label>Nombre</label><input class="input" name="name" required value="${esc(a?.name || '')}" placeholder="Cartera, BBVA, Nu, Cajita de ahorro…"></div>
      <div class="field"><label>Tipo</label><div class="chips">${Object.entries(ACC_TYPES).map(([k, [e, l]]) => `<label class="chip chip-btn"><input type="radio" name="type" value="${k}" ${(a?.type || 'efectivo') === k ? 'checked' : ''}> ${e} ${l}</label>`).join('')}</div></div>
      <div class="field"><label>Saldo actual ${a ? '(al crearla)' : ''}</label><input class="input" name="initial" type="number" inputmode="decimal" step="0.01" value="${a?.initial ?? ''}" placeholder="0"><span class="tiny muted">En tarjeta de crédito pon lo que debes en negativo (ej. -2500).</span></div>
      <div class="field"><label>Color</label><div class="chips">${ACC_GRADS.map((g, i) => `<label class="chip chip-btn" style="background:linear-gradient(135deg,${g[0]},${g[1]});width:40px;height:30px;justify-content:center"><input type="radio" name="grad" value="${i}" ${(a?.grad ?? S.data.accounts.length % ACC_GRADS.length) == i ? 'checked' : ''}></label>`).join('')}</div></div>`,
    submit: async d => {
      const data = { name: d.name.trim(), type: d.type || 'efectivo', initial: Number(d.initial) || 0, grad: Number(d.grad) || 0 };
      if (!data.name) return false;
      if (a) await S.db.update(priv('accounts'), a.id, data); else await S.db.add(priv('accounts'), data);
      toast('💳 Cuenta guardada'); after && setTimeout(after, 300);
    },
    danger: a ? { label: '🗑️', confirm: 'Se eliminará la cuenta (sus movimientos se quedan). ¿Seguro?', action: () => S.db.remove(priv('accounts'), a.id) } : null
  });
}
function budgetForm(b = null) {
  const cats = categories('gasto');
  modal({
    title: b ? 'Editar presupuesto' : 'Nuevo presupuesto mensual',
    body: `<div class="field"><label>Categoría</label><input class="input" name="category" list="bcats" required value="${esc(b?.category || '')}"><datalist id="bcats">${cats.map(c => `<option value="${esc(c.name)}">`).join('')}</datalist></div>
      <div class="field"><label>Límite al mes ($)</label><input class="input" name="amount" type="number" inputmode="decimal" required value="${b?.amount ?? ''}"></div>`,
    submit: async d => {
      const data = { category: d.category.trim(), amount: Number(d.amount) || 0 }; if (!data.category || !data.amount) return false;
      await ensureCategory(data.category, 'gasto');
      if (b) await S.db.update(priv('budgets'), b.id, data); else await S.db.add(priv('budgets'), data);
    },
    danger: b ? { label: '🗑️', confirm: '¿Quitar presupuesto?', action: () => S.db.remove(priv('budgets'), b.id) } : null
  });
}
function goalForm(g = null) {
  modal({
    title: g ? 'Editar meta' : 'Nueva meta de ahorro',
    body: `<div class="frow"><div class="field"><label>Meta</label><input class="input" name="name" required value="${esc(g?.name || '')}" placeholder="Viaje, celular, fondo de emergencia…"></div>
      <div class="field"><label>Emoji</label><input class="input" name="emoji" value="${esc(g?.emoji || '🎯')}" maxlength="4"></div></div>
      <div class="frow"><div class="field"><label>¿Cuánto necesitas?</label><input class="input" name="target" type="number" inputmode="decimal" required value="${g?.target ?? ''}"></div>
      <div class="field"><label>Llevas ahorrado</label><input class="input" name="saved" type="number" inputmode="decimal" value="${g?.saved ?? 0}"></div></div>
      <div class="field"><label>Para cuándo (opcional)</label><input class="input" type="date" name="deadline" value="${esc(g?.deadline || '')}"></div>`,
    submit: async d => {
      const data = { name: d.name.trim(), emoji: d.emoji || '🎯', target: Number(d.target) || 0, saved: Number(d.saved) || 0, deadline: d.deadline || '' };
      if (!data.name || !data.target) return false;
      if (g) await S.db.update(priv('goals'), g.id, data); else await S.db.add(priv('goals'), data);
    },
    danger: g ? { label: '🗑️', confirm: '¿Eliminar meta?', action: () => S.db.remove(priv('goals'), g.id) } : null
  });
}

// ---------- gráficas ----------
function donut(items, total) {
  const R = 64, C = 2 * Math.PI * R, P = pal(); let off = 0;
  const gap = items.length > 1 ? 3 : 0;
  const segs = items.map((it, i) => {
    const len = Math.max(0, it.v / total * C - gap);
    const s = `<circle cx="90" cy="90" r="${R}" fill="none" stroke="${P[i]}" stroke-width="22" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-off}" transform="rotate(-90 90 90)" class="donut-seg"><title>${esc(it.name)}: ${M(it.v)} (${Math.round(it.v / total * 100)}%)</title></circle>`;
    off += it.v / total * C; return s;
  }).join('');
  return `<svg viewBox="0 0 180 180" class="donut" role="img" aria-label="Gastos por categoría"><circle cx="90" cy="90" r="${R}" fill="none" stroke="var(--input)" stroke-width="22"/>${segs}
    <text x="90" y="84" text-anchor="middle" class="donut-l">Gastado</text><text x="90" y="106" text-anchor="middle" class="donut-v">${hide ? '$•••' : '$' + Math.round(total).toLocaleString('es-MX')}</text></svg>`;
}
function bars(months) {
  const P = pal(), max = Math.max(1, ...months.flatMap(m => [m.inc, m.exp]));
  const W = 320, H = 150, bw = 14, g = W / months.length;
  const bar = (x, v, c, lbl) => { const h = Math.max(v ? 2 : 0, v / max * (H - 24)); return `<g class="bar-hit"><rect x="${x - 4}" y="0" width="${bw + 8}" height="${H}" fill="transparent"/><path d="M${x} ${H} V${H - h + 4} q0 -4 4 -4 h${bw - 8} q4 0 4 4 V${H} Z" fill="${c}"/><title>${lbl}: ${M(v)}</title></g>`; };
  return `<svg viewBox="0 0 ${W} ${H + 22}" class="mbars" role="img" aria-label="Ingresos y gastos por mes">
    <line x1="0" y1="${H}" x2="${W}" y2="${H}" stroke="var(--card-border)"/>
    ${months.map((m, i) => { const cx = g * i + g / 2; return bar(cx - bw - 1, m.inc, P[2], `${m.label} · Ingresos`) + bar(cx + 1, m.exp, P[1], `${m.label} · Gastos`) + `<text x="${cx}" y="${H + 16}" text-anchor="middle" class="axis-t">${m.label}</text>`; }).join('')}</svg>`;
}

// ---------- vista ----------
export function renderMyFinance() {
  if (!ym) ym = isoDate().slice(0, 7);
  const [y, mo] = ym.split('-').map(Number);
  const bal = balances();
  const total = Object.values(bal).reduce((a, v) => a + v, 0);
  const list = monthTx(ym).sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || 0) - (a.createdAt || 0));
  const inc = sumKind(list, 'ingreso'), exp = sumKind(list, 'gasto');
  const prevExp = sumKind(monthTx(shiftYm(ym, -1)), 'gasto');
  const byCat = {}; list.filter(t => t.kind === 'gasto').forEach(t => byCat[t.category] = (byCat[t.category] || 0) + Number(t.amount));
  let cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([name, v]) => ({ name, v }));
  if (cats.length > 8) { const rest = cats.slice(7).reduce((a, c) => a + c.v, 0); cats = [...cats.slice(0, 7), { name: 'Otras', v: rest }]; }
  const months = Array.from({ length: 6 }, (_, i) => { const k = shiftYm(ym, i - 5); const l = monthTx(k); return { label: MONTHS[+k.slice(5) - 1].slice(0, 3), inc: sumKind(l, 'ingreso'), exp: sumKind(l, 'gasto') }; });
  const saveRate = inc ? Math.round((inc - exp) / inc * 100) : null;
  const insights = [];
  if (prevExp && exp) { const d = Math.round((exp - prevExp) / prevExp * 100); insights.push(d > 0 ? `📈 Llevas <b>${d}% más</b> gasto que el mes pasado.` : `📉 Llevas <b>${-d}% menos</b> gasto que el mes pasado. ¡Bien!`); }
  if (cats[0]) insights.push(`${catEmoji(cats[0].name)} Tu mayor gasto es <b>${esc(cats[0].name)}</b> (${Math.round(cats[0].v / exp * 100)}%).`);
  if (saveRate != null) insights.push(saveRate >= 0 ? `🐷 Estás ahorrando <b>${saveRate}%</b> de lo que entra.` : `⚠️ Estás gastando más de lo que entra este mes.`);
  const P = pal();

  return `
    <div class="row between wrap mb">
      <div class="row"><button class="icon-btn" data-act="fprev">‹</button><h2 style="font-size:20px;font-weight:900;text-transform:capitalize;min-width:160px;text-align:center">${MONTHS[mo - 1]} ${y}</h2><button class="icon-btn" data-act="fnext">›</button></div>
      <div class="row"><button class="icon-btn" data-act="hideMoney" title="${hide ? 'Mostrar montos' : 'Ocultar montos'}">${hide ? '🙈' : '👁️'}</button><span class="chip">🔒 Sólo tú ves esto</span></div>
    </div>
    <div class="grid g4">
      <section class="card deco stat"><span class="l">Saldo total</span><span class="v">${M(total)}</span><span class="tiny muted">${S.data.accounts.length} cuenta${S.data.accounts.length === 1 ? '' : 's'}</span></section>
      <section class="card deco stat"><span class="l">Ingresos del mes</span><span class="v">${M(inc)}</span></section>
      <section class="card deco stat"><span class="l">Gastos del mes</span><span class="v">${M(exp)}</span></section>
      <section class="card deco stat"><span class="l">Te queda</span><span class="v">${M(inc - exp)}</span>${saveRate != null ? `<span class="tiny muted">${saveRate}% de ahorro</span>` : ''}</section>
    </div>
    <div class="quick mt" style="grid-template-columns:repeat(3,minmax(0,1fr))">
      <a href="#" data-act="addGasto"><span>💸</span>Gasto</a><a href="#" data-act="addIngreso"><span>💰</span>Ingreso</a><a href="#" data-act="addTransfer"><span>↔️</span>Transferir</a>
    </div>

    <div class="card-title mt"><h3>💳 Mis cuentas</h3><button class="link" data-act="newAccount">＋ Cuenta</button></div>
    <div class="acc-row">${S.data.accounts.map(a => { const g = ACC_GRADS[a.grad || 0] || ACC_GRADS[0]; const v = bal[a.id] || 0; return `<button class="acc-card" style="background:linear-gradient(135deg,${g[0]},${g[1]})" data-act="editAccount" data-id="${a.id}">
      <div class="row between"><span class="acc-type">${ACC_TYPES[a.type]?.[0] || '💳'} ${ACC_TYPES[a.type]?.[1] || ''}</span><span class="acc-chip"></span></div>
      <div class="acc-name">${esc(a.name)}</div><div class="acc-bal">${a.type === 'credito' && v < 0 ? 'Debes ' + M(-v) : M(v)}</div></button>`; }).join('')}
      <button class="acc-card add" data-act="newAccount"><span style="font-size:30px">＋</span>Agregar cuenta</button></div>

    ${insights.length ? `<section class="card deco mt"><div class="card-title"><h3>🧠 Resumen del mes</h3></div><div class="col" style="gap:6px">${insights.map(i => `<div class="small">${i}</div>`).join('')}</div></section>` : ''}

    <div class="grid g2 mt">
      <section class="card deco"><div class="card-title"><h3>🍩 ¿En qué se va?</h3></div>
        ${cats.length ? `<div class="donut-wrap">${donut(cats, exp)}<div class="legend">${cats.map((c, i) => `<div class="lg-row"><span class="lg-dot" style="background:${P[i]}"></span><span class="grow ellipsis">${catEmoji(c.name)} ${esc(c.name)}</span><b>${M(c.v)}</b><span class="tiny muted" style="width:36px;text-align:right">${Math.round(c.v / exp * 100)}%</span></div>`).join('')}</div></div>` : '<div class="empty"><div class="big">🍩</div>Registra gastos para ver tu gráfica</div>'}
      </section>
      <section class="card deco"><div class="card-title"><h3>📊 Últimos 6 meses</h3><div class="row tiny bold"><span class="lg-dot" style="background:${P[2]}"></span>Ingresos <span class="lg-dot" style="background:${P[1]};margin-left:8px"></span>Gastos</div></div>
        ${bars(months)}</section>
    </div>

    <div class="grid g2 mt">
      <section class="card deco"><div class="card-title"><h3>🎯 Presupuestos</h3><button class="link" data-act="newBudget">＋ Presupuesto</button></div>
        <div class="col">${S.data.budgets.map(b => { const spent = byCat[b.category] || 0; const p = spent / b.amount; const st = p > 1 ? ['#e34948', '⚠️ Excedido'] : p > .8 ? ['#eda100', '🟡 Cuidado'] : ['#1baf7a', '✅ Bien']; return `<div class="clickable" style="cursor:pointer" data-act="editBudget" data-id="${b.id}">
          <div class="row between small bold"><span>${catEmoji(b.category)} ${esc(b.category)}</span><span>${M(spent)} / ${M(b.amount)}</span></div>
          <div class="progress mt-s"><i style="width:${Math.min(100, p * 100)}%;background:${st[0]}"></i></div><div class="tiny muted mt-s">${st[1]} · ${p <= 1 ? `quedan ${M(b.amount - spent)}` : `te pasaste ${M(spent - b.amount)}`}</div></div>`; }).join('') || '<div class="empty small">Pon un límite por categoría y te avisamos cuando te acerques</div>'}</div></section>
      <section class="card deco"><div class="card-title"><h3>🐷 Metas de ahorro</h3><button class="link" data-act="newGoal">＋ Meta</button></div>
        <div class="col">${S.data.goals.map(g => { const p = Math.min(1, (g.saved || 0) / g.target); return `<div class="item" style="flex-wrap:wrap"><span class="emoji" style="font-size:28px">${esc(g.emoji || '🎯')}</span>
          <div class="grow clickable" style="cursor:pointer" data-act="editGoal" data-id="${g.id}"><div class="bold">${esc(g.name)}</div><div class="tiny muted">${M(g.saved || 0)} de ${M(g.target)}${g.deadline ? ' · para el ' + fmtShort(g.deadline) : ''}</div><div class="progress mt-s"><i style="width:${p * 100}%"></i></div></div>
          <button class="btn sm" data-act="abonar" data-id="${g.id}">＋ Abonar</button></div>`; }).join('') || '<div class="empty small">¿Para qué estás ahorrando? 🏝️📱🚗</div>'}</div></section>
    </div>

    <section class="card deco mt"><div class="card-title"><h3>🧾 Movimientos de ${MONTHS[mo - 1]}</h3><span class="tiny muted">${list.length}</span></div>
      <div class="list">${list.map(t => { const acc = S.data.accounts.find(a => a.id === t.accountId); const to = S.data.accounts.find(a => a.id === t.toAccountId);
        return `<div class="item clickable" data-act="editTx" data-id="${t.id}"><span class="emoji">${t.kind === 'transfer' ? '↔️' : catEmoji(t.category, t.kind)}</span>
        <div class="grow"><div class="bold ellipsis">${esc(t.note || t.category || 'Transferencia')}</div><div class="tiny muted">${fmtShort(t.date)} · ${t.kind === 'transfer' ? `${esc(acc?.name || '?')} → ${esc(to?.name || '?')}` : `${esc(t.category)} · ${esc(acc?.name || '')}`}</div></div>
        <b style="color:${t.kind === 'ingreso' ? P[2] : t.kind === 'gasto' ? 'var(--text)' : 'var(--muted)'}">${t.kind === 'ingreso' ? '+' : t.kind === 'gasto' ? '−' : ''}${M(t.amount)}</b></div>`; }).join('') || '<div class="empty">Sin movimientos este mes</div>'}</div></section>
    ${categories('gasto').length ? `<section class="card deco mt"><div class="card-title"><h3>🏷️ Mis categorías</h3><span class="tiny muted">se crean solas al escribir una nueva</span></div>
      <div class="chips">${[...categories('gasto'), ...categories('ingreso')].map(c => `<span class="chip">${c.emoji} ${esc(c.name)}${c.id ? ` <button class="link tiny" data-act="delCat" data-id="${c.id}">✕</button>` : ''}</span>`).join('')}</div></section>` : ''}`;
}

export const financeActions = {
  fprev() { ym = shiftYm(ym, -1); hooks.rerender(); },
  fnext() { ym = shiftYm(ym, 1); hooks.rerender(); },
  hideMoney() { hide = !hide; try { localStorage.setItem('nido-hide-money', hide ? '1' : '0'); } catch { } hooks.rerender(); },
  addGasto() { txForm('gasto'); }, addIngreso() { txForm('ingreso'); }, addTransfer() { if (S.data.accounts.length < 2) { toast('Necesitas al menos 2 cuentas para transferir'); return; } txForm('transfer'); },
  editTx(el) { const t = S.data.txns.find(x => x.id === el.dataset.id); txForm(t.kind, t); },
  newAccount() { accountForm(); }, editAccount(el) { accountForm(S.data.accounts.find(a => a.id === el.dataset.id)); },
  newBudget() { budgetForm(); }, editBudget(el) { budgetForm(S.data.budgets.find(b => b.id === el.dataset.id)); },
  newGoal() { goalForm(); }, editGoal(el) { goalForm(S.data.goals.find(g => g.id === el.dataset.id)); },
  abonar(el) {
    const g = S.data.goals.find(x => x.id === el.dataset.id);
    modal({ title: `${esc(g.emoji)} Abonar a ${esc(g.name)}`, body: `<div class="field"><label>¿Cuánto?</label><input class="input" name="a" type="number" inputmode="decimal" required style="font-size:24px;font-weight:900;text-align:center"></div>`, submit: async d => {
      const a = Number(d.a); if (!a) return false; const saved = (g.saved || 0) + a;
      await S.db.update(priv('goals'), g.id, { saved });
      if (saved >= g.target) { hooks.celebrate(innerWidth / 2, innerHeight / 3, 'confetti'); toast(`🎉 ¡Lograste tu meta: ${g.name}!`); } else toast(`🐷 Llevas ${Math.round(saved / g.target * 100)}%`);
    } });
  },
  async delCat(el) { if (await confirmBox('¿Quitar esta categoría? (tus movimientos no se borran)')) await S.db.remove(priv('categories'), el.dataset.id); }
};
