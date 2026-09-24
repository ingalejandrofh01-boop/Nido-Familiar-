// 🎁 Resumen del año (tipo "Wrapped"): historias animadas con todo lo que vivió la familia
import { S, hooks, members, member, onCleanup } from '../store.js';
import { esc, avatar } from '../ui.js';
import { CATS } from './money.js';
import { BILL_CATS, cash, r2 } from '../debts.js';
import { rsvpCount } from './parties.js';
import { goalStats, allGoals } from './goals.js';
import { sfx } from '../reveal.js';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const cnt = (arr, key) => { const o = {}; arr.forEach(x => { const k = typeof key === 'function' ? key(x) : x[key]; if (k != null && k !== '') o[k] = (o[k] || 0) + 1; }); return Object.entries(o).sort((a, b) => b[1] - a[1]); };
const sum = (arr, f) => r2(arr.reduce((a, x) => a + (Number(f(x)) || 0), 0));
const first = (n) => (member(n)?.name || '?').split(' ')[0];
const cell = (v, label, f = 'int') => v ? `<div>${n(v, f)}<span>${label}</span></div>` : '';
const n = (v, f = 'int') => `<b class="w-num" data-count="${v}" data-fmt="${f}">${f === 'cash' ? cash(v) : Math.round(v).toLocaleString('es-MX')}</b>`;

export function yearsWithData() {
  const ys = new Set([new Date().getFullYear()]);
  [...S.data.photos.map(p => p.date), ...S.data.expenses.map(e => e.date), ...(S.data.bills || []).map(b => b.date), ...S.data.events.map(e => e.date)].forEach(d => { const y = parseInt(String(d || '').slice(0, 4)); if (y > 2000 && y <= new Date().getFullYear()) ys.add(y); });
  return [...ys].sort((a, b) => b - a);
}

