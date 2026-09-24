// 🏠 Inicio / resumen familiar
import { S, hooks, members, member, isAdult, onCleanup, findEvent } from '../store.js';
import { esc, avatar, fmtDate, fmtTime, relDay, today0, isoDate, nextBirthday, money, parseDate, timeAgo } from '../ui.js';
import { THEMES, nextHoliday, seasonFor } from '../themes.js';
import { occurrences, EVENT_TYPES } from '../events.js';
import { openEventForm } from './agenda.js';
import { pollCard, pollActions } from './polls.js';
import { upcomingParties, rsvpCount, partyDetail } from './parties.js';
import { periodTotals, agendaRows, cash } from '../debts.js';
import { allGoals, goalStats, ring } from './goals.js';
import { modal, toast as toast2 } from '../ui.js';
import { todayMenu, slotLabel, MEALS } from './menu.js';
import { petAvatar, careButtons, careProgress, foodLeft, vaccinesDue, petDetail } from './pets.js';

function juntos() {
  const t = isoDate(today0());
  const poll = S.data.polls.find(p => !p.closed && (!p.closesAt || p.closesAt >= t) && !(p.votes || {})[S.me.id]) || S.data.polls.find(p => !p.closed && (!p.closesAt || p.closesAt >= t));
  const trip = [...S.data.trips].filter(x => x.end >= t).sort((a, b) => a.start.localeCompare(b.start))[0];
  const caps = S.data.capsules.filter(c => c.openAt <= t && !(c.opened || {})[S.me.id] && (c.to === 'all' || (c.to || []).includes(S.me.id)));
  const ch = S.data.challenges.filter(c => c.start <= t && c.end >= t && (c.participants || []).includes(S.me.id) && c.kind === 'check' && !((c.progress || {})[S.me.id] || {})[t]);
  if (!poll && !trip && !caps.length && !ch.length) return '';
  const tripDays = trip ? Math.round((parseDate(trip.start) - today0()) / 864e5) : 0;
  return `<div class="grid g2 mt">
    ${poll ? pollCard(poll, true) : ''}
    <div class="col" style="gap:16px">
      ${caps.length ? `<a class="card deco cap-card ready" href="#/capsula" style="text-decoration:none"><div class="cap-icon">✨⏳✨</div><div class="bold">¡Tienes ${caps.length} cápsula${caps.length > 1 ? 's' : ''} del tiempo por abrir!</div><div class="tiny muted">${esc(caps[0].title)}</div></a>` : ''}
      ${trip ? `<a class="card deco trip-card" href="#/viaje/${trip.id}" style="text-decoration:none"><div class="trip-emoji">${esc(trip.emoji || '✈️')}</div><div class="small bold muted">✈️ Próximo viaje</div><div class="bold" style="font-size:18px">${esc(trip.title)}</div><div class="small muted">${tripDays > 0 ? `Faltan ${tripDays} días` : '🌴 ¡Estamos de viaje!'} · 🧳 ${(trip.packing || []).filter(p => p.done).length}/${(trip.packing || []).length}</div></a>` : ''}
      ${ch.length ? `<a class="card deco" href="#/retos" style="text-decoration:none"><div class="small bold muted">🏅 Retos de hoy</div>${ch.slice(0, 3).map(c => `<div class="row mt-s"><span style="font-size:22px">${esc(c.emoji)}</span><span class="grow bold small">${esc(c.title)}</span><span class="chip">Pendiente</span></div>`).join('')}</a>` : ''}
    </div></div>`;
}
import { renderAvatar, randomAvatar } from '../avatar.js';

