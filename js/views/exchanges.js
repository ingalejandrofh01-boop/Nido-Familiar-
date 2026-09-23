// 🎁 Intercambios: sorteo secreto, listas de deseos y revelación con animación
import { S, hooks, members, member, useSub, isAdult, notify, onCleanup } from '../store.js';
import { esc, avatar, fmtDate, fmtTime, today0, isoDate, parseDate, modal, memberPicker, toast, money, daysBetween, confirmBox } from '../ui.js';
import { THEMES, renderScene } from '../themes.js';
import { startCountdowns } from './home.js';

const TYPES = [
  ['navidad', '🎄', 'Navideño'], ['amor', '💘', 'Amor y amistad'], ['halloween', '🎃', 'Halloween'],
  ['muertos', '💀', 'Día de Muertos'], ['anio_nuevo', '🎆', 'Año Nuevo'], ['cumple', '🎂', 'Cumpleaños'],
  ['madres', '💐', 'Día de las Madres'], ['patrias', '🇲🇽', 'Noche mexicana'], ['verano', '☀️', 'Verano'],
  ['primavera', '🌸', 'Primavera'], ['otono', '🍂', 'Otoño'], ['invierno', '❄️', 'Invierno'], ['clasico', '✨', 'Libre']
];
const typeInfo = (k) => TYPES.find(t => t[0] === k) || TYPES[TYPES.length - 1];
const revealed = {}; // estado local de "caja abierta"
const played = new Set();

