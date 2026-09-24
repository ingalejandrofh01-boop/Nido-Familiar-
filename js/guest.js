// 🎟️ Invitados de fuera (amigos, novia, compañeros…)
// No entran a la familia: se unen a UN evento (intercambio o fiesta) con un link y sólo ven eso.
// Las reglas de Firebase lo garantizan: su uid queda en guestUids del evento y nada más.
import { S, hooks, members, member, guestPerson } from './store.js';
import { esc, avatar, modal, toast, confirmBox, fmtDate, fmtTime, timeAgo, EMOJIS_PEOPLE, COLORS, today0, isoDate, relDay } from './ui.js';

export const KIND = {
  x: { col: 'exchanges', route: 'intercambio', noun: 'intercambio', icon: '🎁' },
  p: { col: 'parties', route: 'fiesta', noun: 'fiesta', icon: '🎉' }
};
export const kindOf = (col) => col === 'exchanges' ? 'x' : 'p';
const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { } };

// ---------------- Link de invitación ----------------
const ALPH = 'abcdefghjkmnpqrstuvwxyz23456789';
const newCode = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), b => ALPH[b % ALPH.length]).join('');
const famId = () => S.family?.id || (S.isDemo ? 'demo' : '');
export const inviteUrl = (col, d) => `${location.origin}${location.pathname}?inv=${encodeURIComponent([famId(), kindOf(col), d.id, d.inviteCode].join('.'))}`;

const PKEY = 'nido-pending-inv';
// Al abrir la app desde el link, guardamos la invitación (sobrevive al inicio de sesión)
(function capture() {
  try {
    const q = new URLSearchParams(location.search).get('inv'); if (!q) return;
    const [fid, k, id, code] = q.split('.'); if (!fid || !KIND[k] || !id || !code) return;
    lsSet(PKEY, JSON.stringify({ fid, k, id, code, at: Date.now() }));
    history.replaceState(null, '', location.pathname + location.hash);
  } catch { }
})();
export function pendingInvite() { try { const v = JSON.parse(lsGet(PKEY) || 'null'); return v && Date.now() - v.at < 7 * 864e5 ? v : null; } catch { return null; } }
export const clearInvite = () => lsSet(PKEY, null);

// ---------------- Datos públicos de la familia para el evento ----------------
// Los invitados NO pueden leer los perfiles de la familia (cumpleaños, teléfonos, notas…).
// Por eso el evento guarda una copia mínima: nombre, emoji, color y avatar de quienes participan.
const pub = (m) => {
  const o = { name: m.name || '', emoji: m.emoji || '', color: m.color || '', uid: m.uid || '' };
  if (m.avatar && m.avatarMode !== 'photo') o.avatar = m.avatar;
  else if (m.photo && /^https:/.test(m.photo)) o.photo = m.photo;
  return o;
};
const stable = (v) => v && typeof v === 'object' ? (Array.isArray(v) ? '[' + v.map(stable).join(',') + ']' : '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}') : JSON.stringify(v);
function snapshotFor(col, d) {
  const ids = col === 'exchanges' ? (d.participants || []).filter(i => !String(i).startsWith('g_')) : members().map(m => m.id);
  const out = {}; for (const id of ids) { const m = S.data.members.find(x => x.id === id); if (m) out[id] = pub(m); }
  if (d.host && !out[d.host]) { const h = S.data.members.find(x => x.id === d.host); if (h) out[d.host] = pub(h); }
  return out;
}
const synced = new Map();
export function syncPeople(col, d) {
  if (S.guest || !d?.inviteCode) return;
  const snap = snapshotFor(col, d), key = stable(snap);
  if (synced.get(d.id) === key || stable(d.people || {}) === key) { synced.set(d.id, key); return; }
  synced.set(d.id, key);
  S.db.update(col, d.id, { people: snap, familyName: S.family?.name || '' }).catch(e => console.warn('people', e));
}

// ---------------- Organizador: invitar amigos ----------------
function qrSvg(txt) {
  const Q = window.qrcode; if (!Q) return '';
  const q = Q(0, 'M'); q.addData(txt); q.make(); return q.createSvgTag({ cellSize: 5, margin: 2, scalable: true });
}
function loadQR() {
  if (window.qrcode) return Promise.resolve();
  return new Promise(res => { const s = document.createElement('script'); s.src = 'js/vendor/qrcode.js'; s.onload = res; s.onerror = res; document.head.appendChild(s); });
}
const docOf = (col, id) => (S.data[col] || []).find(x => x.id === id);