// 🎉 Próxima fiesta + 🍽️ menú de hoy
function partyMenuWidget() {
  const p = upcomingParties().find(x => (parseDate(x.date) - today0()) / 864e5 <= 45);
  const menu = todayMenu();
  if (!p && !menu.length) return '';
  let pc = '';
  if (p) {
    const c = rsvpCount(p), mine = (p.rsvp || {})[S.me.id], items = p.items || [], cov = items.filter(i => i.by).length, days = Math.round((parseDate(p.date) - today0()) / 864e5);
    pc = `<section class="card deco party-home"><a href="#/fiesta/${p.id}" style="text-decoration:none;color:inherit" class="row"><span class="party-emoji sm">${esc(p.emoji || '🎉')}</span><div class="grow" style="min-width:0"><div class="small bold muted">🎉 ${days === 0 ? '¡Es hoy!' : days === 1 ? 'Mañana' : `En ${days} días`}</div><div class="bold" style="font-size:18px">${esc(p.title)}</div><div class="tiny muted bold">👥 ${c.people} van${items.length ? ` · 🧺 ${cov}/${items.length} cubierto` : ''}${p.place ? ` · 📍 ${esc(p.place)}` : ''}</div></div></a>
      ${mine ? `<div class="tiny bold mt-s">${mine.s === 'si' ? '✅ Confirmaste que vas' : mine.s === 'quiza' ? '🤔 Dijiste que tal vez' : '❌ Dijiste que no puedes'} · <a class="link" href="#/fiesta/${p.id}">¿Qué llevas?</a></div>` : `<div class="row mt-s" style="gap:6px"><button class="btn sm primary" data-act="rsvp" data-id="${p.id}" data-s="si">✅ Voy</button><button class="btn sm" data-act="rsvp" data-id="${p.id}" data-s="quiza">🤔 Tal vez</button><button class="btn sm ghost" data-act="rsvp" data-id="${p.id}" data-s="no">❌</button></div>`}</section>`;
  }
  const mc = menu.length ? `<a class="card deco" href="#/menu" style="text-decoration:none;color:inherit"><div class="card-title"><h3>🍽️ Hoy se come</h3><span class="small bold" style="color:var(--accent)">Menú</span></div>${menu.map(x => { const c = member(x.cook); return `<div class="row mt-s"><span class="chip">${MEALS[x.meal][0]} ${MEALS[x.meal][1]}</span><span class="grow bold small">${esc(slotLabel(x))}</span>${c ? `${avatar(c, 'sm')}` : ''}</div>`; }).join('')}</a>` : '';
  return `<div class="grid ${pc && mc ? 'g2' : ''} mt">${pc}${mc}</div>`;
}

// 🤝 Pagos de esta quincena
function debtsWidget() {
  const T = periodTotals(); const pay = T.pay.now + T.pay.overdue, get = T.get.now + T.get.overdue;
  if (!pay && !get && !T.pay.next && !T.get.next) return '';
  const next = agendaRows().find(r => r.from === S.me.id);
  return `<a class="card deco mt debt-home" href="#/cuentas" style="text-decoration:none;color:inherit"><div class="card-title"><h3>🤝 Cuentas de la quincena</h3><span class="small bold" style="color:var(--accent)">Ver</span></div>
    <div class="grid g3" style="gap:10px"><div class="dh"><span class="tiny bold muted">Pagas</span><b class="${T.pay.overdue ? 'bad' : ''}">${cash(pay)}</b>${T.pay.overdue ? `<span class="tiny bad">⚠️ ${cash(T.pay.overdue)} vencido</span>` : ''}</div><div class="dh"><span class="tiny bold muted">Te pagan</span><b>${cash(get)}</b></div><div class="dh"><span class="tiny bold muted">Próxima quincena</span><b>${cash(T.pay.next)}</b><span class="tiny muted">te pagan ${cash(T.get.next)}</span></div></div>
    ${next ? `<div class="tiny bold mt-s">Siguiente: ${esc(next.bill.title)} · ${cash(next.left)} el ${fmtDate(next.due)}</div>` : ''}</a>`;
}

// 🐾 Cuidados de las mascotas en Inicio
function petsWidget() {
  const pets = S.data.pets || []; if (!pets.length) return '';
  return `<div class="grid ${pets.length > 1 ? 'g2' : ''} mt">${pets.slice(0, 2).map(p => {
    const { done, need } = careProgress(p); const f = foodLeft(p); const v = vaccinesDue(p, 7)[0];
    return `<section class="card deco"><div class="card-title"><a class="pet-mini" href="#/mascota/${p.id}" style="text-decoration:none;color:inherit">${petAvatar(p, 'lg')}<div><h3>${esc(p.name)}</h3><div class="tiny muted bold">${done >= need && need ? '😻 ¡Todo listo por hoy!' : `Cuidados de hoy ${done}/${need}`}</div></div></a><a href="#/mascota/${p.id}">Ver</a></div>
      ${careButtons(p, true)}
      ${v || (f && f.days <= 5) ? `<div class="chips mt-s">${v ? `<span class="chip ${v.days < 0 ? 'danger' : 'accent'}">💉 ${esc(v.name)} ${v.days < 0 ? 'vencida' : v.days === 0 ? 'hoy' : `en ${v.days} d`}</span>` : ''}${f && f.days <= 5 ? `<span class="chip danger">🍖 Quedan ${f.days} días de comida</span>` : ''}</div>` : ''}</section>`;
  }).join('')}</div>`;
}
const PROMO = { ...randomAvatar(), anim: 'rebote' };