// 🎬 Animación del sorteo en vivo (todos la ven al mismo tiempo)
function playLive(x) {
  const t = THEMES[x.type] || THEMES.clasico;
  const ps = (x.participants || []).map(member).filter(Boolean);
  const el = document.createElement('div'); el.className = 'live-draw';
  const n = ps.length, R = Math.min(150, innerWidth * .34);
  el.innerHTML = `<div class="ld-inner"><div class="ld-title">${esc(x.title)}</div>
    <div class="ld-stage" style="width:${R * 2 + 90}px;height:${R * 2 + 90}px"><div class="ld-ring">${ps.map((p, i) => { const a = i / n * Math.PI * 2; return `<div class="ld-p" style="left:${R + 45 + Math.cos(a) * R}px;top:${R + 45 + Math.sin(a) * R}px">${avatar(p, 'lg')}</div>`; }).join('')}</div>
    <div class="ld-count">…</div></div><div class="ld-sub">Mezclando nombres en secreto…</div></div>`;
  document.body.appendChild(el);
  const count = el.querySelector('.ld-count'), sub = el.querySelector('.ld-sub');
  const tick = () => {
    const left = Math.ceil((x.liveAt - Date.now()) / 1000);
    if (left > 0) { if (count.textContent !== String(left)) { count.textContent = left; count.classList.remove('pop'); void count.offsetWidth; count.classList.add('pop'); try { navigator.vibrate && navigator.vibrate(30); } catch { } } return; }
    clearInterval(iv); el.classList.add('done'); count.textContent = '🎁'; sub.innerHTML = '¡Sorteo listo! Cada quien ya tiene a su amigo secreto';
    try { navigator.vibrate && navigator.vibrate([80, 60, 160]); } catch { }
    for (let i = 0; i < 7; i++) setTimeout(() => hooks.celebrate(innerWidth * (0.15 + Math.random() * .7), innerHeight * (0.2 + Math.random() * .4), t.tapKind === 'heart' ? 'heart' : 'spark', [t.accent, t.accent2, t.glow, '#fff']), i * 160);
    const btn = document.createElement('button'); btn.className = 'btn primary lg mt'; btn.textContent = '🎁 Ver a quién le regalo'; btn.onclick = () => { el.classList.add('out'); setTimeout(() => el.remove(), 400); document.querySelector('.gift')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
    el.querySelector('.ld-inner').appendChild(btn);
  };
  const iv = setInterval(tick, 100); tick();
}

// ---------- Sorteo: permutación sin auto-asignarse y respetando exclusiones ----------
function draw(ids, exclusions = []) {
  const bad = new Set(exclusions.flatMap(([a, b]) => [a + '>' + b, b + '>' + a]));
  const ok = (g, r) => g !== r && !bad.has(g + '>' + r);
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const givers = shuffle([...ids]);
  const res = {}, used = new Set();
  const bt = (i) => {
    if (i === givers.length) return true;
    const g = givers[i];
    for (const r of shuffle([...ids])) {
      if (used.has(r) || !ok(g, r)) continue;
      used.add(r); res[g] = r;
      if (bt(i + 1)) return true;
      used.delete(r); delete res[g];
    }
    return false;
  };
  return bt(0) ? res : null;
}

function exchangeForm(x = null, preset = 'navidad') {
  const y = today0().getFullYear();
  const defaults = { navidad: `${y}-12-24`, amor: `${y + (today0() > new Date(y, 1, 14) ? 1 : 0)}-02-14`, halloween: `${y}-10-31`, muertos: `${y}-11-02`, anio_nuevo: `${y}-12-31`, madres: `${y + (today0() > new Date(y, 4, 10) ? 1 : 0)}-05-10`, patrias: `${y}-09-15` };
  const e = x || { type: preset, title: '', date: defaults[preset] || isoDate(), time: '20:00', budget: 300, participants: members().map(m => m.id), exclusions: [] };
  const exText = (e.exclusions || []).map(p => p.join(',')).join(';');
  modal({
    title: x ? 'Editar intercambio' : 'Nuevo intercambio', wide: true,
    body: `
      <div class="field"><label>Temporada / estilo (cambia el diseño del evento)</label>
        <div class="chips">${TYPES.map(([k, em, l]) => `<label class="chip chip-btn"><input type="radio" name="type" value="${k}" ${e.type === k ? 'checked' : ''}> ${em} ${l}</label>`).join('')}</div></div>
      <div class="field"><label>Nombre</label><input class="input" name="title" required value="${esc(e.title)}" placeholder="Intercambio navideño ${y}"></div>
      <div class="frow"><div class="field"><label>Fecha</label><input class="input" type="date" name="date" required value="${esc(e.date)}"></div>
        <div class="field"><label>Hora</label><input class="input" type="time" name="time" value="${esc(e.time || '')}"></div></div>
      <div class="frow"><div class="field"><label>Presupuesto por regalo ($)</label><input class="input" type="number" min="0" step="50" name="budget" value="${esc(e.budget ?? '')}"></div>
        <div class="field"><label>Lugar</label><input class="input" name="location" value="${esc(e.location || '')}" placeholder="Casa de la abuela"></div></div>
      <div class="field"><label>Reglas o dinámica</label><input class="input" name="rules" value="${esc(e.rules || '')}" placeholder="Regalo + carta escrita a mano 💌"></div>
      <div class="field"><label>Participantes</label>${memberPicker('participants', members(), e.participants || [])}</div>
      <div class="field"><label>Parejas que NO pueden tocarse entre sí (ej. esposos)</label>
        <div id="excl" class="col"></div><button type="button" class="btn sm" id="addEx" style="align-self:flex-start">＋ Agregar pareja</button>
        <input type="hidden" name="exclusions" value="${esc(exText)}"></div>
      ${x && x.status === 'drawn' ? '<p class="small" style="color:#f59e0b;font-weight:800">⚠️ Si cambias participantes o parejas, tendrás que rehacer el sorteo.</p>' : ''}`,
    onOpen(form) {
      const box = form.querySelector('#excl'), hidden = form.querySelector('[name=exclusions]');
      const opts = (sel) => members().map(m => `<option value="${m.id}" ${m.id === sel ? 'selected' : ''}>${esc(m.name)}</option>`).join('');
      const sync = () => hidden.value = [...box.querySelectorAll('.exrow')].map(r => [...r.querySelectorAll('select')].map(s => s.value).join(',')).join(';');
      const addRow = (a, b) => {
        const r = document.createElement('div'); r.className = 'row exrow';
        r.innerHTML = `<select class="input">${opts(a)}</select><span>🚫</span><select class="input">${opts(b)}</select><button type="button" class="icon-btn">✕</button>`;
        r.querySelector('button').onclick = () => { r.remove(); sync(); };
        r.querySelectorAll('select').forEach(s => s.onchange = sync); box.appendChild(r); sync();
      };
      (e.exclusions || []).forEach(([a, b]) => addRow(a, b));
      form.querySelector('#addEx').onclick = () => addRow(members()[0]?.id, members()[1]?.id);
      form.querySelectorAll('[name=type]').forEach(r => r.onchange = () => {
        const t = form.querySelector('[name=title]'); const [k, em, l] = typeInfo(r.value);
        if (!t.value || t.dataset.auto) { t.value = `${em} Intercambio ${l.toLowerCase()} ${y}`; t.dataset.auto = 1; }
        if (defaults[k] && !x) form.querySelector('[name=date]').value = defaults[k];
        hooks.setPageTheme(k);
      });
    },
    submit: async (d) => {
      const exclusions = (d.exclusions || '').split(';').filter(Boolean).map(p => p.split(',')).filter(p => p[0] && p[1] && p[0] !== p[1]);
      const data = { title: d.title.trim(), type: d.type, date: d.date, time: d.time, budget: Number(d.budget) || 0, location: d.location, rules: d.rules, participants: d.participants || [], exclusions };
      if (data.participants.length < 3) { toast('Se necesitan al menos 3 participantes'); return false; }
      if (x) { await S.db.update('exchanges', x.id, data); toast('✅ Guardado'); }
      else { const id = await S.db.add('exchanges', { ...data, status: 'open', createdBy: S.user.uid }); toast('🎁 ¡Intercambio creado!'); notify({ to: data.participants, icon: typeInfo(data.type)[1], title: `Te invitaron: ${data.title}`, body: `${fmtDate(data.date, { weekday: true })}${data.budget ? ' · presupuesto ' + money(data.budget) : ''} · agrega tu lista de deseos 🎁`, link: 'intercambio/' + id }); hooks.go('intercambio/' + id); }
    },
    onClose: () => hooks.rerender(),
    danger: x ? { label: '🗑️ Eliminar', confirm: '¿Eliminar este intercambio y su sorteo?', action: async () => { await S.db.remove('exchanges', x.id); hooks.go('intercambios'); } } : null
  });
}

// ------------------------- LISTA -------------------------
export const exchangesList = {
  render() {
    const t = isoDate(today0());
    const list = [...S.data.exchanges].sort((a, b) => (a.date < t) - (b.date < t) || a.date.localeCompare(b.date));
    const card = (x) => {
      const [k, em] = typeInfo(x.type); const days = daysBetween(today0(), parseDate(x.date));
      const ps = (x.participants || []).map(member).filter(Boolean);
      return `<article class="card xcard" onclick="location.hash='#/intercambio/${x.id}'">
        <div class="xcard-top">${renderScene(k, 'x' + x.id)}<span class="xemoji">${em}</span></div>
        <div class="xcard-body">
          <div class="row between"><h3 style="font-size:18px;font-weight:900" class="ellipsis">${esc(x.title)}</h3></div>
          <div class="small muted mt-s">${fmtDate(x.date, { weekday: true })}${x.time ? ' · ' + fmtTime(x.time) : ''}</div>
          <div class="row between mt"><div class="avatars">${ps.slice(0, 6).map(p => avatar(p, 'sm')).join('')}</div>
          <span class="chip ${days >= 0 ? 'accent' : ''}">${days > 0 ? `⏳ ${days} días` : days === 0 ? '🎉 ¡Hoy!' : '✔️ Pasado'}</span></div>
          <div class="row mt-s small bold">${x.status === 'open' ? '🎲 Por sortear' : x.status === 'revealed' ? '🎊 Revelado' : '🤫 Sorteado en secreto'}${x.budget ? ` · 💰 ${money(x.budget)}` : ''}</div>
        </div></article>`;
    };
    return `
      <div class="page-head"><div><h1>Intercambios</h1><p>Sorteos secretos, listas de deseos y mucha emoción</p></div>
        <button class="btn primary" data-act="new">＋ Nuevo intercambio</button></div>
      <section class="card deco mb"><div class="card-title"><h3>✨ Empieza rápido</h3></div>
        <div class="chips">${TYPES.slice(0, 9).map(([k, em, l]) => `<button class="chip chip-btn" data-act="new" data-type="${k}">${em} ${l}</button>`).join('')}</div></section>
      ${list.length ? `<div class="grid auto">${list.map(card).join('')}</div>` : `<div class="card empty"><div class="big">🎁</div><p class="bold">Aún no hay intercambios</p><button class="btn primary" data-act="new">Crear el primero</button></div>`}`;
  },
  actions: { new(el) { exchangeForm(null, el.dataset.type || 'navidad'); } }
};

// ------------------------- DETALLE -------------------------
export const exchangeDetail = {
  theme([id]) { const x = S.data.exchanges.find(e => e.id === id); return x ? (THEMES[x.type] ? x.type : 'clasico') : null; },
  render([id]) {
    const x = S.data.exchanges.find(e => e.id === id);
    if (!x) return `<div class="card empty"><div class="big">🔍</div>No encontramos este intercambio. <a class="link" href="#/intercambios">Volver</a></div>`;
    const [k, em, label] = typeInfo(x.type);
    const isOrg = x.createdBy === S.user.uid || S.me.role === 'admin';
    const asgs = useSub('asg-' + id, `exchanges/${id}/assignments`, (isOrg || x.status === 'revealed') ? {} : { where: ['giverUid', '==', S.user.uid] }) || [];
    const wishes = useSub('wish-' + id, `exchanges/${id}/wishes`, {}) || [];
    const ps = (x.participants || []).map(member).filter(Boolean);
    const mine = asgs.find(a => a.giverId === S.me.id);
    const recv = mine ? member(mine.receiverId) : null;
    const iAmIn = (x.participants || []).includes(S.me.id);
    const target = new Date(parseDate(x.date).getTime() + (x.time ? (+x.time.slice(0, 2) * 3600 + +x.time.slice(3) * 60) * 1000 : 0));
    const future = target > Date.now();

    const wishList = (m, highlight) => {
      const ws = wishes.filter(w => w.memberId === m.id);
      const canEdit = m.id === S.me.id || (!m.uid && isAdult());
      return `<div class="card pad-sm" style="${highlight ? 'box-shadow:0 0 0 2px var(--accent),var(--shadow)' : ''}">
        <div class="row mb" style="margin-bottom:10px">${avatar(m)}<div class="grow"><div class="bold">${esc(m.name)}${highlight ? ' <span class="chip accent">🎯 Tu amigo secreto</span>' : ''}</div><div class="tiny muted">${ws.length} deseo${ws.length === 1 ? '' : 's'}</div></div>
        ${canEdit ? `<button class="icon-btn" data-act="addWish" data-m="${m.id}" title="Agregar deseo">＋</button>` : ''}</div>
        <div class="col" style="gap:6px">${ws.map(w => `<div class="wish"><span>🎁</span><div class="grow"><div class="bold small">${esc(w.text)}</div>${w.link ? `<a class="tiny link" href="${esc(w.link)}" target="_blank" rel="noopener">Ver ejemplo ↗</a>` : ''}</div>${canEdit ? `<button class="link tiny" data-act="delWish" data-id="${w.id}">✕</button>` : ''}</div>`).join('') || '<div class="tiny muted">Sin deseos todavía</div>'}</div></div>`;
    };

    // Sección central según estado
    let center = '';
    if (x.status === 'open') {
      const lobby = x.lobby || {}; const now = Date.now();
      const here = (mid) => lobby[mid] && now - lobby[mid] < 90000;
      const inCount = ps.filter(p => here(p.id)).length;
      const meIn = here(S.me.id);
      center = `<section class="card deco center live-lobby">
        <div class="lobby-title"><span class="live-dot"></span> SALA DEL SORTEO EN VIVO</div>
        <h2 style="font-size:24px;font-weight:900;margin-top:6px">${inCount === ps.length ? '¡Ya están todos! 🎉' : `${inCount} de ${ps.length} en la sala`}</h2>
        <p class="muted bold small">Cuando entren, el organizador lanza el sorteo y todos lo ven al mismo tiempo. Cada quien descubre sólo a quién le regala 🤫</p>
        <div class="lobby-grid">${ps.map(p => `<div class="lobby-p ${here(p.id) ? 'in' : ''}">${avatar(p, here(p.id) ? 'lg live' : 'lg')}<div class="tiny bold ellipsis">${esc(p.name)}</div><div class="tiny ${here(p.id) ? '' : 'muted'}">${here(p.id) ? '✅ Listo' : p.uid ? '⏳ Esperando' : '📱 Sin cuenta'}</div></div>`).join('')}</div>
        ${(x.participants || []).includes(S.me.id) ? (meIn ? '<div class="chip accent mt">🙋 Estás en la sala</div>' : `<button class="btn primary lg mt" data-act="joinLobby" data-id="${id}">🙋 Entrar a la sala</button>`) : ''}
        ${isOrg ? `<div class="divider">Organizador</div><button class="btn primary lg" data-act="draw" data-id="${id}">🎲 Lanzar sorteo en vivo</button>
          <button class="btn sm mt" data-act="nudge" data-id="${id}">📣 Avisar a los que faltan</button>` : '<p class="small muted mt">El organizador lanzará el sorteo en cuanto estén todos.</p>'}
      </section>`;
    } else if (x.status === 'revealed') {
      center = `<section class="card deco"><div class="card-title"><h3>🎊 ¡Gran revelación!</h3></div>
        <div class="list">${asgs.map(a => `<div class="item">${avatar(member(a.giverId))}<b class="grow">${esc(member(a.giverId)?.name || '?')}</b><span style="font-size:22px">🎁➜</span><b class="grow" style="text-align:right">${esc(member(a.receiverId)?.name || '?')}</b>${avatar(member(a.receiverId))}</div>`).join('')}</div></section>`;
    } else {
      center = `<section class="card deco center">
        ${!iAmIn ? `<div style="font-size:50px">👀</div><p class="bold">No participas en este intercambio, pero puedes ver las listas de deseos.</p>` :
          !mine ? `<div style="font-size:50px">⏳</div><p class="bold">Cargando tu amigo secreto…</p>` :
            revealed[id] ? `<div class="reveal-name">${avatar(recv, 'xl')}<div class="small bold muted">Te tocó regalarle a</div><h2>${esc(recv?.name || '?')}</h2>
              <p class="muted bold">¡Shhh! 🤫 Es un secreto${x.budget ? ` · Presupuesto ${money(x.budget)}` : ''}</p>
              <button class="btn sm mt" data-act="hide" data-id="${id}">🙈 Ocultar</button></div>`
              : `<div class="small bold muted">Tu amigo secreto te espera…</div>
              <div class="gift-stage"><div class="gift" data-act="open" data-id="${id}"><div class="bow"></div><div class="lid"></div><div class="box"></div><div class="ribbon-v"></div></div></div>
              <p class="bold">👆 Toca el regalo para descubrirlo</p>`}
        ${isOrg ? `<div class="divider">Organizador</div>
          <div class="small muted mb">Para quien no tiene cuenta (por ejemplo los peques), dale tu teléfono y revela aquí su resultado:</div>
          <div class="chips" style="justify-content:center">${ps.filter(p => !p.uid && p.id !== S.me.id).map(p => `<button class="chip chip-btn" data-act="revealFor" data-id="${id}" data-m="${p.id}">🎁 ${esc(p.name)}</button>`).join('') || '<span class="tiny muted">Todos tienen cuenta 👍</span>'}</div>
          <div class="row mt" style="justify-content:center;flex-wrap:wrap"><button class="btn sm" data-act="revealAll" data-id="${id}">🎊 Revelar a todos (el día del evento)</button><button class="btn sm ghost" data-act="redraw" data-id="${id}">↺ Rehacer sorteo</button></div>` : ''}
      </section>`;
    }

    const others = ps.filter(p => p.id !== recv?.id);
    return `
      <a class="link" href="#/intercambios">‹ Intercambios</a>
      <section class="card xhero deco mt">
        <div class="xhero-inner">
          <div class="row between wrap"><span class="chip accent">${em} ${label}</span>${isOrg ? `<button class="btn sm" data-act="edit" data-id="${id}">✏️ Editar</button>` : ''}</div>
          <div class="xhero-title mt">${esc(x.title)}</div>
          <div class="row wrap mt small bold" style="gap:14px">
            <span>📅 ${fmtDate(x.date, { weekday: true })}${x.time ? ' · ' + fmtTime(x.time) : ''}</span>
            ${x.location ? `<span>📍 ${esc(x.location)}</span>` : ''}${x.budget ? `<span>💰 ${money(x.budget)}</span>` : ''}</div>
          ${x.rules ? `<p class="bold mt" style="font-size:16px">📜 ${esc(x.rules)}</p>` : ''}
          ${future ? `<div class="countdown" data-cd="${target.getTime()}">${['días', 'horas', 'min', 'seg'].map(l => `<div class="cd-box"><b>--</b><span>${l}</span></div>`).join('')}</div>` : '<p class="bold mt">🎉 ¡El día llegó!</p>'}
          <div class="avatars mt">${ps.map(p => avatar(p)).join('')}</div>
        </div>
      </section>
      <div class="mt">${center}</div>
      <div class="page-head mt" style="margin-bottom:12px"><div><h1 style="font-size:30px">Listas de deseos</h1><p>Pistas para acertar con el regalo</p></div></div>
      <div class="grid auto">${recv && revealed[id] ? wishList(recv, true) : ''}${(recv && revealed[id] ? others : ps).map(m => wishList(m, false)).join('')}</div>`;
  },
  after(root, [id]) {
    startCountdowns(root);
    const x = S.data.exchanges.find(e => e.id === id); if (!x) return;
    // Latido: mantenerme "en la sala" mientras tenga la pantalla abierta
    if (x.status === 'open' && x.lobby && x.lobby[S.me.id]) {
      const t = setInterval(() => S.db.update('exchanges', id, { ['lobby.' + S.me.id]: Date.now() }), 40000);
      onCleanup(() => clearInterval(t));
      const r = setInterval(() => hooks.rerender(), 20000); onCleanup(() => clearInterval(r));
    }
    // Sorteo en vivo sincronizado
    if (x.liveAt && Date.now() < x.liveAt + 4000 && !played.has(id + x.liveAt)) { played.add(id + x.liveAt); playLive(x); }
  },
  actions: {
    edit(el) { exchangeForm(S.data.exchanges.find(e => e.id === el.dataset.id)); },
    async draw(el) {
      const x = S.data.exchanges.find(e => e.id === el.dataset.id);
      const res = draw(x.participants, x.exclusions);
      if (!res) { toast('😅 No hay combinación posible con esas parejas. Quita alguna exclusión.'); return; }
      const path = `exchanges/${x.id}/assignments`;
      for (const [g, r] of Object.entries(res)) await S.db.set(path, g, { giverId: g, giverUid: member(g)?.uid || '', receiverId: r });
      await S.db.update('exchanges', x.id, { status: 'drawn', drawnAt: Date.now(), liveAt: Date.now() + 5500 });
      notify({ to: x.participants, icon: '🎲', title: `¡Ya se hizo el sorteo! ${x.title}`, body: 'Entra y abre tu regalo para ver a quién le toca 🎁', link: 'intercambio/' + x.id });
    },
    async joinLobby(el) { await S.db.update('exchanges', el.dataset.id, { ['lobby.' + S.me.id]: Date.now() }); try { navigator.vibrate && navigator.vibrate(40); } catch { } toast('🙋 ¡Entraste a la sala!'); },
    async nudge(el) {
      const x = S.data.exchanges.find(e => e.id === el.dataset.id); const lobby = x.lobby || {};
      const missing = x.participants.filter(id => !(lobby[id] && Date.now() - lobby[id] < 90000) && member(id)?.uid);
      if (!missing.length) { toast('Ya están todos los que tienen cuenta 🙌'); return; }
      notify({ to: missing, icon: '📣', title: `¡Te estamos esperando! ${x.title}`, body: 'Entra a la sala del sorteo en vivo', link: 'intercambio/' + x.id });
      toast(`📣 Avisamos a ${missing.length}`);
    },
    async redraw(el) {
      if (!(await confirmBox('Se borrará el sorteo actual y todos verán a alguien nuevo. ¿Rehacer?'))) return;
      const id = el.dataset.id; const asgs = S.subs['asg-' + id]?.data || [];
      for (const a of asgs) await S.db.remove(`exchanges/${id}/assignments`, a.id);
      Object.keys(revealed).forEach(k => delete revealed[k]);
      await S.db.update('exchanges', id, { status: 'open', liveAt: 0, lobby: {} });
    },
    async revealAll(el) {
      if (!(await confirmBox('Todos podrán ver quién le regaló a quién. ¿Revelar?', '🎊 Revelar'))) return;
      await S.db.update('exchanges', el.dataset.id, { status: 'revealed' });
      { const x = S.data.exchanges.find(e => e.id === el.dataset.id); notify({ to: x.participants, icon: '🎊', title: `¡Gran revelación! ${x.title}`, body: 'Entra a ver quién le regaló a quién', link: 'intercambio/' + x.id }); }
      hooks.celebrate(innerWidth / 2, innerHeight / 3, 'confetti');
    },
    open(el) {
      const id = el.dataset.id; if (el.classList.contains('shake')) return;
      el.classList.add('shake');
      setTimeout(() => {
        el.classList.remove('shake'); el.classList.add('open');
        const r = el.getBoundingClientRect(); const x = S.data.exchanges.find(e => e.id === id); const t = THEMES[x?.type] || THEMES.clasico;
        hooks.celebrate(r.left + r.width / 2, r.top + r.height / 3, 'confetti', [t.accent, t.accent2, t.glow, '#fff']);
        hooks.celebrate(r.left + r.width / 2, r.top + r.height / 3, 'spark', [t.accent, t.accent2, t.glow, '#fff']);
        setTimeout(() => { revealed[id] = true; hooks.rerender(); }, 650);
      }, 1000);
    },
    hide(el) { revealed[el.dataset.id] = false; hooks.rerender(); },
    revealFor(el) {
      const id = el.dataset.id; const giver = member(el.dataset.m);
      const a = (S.subs['asg-' + id]?.data || []).find(a => a.giverId === giver.id);
      if (!a) { toast('No se encontró su resultado'); return; }
      const recv = member(a.receiverId);
      const m = modal({
        title: `🎁 Para ${esc(giver.name)}`, body: `<div class="center" id="rv"><p class="bold">${esc(giver.name)}, toca tu regalo 👇</p>
          <div class="gift-stage"><div class="gift" id="g2"><div class="bow"></div><div class="lid"></div><div class="box"></div><div class="ribbon-v"></div></div></div></div>`, foot: `<div class="modal-foot"><button type="button" class="btn primary" data-close>Listo 🤫</button></div>`
      });
      const g = m.el.querySelector('#g2');
      g.onclick = () => {
        g.classList.add('shake');
        setTimeout(() => {
          g.classList.add('open'); const r = g.getBoundingClientRect(); hooks.celebrate(r.left + r.width / 2, r.top + 40, 'confetti');
          setTimeout(() => { m.el.querySelector('#rv').innerHTML = `<div class="reveal-name">${avatar(recv, 'xl')}<div class="small bold muted">Te tocó regalarle a</div><h2>${esc(recv.name)}</h2><p class="bold muted">¡No se lo digas a nadie! 🤫</p></div>`; }, 600);
        }, 1000);
      };
    },
    addWish(el) {
      const id = S.route.params[0]; const m = member(el.dataset.m);
      modal({
        title: `🎁 Deseo de ${esc(m.name)}`, body: `<div class="field"><label>¿Qué te gustaría?</label><input class="input" name="text" required placeholder="Audífonos, un libro, pantuflas…"></div>
          <div class="field"><label>Link de ejemplo (opcional)</label><input class="input" name="link" type="url" placeholder="https://…"></div>`,
        submit: async (d) => { if (!d.text.trim()) return false; await S.db.add(`exchanges/${id}/wishes`, { memberId: m.id, text: d.text.trim(), link: d.link || '' }); toast('🎁 Deseo agregado'); }
      });
    },
    async delWish(el) { await S.db.remove(`exchanges/${S.route.params[0]}/wishes`, el.dataset.id); }
  }
};