// Crea el link de invitación del evento si todavía no tiene uno
export async function ensureInvite(col, id) {
  let d = docOf(col, id); if (!d) return null;
  if (!d.inviteCode) {
    const code = newCode();
    await S.db.update(col, id, { inviteCode: code, inviteOpen: true, familyName: S.family?.name || '', people: snapshotFor(col, d), guestUids: d.guestUids || [], guests: d.guests || {} });
    d = { ...d, inviteCode: code, inviteOpen: true };
  }
  return d;
}
export async function openInvite(col, id) {
  let d = await ensureInvite(col, id); if (!d) return;
  await loadQR();
  const k = KIND[kindOf(col)];
  const body = () => {
    const x = docOf(col, id) || d, url = inviteUrl(col, x), gs = Object.entries(x.guests || {});
    const drawn = col === 'exchanges' && x.status !== 'open';
    return `<div class="inv-sees"><div class="bold">🔒 ¿Qué verán tus invitados?</div>
        <div class="small">Sólo ${col === 'exchanges' ? 'este intercambio: quiénes participan (nombre y avatar), las listas de deseos, la sala del sorteo y a quién les tocó regalar' : 'esta fiesta: fecha, lugar, quién va y la lista de "¿quién trae qué?"'}.</div>
        <div class="small muted">No ven nada más de la familia: ni chat, fotos, agenda, dinero, documentos ni perfiles.</div></div>
      ${x.inviteOpen ? `<div class="inv-link">
        <div class="inv-qr">${qrSvg(url)}</div>
        <div class="grow" style="min-width:0">
          <div class="tiny bold muted">Link de invitación</div>
          <input class="input inv-url" readonly value="${esc(url)}" onclick="this.select()">
          <div class="row wrap mt-s" style="gap:8px">
            ${navigator.share ? '<button type="button" class="btn sm primary" data-inv="share">📤 Compartir</button>' : ''}
            <a class="btn sm ${navigator.share ? '' : 'primary'}" data-inv="wa" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(shareText(col, x, url))}">💬 WhatsApp</a>
            <button type="button" class="btn sm" data-inv="copy">📋 Copiar</button>
          </div>
        </div></div>
        ${drawn ? '<p class="tiny" style="color:#f59e0b;font-weight:800;margin-top:8px">⚠️ El sorteo ya se hizo: quien entre ahora podrá ver las listas, pero no participa en el sorteo (a menos que lo rehagas).</p>' : ''}`
        : '<div class="card pad-sm center small bold">🚪 Las invitaciones están cerradas: el link no deja entrar a nadie nuevo.</div>'}
      <button type="button" class="btn block mt" data-inv="image">🖼️ Crear imagen para compartir</button>
      <label class="row mt" style="gap:10px;cursor:pointer"><input type="checkbox" data-inv="open" ${x.inviteOpen ? 'checked' : ''} style="width:20px;height:20px;accent-color:var(--accent)"><span class="grow"><b>Aceptar nuevos invitados</b><div class="tiny muted">Apágalo cuando ya estén todos</div></span></label>
      <button type="button" class="link tiny mt-s" data-inv="rotate">🔄 Cambiar el link (el anterior deja de funcionar)</button>
      <div class="nav-group mt">🎟️ Invitados (${gs.length})</div>
      <div class="list">${gs.map(([uid, g]) => { const p = guestPerson(uid, g); return `<div class="item">${avatar(p, 'sm')}<div class="grow"><div class="bold">${esc(p.name)}</div><div class="tiny muted">Se unió ${timeAgo(g.joinedAt)}</div></div><button type="button" class="btn sm ghost" data-inv="kick" data-uid="${esc(uid)}">Quitar</button></div>`; }).join('') || `<div class="tiny muted">Todavía nadie. Manda el link por WhatsApp a tus amigos, a tu novia, a los tíos… 💌</div>`}</div>
      ${S.isDemo ? '<div class="divider">Demo</div><button type="button" class="btn sm block" data-inv="demoGuest">👀 Probar cómo lo ve una invitada</button>' : ''}`;
  };
  modal({
    title: `🎟️ Invitar de fuera · ${esc(d.title || k.noun)}`, body: body(),
    foot: '<div class="modal-foot"><button type="button" class="btn primary" data-close>Listo</button></div>',
    onOpen(form, close) {
      const paint = () => { form.querySelector('.modal-body').innerHTML = body(); };
      form.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-inv]'); if (!b) return;
        const act = b.dataset.inv, x = docOf(col, id) || d, url = inviteUrl(col, x);
        if (act === 'copy') { try { await navigator.clipboard.writeText(url); toast('📋 Link copiado'); } catch { form.querySelector('.inv-url')?.select(); } }
        if (act === 'share') { e.preventDefault(); try { await navigator.share({ title: x.title, text: shareText(col, x, ''), url }); } catch { } }
        if (act === 'image') { e.preventDefault(); const { openInviteImage } = await import('./invitecard.js'); openInviteImage(col, id); return; }
        if (act === 'rotate') { e.preventDefault(); if (!(await confirmBox('Se creará un link nuevo y el anterior dejará de funcionar para quien no se haya unido. ¿Cambiarlo?', '🔄 Cambiar'))) return; await S.db.update(col, id, { inviteCode: newCode() }); setTimeout(paint, 150); toast('🔄 Link nuevo listo'); }
        if (act === 'kick') { e.preventDefault(); await kickGuest(col, id, b.dataset.uid); setTimeout(paint, 150); }
        if (act === 'demoGuest') { e.preventDefault(); close(); lsSet(PKEY, JSON.stringify({ fid: 'demo', k: kindOf(col), id, code: x.inviteCode, at: Date.now() })); await S.db.signOut(); await S.db.signInDemoGuest(); }
      });
      form.addEventListener('change', async (e) => {
        if (e.target.dataset.inv !== 'open') return;
        await S.db.update(col, id, { inviteOpen: e.target.checked }); setTimeout(paint, 150);
      });
    }
  });
}
const shareText = (col, x, url) => col === 'exchanges'
  ? `🎁 ¡Te invito a "${x.title}"! Entra para unirte al sorteo, hacer tu lista de deseos y descubrir a quién le regalas 🤫${url ? '\n' + url : ''}`
  : `🎉 ¡Estás invitado a "${x.title}"! ${fmtDate(x.date, { weekday: true })}${x.time ? ' · ' + fmtTime(x.time) : ''}. Confirma y apunta qué llevas 👇${url ? '\n' + url : ''}`;