function greeting() {
  const h = new Date().getHours();
  return h >= 5 && h < 12 ? 'Buenos días' : h >= 12 && h < 19 ? 'Buenas tardes' : 'Buenas noches';
}
export const timeOfDay = () => { const h = new Date().getHours(); return h >= 5 && h < 12 ? 'manana' : h >= 12 && h < 19 ? 'tarde' : 'noche'; };
export const HOME_BLOCKS = { today: '📅 Hoy, próximos días, avisos y cumpleaños', partyMenu: '🎉 Próxima fiesta y 🍽️ menú de hoy', pets: '🐾 Mascotas', stats: '🔢 Resumen en números', quick: '⚡ Accesos rápidos', debts: '🤝 Cuentas de la quincena', goals: '🎯 Metas', juntos: '🗳️ Encuestas, viaje, cápsulas y retos', recap: '🌙 Resumen del día', memories: '✨ Recuerdo del día y ranking' };
const DEFAULT_ORDER = {
  manana: ['today', 'partyMenu', 'pets', 'stats', 'quick', 'debts', 'juntos', 'goals', 'memories', 'recap'],
  tarde: ['quick', 'stats', 'today', 'debts', 'partyMenu', 'juntos', 'pets', 'goals', 'memories', 'recap'],
  noche: ['recap', 'today', 'pets', 'juntos', 'memories', 'goals', 'partyMenu', 'debts', 'stats', 'quick']
};
function wrappedBanner() {
  const t = new Date(), m = t.getMonth(); if (!(m === 11 || m === 0)) return '';
  const Y = m === 0 ? t.getFullYear() - 1 : t.getFullYear();
  return `<a class="card wrapped-card mt" href="#/resumen/${Y}"><span style="font-size:42px">🎁</span><div class="grow"><div class="bold" style="font-size:19px">¡Llegó el resumen ${Y}!</div><div class="small bold" style="opacity:.9">Fotos, fiestas, la compra más cara, el mes más caro, premios… ¡todo el año en historias!</div></div><span class="btn sm">Ver ›</span></a>`;
}
function goalsWidget() {
  const gs = allGoals().filter(g => !g._private && !goalStats(g).done).sort((a, b) => goalStats(b).pct - goalStats(a).pct).slice(0, 3); if (!gs.length) return '';
  return `<section class="card deco mt"><div class="card-title"><h3>🎯 Nuestras metas</h3><a href="#/metas">Ver todas</a></div><div class="goal-mini">${gs.map(g => { const st = goalStats(g); return `<a href="#/meta/${g.id}">${ring(st.pct, g.emoji, 78, g.photo)}<b class="small ellipsis">${esc(g.name)}</b><span class="tiny muted">${cash(st.saved)} de ${cash(st.target)}</span></a>`; }).join('')}</div></section>`;
}
function dayRecap() {
  const t = isoDate(today0()), isT = (ts) => ts && isoDate(new Date(ts)) === t;
  const photos = S.data.photos.filter(p => p.date === t || isT(p.createdAt)).length;
  const chores = S.data.chores.filter(c => isT(c.doneAt) || c.lastDone === t).length;
  const bought = S.data.shopping.filter(x => x.done && isT(x.doneAt)).length;
  const care = (S.data.pets || []).reduce((a, p) => a + Object.values((p.log || {})[t] || {}).flat().length, 0);
  const msgs = S.data.messages.filter(m => isT(m.createdAt)).length;
  const pays = (S.data.bills || []).flatMap(b => b.payments || []).filter(p => p.date === t);
  const contrib = [...(S.data.famgoals || [])].flatMap(g => g.contribs || []).filter(c => c.date === t && c.amount > 0).reduce((a, c) => a + c.amount, 0);
  const tm = new Date(today0()); tm.setDate(tm.getDate() + 1); const tomorrow = occurrences(tm, tm).filter(o => !o.bill).slice(0, 3);
  const items = [[photos, '📸', 'fotos nuevas'], [chores, '🧹', 'tareas hechas'], [bought, '🛒', 'cosas compradas'], [care, '🐾', 'cuidados a las mascotas'], [msgs, '💬', 'mensajes'], [pays.length, '💸', 'abonos'], [contrib ? cash(contrib) : 0, '🎯', 'para las metas']].filter(([v]) => v);
  return `<section class="card deco mt recap"><div class="card-title"><h3>🌙 Así estuvo hoy</h3><span class="tiny muted">${new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}</span></div>
    ${items.length ? `<div class="recap-grid">${items.map(([v, e, l]) => `<div><span>${e}</span><b>${v}</b><span class="tiny muted">${l}</span></div>`).join('')}</div>` : '<p class="small bold muted">Un día tranquilo en el nido 😌</p>'}
    ${tomorrow.length ? `<div class="small bold mt">🔜 Mañana: ${tomorrow.map(o => esc(o.title)).join(' · ')}</div>` : ''}</section>`;
}
function cdBoxes(target) {
  return `<div class="countdown" data-cd="${target.getTime()}">
    ${['días', 'horas', 'min', 'seg'].map(l => `<div class="cd-box"><b>--</b><span>${l}</span></div>`).join('')}</div>`;
}
export function startCountdowns(root) {
  const els = root.querySelectorAll('[data-cd]'); if (!els.length) return;
  const tick = () => els.forEach(el => {
    let s = Math.max(0, Math.floor((+el.dataset.cd - Date.now()) / 1000));
    const v = [Math.floor(s / 86400), Math.floor(s % 86400 / 3600), Math.floor(s % 3600 / 60), s % 60];
    el.querySelectorAll('b').forEach((b, i) => b.textContent = String(v[i]).padStart(2, '0'));
  });
  tick(); const t = setInterval(tick, 1000); onCleanup(() => clearInterval(t));
}

