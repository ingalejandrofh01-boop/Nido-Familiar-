// 🏠 Inicio / resumen familiar
import { S, hooks, members, member, isAdult, onCleanup } from '../store.js';
import { esc, avatar, fmtDate, fmtTime, relDay, today0, isoDate, nextBirthday, money, parseDate, timeAgo } from '../ui.js';
import { THEMES, nextHoliday, seasonFor } from '../themes.js';
import { occurrences, EVENT_TYPES } from '../events.js';
import { openEventForm } from './agenda.js';
import { renderAvatar, randomAvatar } from '../avatar.js';
const PROMO = { ...randomAvatar(), anim: 'rebote' };

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
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

    const evRow = (o) => {
      const T = EVENT_TYPES[o.type] || EVENT_TYPES.familiar;
      const people = (o.ev?.participants || (o.member ? [o.member.id] : [])).map(member).filter(Boolean);
      const href = o.exchange ? `#/intercambio/${o.exchange.id}` : o.member ? `#/perfil/${o.member.id}` : '';
      return `<div class="item ${href || o.ev ? 'clickable' : ''}" ${href ? `onclick="location.hash='${href}'"` : o.ev ? `data-act="editEvent" data-id="${o.ev.id}"` : ''}>
        <span class="emoji">${T.e}</span>
        <div class="grow"><div class="bold ellipsis">${esc(o.title)}${o.years && o.type === 'cumple' ? ` · ${o.years} años` : ''}</div>
        <div class="small muted">${relDay(o.date)}${o.time ? ' · ' + fmtTime(o.time) : ''}${o.ev?.location ? ' · ' + esc(o.ev.location) : ''}</div></div>
        <div class="avatars">${people.slice(0, 4).map(p => avatar(p, 'sm')).join('')}</div></div>`;
    };

    return `
    <section class="card hero deco">
      <div class="hero-emoji">${th.emoji}</div>
      <div class="small bold muted">${esc(S.family?.name || '')} · ${th.emoji} ${esc(th.name)}</div>
      ${bdayToday ? `<div class="hero-greet">¡Feliz cumpleaños, ${esc(bdayToday.name)}! 🎂</div>
        <div class="hero-sub">Hoy cumple ${nextBirthday(bdayToday).age} años. ¡Que se note el cariño!</div>
        <button class="btn primary mt" data-act="party">🎉 Lanzar confeti</button>`
        : `<div class="hero-greet">${greeting()}, ${esc(me.name.split(' ')[0])} 👋</div>
        <div class="hero-sub">${esc(th.tagline)}</div>`}
      ${hol ? `<div class="mt small bold">${hol.emoji} ${hol.days === 0 ? `¡Hoy es ${esc(hol.label)}!` : `Faltan para ${esc(hol.label)}:`}</div>${hol.days > 0 ? cdBoxes(hol.date) : ''}` : ''}
    </section>

    ${!me.avatar ? `<a class="card deco row mt" href="#/avatar/${me.id}" style="text-decoration:none;gap:16px">
      <span class="avatar ava lg live">${renderAvatar(PROMO, { raw: true })}</span>
      <div class="grow"><div class="bold" style="font-size:18px">🐾 ¡Crea tu avatar animado!</div><div class="small muted bold">Elige tu animalito, sus colores, lentes, sombreros y cómo se mueve.</div></div><span class="btn primary">Crear</span></a>` : ''}

    <div class="quick mt">
      <a href="#/agenda" data-act="newEvent"><span>📅</span>Evento</a>
      <a href="#/intercambios"><span>🎁</span>Intercambio</a>
      <a href="#/fotos"><span>📸</span>Fotos</a>
      <a href="#/listas"><span>🛒</span>Compras</a>
    </div>

    <div class="grid g4 mt">
      <a class="card pad-sm stat" href="#/agenda" style="text-decoration:none"><span class="v">📅 ${todays.length}</span><span class="l">Eventos hoy</span></a>
      <a class="card pad-sm stat" href="#/listas" style="text-decoration:none"><span class="v">🛒 ${pendingShop}</span><span class="l">Por comprar</span></a>
      ${isAdult() ? `<a class="card pad-sm stat" href="#/dinero" style="text-decoration:none"><span class="v">${money(monthSpend)}</span><span class="l">Gastos del mes</span></a>`
        : `<a class="card pad-sm stat" href="#/fotos" style="text-decoration:none"><span class="v">📸 ${S.data.photos.length}</span><span class="l">Recuerdos</span></a>`}
      <a class="card pad-sm stat" href="#/tareas" style="text-decoration:none"><span class="v">✅ ${choresDone}/${todayChores.length}</span><span class="l">Tareas de hoy</span></a>
    </div>

    <div class="grid g2 mt">
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
    </div>

    <div class="grid g2 mt">
      ${photo ? `<section class="card deco"><div class="card-title"><h3>✨ Recuerdo del día</h3><a href="#/album/${photo.albumId}">Ver álbum</a></div>
        <div class="row" style="align-items:stretch;gap:16px"><div class="polaroid" style="width:48%;flex-shrink:0" onclick="location.hash='#/album/${photo.albumId}'"><img src="${photo.thumb}" alt=""><div class="cap">${esc(photo.caption || '')}</div></div>
        <div class="grow col" style="justify-content:center"><div style="font-family:Caveat,cursive;font-size:28px;line-height:1.1">${esc(photo.caption || 'Un bonito momento')}</div><div class="small muted">${photo.date ? fmtDate(photo.date, { year: true }) : ''}</div>
        <div class="small muted">${esc(S.data.albums.find(a => a.id === photo.albumId)?.title || '')}</div></div></div></section>` : ''}
      <section class="card deco"><div class="card-title"><h3>🏆 Ranking de tareas</h3><a href="#/tareas">Tareas</a></div>
        ${board.length ? `<div class="podium">${[board[1], board[0], board[2]].filter(Boolean).map((m) => { const pos = board.indexOf(m); return `<div class="p">${avatar(m, pos === 0 ? 'lg' : '')}<div class="small bold">${esc(m.name)}</div><div class="tiny muted">${m.points || 0} pts</div><div class="blk" style="height:${[90, 64, 46][pos]}px">${['🥇', '🥈', '🥉'][pos]}</div></div>`; }).join('')}</div>` : '<div class="empty">Aún no hay puntos</div>'}
      </section>
    </div>`;
  },
  after(root) { startCountdowns(root); },
  actions: {
    newEvent(el, e) { openEventForm(); },
    editEvent(el) { openEventForm(S.data.events.find(e => e.id === el.dataset.id)); },
    party() { for (let i = 0; i < 5; i++) setTimeout(() => hooks.celebrate(innerWidth * (0.2 + Math.random() * 0.6), innerHeight * (0.2 + Math.random() * 0.3), 'confetti'), i * 250); }
  }
};