export async function kickGuest(col, id, uid) {
  const x = docOf(col, id); if (!x) return;
  const g = 'g_' + uid, name = x.guests?.[uid]?.name || 'este invitado';
  const inDraw = col === 'exchanges' && x.status !== 'open' && (x.participants || []).includes(g);
  if (!(await confirmBox(`${inDraw ? `${name} ya está en el sorteo. Si lo quitas tendrás que rehacer el sorteo. ` : `${name} ya no podrá ver este ${KIND[kindOf(col)].noun}. `}Para que no vuelva a entrar con el mismo link, se creará un link nuevo (compártelo otra vez si falta alguien). ¿Quitar?`, 'Quitar'))) return;
  const guests = { ...(x.guests || {}) }; delete guests[uid];
  const upd = { guestUids: (x.guestUids || []).filter(u => u !== uid), guests, inviteCode: newCode() };
  if (col === 'exchanges') { upd.participants = (x.participants || []).filter(p => p !== g); const lobby = { ...(x.lobby || {}) }; delete lobby[g]; upd.lobby = lobby; }
  if (col === 'parties' && x.rsvp) { const rsvp = { ...x.rsvp }; delete rsvp[g]; upd.rsvp = rsvp; }
  await S.db.update(col, id, upd);
  S.db.remove(`${col}/${id}/contacts`, uid).catch(() => { });
  toast(`${name} ya no tiene acceso`);
}

// Tarjetita para el organizador dentro del evento
export function inviteCard(col, x, canInvite) {
  const gs = Object.entries(x.guests || {});
  if (!canInvite && !gs.length) return '';
  return `<section class="card deco mt inv-card"><div class="row wrap" style="gap:12px">
    <span style="font-size:30px">🎟️</span>
    <div class="grow" style="min-width:0"><div class="bold">Invitados de fuera</div>
      <div class="tiny muted">${gs.length ? `${gs.length} invitado${gs.length === 1 ? '' : 's'} · sólo ven este ${KIND[kindOf(col)].noun}` : 'Amigos, novia, tíos, primos… sólo verán este ' + KIND[kindOf(col)].noun + ', nada más de la familia'}</div>
      ${gs.length ? `<div class="avatars mt-s">${gs.map(([uid, g]) => avatar(guestPerson(uid, g), 'sm')).join('')}</div>` : ''}</div>
    ${canInvite ? `<div class="row wrap" style="gap:8px"><button class="btn ${gs.length ? '' : 'primary'}" data-act="invite" data-col="${col}" data-id="${x.id}">🎟️ ${gs.length ? 'Administrar' : 'Invitar'}</button><button class="btn" data-act="inviteImage" data-col="${col}" data-id="${x.id}">🖼️ Imagen para compartir</button></div>` : ''}
  </div></section>`;
}