export function computeYear(Y, extra = {}) {
  const inY = (d) => String(d || '').startsWith(String(Y));
  const tsY = (t) => t && new Date(t).getFullYear() === Y;
  const R = { Y };
  // 📸 Fotos
  R.photos = S.data.photos.filter(p => inY(p.date) || (!p.date && tsY(p.createdAt)));
  R.topPhotographer = cnt(R.photos, 'by')[0];
  R.albums = S.data.albums.filter(a => R.photos.some(p => p.albumId === a.id));
  // 📅 Momentos
  R.events = S.data.events.filter(e => inY(e.date));
  R.parties = (S.data.parties || []).filter(p => inY(p.date));
  R.bestParty = [...R.parties].sort((a, b) => rsvpCount(b).people - rsvpCount(a).people)[0];
  R.trips = (S.data.trips || []).filter(t => inY(t.start));
  R.tripDays = R.trips.reduce((a, t) => a + Math.max(1, Math.round((new Date(t.end) - new Date(t.start)) / 864e5) + 1), 0);
  R.exchanges = S.data.exchanges.filter(x => inY(x.date));
  R.birthdays = members().filter(m => m.birthday).length;
  // 💰 Dinero familiar: gastos + cuentas divididas
  const exp = S.data.expenses.filter(e => inY(e.date) && e.category !== 'ajuste').map(e => ({ title: e.title, amount: Number(e.amount) || 0, date: e.date, cat: (CATS[e.category] || CATS.otros)[1], emoji: (CATS[e.category] || CATS.otros)[0], by: e.paidBy }));
  const bls = (S.data.bills || []).filter(b => inY(b.date)).map(b => ({ title: b.title, amount: Number(b.total) || 0, date: b.date, cat: (BILL_CATS[b.category] || BILL_CATS.otro)[1], emoji: (BILL_CATS[b.category] || BILL_CATS.otro)[0], by: b.to }));
  R.buys = [...exp, ...bls];
  R.spent = sum(R.buys, x => x.amount);
  R.months = Array.from({ length: 12 }, (_, i) => sum(R.buys.filter(x => parseInt(x.date.slice(5, 7)) === i + 1), x => x.amount));
  const mMax = R.months.indexOf(Math.max(...R.months)); R.topMonth = R.spent ? { i: mMax, v: R.months[mMax] } : null;
  const nz = R.months.map((v, i) => [v, i]).filter(([v]) => v > 0); R.lowMonth = nz.length > 1 ? nz.sort((a, b) => a[0] - b[0])[0] : null;
  R.topBuy = [...R.buys].sort((a, b) => b.amount - a.amount)[0];
  const byCat = {}; R.buys.forEach(x => { byCat[x.cat] = byCat[x.cat] || { v: 0, e: x.emoji }; byCat[x.cat].v += x.amount; }); R.cats = Object.entries(byCat).sort((a, b) => b[1].v - a[1].v);
  const byPayer = {}; R.buys.forEach(x => { if (x.by) byPayer[x.by] = (byPayer[x.by] || 0) + x.amount; }); R.topPayer = Object.entries(byPayer).sort((a, b) => b[1] - a[1])[0];
  // 🤝 Cuentas claras
  R.bills = (S.data.bills || []).filter(b => inY(b.date));
  R.payments = (S.data.bills || []).flatMap(b => (b.payments || []).filter(p => inY(p.date)).map(p => ({ ...p, bill: b })));
  R.paid = sum(R.payments, p => p.amount); R.topAbonador = cnt(R.payments, 'from')[0];
  // 🙋 Mis finanzas (privadas, sólo para quien lo ve)
  const tx = (S.data.txns || []).filter(t => inY(t.date));
  R.my = tx.length ? (() => { const g = tx.filter(t => t.kind === 'gasto'), i = tx.filter(t => t.kind === 'ingreso'); const mm = Array.from({ length: 12 }, (_, k) => sum(g.filter(t => parseInt(t.date.slice(5, 7)) === k + 1), t => t.amount)); const mi = mm.indexOf(Math.max(...mm)); return { spent: sum(g, t => t.amount), earned: sum(i, t => t.amount), topCat: cnt(g, 'category')[0], top: [...g].sort((a, b) => b.amount - a.amount)[0], month: { i: mi, v: mm[mi] }, months: mm }; })() : null;
  // 🛒 Compras y cocina
  R.bought = S.data.shopping.filter(s => s.done && (tsY(s.doneAt) || (!s.doneAt && tsY(s.createdAt))));
  R.topShopper = cnt(R.bought.filter(s => s.doneBy), 'doneBy')[0];
  const menuSlots = (S.data.menus || []).filter(m => String(m.id).startsWith(String(Y)) || Object.keys(m.days || {}).some(inY)).flatMap(m => Object.entries(m.days || {}).filter(([d]) => inY(d)).flatMap(([, v]) => Object.values(v || {}))).filter(s => s && (s.recipeId || s.text));
  R.meals = menuSlots.length;
  const cooked = S.data.recipes.flatMap(r => (r.cooked || []).filter(c => inY(c.date)).map(() => r.id));
  const favR = cnt([...cooked, ...menuSlots.filter(s => s.recipeId).map(s => s.recipeId)], x => x)[0];
  R.topRecipe = favR ? { r: S.data.recipes.find(r => r.id === favR[0]), n: favR[1] } : null;
  R.cooks = cnt(menuSlots.filter(s => s.cook), 'cook')[0];
  R.newRecipes = S.data.recipes.filter(r => tsY(r.createdAt));
  // 🧹 Casa
  R.chores = members().map(m => ({ m, v: ((m.stats || {})[Y] || {}).chores || 0 })).sort((a, b) => b.v - a.v);
  R.choresTotal = R.chores.reduce((a, x) => a + x.v, 0) + S.data.chores.filter(c => c.done && tsY(c.doneAt) && !c.repeat).length * 0;
  R.pointsTop = members().filter(m => m.points).sort((a, b) => (b.points || 0) - (a.points || 0))[0];
  R.pets = (S.data.pets || []).map(p => { const logs = Object.entries(p.log || {}).filter(([d]) => inY(d)).flatMap(([, v]) => Object.values(v).flat()); return { p, n: logs.length, top: cnt(logs, 'by')[0] }; }).filter(x => x.n || x.p);
  // 💬 Juntos
  const msgs = (extra.messages || S.data.messages).filter(m => tsY(m.createdAt));
  R.msgs = msgs.length; R.topChatter = cnt(msgs, 'author')[0];
  const emo = []; msgs.forEach(m => (String(m.text || '').match(/\p{Extended_Pictographic}(?:\uFE0F|[\u{1F3FB}-\u{1F3FF}]|\u200D\p{Extended_Pictographic}\uFE0F?)*/gu) || []).filter(e => e.codePointAt(0) > 0x2BFF || e.length > 1).forEach(e => emo.push(e))); R.emojis = cnt(emo, x => x).slice(0, 3);
  R.polls = (S.data.polls || []).filter(p => tsY(p.createdAt));
  R.challengesWon = (S.data.challenges || []).flatMap(c => Object.entries(c.awarded || {}).filter(([, t]) => tsY(t)).map(([m]) => m));
  const spins = (extra.spins || S.data.spins || []).filter(s => tsY(s.at));
  R.spins = spins.length;
  const wTop = cnt(spins, 'wheelId')[0]; if (wTop) { const w = (S.data.wheels || []).find(x => x.id === wTop[0]); const loser = cnt(spins.filter(s => s.wheelId === wTop[0]), 'label')[0]; R.wheel = w && loser ? { w, label: loser[0], n: loser[1] } : null; }
  R.capsules = (S.data.capsules || []).filter(c => tsY(c.createdAt));
  // 🎯 Metas
  const gs = allGoals().filter(g => !g._private);
  R.goalSaved = sum(gs.flatMap(g => (g.contribs || []).filter(c => inY(c.date))), c => c.amount);
  R.goalsDone = gs.filter(g => tsY(g.achievedAt));
  R.goalBest = [...gs].filter(g => !goalStats(g).done).sort((a, b) => goalStats(b).pct - goalStats(a).pct)[0];
  R.goalSavers = cnt(gs.flatMap(g => (g.contribs || []).filter(c => inY(c.date) && c.amount > 0)), 'by')[0];
  return R;
}