export default {
  render() {
    const me = S.me; const t0 = today0();
    const themeId = document.body.dataset.theme || seasonFor();
    const th = THEMES[themeId] || THEMES.clasico;
    const hol = nextHoliday();
    const bdayToday = members().find(m => nextBirthday(m)?.days === 0);

    const week = new Date(t0); week.setDate(week.getDate() + 7);
    const occ = occurrences(t0, week);
    const todayIso = isoDate(t0);
    const todays = occ.filter(o => o.date === todayIso);
    const seen = new Set(todays.map(o => o.ev?.id).filter(Boolean));
    const upcoming = occ.filter(o => o.date !== todayIso).filter(o => !o.ev || o.ev.repeat !== 'daily' || !seen.has(o.ev.id)).filter(o => { const k = o.ev?.id; if (!k) return true; if (seen.has(k) && o.ev.repeat === 'daily') return false; seen.add(k); return true; }).slice(0, 6);

    const pendingShop = S.data.shopping.filter(s => !s.done).length;
    const todayChores = S.data.chores.filter(c => c.due <= todayIso && (!c.done || c.due === todayIso));
    const choresDone = todayChores.filter(c => c.done).length;
    const ym = todayIso.slice(0, 7);
    const monthSpend = S.data.expenses.filter(e => (e.date || '').startsWith(ym) && e.category !== 'ajuste').reduce((a, e) => a + Number(e.amount || 0), 0);

    const bdays = members().map(m => ({ m, nb: nextBirthday(m) })).filter(x => x.nb).sort((a, b) => a.nb.days - b.nb.days).slice(0, 8);
    const nextX = S.data.exchanges.filter(x => x.date >= todayIso).sort((a, b) => a.date.localeCompare(b.date))[0];
    const pinned = S.data.messages.filter(m => m.pinned).slice(-3).reverse();
    const photo = S.data.photos.length ? S.data.photos[(new Date().getDate() * 7) % S.data.photos.length] : null;
    const board = members().filter(m => m.points != null).sort((a, b) => (b.points || 0) - (a.points || 0)).slice(0, 3);

    const TOD = timeOfDay();
    const menuT = todayMenu(); const TT = periodTotals();
    const daySub = TOD === 'manana' ? (todays.length ? `Hoy ${todays.length === 1 ? 'hay 1 evento' : 'hay ' + todays.length + ' eventos'}${menuT[0] ? ' · se come ' + esc(slotLabel(menuT[0])) : ''}` : menuT[0] ? `Hoy se come ${esc(slotLabel(menuT[0]))}` : esc(th.tagline))
      : TOD === 'tarde' ? ([todayChores.length - choresDone ? `Faltan ${todayChores.length - choresDone} tarea${todayChores.length - choresDone > 1 ? 's' : ''}` : '', TT.pay.now + TT.pay.overdue ? `pagas ${cash(TT.pay.now + TT.pay.overdue)} esta quincena` : '', pendingShop ? `${pendingShop} cosas por comprar` : ''].filter(Boolean).join(' · ') || esc(th.tagline))
      : 'Así estuvo el día en el nido 💛';
    const evRow = (o) => {
      const T = EVENT_TYPES[o.type] || EVENT_TYPES.familiar;
      const people = (o.ev?.participants || (o.member ? [o.member.id] : [])).map(member).filter(Boolean);
      const href = o.exchange ? `#/intercambio/${o.exchange.id}` : o.member ? `#/perfil/${o.member.id}` : o.pet ? `#/mascota/${o.pet.id}` : o.party ? `#/fiesta/${o.party.id}` : o.bill ? `#/cuenta/${o.bill.id}` : '';
      return `<div class="item ${href || o.ev ? 'clickable' : ''}" ${href ? `onclick="location.hash='${href}'"` : o.ev ? `data-act="editEvent" data-id="${o.ev.id}"` : ''}>
        <span class="emoji">${T.e}</span>
        <div class="grow"><div class="bold ellipsis">${o.ev?._private ? '🔒 ' : ''}${esc(o.title)}${o.years && o.type === 'cumple' ? ` · ${o.years} años` : ''}</div>
        <div class="small muted">${relDay(o.date)}${o.time ? ' · ' + fmtTime(o.time) : ''}${o.ev?.location ? ' · ' + esc(o.ev.location) : ''}</div></div>
        <div class="avatars">${people.slice(0, 4).map(p => avatar(p, 'sm')).join('')}</div></div>`;
    };

    const B = {
      hero: `<section class="card hero deco">
      <div class="hero-emoji">${th.emoji}</div>
      <div class="small bold muted">${esc(S.family?.name || '')} · ${th.emoji} ${esc(th.name)}</div>
      ${bdayToday ? `<div class="hero-greet">¡Feliz cumpleaños, ${esc(bdayToday.name)}! 🎂</div>
        <div class="hero-sub">Hoy cumple ${nextBirthday(bdayToday).age} años. ¡Que se note el cariño!</div>
        <button class="btn primary mt" data-act="party">🎉 Lanzar confeti</button>`
        : `<div class="hero-greet">${greeting()}, ${esc(me.name.split(' ')[0])} ${TOD === 'manana' ? '☀️' : TOD === 'tarde' ? '🌤️' : '🌙'}</div>
        <div class="hero-sub">${daySub}</div>`}
      ${hol ? `<div class="mt small bold">${hol.emoji} ${hol.days === 0 ? `¡Hoy es ${esc(hol.label)}!` : `Faltan para ${esc(hol.label)}:`}</div>${hol.days > 0 ? cdBoxes(hol.date) : ''}` : ''}
    </section>`,
      promo: `${!me.avatar ? `<a class="card deco row mt" href="#/avatar/${me.id}" style="text-decoration:none;gap:16px">
      <span class="avatar ava lg live">${renderAvatar(PROMO, { raw: true })}</span>
      <div class="grow"><div class="bold" style="font-size:18px">🐾 ¡Crea tu avatar animado!</div><div class="small muted bold">Elige tu animalito, sus colores, lentes, sombreros y cómo se mueve.</div></div><span class="btn primary">Crear</span></a>` : ''}`,
      wrapped: wrappedBanner(),
      quick: `<div class="quick mt">
      <a href="#/agenda" data-act="newEvent"><span>📅</span>Evento</a>
      <a href="#/intercambios"><span>🎁</span>Regalos</a>
      <a href="#/fotos"><span>📸</span>Fotos</a>
      <a href="#/listas"><span>🛒</span>Compras</a>
      <a href="#/cuentas"><span>🤝</span>Cuentas</a>
    </div>`,
      stats: `<div class="grid g4 mt">
      <a class="card pad-sm stat" href="#/agenda" style="text-decoration:none"><span class="v">📅 <span data-count="${todays.length}">${todays.length}</span></span><span class="l">Eventos hoy</span></a>
      <a class="card pad-sm stat" href="#/listas" style="text-decoration:none"><span class="v">🛒 <span data-count="${pendingShop}">${pendingShop}</span></span><span class="l">Por comprar</span></a>
      ${isAdult() ? `<a class="card pad-sm stat" href="#/dinero" style="text-decoration:none"><span class="v" data-count="${monthSpend}" data-fmt="money">${money(monthSpend)}</span><span class="l">Gastos del mes</span></a>`
        : `<a class="card pad-sm stat" href="#/fotos" style="text-decoration:none"><span class="v">📸 ${S.data.photos.length}</span><span class="l">Recuerdos</span></a>`}
      <a class="card pad-sm stat" href="#/tareas" style="text-decoration:none"><span class="v">✅ ${choresDone}/${todayChores.length}</span><span class="l">Tareas de hoy</span></a>
    </div>`,
      today: `<div class="grid g2 mt">
      <section class="card deco">
        <div class="card-title"><h3>📅 Hoy</h3><a href="#/agenda">Ver agenda</a></div>
        <div class="list">${todays.length ? todays.map(evRow).join('') : `<div class="empty"><div class="big">🌤️</div>Nada agendado para hoy</div>`}</div>
        ${upcoming.length ? `<div class="small bold muted mt mb" style="margin-bottom:8px">Próximos días</div><div class="list">${upcoming.map(evRow).join('')}</div>` : ''}
      </section>

      <div class="col" style="gap:16px">
        ${pinned.length ? `<section class="card deco"><div class="card-title"><h3>📌 Avisos importantes</h3><a href="#/chat">Chat</a></div>
          <div class="list">${pinned.map(p => `<div class="item"><span class="emoji">📣</span><div class="grow"><div class="bold">${esc(p.text)}</div><div class="tiny muted">${esc(member(p.author)?.name || '')} · ${timeAgo(p.createdAt)}</div></div></div>`).join('')}</div></section>` : ''}

        ${nextX ? `<section class="card deco clickable" style="cursor:pointer" onclick="location.hash='#/intercambio/${nextX.id}'">
          <div class="card-title"><h3>${THEMES[nextX.type]?.emoji || '🎁'} Próximo intercambio</h3><span class="chip accent">${nextX.status === 'drawn' ? '✅ Sorteado' : '⏳ Por sortear'}</span></div>
          <div class="bold" style="font-size:18px">${esc(nextX.title)}</div>
          <div class="small muted">${fmtDate(nextX.date, { weekday: true })}${nextX.budget ? ' · Presupuesto ' + money(nextX.budget) : ''}</div>
          ${cdBoxes(new Date(parseDate(nextX.date).getTime() + (nextX.time ? (+nextX.time.slice(0, 2) * 3600 + +nextX.time.slice(3) * 60) * 1000 : 0)))}
        </section>` : ''}

        <section class="card deco"><div class="card-title"><h3>🎂 Próximos cumpleaños</h3><a href="#/familia">Familia</a></div>
          <div class="bday-row">${bdays.map(({ m, nb }) => `<a class="bday" href="#/perfil/${m.id}" style="text-decoration:none">${avatar(m, 'lg')}<div class="bold small mt-s ellipsis">${esc(m.name)}</div><div class="tiny muted">${fmtDate(isoDate(nb.date))}</div><div class="days">${nb.days === 0 ? '¡HOY! 🎉' : nb.days === 1 ? 'Mañana' : `en ${nb.days} días`}</div></a>`).join('') || '<div class="empty">Agrega cumpleaños en Familia</div>'}</div>
        </section>
      </div>
    </div>`,
      recap: dayRecap(),
      juntos: juntos(), partyMenu: partyMenuWidget(), debts: debtsWidget(), pets: petsWidget(), goals: goalsWidget(),
      memories: `<div class="grid g2 mt">
      ${photo ? `<section class="card deco"><div class="card-title"><h3>✨ Recuerdo del día</h3><a href="#/album/${photo.albumId}">Ver álbum</a></div>
        <div class="row" style="align-items:stretch;gap:16px"><div class="polaroid" style="width:48%;flex-shrink:0" onclick="location.hash='#/album/${photo.albumId}'"><img src="${photo.thumb}" alt=""><div class="cap">${esc(photo.caption || '')}</div></div>
        <div class="grow col" style="justify-content:center"><div style="font-family:Caveat,cursive;font-size:28px;line-height:1.1">${esc(photo.caption || 'Un bonito momento')}</div><div class="small muted">${photo.date ? fmtDate(photo.date, { year: true }) : ''}</div>
        <div class="small muted">${esc(S.data.albums.find(a => a.id === photo.albumId)?.title || '')}</div></div></div></section>` : ''}
      <section class="card deco"><div class="card-title"><h3>🏆 Ranking de tareas</h3><a href="#/tareas">Tareas</a></div>
        ${board.length ? `<div class="podium">${[board[1], board[0], board[2]].filter(Boolean).map((m) => { const pos = board.indexOf(m); return `<div class="p">${avatar(m, pos === 0 ? 'lg' : '')}<div class="small bold">${esc(m.name)}</div><div class="tiny muted">${m.points || 0} pts</div><div class="blk" style="height:${[90, 64, 46][pos]}px">${['🥇', '🥈', '🥉'][pos]}</div></div>`; }).join('')}</div>` : '<div class="empty">Aún no hay puntos</div>'}
      </section>
    </div>`
    };
    const L = me.homeLayout || {}; const hidden = new Set(L.hidden || []);
    const order = [...new Set([...(L.order || DEFAULT_ORDER[TOD]), ...Object.keys(HOME_BLOCKS)])].filter(k => B[k] !== undefined);
    return ['hero', 'promo', 'wrapped', ...order.filter(k => !['hero', 'promo', 'wrapped'].includes(k) && !hidden.has(k))].map(k => B[k] ? `<div class="hb" data-hb="${k}">${B[k]}</div>` : '').join('\n') +
      `<div class="center mt"><button class="btn sm ghost" data-act="customize">✏️ Personalizar Inicio</button></div>`;
  },
  after(root) { startCountdowns(root); },
  actions: {
    ...pollActions,
    care: petDetail.actions.care,
    rsvp: partyDetail.actions.rsvp,
    newEvent(el, e) { openEventForm(); },
    editEvent(el) { openEventForm(findEvent(el.dataset.id)); },
    customize() {
      const L = S.me.homeLayout || {}; let order = [...new Set([...(L.order || DEFAULT_ORDER[timeOfDay()]), ...Object.keys(HOME_BLOCKS)])]; const hidden = new Set(L.hidden || []);
      const paint = (f) => { f.querySelector('[data-hl]').innerHTML = order.map((k, i) => `<div class="hl-row ${hidden.has(k) ? 'off' : ''}"><label class="grow"><input type="checkbox" data-k="${k}" ${hidden.has(k) ? '' : 'checked'}> ${HOME_BLOCKS[k]}</label><button type="button" class="icon-btn sm" data-up="${i}" ${i ? '' : 'disabled'}>↑</button><button type="button" class="icon-btn sm" data-dn="${i}" ${i < order.length - 1 ? '' : 'disabled'}>↓</button></div>`).join('');
        f.querySelectorAll('[data-k]').forEach(c => c.onchange = () => { c.checked ? hidden.delete(c.dataset.k) : hidden.add(c.dataset.k); paint(f); });
        f.querySelectorAll('[data-up]').forEach(b => b.onclick = () => { const i = +b.dataset.up; [order[i - 1], order[i]] = [order[i], order[i - 1]]; paint(f); });
        f.querySelectorAll('[data-dn]').forEach(b => b.onclick = () => { const i = +b.dataset.dn; [order[i + 1], order[i]] = [order[i], order[i + 1]]; paint(f); }); };
      modal({ title: '✏️ Personalizar Inicio', body: `<p class="small muted bold">Elige qué ver y en qué orden. Si no lo cambias, Nido acomoda el Inicio según la hora: en la mañana tu día, en la tarde pendientes y en la noche el resumen.</p><div class="hl" data-hl></div>`,
        danger: { label: '↺ Según la hora', confirm: '¿Volver al orden automático según la hora del día?', action: async () => { await S.db.update('members', S.me.id, { homeLayout: null }); } },
        onOpen: (f) => paint(f), submit: async () => { await S.db.update('members', S.me.id, { homeLayout: { order, hidden: [...hidden] } }); toast2('✅ Inicio personalizado'); } });
    },
    party() { for (let i = 0; i < 5; i++) setTimeout(() => hooks.celebrate(innerWidth * (0.2 + Math.random() * 0.6), innerHeight * (0.2 + Math.random() * 0.3), 'confetti'), i * 250); }
  }
};
