// 🤝 Cuentas claras: dividir gastos, pagos por quincena, abonos y confirmación de recibido
import { S, hooks, members, member, notify, isAdult } from '../store.js';
import { esc, avatar, modal, toast, fmtDate, isoDate, parseDate, today0, confirmBox, compressImage, pickFiles, timeAgo } from '../ui.js';
import { coin } from '../motion.js';
import { r2, cash, BILL_CATS, SPLITS, FREQS, METHODS, computeShares, dueDates, payday, quincena, debtors, schedule, personStatus, billStatus, planLabel, agendaRows, periodTotals, pairBalances, personName } from '../debts.js';

let tab = 'agenda', scopeAll = false, showDone = false;
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const bill = (id) => (S.data.bills || []).find(b => b.id === id);
const rid = () => Math.random().toString(36).slice(2, 9);
const qLabel = (q) => `${q.s.getDate()}–${q.e.getDate()} ${MES[q.e.getMonth()]}`;
const STATUS = { pagado: ['✅', 'Pagado'], parcial: ['🟡', 'Parcial'], pendiente: ['⏳', 'Pendiente'], vencido: ['⚠️', 'Vencido'] };
const catE = (b) => (BILL_CATS[b.category] || BILL_CATS.otro)[0];

// ---------------- Formulario de cuenta ----------------
function billForm(b = null) {
  const ppl0 = b ? Object.keys(b.shares || {}) : members().filter(m => ['admin', 'adulto'].includes(m.role)).map(m => m.id);
  const st = { mode: b?.split || 'igual', people: new Set(ppl0.length ? ppl0 : members().map(m => m.id)), inputs: { ...(b?.inputs || {}) }, freq: b?.plan?.freq || 'unico' };
  const defStart = isoDate(payday(today0()) < today0() ? today0() : payday(today0()));
  let getShares = () => ({});
  modal({
    title: b ? '✏️ Editar cuenta' : '🤝 Nueva cuenta dividida', wide: true,
    body: `<div class="field"><label>¿De qué es?</label><div class="chips">${Object.entries(BILL_CATS).map(([k, [e, l]]) => `<label class="chip chip-btn"><input type="radio" name="category" value="${k}" ${(b?.category || 'renta') === k ? 'checked' : ''}> ${e} ${l}</label>`).join('')}</div></div>
      <div class="frow"><div class="field"><label>Concepto</label><input class="input" name="title" required value="${esc(b?.title || '')}" placeholder="Renta de octubre, súper de la semana, préstamo…"></div><div class="field" style="max-width:160px"><label>Total $</label><input class="input" name="total" type="number" inputmode="decimal" step="0.01" min="0" required value="${b?.total || ''}"></div></div>
      <div class="frow"><div class="field"><label>¿A quién se le paga? (quien puso o junta el dinero)</label><select class="input" name="to">${members().map(x => `<option value="${x.id}" ${(b?.to || S.me.id) === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div><div class="field" style="max-width:170px"><label>Fecha</label><input class="input" type="date" name="date" value="${b?.date || isoDate()}"></div></div>
      <div class="field"><label>¿Entre quiénes se divide?</label><div class="chips" data-people>${members().map(x => `<label class="chip chip-btn"><input type="checkbox" value="${x.id}" ${st.people.has(x.id) ? 'checked' : ''}> ${esc(x.emoji || '')} ${esc(x.name)}</label>`).join('')}</div></div>
      <div class="field"><label>¿Cómo se divide?</label><div class="seg wrap" data-mode>${Object.entries(SPLITS).map(([k, l]) => `<button type="button" class="${st.mode === k ? 'on' : ''}" data-m="${k}">${l}</button>`).join('')}</div></div>
      <div class="split-table" data-table></div>
      <div class="field mt"><label>¿Cómo se paga?</label><div class="seg wrap" data-freq>${Object.entries(FREQS).map(([k, l]) => `<button type="button" class="${st.freq === k ? 'on' : ''}" data-f="${k}">${l}</button>`).join('')}</div></div>
      <div class="frow" data-planrow><div class="field" style="max-width:150px"><label>¿En cuántos pagos?</label><input class="input" type="number" name="n" min="1" max="48" value="${b?.plan?.n || 2}"></div><div class="field"><label>Primer pago</label><input class="input" type="date" name="start" value="${b?.plan?.start || defStart}"></div></div>
      <div class="plan-prev small bold" data-prev></div>
      <div class="row wrap mt" style="gap:8px"><label class="chip chip-btn"><input type="checkbox" name="monthly" ${b?.recurring?.monthly ? 'checked' : ''}> 🔁 Se repite cada mes (renta, internet, colegiatura…)</label></div>
      <div class="field mt"><label>Notas</label><input class="input" name="notes" value="${esc(b?.notes || '')}" placeholder="CLABE, número de referencia, lo que acordaron…"></div>`,
    danger: b ? { label: 'Borrar', confirm: '¿Borrar esta cuenta y todos sus abonos?', action: async () => {
      if (b.recurring?.parentId) { const tpl = bill(b.recurring.parentId); if (tpl) await S.db.update('bills', tpl.id, { 'recurring.skip': [...(tpl.recurring.skip || []), b.date.slice(0, 7)] }); }
      await S.db.remove('bills', b.id); hooks.go('cuentas');
    } } : undefined,
    submitLabel: b ? 'Guardar' : '🤝 Crear cuenta',
    onOpen(f) {
      const total = () => r2(f.querySelector('[name=total]').value);
      const people = () => members().filter(x => st.people.has(x.id));
      const shares = () => computeShares(total(), st.mode, people().map(x => x.id), st.inputs);
      const paint = () => {
        const T = total(), sh = shares(), sum = r2(Object.values(sh).reduce((a, v) => a + v, 0)), to = f.querySelector('[name=to]').value;
        const unit = st.mode === 'porcentaje' ? '%' : st.mode === 'partes' ? 'partes' : '$';
        const pctSum = st.mode === 'porcentaje' ? people().reduce((a, x) => a + (Number(st.inputs[x.id]) || 0), 0) : 0;
        f.querySelector('[data-table]').innerHTML = people().length ? `<div class="st-rows">${people().map(x => `<div class="st-row">${avatar(x, 'sm')}<span class="grow bold small">${esc(x.name)}${x.id === to ? ' <span class="tiny muted">(recibe)</span>' : ''}</span>
          ${st.mode !== 'igual' ? `<input class="input st-in" type="number" inputmode="decimal" step="${st.mode === 'exacto' ? '0.01' : '1'}" min="0" data-in="${x.id}" value="${esc(st.inputs[x.id] ?? (st.mode === 'partes' ? 1 : ''))}" placeholder="${unit}"><span class="tiny muted st-u">${unit === '$' ? '' : unit}</span>` : ''}
          <b class="st-v">${cash(sh[x.id] || 0)}</b></div>`).join('')}</div>
          <div class="st-foot tiny bold ${Math.abs(sum - T) > 0.004 && T ? 'bad' : ''}">${st.mode === 'porcentaje' && pctSum !== 100 ? `Los porcentajes suman ${pctSum}% (deben sumar 100%) · ` : ''}${Math.abs(sum - T) > 0.004 && T ? (sum < T ? `Faltan ${cash(T - sum)} por repartir` : `Te pasaste por ${cash(sum - T)}`) : T ? `✅ Suma ${cash(sum)}` : 'Escribe el total'}</div>` : '<div class="tiny muted">Elige quiénes entran</div>';
        f.querySelectorAll('[data-in]').forEach(i => i.oninput = () => { st.inputs[i.dataset.in] = i.value; const pos = i.selectionStart; paint(); const ni = f.querySelector(`[data-in="${i.dataset.in}"]`); if (ni) { ni.focus(); try { ni.setSelectionRange(pos, pos); } catch { } } });
        // Plan
        f.querySelector('[data-planrow]').style.display = st.freq === 'unico' ? 'none' : '';
        f.querySelector('[name=n]').closest('.field').style.display = st.freq === 'unico' ? 'none' : '';
        const plan = { freq: st.freq, n: st.freq === 'unico' ? 1 : Number(f.querySelector('[name=n]').value) || 1, start: f.querySelector('[name=start]').value || isoDate() };
        const ds = dueDates(plan); const deb = people().filter(x => x.id !== to && (sh[x.id] || 0) > 0);
        f.querySelector('[data-prev]').innerHTML = deb.length && T ? `🗓️ ${ds.length === 1 ? `Se paga el ${fmtDate(ds[0])}` : `${ds.length} pagos: ${ds.slice(0, 4).map(d => { const x = parseDate(d); return `${x.getDate()} ${MES[x.getMonth()]}`; }).join(', ')}${ds.length > 4 ? '…' : ''}`}<br>${deb.map(x => `${esc(x.name.split(' ')[0])}: ${ds.length > 1 ? `${ds.length} × ${cash(r2((sh[x.id] || 0) / ds.length))}` : cash(sh[x.id])}`).join(' · ')}` : '';
      };
      f.querySelectorAll('[data-people] input').forEach(i => i.onchange = () => { i.checked ? st.people.add(i.value) : st.people.delete(i.value); paint(); });
      f.querySelectorAll('[data-m]').forEach(bt => bt.onclick = () => { st.mode = bt.dataset.m; f.querySelectorAll('[data-m]').forEach(x => x.classList.toggle('on', x === bt)); if (st.mode === 'porcentaje') { const n = st.people.size; [...st.people].forEach((id, k) => st.inputs[id] = st.inputs[id] && b?.split === 'porcentaje' ? st.inputs[id] : Math.floor(100 / n) + (k === n - 1 ? 100 - Math.floor(100 / n) * n : 0)); } else if (st.mode === 'partes') [...st.people].forEach(id => st.inputs[id] = b?.split === 'partes' && st.inputs[id] ? st.inputs[id] : 1); else if (st.mode === 'exacto') [...st.people].forEach(id => st.inputs[id] = b?.split === 'exacto' ? st.inputs[id] : ''); paint(); });
      f.querySelectorAll('[data-f]').forEach(bt => bt.onclick = () => { st.freq = bt.dataset.f; f.querySelectorAll('[data-f]').forEach(x => x.classList.toggle('on', x === bt)); if (st.freq === 'quincenal') f.querySelector('[name=start]').value = isoDate(payday(today0())); paint(); });
      ['total', 'n', 'start', 'to'].forEach(n => { const el = f.querySelector(`[name=${n}]`); el.addEventListener('input', paint); el.addEventListener('change', paint); });
      getShares = shares; paint();
    },
    submit: async d => {
      const total = r2(d.total); if (!d.title.trim() || !total) { toast('Pon concepto y total'); return false; }
      const shares = getShares(); const sum = r2(Object.values(shares).reduce((a, v) => a + v, 0));
      if (!Object.keys(shares).length) { toast('Elige entre quiénes se divide'); return false; }
      if (Math.abs(sum - total) > 0.004) { toast(`La división suma ${cash(sum)} y el total es ${cash(total)}`); return false; }
      if (st.mode === 'porcentaje') { const p = [...st.people].reduce((a, id) => a + (Number(st.inputs[id]) || 0), 0); if (Math.round(p) !== 100) { toast('Los porcentajes deben sumar 100%'); return false; } }
      const data = { title: d.title.trim(), category: d.category || 'otro', total, date: d.date || isoDate(), to: d.to, split: st.mode, inputs: st.mode === 'igual' ? {} : Object.fromEntries([...st.people].map(id => [id, st.inputs[id] ?? ''])), shares,
        plan: { freq: st.freq, n: st.freq === 'unico' ? 1 : Math.max(1, Number(d.n) || 1), start: st.freq === 'unico' ? (d.date || isoDate()) : (d.start || isoDate()) }, notes: d.notes || '' };
      if (!b?.recurring?.parentId) data.recurring = d.monthly ? { monthly: true, skip: b?.recurring?.skip || [] } : null;
      if (b) { await S.db.update('bills', b.id, data); toast('✅ Cuenta actualizada'); return; }
      const id = await S.db.add('bills', { ...data, payments: [], by: S.me.id });
      const tmp = { ...data, id, payments: [] };
      for (const mid of debtors(tmp)) notify({ to: [mid], icon: catE(tmp), title: `Nueva cuenta: ${data.title}`, body: `Te toca ${cash(shares[mid])}${data.plan.n > 1 ? ` en ${planLabel(data.plan)}` : ''} · se le paga a ${personName(data.to)}`, link: 'cuenta/' + id });
      toast('🤝 ¡Cuenta creada! Ya les avisamos'); hooks.go('cuenta/' + id);
    }
  });
}

// ---------------- Abono ----------------
function paymentForm(b, from, suggested) {
  const iAmTo = b.to === S.me.id; const st0 = personStatus(b, from || S.me.id);
  let proof = '';
  const debs = debtors(b).filter(id => personStatus(b, id).remaining > 0 || id === from);
  modal({
    title: `💸 Abono · ${esc(b.title)}`,
    body: `${iAmTo ? `<div class="field"><label>¿Quién te pagó?</label><select class="input" name="from">${debs.map(id => `<option value="${id}" ${id === from ? 'selected' : ''}>${esc(member(id)?.name || '?')} · debe ${cash(personStatus(b, id).remaining)}</option>`).join('')}</select></div>` : `<input type="hidden" name="from" value="${esc(from || S.me.id)}"><p class="small bold">Le abonas a <b>${esc(member(b.to)?.name || '?')}</b>. Te faltan <b>${cash(st0.remaining)}</b>${st0.next ? ` · el siguiente pago es de ${cash(st0.next.left)} (${fmtDate(st0.next.due)})` : ''}.</p>`}
      <div class="frow"><div class="field"><label>¿Cuánto?</label><input class="input" name="amount" type="number" inputmode="decimal" step="0.01" min="0" required value="${suggested || st0.next?.left || st0.remaining || ''}"></div><div class="field"><label>Fecha</label><input class="input" type="date" name="date" value="${isoDate()}"></div></div>
      <div class="chips mb" data-quick>${st0.next ? `<button type="button" class="chip chip-btn" data-v="${st0.next.left}">Este pago · ${cash(st0.next.left)}</button>` : ''}${st0.remaining ? `<button type="button" class="chip chip-btn" data-v="${st0.remaining}">Todo lo que falta · ${cash(st0.remaining)}</button>` : ''}</div>
      <div class="field"><label>¿Cómo?</label><div class="chips">${Object.entries(METHODS).map(([k, l], i) => `<label class="chip chip-btn"><input type="radio" name="method" value="${k}" ${i === 1 ? 'checked' : ''}> ${l}</label>`).join('')}</div></div>
      <div class="field"><label>Nota (opcional)</label><input class="input" name="note" placeholder="Referencia, “te lo dejé en el cajón”…"></div>
      <div class="row" style="gap:10px"><button type="button" class="btn sm" data-proof>📎 Foto del comprobante</button><span class="tiny muted" data-pst></span></div>`,
    submitLabel: iAmTo ? '✅ Registrar pago recibido' : '💸 Registrar abono',
    onOpen(f) {
      f.querySelectorAll('[data-v]').forEach(x => x.onclick = () => { f.querySelector('[name=amount]').value = x.dataset.v; });
      f.querySelector('[data-proof]').onclick = async () => { const [file] = await pickFiles(); if (!file) return; proof = await compressImage(file, 900, .7, 110000); f.querySelector('[data-pst]').textContent = '✅ Comprobante listo'; };
      const sel = f.querySelector('select[name=from]'); if (sel) sel.onchange = () => { const s = personStatus(b, sel.value); f.querySelector('[name=amount]').value = s.next?.left || s.remaining || ''; };
    },
    submit: async d => {
      const amount = r2(d.amount); if (!amount) return false;
      const fresh = bill(b.id) || b;
      const p = { id: rid(), from: d.from, amount, date: d.date || isoDate(), method: d.method || 'otro', note: d.note || '', proof, by: S.me.id, at: Date.now(), confirmed: fresh.to === S.me.id };
      await S.db.update('bills', b.id, { payments: [...(fresh.payments || []), p] });
      coin();
      const after = personStatus({ ...fresh, payments: [...(fresh.payments || []), p] }, d.from);
      if (after.done) { hooks.celebrate(innerWidth / 2, innerHeight / 3, 'confetti'); toast(`🎉 ¡${d.from === S.me.id ? 'Quedaste' : personName(d.from) + ' quedó'} al corriente en ${b.title}!`); } else toast(`💸 Abono de ${cash(amount)} registrado · faltan ${cash(after.remaining)}`);
      if (p.confirmed) { if (d.from !== S.me.id) notify({ to: [d.from], icon: '✅', title: `${personName(S.me.id)} registró tu pago de ${cash(amount)}`, body: `${b.title}${after.done ? ' · ¡quedaste al corriente! 🎉' : ` · te faltan ${cash(after.remaining)}`}`, link: 'cuenta/' + b.id }); }
      else notify({ to: [fresh.to], icon: '💸', title: `${personName(d.from)} te abonó ${cash(amount)}`, body: `${b.title} · confírmalo cuando lo recibas`, link: 'cuenta/' + b.id });
    }
  });
}

// Pagar a una persona: reparte el abono entre las cuentas más viejas primero
function pairPayForm(from, to) {
  const rows = agendaRows({ all: true }).filter(r => r.from === from && r.to === to);
  const owed = r2(rows.reduce((a, r) => a + r.left, 0)); if (!owed) { toast('No hay nada pendiente 🙌'); return; }
  const iAmTo = to === S.me.id;
  modal({
    title: `💸 ${iAmTo ? `${esc(member(from)?.name)} te paga` : `Pagarle a ${esc(member(to)?.name)}`}`,
    body: `<p class="small bold">${iAmTo ? 'Te debe' : 'Le debes'} <b>${cash(owed)}</b> en ${new Set(rows.map(r => r.bill.id)).size} cuenta(s). El abono se aplica primero a lo más antiguo.</p>
      <div class="field"><label>¿Cuánto?</label><input class="input" name="amount" type="number" step="0.01" inputmode="decimal" value="${owed}"></div>
      <div class="field"><label>¿Cómo?</label><div class="chips">${Object.entries(METHODS).map(([k, l], i) => `<label class="chip chip-btn"><input type="radio" name="method" value="${k}" ${i === 1 ? 'checked' : ''}> ${l}</label>`).join('')}</div></div>`,
    submitLabel: iAmTo ? '✅ Registrar lo que recibí' : '💸 Registrar pago',
    submit: async d => {
      let left = Math.min(r2(d.amount), owed); if (!left) return false; const perBill = {};
      for (const r of rows) { if (left <= 0) break; const a = r2(Math.min(left, r.left)); perBill[r.bill.id] = r2((perBill[r.bill.id] || 0) + a); left = r2(left - a); }
      for (const [bid, amount] of Object.entries(perBill)) { const b = bill(bid); await S.db.update('bills', bid, { payments: [...(b.payments || []), { id: rid(), from, amount, date: isoDate(), method: d.method || 'otro', note: 'Pago agrupado', proof: '', by: S.me.id, at: Date.now(), confirmed: iAmTo }] }); }
      toast(`💸 Aplicado a ${Object.keys(perBill).length} cuenta(s)`);
      notify({ to: [iAmTo ? from : to], icon: '💸', title: iAmTo ? `${personName(to)} registró tu pago de ${cash(d.amount)}` : `${personName(from)} te pagó ${cash(d.amount)}`, body: iAmTo ? '¡Gracias!' : 'Confírmalo cuando lo recibas', link: 'cuentas' });
    }
  });
}

// ---------------- Vistas ----------------
function rowHTML(r) {
  const d = parseDate(r.due), me = S.me.id, [si, sl] = STATUS[r.status];
  return `<div class="debt-row ${r.status}" data-act="open" data-id="${r.bill.id}">
    <div class="dr-date"><b>${d.getDate()}</b><span>${MES[d.getMonth()]}</span></div>
    <div class="grow" style="min-width:0"><div class="bold small ellipsis">${catE(r.bill)} ${esc(r.bill.title)}${r.of > 1 ? ` <span class="muted">· ${r.n}/${r.of}</span>` : ''}</div>
      <div class="tiny muted dr-who">${avatar(member(r.from), 'xs')} ${r.from === me ? 'Tú pagas' : esc(personName(r.from))} → ${avatar(member(r.to), 'xs')} ${r.to === me ? 'a ti' : esc(personName(r.to))}</div></div>
    <div class="dr-amt"><b>${cash(r.left)}</b><span class="tiny ${r.status === 'vencido' ? 'bad' : 'muted'}">${si} ${sl}</span></div>
    <div class="dr-act">${r.from === me ? `<button class="btn sm primary" data-act="pay" data-id="${r.bill.id}" data-f="${r.from}" data-v="${r.left}">💸 Abonar</button>` : r.to === me ? `<button class="btn sm" data-act="got" data-id="${r.bill.id}" data-f="${r.from}" data-v="${r.left}">✅ Me pagó</button><button class="icon-btn sm" data-act="remind" data-id="${r.bill.id}" data-f="${r.from}" data-v="${r.left}" title="Recordar">📣</button>` : ''}</div></div>`;
}

export const billsView = {
  render() {
    const T = periodTotals(), q0 = T.q0, q1 = T.q1, t = isoDate();
    const rows = agendaRows({ all: scopeAll });
    const groups = [['⚠️ Vencido', rows.filter(r => r.due < t)], [`📅 Esta quincena · ${qLabel(q0)}`, rows.filter(r => r.due >= t && r.due <= q0.end)], [`🔜 Próxima quincena · ${qLabel(q1)}`, rows.filter(r => r.due > q0.end && r.due <= q1.end)], ['🗓️ Más adelante', rows.filter(r => r.due > q1.end)]];
    const bills = [...(S.data.bills || [])].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const act = bills.filter(b => !billStatus(b).done), done = bills.filter(b => billStatus(b).done);
    const pairs = pairBalances().filter(p => scopeAll || p.from === S.me.id || p.to === S.me.id);
    const stat = (l, v, sub, cls = '') => `<section class="card deco stat ${cls}"><span class="l">${l}</span><span class="v">${cash(v)}</span><span class="tiny muted">${sub}</span></section>`;
    let body = '';
    if (tab === 'agenda') body = rows.length ? groups.filter(([, g]) => g.length).map(([h, g]) => `<div class="nav-group" style="margin:18px 4px 8px">${h} · ${cash(g.reduce((a, r) => a + r.left, 0))}</div><div class="debt-list">${g.map(rowHTML).join('')}</div>`).join('') : `<div class="card empty mt"><div class="big">🎉</div><p class="bold">¡Nadie debe nada! Todo está al corriente.</p></div>`;
    else if (tab === 'personas') body = `<div class="grid g2 mt">${pairs.map(p => { const me = S.me.id; const mine = p.from === me || p.to === me; return `<section class="card deco pair"><div class="row">${avatar(member(p.from), 'lg')}<div class="grow center"><div class="small bold muted">${p.from === me ? 'Le debes a' : p.to === me ? 'Te debe' : `${esc(personName(p.from))} le debe a`}</div><div class="pair-amt">${cash(p.amount)}</div><div class="bold">${p.from === me ? esc(member(p.to)?.name) : p.to === me ? esc(member(p.from)?.name) : esc(member(p.to)?.name)}</div></div>${avatar(member(p.to), 'lg')}</div>
        ${mine ? `<div class="row mt" style="gap:8px;justify-content:center">${p.from === me ? `<button class="btn sm primary" data-act="payPair" data-f="${p.from}" data-t="${p.to}">💸 Pagarle</button>` : `<button class="btn sm primary" data-act="payPair" data-f="${p.from}" data-t="${p.to}">✅ Me pagó</button><button class="btn sm" data-act="remindPair" data-f="${p.from}" data-v="${p.amount}">📣 Recordarle</button>`}</div>` : ''}</section>`; }).join('') || `<div class="card empty"><div class="big">🤝</div><p class="bold">Todos a mano 🙌</p></div>`}</div>
        <p class="tiny muted mt-s center">Se netea lo que se deben entre dos personas: si tú le debes $300 y te debe $100, sólo ves $200.</p>`;
    else body = `<div class="row mt" style="gap:8px"><button class="chip chip-btn ${!showDone ? 'sel' : ''}" data-act="done" data-v="0">Activas (${act.length})</button><button class="chip chip-btn ${showDone ? 'sel' : ''}" data-act="done" data-v="1">Liquidadas (${done.length})</button></div>
      <div class="grid g2 mt">${(showDone ? done : act).map(b => { const s = billStatus(b); return `<a class="card deco bill-card" href="#/cuenta/${b.id}"><div class="row"><span class="bill-e">${catE(b)}</span><div class="grow" style="min-width:0"><div class="bold ellipsis">${esc(b.title)}</div><div class="tiny muted">${cash(b.total)} · se le paga a ${esc(personName(b.to))} · ${planLabel(b.plan)}${b.recurring?.monthly ? ' · 🔁' : ''}</div></div></div>
        <div class="progress mt" style="height:8px"><i style="width:${s.pct * 100}%;${s.done ? 'background:#1baf7a' : ''}"></i></div><div class="row between tiny bold mt-s"><span>${s.done ? '✅ Liquidada' : `Faltan ${cash(s.remaining)}`}</span><span class="${s.overdue ? 'bad' : 'muted'}">${s.overdue ? `⚠️ ${cash(s.overdue)} vencido` : `${cash(s.paid)} de ${cash(s.owed)}`}</span></div></a>`; }).join('') || `<div class="card empty"><div class="big">🧾</div><p class="bold">${showDone ? 'Aún no hay cuentas liquidadas' : 'Sin cuentas activas'}</p></div>`}</div>`;
    return `<div class="page-head"><div><h1>Cuentas claras</h1><p>Dividir, abonar y saber cuánto toca cada quincena 🤝</p></div><button class="btn primary" data-act="newBill">＋ Nueva cuenta</button></div>
      <div class="grid g4 debt-stats">${stat(`Pagas esta quincena`, r2(T.pay.now + T.pay.overdue), T.pay.overdue ? `⚠️ ${cash(T.pay.overdue)} vencido` : qLabel(q0), T.pay.overdue ? 'warn' : '')}${stat('Te pagan esta quincena', r2(T.get.now + T.get.overdue), T.get.overdue ? `⚠️ ${cash(T.get.overdue)} atrasado` : qLabel(q0))}${stat('Próxima quincena', T.pay.next, `pagas · te pagan ${cash(T.get.next)}`)}${stat('Saldo total', r2(T.get.total - T.pay.total), `debes ${cash(T.pay.total)} · te deben ${cash(T.get.total)}`, T.get.total - T.pay.total < 0 ? 'neg' : 'pos')}</div>
      <div class="row wrap mt" style="gap:8px;justify-content:space-between"><div class="seg">${[['agenda', '📅 Agenda'], ['personas', '👥 Por persona'], ['cuentas', '🧾 Cuentas']].map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-act="tab" data-t="${k}">${l}</button>`).join('')}</div>
        ${tab !== 'cuentas' ? `<label class="chip chip-btn"><input type="checkbox" data-change="scope" ${scopeAll ? 'checked' : ''}> 👨‍👩‍👧 Ver toda la familia</label>` : ''}</div>
      ${body}`;
  },
  actions: {
    newBill() { billForm(); },
    tab(el) { tab = el.dataset.t; hooks.rerender(); },
    scope(el) { scopeAll = el.checked; hooks.rerender(); },
    done(el) { showDone = el.dataset.v === '1'; hooks.rerender(); },
    open(el, e) { if (e.target.closest('button')) return; hooks.go('cuenta/' + el.dataset.id); },
    pay(el) { paymentForm(bill(el.dataset.id), el.dataset.f, el.dataset.v); },
    got(el) { paymentForm(bill(el.dataset.id), el.dataset.f, el.dataset.v); },
    remind(el) { const b = bill(el.dataset.id); notify({ to: [el.dataset.f], icon: '📣', title: `Recordatorio: ${b.title}`, body: `${personName(b.to)} te recuerda tu pago de ${cash(el.dataset.v)}`, link: 'cuenta/' + b.id }); toast(`📣 Le recordamos a ${personName(el.dataset.f)}`); },
    payPair(el) { pairPayForm(el.dataset.f, el.dataset.t); },
    remindPair(el) { notify({ to: [el.dataset.f], icon: '📣', title: `${personName(S.me.id)} te recuerda que le debes ${cash(el.dataset.v)}`, body: 'Entra a Cuentas claras para ver el detalle', link: 'cuentas' }); toast('📣 Recordatorio enviado'); }
  }
};

export const billDetail = {
  render([id]) {
    const b = bill(id); if (!b) return `<div class="card empty"><div class="big">🔍</div>No encontramos esta cuenta. <a class="link" href="#/cuentas">Volver</a></div>`;
    const s = billStatus(b), me = S.me.id, iAmTo = b.to === me, to = member(b.to);
    const ds = debtors(b); const own = (b.shares || {})[b.to];
    const pays = [...(b.payments || [])].sort((a, c) => (c.date || '').localeCompare(a.date || '') || c.at - a.at);
    return `<a class="link" href="#/cuentas">‹ Cuentas claras</a>
      <section class="card deco mt bill-hero">
        <div class="row wrap between" style="gap:10px"><div class="row" style="min-width:0"><span class="bill-e lg">${catE(b)}</span><div style="min-width:0"><div class="xhero-title" style="font-size:clamp(26px,5vw,40px)">${esc(b.title)}</div><div class="small bold muted">${fmtDate(b.date, { weekday: true })} · ${SPLITS[b.split] || ''} · ${planLabel(b.plan)}${b.recurring?.monthly ? ' · 🔁 cada mes' : ''}${b.auto ? ' · creada automáticamente' : ''}</div></div></div>
          <div class="row" style="gap:8px"><button class="btn sm" data-act="edit" data-id="${b.id}">✏️ Editar</button></div></div>
        <div class="bill-sum mt"><div><span class="tiny bold muted">Total</span><b>${cash(b.total)}</b></div><div><span class="tiny bold muted">Se le paga a</span><b class="row" style="gap:6px">${avatar(to, 'sm')} ${esc(to?.name || '?')}</b></div><div><span class="tiny bold muted">Juntado</span><b>${cash(s.paid)} <span class="muted small">de ${cash(s.owed)}</span></b></div></div>
        <div class="progress mt" style="height:10px"><i style="width:${s.pct * 100}%;${s.done ? 'background:#1baf7a' : ''}"></i></div>
        <div class="row between tiny bold mt-s"><span>${s.done ? '🎉 ¡Cuenta liquidada!' : `Faltan ${cash(s.remaining)}`}</span>${s.overdue ? `<span class="bad">⚠️ ${cash(s.overdue)} vencido</span>` : ''}</div>
        ${b.notes ? `<p class="small bold mt">📝 ${esc(b.notes)}</p>` : ''}
      </section>
      <div class="nav-group" style="margin:20px 4px 10px">¿Cuánto le toca a cada quien?</div>
      <div class="grid g2">${ds.map(mid => { const p = personStatus(b, mid), m = member(mid); return `<section class="card deco person-debt ${p.done ? 'ok' : p.overdue ? 'late' : ''}">
          <div class="row">${avatar(m, 'lg')}<div class="grow" style="min-width:0"><div class="bold">${esc(m?.name || '?')}${mid === me ? ' (tú)' : ''}</div><div class="small muted bold">Le toca ${cash(p.share)} · pagó ${cash(p.paid)}${p.unconfirmed ? ` <span class="tiny">(${cash(p.unconfirmed)} por confirmar)</span>` : ''}</div></div>
            <div class="right"><div class="pd-amt">${p.done ? '✅' : cash(p.remaining)}</div><div class="tiny muted bold">${p.done ? (p.extra ? `Pagó ${cash(p.extra)} de más` : 'Al corriente') : 'le falta'}</div></div></div>
          <div class="inst mt">${p.inst.map(x => { const d = parseDate(x.due); return `<div class="inst-i ${x.status}" title="${STATUS[x.status][1]}"><span class="tiny bold">${d.getDate()} ${MES[d.getMonth()]}</span><b class="small">${cash(x.amount)}</b><span class="tiny">${STATUS[x.status][0]}${x.status === 'parcial' ? ' ' + cash(x.left) : ''}</span></div>`; }).join('')}</div>
          ${!p.done && (mid === me || iAmTo) ? `<div class="row mt" style="gap:8px">${mid === me ? `<button class="btn sm primary" data-act="pay" data-id="${b.id}" data-f="${mid}">💸 Abonar</button>` : `<button class="btn sm primary" data-act="pay" data-id="${b.id}" data-f="${mid}">✅ Me pagó</button><button class="btn sm" data-act="remind" data-id="${b.id}" data-f="${mid}" data-v="${p.next?.left || p.remaining}">📣 Recordar</button>`}</div>` : ''}
        </section>`; }).join('')}
        ${own ? `<section class="card person-debt ok"><div class="row">${avatar(to, 'lg')}<div class="grow"><div class="bold">${esc(to?.name || '')}</div><div class="small muted bold">Su parte: ${cash(own)} · la puso él/ella al recibir el dinero</div></div><div class="pd-amt">✅</div></div></section>` : ''}
      </div>
      <section class="card deco mt"><div class="card-title"><h3>🧾 Abonos</h3>${!s.done ? `<button class="btn sm primary" data-act="pay" data-id="${b.id}" data-f="${ds.includes(me) ? me : ds[0] || ''}">＋ Registrar abono</button>` : ''}</div>
        <div class="list">${pays.map(p => { const m = member(p.from); const canDel = p.by === me || iAmTo; return `<div class="item pay-i">${avatar(m, 'sm')}<div class="grow" style="min-width:0"><div class="bold small">${esc(m?.name || '?')} abonó ${cash(p.amount)}</div><div class="tiny muted">${fmtDate(p.date)} · ${METHODS[p.method] || ''}${p.note ? ' · ' + esc(p.note) : ''}</div></div>
          ${p.proof ? `<button class="proof-th" data-act="proof" data-id="${b.id}" data-p="${p.id}" style="background-image:url('${p.proof}')" aria-label="Ver comprobante"></button>` : ''}
          ${p.confirmed ? '<span class="chip ok">✅ Recibido</span>' : iAmTo ? `<button class="btn sm primary" data-act="confirm" data-id="${b.id}" data-p="${p.id}">✅ Confirmar</button>` : '<span class="chip">⏳ Por confirmar</span>'}
          ${canDel ? `<button class="link tiny faint" data-act="delPay" data-id="${b.id}" data-p="${p.id}" aria-label="Borrar">✕</button>` : ''}</div>`; }).join('') || '<div class="empty small">Aún no hay abonos</div>'}</div></section>`;
  },
  actions: {
    edit(el) { billForm(bill(el.dataset.id)); },
    pay(el) { paymentForm(bill(el.dataset.id), el.dataset.f); },
    remind: billsView.actions.remind,
    async confirm(el) {
      const b = bill(el.dataset.id); const p = (b.payments || []).find(x => x.id === el.dataset.p);
      await S.db.update('bills', b.id, { payments: b.payments.map(x => x.id === p.id ? { ...x, confirmed: true, confirmedAt: Date.now() } : x) });
      notify({ to: [p.from], icon: '✅', title: `${personName(S.me.id)} confirmó tu pago de ${cash(p.amount)}`, body: b.title, link: 'cuenta/' + b.id }); toast('✅ Confirmado');
    },
    async delPay(el) { if (!(await confirmBox('¿Borrar este abono?', 'Borrar'))) return; const b = bill(el.dataset.id); await S.db.update('bills', b.id, { payments: (b.payments || []).filter(x => x.id !== el.dataset.p) }); },
    proof(el) { const b = bill(el.dataset.id); const p = (b.payments || []).find(x => x.id === el.dataset.p); modal({ title: '📎 Comprobante', body: `<img src="${p.proof}" alt="Comprobante" style="width:100%;border-radius:14px">`, foot: '<div class="modal-foot"><button type="button" class="btn" data-close>Cerrar</button></div>' }); }
  }
};