function monthBars(vals, hi) {
  const max = Math.max(...vals, 1);
  return `<div class="w-bars">${vals.map((v, i) => `<div class="wb ${i === hi ? 'hi' : ''}"><i style="--h:${Math.max(3, v / max * 100)}%"></i><span>${MESES[i][0]}</span></div>`).join('')}</div>`;
}
function slides(R) {
  const fam = esc(S.family?.name || 'la familia'), out = [];
  const s = (bg, html, key) => out.push({ bg, html, key });
  s('linear-gradient(160deg,#ff5f6d,#ffc371)', `<div class="w-kicker w-in">🪺 NIDO · RESUMEN ${R.Y}</div><h1 class="w-title w-in">El año de ${fam}</h1><div class="w-avatars w-in">${members().map((m, i) => `<span style="--d:${i * .12}s">${avatar(m, 'lg live')}</span>`).join('')}</div><p class="w-sub w-in">Todo lo que vivimos, compramos, cocinamos y soñamos juntos ✨</p><p class="w-hint w-in">Toca para avanzar →</p>`, 'intro');
  if (R.photos.length) s('linear-gradient(160deg,#6a11cb,#2575fc)', `<div class="w-kicker w-in">📸 RECUERDOS</div><h2 class="w-h w-in">Guardamos ${n(R.photos.length)} fotos</h2><p class="w-sub w-in">en ${R.albums.length} capítulo${R.albums.length === 1 ? '' : 's'} del libro familiar</p><div class="w-polas w-in">${R.photos.slice(-3).map((p, i) => `<div class="w-pola" style="--r:${[-8, 4, -2][i]}deg"><img src="${p.thumb}" alt=""><span>${esc(p.caption || '')}</span></div>`).join('')}</div>${R.topPhotographer ? `<p class="w-foot w-in">📷 Fotógrafo oficial: <b>${esc(first(R.topPhotographer[0]))}</b> con ${R.topPhotographer[1]} fotos</p>` : ''}`, 'fotos');
  if (R.events.length || R.parties.length || R.trips.length) s('linear-gradient(160deg,#11998e,#38ef7d)', `<div class="w-kicker w-in">📅 MOMENTOS</div><h2 class="w-h w-in">Un año lleno de planes</h2><div class="w-grid w-in">${cell(R.events.length, 'eventos en la agenda')}${cell(R.parties.length, 'fiestas y posadas')}${cell(R.trips.length, `viajes · ${R.tripDays} días fuera`)}${cell(R.exchanges.length, 'intercambios')}</div>${R.bestParty ? `<p class="w-foot w-in">🎉 La fiesta más concurrida: <b>${esc(R.bestParty.title)}</b> con ${rsvpCount(R.bestParty).people} personas</p>` : ''}`, 'momentos');
  if (R.spent) s('linear-gradient(160deg,#0f2027,#2c5364)', `<div class="w-kicker w-in">💰 DINERO DE LA FAMILIA</div><h2 class="w-h w-in">Entre todos gastamos</h2><div class="w-big w-in">${n(R.spent, 'cash')}</div>${monthBars(R.months, R.topMonth?.i)}<p class="w-sub w-in">🔥 El mes más caro fue <b>${MESES[R.topMonth.i]}</b> con ${cash(R.topMonth.v)}${R.lowMonth ? ` · el más tranquilo, ${MESES[R.lowMonth[1]]} (${cash(R.lowMonth[0])})` : ''}</p>`, 'dinero');
  if (R.topBuy) s('linear-gradient(160deg,#f7971e,#ffd200)', `<div class="w-kicker w-in">🛍️ LA COMPRA DEL AÑO</div><div class="w-emoji w-in">${R.topBuy.emoji}</div><h2 class="w-h w-in">${esc(R.topBuy.title)}</h2><div class="w-big w-in">${n(R.topBuy.amount, 'cash')}</div><p class="w-sub w-in">${new Date(R.topBuy.date + 'T12:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })}${R.topBuy.by ? ` · pagó ${esc(first(R.topBuy.by))}` : ''}</p>
    <div class="w-list w-in">${R.cats.slice(0, 4).map(([c, o], i) => `<div><span>${o.e} ${esc(c)}</span><i style="--w:${o.v / R.cats[0][1].v * 100}%"></i><b>${cash(o.v)}</b></div>`).join('')}</div>${R.topPayer ? `<p class="w-foot w-in">💳 Quien más pagó: <b>${esc(first(R.topPayer[0]))}</b> (${cash(R.topPayer[1])})</p>` : ''}`, 'compra');
  if (R.bills.length || R.payments.length) s('linear-gradient(160deg,#8e2de2,#4a00e0)', `<div class="w-kicker w-in">🤝 CUENTAS CLARAS</div><h2 class="w-h w-in">Dividimos ${n(R.bills.length)} cuentas</h2><div class="w-grid w-in"><div>${n(R.payments.length)}<span>abonos registrados</span></div><div>${n(R.paid, 'cash')}<span>abonados entre familiares</span></div></div>${R.topAbonador ? `<p class="w-foot w-in">🏅 El más cumplido: <b>${esc(first(R.topAbonador[0]))}</b> con ${R.topAbonador[1]} abonos</p>` : ''}`, 'cuentas');
  if (R.my && (R.my.spent || R.my.earned)) s('linear-gradient(160deg,#232526,#414345)', `<div class="w-kicker w-in">🔒 SÓLO PARA TI · TUS FINANZAS</div><h2 class="w-h w-in">Tu año en números</h2><div class="w-grid w-in"><div>${n(R.my.earned, 'cash')}<span>ingresos</span></div><div>${n(R.my.spent, 'cash')}<span>gastos</span></div></div>${monthBars(R.my.months, R.my.month.i)}<p class="w-sub w-in">Tu mes más caro: <b>${MESES[R.my.month.i]}</b> (${cash(R.my.month.v)})${R.my.topCat ? ` · donde más gastaste: <b>${esc(R.my.topCat[0])}</b>` : ''}</p>${R.my.top ? `<p class="w-foot w-in">Tu gasto más grande: <b>${esc(R.my.top.note || R.my.top.category)}</b> · ${cash(R.my.top.amount)}</p>` : ''}`, 'mias');
  if (R.bought.length || R.meals || R.topRecipe) s('linear-gradient(160deg,#e96443,#904e95)', `<div class="w-kicker w-in">🛒 COMPRAS Y COCINA</div><h2 class="w-h w-in">La casa bien surtida</h2><div class="w-grid w-in">${cell(R.bought.length, 'cosas compradas de la lista')}${cell(R.meals, 'comidas planeadas en el menú')}</div>${R.topRecipe?.r ? `<p class="w-sub w-in">👑 El platillo del año: <b>${esc(R.topRecipe.r.emoji || '🍲')} ${esc(R.topRecipe.r.title)}</b> (${R.topRecipe.n} veces)</p>` : ''}${R.topShopper ? `<p class="w-foot w-in">🛍️ Rey del súper: <b>${esc(first(R.topShopper[0]))}</b>${R.cooks ? ` · 👩‍🍳 Chef del año: <b>${esc(first(R.cooks[0]))}</b>` : ''}</p>` : R.cooks ? `<p class="w-foot w-in">👩‍🍳 Chef del año: <b>${esc(first(R.cooks[0]))}</b></p>` : ''}`, 'cocina');
  const petsTxt = R.pets.filter(x => x.n).map(x => `${esc(x.p.name)} recibió ${x.n} cuidados${x.top ? ` (el que más lo cuidó: <b>${esc(first(x.top[0]))}</b>)` : ''}`).join(' · ');
  if (R.chores[0]?.v || petsTxt) s('linear-gradient(160deg,#00b09b,#96c93d)', `<div class="w-kicker w-in">🧹 LA CASA</div><h2 class="w-h w-in">Manos a la obra</h2>${R.chores[0]?.v ? `<div class="w-podium w-in">${R.chores.slice(0, 3).filter(x => x.v).map((x, i) => `<div class="p${i}">${avatar(x.m, i ? '' : 'lg')}<b>${esc(first(x.m.id))}</b><span>${x.v} tareas</span></div>`).join('')}</div>` : ''}${petsTxt ? `<p class="w-sub w-in">🐾 ${petsTxt}</p>` : ''}`, 'casa');
  if (R.msgs || R.spins || R.polls.length) s('linear-gradient(160deg,#fc466b,#3f5efb)', `<div class="w-kicker w-in">💬 JUNTOS</div><h2 class="w-h w-in">Nos mandamos ${n(R.msgs)} mensajes</h2>${R.topChatter ? `<p class="w-sub w-in">🗣️ El más platicador: <b>${esc(first(R.topChatter[0]))}</b> (${R.topChatter[1]})</p>` : ''}${R.emojis.length ? `<div class="w-emojis w-in">${R.emojis.map(([e, c]) => `<span>${e}<b>${c}</b></span>`).join('')}</div>` : ''}
    <div class="w-grid w-in">${cell(R.polls.length, 'encuestas')}${cell(R.spins, 'giros de la ruleta')}</div>${R.wheel ? `<p class="w-foot w-in">🎡 “${esc(R.wheel.w.title)}” le tocó a <b>${esc(R.wheel.label)}</b> ${R.wheel.n} ${R.wheel.n === 1 ? 'vez' : 'veces'} 😅</p>` : ''}`, 'juntos');
  if (R.goalSaved || R.goalsDone.length || R.goalBest) s('linear-gradient(160deg,#134e5e,#71b280)', `<div class="w-kicker w-in">🎯 METAS</div><h2 class="w-h w-in">Ahorramos para nuestros sueños</h2><div class="w-big w-in">${n(R.goalSaved, 'cash')}</div><p class="w-sub w-in">apartados este año en las metas familiares</p>${R.goalsDone.length ? `<p class="w-sub w-in">🏆 Cumplimos: ${R.goalsDone.map(g => `<b>${esc(g.emoji)} ${esc(g.name)}</b>`).join(', ')}</p>` : ''}${R.goalBest ? `<p class="w-foot w-in">🚀 La más cerca: <b>${esc(R.goalBest.emoji)} ${esc(R.goalBest.name)}</b> al ${Math.floor(goalStats(R.goalBest).pct * 100)}%${R.goalSavers ? ` · más constante: <b>${esc(first(R.goalSavers[0]))}</b>` : ''}</p>` : ''}`, 'metas');
  const awards = [R.topPhotographer && ['📷', 'Fotógrafo del año', R.topPhotographer[0]], R.cooks && ['👩‍🍳', 'Chef del año', R.cooks[0]], R.chores[0]?.v && ['🧹', 'Rey de las tareas', R.chores[0].m.id], R.topChatter && ['🗣️', 'El más platicador', R.topChatter[0]], R.topShopper && ['🛒', 'Rey del súper', R.topShopper[0]], R.topAbonador && ['🤝', 'El más cumplido', R.topAbonador[0]], R.goalSavers && ['🐷', 'El más ahorrador', R.goalSavers[0]], R.topPayer && ['💳', 'La cartera de la familia', R.topPayer[0]], ...R.pets.filter(x => x.top).map(x => ['🐾', `Mejor amigo de ${x.p.name}`, x.top[0]])].filter(Boolean);
  if (awards.length) s('linear-gradient(160deg,#141e30,#243b55)', `<div class="w-kicker w-in">🏆 PREMIOS NIDO ${R.Y}</div><h2 class="w-h w-in">Y los ganadores son…</h2><div class="w-awards">${awards.slice(0, 8).map(([e, t, id], i) => `<div class="w-aw w-in" style="--d:${.2 + i * .12}s">${avatar(member(id), 'sm')}<div><span>${e} ${esc(t)}</span><b>${esc(member(id)?.name || '?')}</b></div></div>`).join('')}</div>`, 'premios');
  s('linear-gradient(160deg,#ff5f6d,#845ec2)', `<div class="w-emoji w-in">🪺💛</div><h1 class="w-title w-in">Gracias por otro año juntos</h1><p class="w-sub w-in">Lo mejor de ${R.Y} no fueron las cosas: fueron ustedes.</p><div class="row w-in" style="gap:10px;justify-content:center;flex-wrap:wrap;margin-top:18px"><button class="btn primary lg" data-w="again">🔁 Ver otra vez</button><button class="btn lg" data-w="close">Cerrar</button></div>`, 'outro');
  return out;
}