// ---------------- Invitado: perfil, unirse y salir ----------------
const PROFILE = 'nido-guest-profile';
export const savedProfile = () => { try { return JSON.parse(lsGet(PROFILE) || 'null'); } catch { return null; } };
const digits = (v) => String(v || '').replace(/\D/g, '');
// WhatsApp internacional: 10 dígitos en México → 52 + número
export const waNumber = (phone) => { const d = digits(phone); return d.length === 10 ? '52' + d : d; };
function profileFields(p) {
  return `<div class="field"><label>¿Cómo te llamas?</label><input class="input" name="name" required maxlength="30" value="${esc(p.name || '')}" placeholder="Tu nombre"></div>
    <div class="field"><label>Tu WhatsApp 📱</label><input class="input" name="phone" type="tel" inputmode="tel" required value="${esc(p.phone || '')}" placeholder="55 1234 5678" autocomplete="tel">
      <div class="tiny muted mt-s">Para mandarte recordatorios una semana antes y el mismo día. Sólo lo ve quien organiza, nadie más.</div></div>
    <div class="field"><label>Tu emoji</label><div class="chips gp-emojis">${['😎', '😊', '🥰', '🤓', '😜', '🤠', '👩', '👨', '👧', '🧔', '👱‍♀️', '🦊', '🐱', '🐶', '🦄', '🌸', '⭐', '🍀'].map(e => `<label class="chip chip-btn"><input type="radio" name="emoji" value="${e}" ${p.emoji === e ? 'checked' : ''}> ${e}</label>`).join('')}</div></div>
    <div class="field"><label>Tu color</label><div class="chips">${COLORS.map(c => `<label class="gp-color" style="--c:${c}"><input type="radio" name="color" value="${c}" ${p.color === c ? 'checked' : ''}><span></span></label>`).join('')}</div></div>`;
}

