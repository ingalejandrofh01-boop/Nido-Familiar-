// 💰 Dinero: gastos compartidos, presupuesto y cuentas entre familiares
import { S, hooks, members, member, isAdult, isAdmin } from '../store.js';
import { esc, avatar, money, isoDate, modal, toast, memberPicker, MONTHS, fmtShort } from '../ui.js';
import { renderMyFinance, financeActions } from './myfinance.js';
let mtab = null;

export const CATS = {
  casa: ['🏠', 'Casa', '#8b5cf6'], super: ['🛒', 'Supermercado', '#22c55e'], comida: ['🍔', 'Comida', '#f97316'],
  transporte: ['🚗', 'Transporte', '#0ea5e9'], servicios: ['💡', 'Servicios', '#eab308'], escuela: ['🎒', 'Escuela', '#14b8a6'],
  salud: ['💊', 'Salud', '#ef4444'], ocio: ['🎉', 'Diversión', '#ec4899'], regalos: ['🎁', 'Regalos', '#d946ef'], otros: ['📦', 'Otros', '#64748b']
};
let ym = null;

export function expenseForm(e = null) {
  modal({
    title: e?.id ? 'Editar gasto' : 'Nuevo gasto',
    body: `<div class="frow"><div class="field"><label>Concepto</label><input class="input" name="title" required value="${esc(e?.title || '')}" placeholder="Súper, gasolina, luz…"></div>
      <div class="field"><label>Monto ($)</label><input class="input" type="number" step="0.01" min="0" name="amount" required value="${e?.amount ?? ''}"></div></div>
      <div class="field"><label>Categoría</label><div class="chips">${Object.entries(CATS).map(([k, [em, n]]) => `<label class="chip chip-btn"><input type="radio" name="category" value="${k}" ${(e?.category || 'super') === k ? 'checked' : ''}> ${em} ${n}</label>`).join('')}</div></div>
      <div class="frow"><div class="field"><label>¿Quién pagó?</label><select class="input" name="paidBy">${members().map(m => `<option value="${m.id}" ${(e?.paidBy || S.me.id) === m.id ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}</select></div>
      <div class="field"><label>Fecha</label><input class="input" type="date" name="date" value="${esc(e?.date || isoDate())}"></div></div>
      <div class="field"><label>¿Se divide entre varios? (opcional, para cuentas entre familiares)</label>${memberPicker('split', members(), e?.split || [])}</div>`,
    submit: async d => {
      const data = { title: d.title.trim(), amount: Number(d.amount) || 0, category: d.category || 'otros', paidBy: d.paidBy, date: d.date, split: d.split || [] };
      if (!data.title || !data.amount) { toast('Escribe concepto y monto'); return false; }
      if (e?.id) await S.db.update('expenses', e.id, data); else await S.db.add('expenses', data);
    },
    danger: e?.id ? { label: '🗑️', confirm: '¿Eliminar gasto?', action: () => S.db.remove('expenses', e.id) } : null
  });
}

function balances() {
  const net = {};
  for (const e of S.data.expenses) {
    if (!e.split || !e.split.length) continue;
    const share = e.amount / e.split.length;
    net[e.paidBy] = (net[e.paidBy] || 0) + Number(e.amount);
    e.split.forEach(id => net[id] = (net[id] || 0) - share);
  }
  const cred = Object.entries(net).filter(([, v]) => v > 0.5).map(([id, v]) => ({ id, v })).sort((a, b) => b.v - a.v);
  const debt = Object.entries(net).filter(([, v]) => v < -0.5).map(([id, v]) => ({ id, v: -v })).sort((a, b) => b.v - a.v);
  const out = [];
  let i = 0, j = 0;
  while (i < debt.length && j < cred.length) {
    const x = Math.min(debt[i].v, cred[j].v);
    out.push({ from: debt[i].id, to: cred[j].id, amount: Math.round(x) });
    debt[i].v -= x; cred[j].v -= x;
    if (debt[i].v < 0.5) i++; if (cred[j].v < 0.5) j++;
  }
  return out;
}

export default {
  render() {
    if (!mtab) mtab = 'personal';
    if (!isAdult()) mtab = 'personal';
    const tabs = `<div class="page-head"><div><h1>Dinero</h1><p>${mtab === 'personal' ? 'Tus finanzas personales, privadas sólo para ti' : 'Gastos compartidos, presupuesto y cuentas claras'}</p></div>
      <div class="row" style="gap:8px"><button class="btn" data-act="scanTicket">🧾 Ticket</button>${mtab === 'familia' ? '<button class="btn primary" data-act="new">＋ Gasto familiar</button>' : ''}</div></div>
      <div class="seg mb"><button class="${mtab === 'personal' ? 'on' : ''}" data-act="mtab" data-t="personal">🙋 Mis finanzas</button>${isAdult() ? `<button class="${mtab === 'familia' ? 'on' : ''}" data-act="mtab" data-t="familia">👨‍👩‍👧 Familiar</button>` : ''}</div>`;
    const promo = `<a class="card deco mb cc-promo" href="#/cuentas"><span style="font-size:34px">🤝</span><div class="grow"><div class="bold">Cuentas claras</div><div class="small muted bold">Divide renta, súper o préstamos, págalos por quincena y lleva los abonos</div></div><span class="btn sm primary">Abrir</span></a>`;
    if (mtab === 'personal') return tabs + promo + renderMyFinance();
    return tabs + promo + this.renderFamily();
  },
  renderFamily() {
    if (!ym) ym = isoDate().slice(0, 7);
    const [y, m] = ym.split('-').map(Number);
    const list = S.data.expenses.filter(e => (e.date || '').startsWith(ym) && e.category !== 'ajuste').sort((a, b) => b.date.localeCompare(a.date));
    const total = list.reduce((a, e) => a + Number(e.amount || 0), 0);
    const budget = Number(S.family?.budget || 0);
    const byCat = {}; list.forEach(e => byCat[e.category] = (byCat[e.category] || 0) + Number(e.amount));
    const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]); const max = cats[0]?.[1] || 1;
    const byWho = {}; list.forEach(e => byWho[e.paidBy] = (byWho[e.paidBy] || 0) + Number(e.amount));
    const debts = balances();
    const pct = budget ? Math.min(100, total / budget * 100) : 0;
    return `
      <div class="row mb"><button class="icon-btn" data-act="prev">‹</button><h2 style="font-size:22px;font-weight:900;text-transform:capitalize;min-width:180px;text-align:center">${MONTHS[m - 1]} ${y}</h2><button class="icon-btn" data-act="next">›</button></div>
      <div class="grid g3">
        <section class="card deco stat"><span class="l">Total del mes</span><span class="v">${money(total)}</span><span class="tiny muted">${list.length} movimientos</span></section>
        <section class="card deco stat"><span class="l">Presupuesto ${isAdmin() ? '<button class="link tiny" data-act="budget">editar</button>' : ''}</span><span class="v">${budget ? money(budget) : '—'}</span>
          ${budget ? `<div class="progress mt-s"><i style="width:${pct}%;${pct > 90 ? 'background:#ef4444' : ''}"></i></div><span class="tiny muted">${budget - total >= 0 ? `Quedan ${money(budget - total)}` : `Excedido por ${money(total - budget)} ⚠️`}</span>` : '<span class="tiny muted">Define un presupuesto mensual</span>'}</section>
        <section class="card deco stat"><span class="l">Quién pagó más</span>${Object.entries(byWho).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id, v]) => `<div class="row small bold mt-s">${avatar(member(id), 'sm')}<span class="grow">${esc(member(id)?.name || '?')}</span>${money(v)}</div>`).join('') || '<span class="tiny muted">—</span>'}</section>
      </div>
      <div class="grid g2 mt">
        <section class="card deco"><div class="card-title"><h3>📊 Por categoría</h3></div>
          <div class="col">${cats.map(([k, v]) => { const [em, n, c] = CATS[k] || CATS.otros; return `<div class="bar-row"><span>${em} ${n}</span><div class="bar"><i style="width:${v / max * 100}%;--c:${c}"></i></div><b>${money(v)}</b></div>`; }).join('') || '<div class="empty">Sin gastos este mes</div>'}</div></section>
        <section class="card deco"><div class="card-title"><h3>🤝 Cuentas entre familiares</h3><a href="#/cuentas">Cuentas claras ›</a></div>
          <div class="list">${debts.map(d => `<div class="item">${avatar(member(d.from), 'sm')}<div class="grow small"><b>${esc(member(d.from)?.name)}</b> le debe <b>${money(d.amount)}</b> a <b>${esc(member(d.to)?.name)}</b></div>${avatar(member(d.to), 'sm')}<button class="btn sm" data-act="settle" data-f="${d.from}" data-t="${d.to}" data-a="${d.amount}">Saldar</button></div>`).join('') || '<div class="empty"><div class="big">✅</div>Todos a mano</div>'}</div>
          <p class="tiny muted mt-s">Se calcula con los gastos marcados “se divide entre varios”.</p></section>
      </div>
      <section class="card deco mt"><div class="card-title"><h3>🧾 Movimientos</h3></div>
        <div class="list">${list.map(e => { const [em, n] = CATS[e.category] || CATS.otros; return `<div class="item clickable" data-act="edit" data-id="${e.id}"><span class="emoji">${em}</span><div class="grow"><div class="bold ellipsis">${esc(e.title)}</div><div class="tiny muted">${fmtShort(e.date)} · ${n} · pagó ${esc(member(e.paidBy)?.name || '?')}${e.split?.length ? ` · ÷${e.split.length}` : ''}</div></div><b>${money(e.amount)}</b></div>`; }).join('') || '<div class="empty">Sin movimientos</div>'}</div></section>`;
  },
  actions: {
    ...financeActions,
    async scanTicket() { (await import('../scanner.js')).openScanner(); },
    mtab(el) { mtab = el.dataset.t; hooks.rerender(); },
    new() { expenseForm(); },
    edit(el) { expenseForm(S.data.expenses.find(e => e.id === el.dataset.id)); },
    prev() { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 2, 1); ym = isoDate(d).slice(0, 7); hooks.rerender(); },
    next() { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m, 1); ym = isoDate(d).slice(0, 7); hooks.rerender(); },
    budget() { modal({ title: 'Presupuesto mensual', body: `<div class="field"><label>Monto ($)</label><input class="input" type="number" name="b" value="${S.family?.budget || ''}"></div>`, submit: async d => { await S.db.updateFamily({ budget: Number(d.b) || 0 }); } }); },
    async settle(el) {
      const { f, t, a } = el.dataset;
      await S.db.add('expenses', { title: `Pago de ${member(f)?.name} a ${member(t)?.name}`, amount: Number(a), category: 'ajuste', paidBy: f, split: [t], date: isoDate() });
      toast('🤝 ¡Cuentas saldadas!');
    }
  }
};