// Animación de números
function countUp(root) {
  root.querySelectorAll('.w-num[data-count]').forEach(el => {
    const to = +el.dataset.count, fmt = el.dataset.fmt, t0 = performance.now(), d = 1100;
    const step = (t) => { const k = Math.min(1, (t - t0) / d), v = to * (1 - Math.pow(1 - k, 3)); el.textContent = fmt === 'cash' ? cash(v) : Math.round(v).toLocaleString('es-MX'); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
}

export function openWrapped(Y = new Date().getFullYear()) {
  document.querySelector('.wrapped')?.remove();
  const el = document.createElement('div'); el.className = 'wrapped';
  el.innerHTML = `<div class="w-load"><div class="w-spin">🪺</div><p>Preparando el año de la familia…</p></div>`;
  document.body.appendChild(el); document.documentElement.classList.add('modal-open');
  let i = 0, timer = null, paused = false, list = [];
  const close = () => { clearTimeout(timer); el.classList.add('out'); document.documentElement.classList.remove('modal-open'); setTimeout(() => el.remove(), 300); if (location.hash.startsWith('#/resumen')) hooks.go('inicio'); };
  const show = (k) => {
    i = Math.max(0, Math.min(list.length - 1, k)); clearTimeout(timer);
    const sl = list[i];
    el.innerHTML = `<div class="w-slide" style="background:${sl.bg}">
      <div class="w-bars-top">${list.map((_, j) => `<i class="${j < i ? 'full' : j === i ? 'run' : ''}"></i>`).join('')}</div>
      <button class="w-x" data-w="close" aria-label="Cerrar">✕</button>
      ${i === 0 ? `<div class="w-years">${yearsWithData().map(y => `<button class="${y === Y ? 'on' : ''}" data-y="${y}">${y}</button>`).join('')}</div>` : ''}
      <div class="w-body">${sl.html}</div><div class="w-tap l" data-w="prev"></div><div class="w-tap r" data-w="next"></div></div>`;
    el.querySelectorAll('.w-in').forEach((x, k) => x.style.animationDelay = (x.style.getPropertyValue('--d') || `${.1 + k * .14}s`));
    countUp(el);
    try { sfx.pop(); navigator.vibrate && navigator.vibrate(8); } catch { }
    if (sl.key === 'premios' || sl.key === 'outro') setTimeout(() => { for (let q = 0; q < 5; q++) setTimeout(() => hooks.celebrate(innerWidth * (.2 + Math.random() * .6), innerHeight * (.25 + Math.random() * .3), 'confetti'), q * 160); }, 500);
    if (i < list.length - 1) timer = setTimeout(() => !paused && show(i + 1), 7500);
  };
  el.addEventListener('click', e => {
    const y = e.target.closest('[data-y]'); if (y) { e.stopPropagation(); openWrapped(+y.dataset.y); return; }
    const w = e.target.closest('[data-w]')?.dataset.w; if (!w) return;
    if (w === 'close') close(); else if (w === 'again') show(0); else if (w === 'prev') show(i - 1); else if (w === 'next') { if (i === list.length - 1) close(); else show(i + 1); }
  });
  el.addEventListener('pointerdown', () => { paused = true; el.classList.add('paused'); });
  ['pointerup', 'pointercancel'].forEach(t => el.addEventListener(t, () => { paused = false; el.classList.remove('paused'); if (!timer || i < list.length - 1) { clearTimeout(timer); if (i < list.length - 1) timer = setTimeout(() => show(i + 1), 6000); } }));
  const onHash = () => { if (!location.hash.startsWith('#/resumen')) { removeEventListener('hashchange', onHash); clearTimeout(timer); el.remove(); document.documentElement.classList.remove('modal-open'); } };
  addEventListener('hashchange', onHash);
  const key = (e) => { if (!el.isConnected) return removeEventListener('keydown', key); if (e.key === 'ArrowRight') show(i + 1); if (e.key === 'ArrowLeft') show(i - 1); if (e.key === 'Escape') close(); };
  addEventListener('keydown', key);
  // Mensajes y giros completos (no sólo los últimos que tiene la app en memoria)
  Promise.all([S.db.list('messages').catch(() => null), S.db.list('spins').catch(() => null)]).then(([messages, spins]) => {
    list = slides(computeYear(Y, { messages: messages || undefined, spins: spins || undefined })); show(0);
  });
  return close;
}

// Ruta #/resumen
export const wrappedView = {
  render() { return `<div class="card empty"><div class="big">🎁</div><p class="bold">Abriendo el resumen del año…</p></div>`; },
  after(root, [y]) { if (!document.querySelector('.wrapped')) openWrapped(y ? +y : new Date().getFullYear()); }
};