export function renderJoin(inv, { onJoined, onCancel }) {
  const k = KIND[inv.k], p = savedProfile() || { name: S.user?.name || '', emoji: '😊', color: COLORS[Math.floor(Math.random() * COLORS.length)] };
  document.getElementById('app').innerHTML = `<div class="auth"><div class="card auth-card deco view-enter" style="width:min(520px,100%);text-align:left">
    <div class="auth-logo" style="text-align:center">🎟️</div>
    <h2 style="font-size:25px;font-weight:900;text-align:center">¡Te invitaron ${k.noun === 'fiesta' ? 'a una fiesta' : 'a un intercambio'}! ${k.icon}</h2>
    <p class="muted bold center">Entrarás como <b>invitado</b>: sólo verás ${k.noun === 'fiesta' ? 'esa fiesta' : 'ese intercambio'}, nada más de la familia.</p>
    <form id="join-form" class="mt">${profileFields(p)}
      ${inv.k === 'p' ? `<div class="field"><label>¿Vas a ir?</label><div class="rsvp-btns join-rsvp">${[['si', '✅ Voy'], ['quiza', '🤔 Tal vez'], ['no', '❌ No puedo']].map(([v, l], i) => `<label class="btn"><input type="radio" name="rsvp" value="${v}" ${i === 0 ? 'checked' : ''}> ${l}</label>`).join('')}</div>
        <div class="row mt-s" style="gap:10px"><span class="small bold">¿Cuántos van contigo (contándote)?</span><input class="input" type="number" name="n" min="1" max="30" value="1" style="max-width:80px"></div></div>` : ''}
      <button class="btn primary lg block mt">${inv.k === 'p' ? '✅ Confirmar' : '🎉 Unirme'}</button></form>
    <p class="small mt center">${onCancel ? '<a class="link" id="join-cancel">Ahora no</a> · ' : ''}<a class="link" data-act="logout">Cerrar sesión</a></p>
  </div></div>`;
  document.getElementById('join-cancel')?.addEventListener('click', () => { clearInvite(); onCancel(); });
  document.getElementById('join-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target)); const btn = e.target.querySelector('button'); btn.disabled = true; btn.textContent = 'Uniéndote…';
    const profile = { name: (d.name || '').trim().slice(0, 30) || 'Invitado', emoji: d.emoji || '😊', color: d.color || COLORS[0] };
    const phone = digits(d.phone);
    if (phone.length < 10) { toast('📱 Escribe tu WhatsApp (10 dígitos) para los recordatorios'); btn.disabled = false; btn.textContent = inv.k === 'p' ? '✅ Confirmar' : '🎉 Unirme'; return; }
    try {
      const info = await S.db.getUserInfo();
      const rsvp = inv.k === 'p' ? { s: d.rsvp || 'si', n: Math.max(1, Math.min(30, +d.n || 1)) } : false;
      const doc = await S.db.guestJoin(inv.fid, k.col, inv.id, inv.code, profile, { participant: inv.k === 'x', rsvp });
      // 🔒 El teléfono y el correo van aparte: sólo los ve la familia organizadora (los otros invitados no)
      S.db.setFamily(inv.fid);
      await S.db.set(`${k.col}/${inv.id}/contacts`, S.user.uid, { name: profile.name, phone, email: S.user.email || '', at: Date.now() }).catch(e => console.warn('contact', e));
      lsSet(PROFILE, JSON.stringify({ ...profile, phone }));
      const entry = { fid: inv.fid, k: inv.k, id: inv.id, title: doc?.title || '', familyName: doc?.familyName || '', date: doc?.date || '' };
      const list = [...(info.guestOf || []).filter(g => !(g.fid === inv.fid && g.id === inv.id)), entry];
      await S.db.setGuestOf(list); S.guestOf = list;
      clearInvite(); toast(`🎉 ¡Listo, ${profile.name}! Ya estás dentro`);
      onJoined(inv);
    } catch (err) {
      console.warn(err); btn.disabled = false; btn.textContent = '🎉 Unirme';
      if ((err.code || '').includes('permission') || /no válida/.test(err.message)) {
        clearInvite();
        document.querySelector('.auth-card').innerHTML = `<div class="auth-logo">🚪</div><h2 style="font-size:24px;font-weight:900">Este link ya no funciona</h2><p class="muted bold">Puede que el organizador haya cerrado las invitaciones o cambiado el link. Pídele uno nuevo 🙏</p>
          <p class="small mt">${onCancel ? '<a class="link" id="join-back">Continuar</a> · ' : ''}<a class="link" data-act="logout">Cerrar sesión</a></p>`;
        document.getElementById('join-back')?.addEventListener('click', onCancel);
      } else toast('⚠️ ' + (err.message || 'No se pudo unir'));
    }
  });
}

export function editGuestProfile() {
  const p = { name: S.me?.name, emoji: S.me?.emoji, color: S.me?.color, phone: savedProfile()?.phone || '' };
  modal({
    title: '✏️ Mi perfil de invitado', body: profileFields(p) + '<p class="tiny muted">Así te verán en los eventos a los que te invitaron.</p>',
    submit: async (d) => {
      const profile = { name: (d.name || '').trim().slice(0, 30) || 'Invitado', emoji: d.emoji || '😊', color: d.color || COLORS[0] };
      const phone = digits(d.phone); if (phone.length < 10) { toast('📱 Revisa tu WhatsApp (10 dígitos)'); return false; }
      let fails = 0;
      for (const [col, rows] of [['exchanges', S.data.exchanges], ['parties', S.data.parties]]) for (const x of rows || []) {
        try { await S.db.guestJoin(S.family.id, col, x.id, x.inviteCode, profile, {}); } catch { fails++; }
        S.db.set(`${col}/${x.id}/contacts`, S.user.uid, { name: profile.name, phone, email: S.user.email || '', at: Date.now() }).catch(() => { });
      }
      lsSet(PROFILE, JSON.stringify({ ...profile, phone }));
      toast(fails ? '✅ Guardado (algún evento ya no acepta cambios)' : '✅ Perfil actualizado');
    }
  });
}

export async function leaveEvent(col, id) {
  const x = docOf(col, id); if (!x) return;
  if (!(await confirmBox(`¿Salir de "${x.title}"? Ya no lo verás. Si cambias de opinión, pide el link otra vez.`, 'Salir'))) return;
  try {
    await S.db.remove(`${col}/${id}/contacts`, S.user.uid).catch(() => { });
    await S.db.guestLeave(S.family.id, col, id, (x.participants || []).includes(S.me.id) && x.status === 'open');
    const list = (S.guestOf || []).filter(g => !(g.fid === S.family.id && g.id === id)); S.guestOf = list; await S.db.setGuestOf(list);
    toast('👋 Saliste del evento'); hooks.go('invitado');
  } catch (e) { console.warn(e); toast('⚠️ No se pudo salir (si ya se hizo el sorteo, pídele al organizador que te quite)'); }
}

// ---------------- Vista: Mis invitaciones ----------------
export const guestHome = {
  render() {
    const xs = [...(S.data.exchanges || [])].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const ps = [...(S.data.parties || [])].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const others = [...new Map((S.guestOf || []).filter(g => g.fid !== S.family?.id).map(g => [g.fid, g])).values()];
    const t = isoDate(today0());
    const card = (col, x) => {
      const k = KIND[kindOf(col)], past = (x.date || '') < t;
      const status = col === 'exchanges' ? (x.status === 'open' ? '🎲 Por sortear' : x.status === 'revealed' ? '🎊 Revelado' : '🤫 ¡Ya hay sorteo! Descubre a quién le regalas') : (() => { const r = (x.rsvp || {})[S.me.id]; return r?.s === 'si' ? '✅ Vas' : r?.s === 'no' ? '❌ No vas' : r?.s === 'quiza' ? '🤔 Tal vez' : '¿Vas? Confirma'; })();
      return `<a class="card deco party-card ${past ? 'old' : ''}" href="#/${k.route}/${x.id}">
        <div class="party-emoji">${esc(x.emoji || k.icon)}</div>
        <div class="grow" style="min-width:0"><div class="bold" style="font-size:18px">${esc(x.title)}</div>
          <div class="small muted bold">📅 ${fmtDate(x.date, { weekday: true })}${x.time ? ' · ' + fmtTime(x.time) : ''}${x.place || x.location ? ` · 📍 ${esc(x.place || x.location)}` : ''}</div>
          <div class="chips mt-s">${!past ? `<span class="chip accent">${relDay(x.date)}</span>` : ''}<span class="chip">${status}</span></div></div></a>`;
    };
    const any = xs.length + ps.length;
    return `<div class="page-head"><div><h1>¡Hola, ${esc((S.me?.name || '').split(' ')[0])}! ${esc(S.me?.emoji || '')}</h1><p>Tus invitaciones${S.family?.name ? ' de ' + esc(S.family.name) : ''}</p></div>
        <button class="btn" data-act="guestProfile">✏️ Mi perfil</button></div>
      <div class="inv-sees mb"><div class="small bold">🔒 Eres invitado: sólo ves los eventos a los que te invitaron. Lo demás de la familia es privado.</div></div>
      ${any ? `<div class="grid g2">${xs.map(x => card('exchanges', x)).join('')}${ps.map(x => card('parties', x)).join('')}</div>`
        : `<div class="card empty"><div class="big">🎟️</div><p class="bold">Aquí aparecerán los intercambios y fiestas a los que te inviten.</p><p class="small muted">Pídele a quien organiza que te mande el link.</p></div>`}
      ${others.length ? `<div class="nav-group" style="margin:22px 4px 10px">Invitaciones de otras familias</div><div class="list">${others.map(g => `<button class="item clickable" data-act="switchGuest" data-fid="${esc(g.fid)}" style="width:100%;text-align:left">🏡<div class="grow bold">${esc(g.familyName || 'Otra familia')}</div><span class="chip">Ver ›</span></button>`).join('')}</div>` : ''}
      <div class="row wrap mt" style="gap:10px;justify-content:center">${S.myFamilyId ? '<button class="btn" data-act="goFamily">🏠 Ir a mi familia</button>' : ''}<button class="btn ghost" data-act="logout">Cerrar sesión</button></div>`;
  },
  actions: { guestProfile() { editGuestProfile(); } }
};

// ---------------- 📅 Calendario: el teléfono de cada quien le recuerda solo ----------------
const whenOf = (x) => { const [y, m, d] = (x.date || '').split('-').map(Number); const [hh, mm] = (x.time || '12:00').split(':').map(Number); return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0); };
const icsDate = (dt) => dt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const icsEsc = (t) => String(t || '').replace(/[\\;,]/g, (c) => '\\' + c).replace(/\n/g, '\\n');
export function addToCalendar(col, x) {
  const start = whenOf(x), end = new Date(start.getTime() + (x.time ? 4 : 24) * 36e5);
  const place = x.address || x.place || x.location || '';
  const desc = [x.notes || x.rules || '', col === 'exchanges' && x.budget ? `Presupuesto: $${x.budget}` : '', `Organizado en Nido 🪺`].filter(Boolean).join('\n');
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Nido//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
    `UID:${x.id}@nido`, `DTSTAMP:${icsDate(new Date())}`,
    x.time ? `DTSTART:${icsDate(start)}` : `DTSTART;VALUE=DATE:${(x.date || '').replace(/-/g, '')}`,
    x.time ? `DTEND:${icsDate(end)}` : `DTEND;VALUE=DATE:${icsDate(end).slice(0, 8)}`,
    `SUMMARY:${icsEsc((x.emoji ? x.emoji + ' ' : '') + x.title)}`, place ? `LOCATION:${icsEsc(place)}` : '', `DESCRIPTION:${icsEsc(desc)}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEsc('En una semana: ' + x.title)}`, 'TRIGGER:-P7D', 'END:VALARM',
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEsc('¡Hoy! ' + x.title)}`, 'TRIGGER:-PT3H', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'].filter(Boolean).join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  a.download = (x.title || 'evento').replace(/[^\w\sáéíóúñ-]/gi, '').trim().replace(/\s+/g, '-') + '.ics';
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 3000);
  toast('📅 Ábrelo y toca "Agregar": tu teléfono te avisará una semana antes y 3 horas antes');
}

// ---------------- ⏰ Recordatorios (organizador) ----------------
// Una semana antes y el mismo día: la app avisa al organizador y le deja mandar cada recordatorio con un toque.
export const REMINDERS = { week: ['📅', 'Una semana antes'], day: ['⏰', 'El mismo día'] };
export function reminderStage(x) {
  const ms = whenOf(x) - Date.now(), days = ms / 864e5;
  if (ms < -3 * 36e5) return null;
  if (days <= 1) return 'day';
  if (days <= 7) return 'week';
  return null;
}
const who = (col, x) => {
  // A quién recordarle: fiestas → quien dijo que va o tal vez (o no ha contestado); intercambios → participantes
  const r = x.rsvp || {};
  if (col === 'parties') return Object.keys({ ...Object.fromEntries(members().map(m => [m.id, 1])), ...Object.fromEntries(Object.keys(x.guests || {}).map(u => ['g_' + u, 1])) }).filter(id => (r[id]?.s || 'pend') !== 'no');
  return (x.participants || []);
};
export function reminderText(col, x, stage, name) {
  const when = `${fmtDate(x.date, { weekday: true })}${x.time ? ' a las ' + fmtTime(x.time) : ''}`;
  const place = x.place || x.location ? `\n📍 ${x.place || x.location}${x.address ? ' · ' + x.address : ''}` : '';
  const hi = name ? `¡Hola ${name.split(' ')[0]}! ` : '¡Hola! ';
  if (col === 'exchanges') return stage === 'week'
    ? `${hi}🎁 Falta una semana para "${x.title}" (${when}).${x.budget ? ` Presupuesto: $${x.budget}.` : ''} ¿Ya tienes el regalo de tu amigo secreto? 🤫${place}`
    : `${hi}🎁 ¡Hoy es "${x.title}"! ${x.time ? 'Nos vemos a las ' + fmtTime(x.time) : 'Nos vemos'}. No olvides el regalo 🎀${place}`;
  return stage === 'week'
    ? `${hi}${x.emoji || '🎉'} Falta una semana para "${x.title}" (${when}). ¿Sigues en pie? Confirma o cambia tu respuesta aquí 👇${place}`
    : `${hi}${x.emoji || '🎉'} ¡Hoy es "${x.title}"! ${x.time ? 'Te esperamos a las ' + fmtTime(x.time) : 'Te esperamos'}. ¡No faltes!${place}`;
}
export function remindersCard(col, x, contacts) {
  const stage = reminderStage(x);
  const ids = who(col, x), sent = x.reminders || {};
  const people = ids.map(id => {
    const m = member(id); if (!m) return null;
    const c = m.guest ? (contacts || []).find(c => c.id === m.uid) : null;
    const phone = m.guest ? c?.phone : m.phone, email = m.guest ? c?.email : m.email;
    return { m, phone, email };
  }).filter(p => p && p.m.id !== S.me.id);
  if (!people.length) return '';
  const link = x.inviteCode && x.inviteOpen ? '\n' + inviteUrl(col, x) : '';
  const row = (st) => (p) => {
    const done = sent[st]?.[p.m.id];
    const text = reminderText(col, x, st, p.m.name) + (p.m.guest ? link : '');
    return `<div class="item">${avatar(p.m, 'sm')}<div class="grow" style="min-width:0"><div class="bold small">${esc(p.m.name)}${p.m.guest ? ' <span class="tiny guest-tag">🎟️</span>' : ''}</div><div class="tiny muted">${p.phone ? '📱 ' + esc(p.phone) : 'Sin teléfono'}${done ? ' · ✅ enviado ' + timeAgo(done) : ''}</div></div>
      ${p.phone ? `<a class="btn sm ${done ? 'ghost' : 'primary'}" target="_blank" rel="noopener" data-act="remindSent" data-col="${col}" data-id="${x.id}" data-st="${st}" data-p="${esc(p.m.id)}" href="https://wa.me/${waNumber(p.phone)}?text=${encodeURIComponent(text)}">💬</a>` : ''}
      ${p.email ? `<a class="btn sm ghost" data-act="remindSent" data-col="${col}" data-id="${x.id}" data-st="${st}" data-p="${esc(p.m.id)}" href="mailto:${esc(p.email)}?subject=${encodeURIComponent('Recordatorio: ' + x.title)}&body=${encodeURIComponent(text)}">✉️</a>` : ''}</div>`;
  };
  const st = stage || 'week';
  const pending = people.filter(p => !sent[st]?.[p.m.id] && (p.phone || p.email)).length;
  const emails = people.filter(p => p.email).map(p => p.email);
  return `<section class="card deco mt remind-card ${stage && pending ? 'due' : ''}"><div class="card-title"><h3>⏰ Recordatorios</h3><span class="chip ${stage && pending ? 'accent' : ''}">${stage ? `${REMINDERS[stage][0]} ${REMINDERS[stage][1]}${pending ? ' · ' + pending + ' por enviar' : ' · ✅ listos'}` : 'Se activan una semana antes'}</span></div>
    <p class="tiny muted" style="margin-top:-4px">${stage ? 'Toca 💬 para mandarle el recordatorio por WhatsApp (ya va escrito) o ✉️ por correo.' : 'Una semana antes y el mismo día te avisamos para que les mandes su recordatorio con un toque.'}</p>
    <details ${stage && pending ? 'open' : ''}><summary class="small bold">Ver a quién (${people.length})</summary>
      <div class="list mt-s">${people.map(row(st)).join('')}</div>
      ${emails.length > 1 ? `<a class="btn sm block mt-s" data-act="remindSent" data-col="${col}" data-id="${x.id}" data-st="${st}" data-p="*" href="mailto:?bcc=${encodeURIComponent(emails.join(','))}&subject=${encodeURIComponent('Recordatorio: ' + x.title)}&body=${encodeURIComponent(reminderText(col, x, st, '') + link)}">✉️ Un correo para todos (${emails.length})</a>` : ''}
    </details></section>`;
}
export async function markReminder(el) {
  const { col, id, st, p } = el.dataset; const x = docOf(col, id); if (!x) return;
  const ids = p === '*' ? who(col, x) : [p]; const upd = {};
  for (const pid of ids) upd[`reminders.${st}.${pid}`] = Date.now();
  setTimeout(() => S.db.update(col, id, upd).catch(() => { }), 400); // deja abrir WhatsApp primero
}
// Al abrir la app: ¿hay recordatorios por mandar hoy? (una vez al día por evento)
export function checkDueReminders(alertFn) {
  if (S.guest) return;
  const today = isoDate();
  for (const [col, rows] of [['parties', S.data.parties], ['exchanges', S.data.exchanges]]) for (const x of rows || []) {
    const st = reminderStage(x); if (!st) continue;
    const mine = col === 'parties' ? (x.by === S.me?.id || x.host === S.me?.id) : x.createdBy === S.user?.uid;
    if (!mine) continue;
    const k = `nido-remind-${x.id}-${st}`; if (lsGet(k) === today) continue; lsSet(k, today);
    const n = who(col, x).filter(id => id !== S.me.id && !x.reminders?.[st]?.[id]).length; if (!n) continue;
    alertFn({ icon: REMINDERS[st][0], title: `${st === 'week' ? 'Falta una semana' : '¡Es hoy!'}: ${x.title}`, body: `Mándales el recordatorio a ${n} persona${n === 1 ? '' : 's'} con un toque`, link: `${KIND[kindOf(col)].route}/${x.id}` });
  }
}
