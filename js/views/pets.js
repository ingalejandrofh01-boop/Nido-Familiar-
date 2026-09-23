// 🐾 Mascotas: perfil, cuidados diarios por turnos, salud, comida y peso
import { S, hooks, members, member, notify, isAdult } from '../store.js';
import { esc, avatar, modal, toast, fmtDate, fmtShort, isoDate, parseDate, today0, daysBetween, memberPicker, compressImage, pickFiles, confirmBox } from '../ui.js';
import { defaultAvatar, FUR_COLORS, SEC_COLORS, ACC_COLORS, BG_COLORS } from '../avatar.js';

export const PET_TYPES = {
  gato: ['🐱', 'Gato', 'gato'], perro: ['🐶', 'Perro', 'perro'], conejo: ['🐰', 'Conejo', 'conejo'], hamster: ['🐹', 'Hámster', 'raton'],
  ave: ['🐦', 'Pájaro', 'pollito'], ajolote: ['🦎', 'Ajolote', 'ajolote'], pez: ['🐟', 'Pez', null], tortuga: ['🐢', 'Tortuga', null], otro: ['🐾', 'Otro', null]
};
const ROUTINE_TPL = {
  gato: [['🍽️', 'Darle de comer', 2], ['💧', 'Agua fresca', 1], ['🧹', 'Limpiar arenero', 1], ['🧶', 'Jugar 15 min', 1]],
  perro: [['🍽️', 'Darle de comer', 2], ['💧', 'Agua fresca', 1], ['🦮', 'Paseo', 2], ['💩', 'Recoger el patio', 1]],
  default: [['🍽️', 'Darle de comer', 1], ['💧', 'Agua fresca', 1], ['🧽', 'Limpiar su espacio', 1]]
};
const rid = () => Math.random().toString(36).slice(2, 8);
export const petAvatar = (p, cls = '') => avatar({ name: p.name, avatar: p.avatarMode === 'photo' ? null : p.avatar, photo: p.photo, emoji: (PET_TYPES[p.type] || PET_TYPES.otro)[0], color: '#f59e0b', birthday: p.birthday }, cls);

export function petAge(p) {
  if (!p.birthday) return '';
  const b = parseDate(p.birthday), t = today0();
  let months = (t.getFullYear() - b.getFullYear()) * 12 + t.getMonth() - b.getMonth(); if (t.getDate() < b.getDate()) months--;
  if (months < 1) return 'Bebé 🍼';
  const y = Math.floor(months / 12), m = months % 12;
  return [y ? `${y} año${y > 1 ? 's' : ''}` : '', m ? `${m} mes${m > 1 ? 'es' : ''}` : ''].filter(Boolean).join(' y ');
}
export function foodLeft(p) {
  const f = p.food; if (!f || !f.bagKg || !f.dailyG || !f.boughtAt) return null;
  const total = f.bagKg * 1000 / f.dailyG, used = daysBetween(parseDate(f.boughtAt), today0());
  return { days: Math.max(0, Math.round(total - used)), pct: Math.max(0, Math.min(1, 1 - used / total)) };
}
export function vaccinesDue(p, within = 30) {
  const t0 = today0();
  return (p.vaccines || []).filter(v => v.next).map(v => ({ ...v, days: daysBetween(t0, parseDate(v.next)) })).filter(v => v.days <= within).sort((a, b) => a.days - b.days);
}
const todayLog = (p) => ((p.log || {})[isoDate()] || {});
const doneCount = (p, r) => (todayLog(p)[r.id] || []).length;
export function turnOf(r) {
  const who = (r.who || []).filter(id => member(id)); if (!who.length) return null;
  const d = today0(), doy = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5);
  return member(who[doy % who.length]);
}
export function careProgress(p) {
  const rs = p.routines || []; const need = rs.reduce((a, r) => a + (r.times || 1), 0);
  const done = rs.reduce((a, r) => a + Math.min(r.times || 1, doneCount(p, r)), 0);
  return { done, need };
}

// Botones de cuidados (se usan en el detalle y en Inicio)
export function careButtons(p, compact = false) {
  return `<div class="care-grid ${compact ? 'compact' : ''}">${(p.routines || []).map(r => {
    const n = doneCount(p, r), times = r.times || 1, full = n >= times, turn = turnOf(r);
    const whoDid = (todayLog(p)[r.id] || []).map(x => member(x.by)).filter(Boolean);
    return `<button class="care ${full ? 'done' : ''}" data-act="care" data-pet="${p.id}" data-r="${r.id}">
      <span class="care-e">${full ? '✅' : esc(r.emoji || '🐾')}</span><span class="care-t">${esc(r.title)}</span>
      <span class="care-n">${times > 1 ? `${Math.min(n, times)}/${times}` : full ? 'Listo' : 'Pendiente'}</span>
      ${!compact ? `<span class="care-who">${whoDid.length ? whoDid.map(m => avatar(m, 'xs')).join('') : turn ? `<span class="tiny">Le toca a ${esc(turn.name)}</span>` : ''}</span>` : ''}
    </button>`;
  }).join('')}</div>`;
}

function sparkline(log) {
  const pts = [...(log || [])].sort((a, b) => a.date.localeCompare(b.date)).slice(-12);
  if (pts.length < 2) return '';
  const W = 280, H = 70, min = Math.min(...pts.map(p => p.kg)), max = Math.max(...pts.map(p => p.kg)), span = max - min || 1;
  const xy = pts.map((p, i) => [8 + i / (pts.length - 1) * (W - 16), H - 10 - (p.kg - min) / span * (H - 24)]);
  const d = xy.map(([x, y], i) => (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1)).join(' ');
  return `<svg viewBox="0 0 ${W} ${H}" class="spark" role="img" aria-label="Historial de peso"><path d="${d} L${xy.at(-1)[0]} ${H} L${xy[0][0]} ${H} Z" style="fill:color-mix(in srgb, var(--accent) 18%, transparent)"/><path d="${d}" fill="none" style="stroke:var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>${xy.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i === xy.length - 1 ? 4.5 : 3}" style="fill:var(--accent)"><title>${fmtShort(pts[i].date)}: ${pts[i].kg} kg</title></circle>`).join('')}</svg>`;
}

// ---------------- Formulario de mascota ----------------
function petForm(p = {}) {
  const isNew = !p.id;
  let draft = { type: p.type || 'gato', avatar: p.avatar ? { ...p.avatar } : { ...defaultAvatar('gato'), fur: '#ec7a32', pattern: 'rayas', neck: 'collar', eyeColor: '#d4a017', bg: BG_COLORS[3] }, photo: p.photo || '', avatarMode: p.avatarMode || 'avatar' };
  const sw = (name, list, cur) => `<div class="swatches">${list.map(c => `<button type="button" class="swatch ${c === cur ? 'on' : ''}" data-sw="${name}" data-v="${c}" style="background:${c}"></button>`).join('')}</div>`;
  const body = () => `
    <div class="pet-prev">${petAvatar({ ...p, ...draft, name: 'preview' }, 'xl live')}</div>
    <div class="field"><label>¿Qué es?</label><div class="chips">${Object.entries(PET_TYPES).map(([k, [e, l]]) => `<button type="button" class="chip chip-btn ${draft.type === k ? 'accent' : ''}" data-type="${k}">${e} ${l}</button>`).join('')}</div></div>
    ${PET_TYPES[draft.type][2] ? `<div class="field"><label>Color de pelaje</label>${sw('fur', FUR_COLORS, draft.avatar.fur)}</div>
      <div class="field"><label>Panza y detalles</label>${sw('sec', SEC_COLORS, draft.avatar.sec)}</div>
      <div class="frow"><div class="field"><label>Marcas</label><select class="input" data-av="pattern">${[['ninguno', 'Liso'], ['rayas', 'Atigrado'], ['manchas', 'Manchas'], ['parche', 'Parche'], ['antifaz', 'Antifaz'], ['frente', 'Estrella en la frente'], ['vaca', 'Manchas grandes']].map(([k, l]) => `<option value="${k}" ${draft.avatar.pattern === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="field"><label>En el cuello</label><select class="input" data-av="neck">${[['ninguno', 'Nada'], ['collar', 'Collar con placa'], ['paliacate', 'Paliacate'], ['corbatin', 'Moñito'], ['bufanda', 'Bufanda']].map(([k, l]) => `<option value="${k}" ${draft.avatar.neck === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div>
      <div class="field"><label>Color del collar</label>${sw('acc', ACC_COLORS, draft.avatar.acc)}</div>` : ''}
    <div class="row wrap" style="gap:8px;margin-bottom:12px"><button type="button" class="btn sm" data-photo>📷 ${draft.photo ? 'Cambiar foto' : 'Subir foto real'}</button>${draft.photo ? `<label class="chip chip-btn"><input type="checkbox" data-usephoto ${draft.avatarMode === 'photo' ? 'checked' : ''}> Usar la foto como avatar</label>` : ''}</div>`;
  const m = modal({
    title: isNew ? '🐾 Nueva mascota' : `✏️ ${esc(p.name)}`, wide: true,
    body: `<div data-live>${body()}</div>
      <div class="frow"><div class="field"><label>Nombre</label><input class="input" name="name" required value="${esc(p.name || '')}" placeholder="Cheto"></div><div class="field"><label>Raza / tipo</label><input class="input" name="breed" value="${esc(p.breed || '')}" placeholder="Naranja atigrado"></div></div>
      <div class="frow"><div class="field"><label>Cumpleaños (o llegada a casa)</label><input class="input" type="date" name="birthday" value="${esc(p.birthday || '')}"></div><div class="field"><label>Sexo</label><select class="input" name="sex"><option value="">—</option><option value="m" ${p.sex === 'm' ? 'selected' : ''}>Macho</option><option value="h" ${p.sex === 'h' ? 'selected' : ''}>Hembra</option></select></div></div>
      <div class="frow"><div class="field"><label>Le encanta 😻</label><input class="input" name="likes" value="${esc(p.likes || '')}" placeholder="Las cajas, el atún, dormir al sol"></div><div class="field"><label>Odia 😾</label><input class="input" name="dislikes" value="${esc(p.dislikes || '')}" placeholder="La aspiradora, el baño"></div></div>
      <div class="frow"><div class="field"><label>Microchip / placa</label><input class="input" name="chip" value="${esc(p.chip || '')}"></div><div class="field"><label>Esterilizado</label><select class="input" name="neutered"><option value="">—</option><option value="si" ${p.neutered === 'si' ? 'selected' : ''}>Sí</option><option value="no" ${p.neutered === 'no' ? 'selected' : ''}>No</option></select></div></div>
      <div class="field"><label>Notas (alergias, carácter, cuidados especiales)</label><textarea class="input" name="notes" rows="2">${esc(p.notes || '')}</textarea></div>`,
    danger: isNew ? undefined : { label: 'Borrar', confirm: `¿Borrar a ${esc(p.name)} y todo su historial?`, action: async () => { await S.db.remove('pets', p.id); hooks.go('mascotas'); } },
    onOpen(f) {
      const live = f.querySelector('[data-live]');
      const repaint = () => { live.innerHTML = body(); bind(); };
      const bind = () => {
        live.querySelectorAll('[data-type]').forEach(b => b.onclick = () => {
          const k = b.dataset.type; draft.type = k; const sp = PET_TYPES[k][2];
          if (sp && sp !== draft.avatar.species) { const keep = { neck: draft.avatar.neck, acc: draft.avatar.acc, bg: draft.avatar.bg }; draft.avatar = { ...defaultAvatar(sp), ...keep }; }
          if (!sp && draft.photo) draft.avatarMode = 'photo';
          repaint();
        });
        live.querySelectorAll('[data-sw]').forEach(b => b.onclick = () => { draft.avatar[b.dataset.sw] = b.dataset.v; repaint(); });
        live.querySelectorAll('[data-av]').forEach(s => s.onchange = () => { draft.avatar[s.dataset.av] = s.value; repaint(); });
        const ph = live.querySelector('[data-photo]'); if (ph) ph.onclick = async () => { const [file] = await pickFiles(); if (!file) return; draft.photo = await compressImage(file, 600, .82, 140000); draft.avatarMode = 'photo'; repaint(); };
        const up = live.querySelector('[data-usephoto]'); if (up) up.onchange = () => { draft.avatarMode = up.checked ? 'photo' : 'avatar'; repaint(); };
      };
      bind();
    },
    submit: async d => {
      if (!d.name.trim()) { toast('Ponle nombre 🐾'); return false; }
      const sp = PET_TYPES[draft.type][2];
      const data = { name: d.name.trim(), breed: d.breed, birthday: d.birthday, sex: d.sex, likes: d.likes, dislikes: d.dislikes, chip: d.chip, neutered: d.neutered, notes: d.notes, type: draft.type, avatar: sp ? draft.avatar : null, photo: draft.photo, avatarMode: sp ? draft.avatarMode : (draft.photo ? 'photo' : 'avatar') };
      if (isNew) {
        const tpl = ROUTINE_TPL[draft.type] || ROUTINE_TPL.default;
        const id = await S.db.add('pets', { ...data, routines: tpl.map(([emoji, title, times]) => ({ id: rid(), emoji, title, times, who: [] })), vaccines: [], weightLog: [], log: {}, vet: {}, food: {}, by: S.me.id });
        notify({ icon: '🐾', title: `¡Bienvenido a la familia, ${data.name}!`, body: 'Ya pueden anotar sus cuidados en Nido', link: 'mascota/' + id });
        toast(`🐾 ¡${data.name} ya está en el Nido!`); hooks.go('mascota/' + id);
      } else { await S.db.update('pets', p.id, data); toast('✅ Guardado'); }
    }
  });
  return m;
}

// ---------------- LISTA ----------------
export const petsList = {
  render() {
    const pets = S.data.pets || [];
    const card = (p) => {
      const { done, need } = careProgress(p); const f = foodLeft(p); const vs = vaccinesDue(p, 14);
      return `<a class="card pet-card deco" href="#/mascota/${p.id}">
        <div class="row">${petAvatar(p, 'xl')}<div class="grow"><div class="pet-name">${esc(p.name)}</div><div class="small muted bold">${PET_TYPES[p.type]?.[0] || '🐾'} ${esc(p.breed || PET_TYPES[p.type]?.[1] || '')}${petAge(p) ? ' · ' + petAge(p) : ''}</div>
        ${need ? `<div class="progress mt-s" style="height:8px"><i style="width:${done / need * 100}%"></i></div><div class="tiny muted mt-s">Cuidados de hoy: ${done}/${need}${done >= need ? ' 🎉' : ''}</div>` : ''}</div></div>
        <div class="chips mt">${vs.map(v => `<span class="chip ${v.days < 0 ? 'danger' : 'accent'}">💉 ${esc(v.name)} ${v.days < 0 ? 'vencida' : v.days === 0 ? 'hoy' : `en ${v.days} d`}</span>`).join('')}${f && f.days <= 7 ? `<span class="chip ${f.days <= 3 ? 'danger' : ''}">🍖 Comida: ${f.days} días</span>` : ''}</div></a>`;
    };
    return `<div class="page-head"><div><h1>Mascotas</h1><p>Los consentidos de la casa 🐾</p></div><button class="btn primary" data-act="newPet">＋ Agregar</button></div>
      ${pets.length ? `<div class="grid g2">${pets.map(card).join('')}</div>` : `<div class="card empty"><div class="big">🐾</div><p class="bold">Agrega a tu perro, gato o lo que tengan: sus cuidados, vacunas, veterinario y comida, todo en un lugar.</p><button class="btn primary" data-act="newPet">Agregar mascota</button></div>`}`;
  },
  actions: { newPet() { petForm(); } }
};

// ---------------- DETALLE ----------------
const pet = (id) => (S.data.pets || []).find(p => p.id === id);
async function logCare(p, r) {
  const t = isoDate(), cur = [...(todayLog(p)[r.id] || [])], times = r.times || 1;
  if (cur.length >= times) {
    // tocar de nuevo deshace el último registro propio
    const i = cur.map(x => x.by).lastIndexOf(S.me.id); if (i < 0) { toast('Ya está hecho por hoy ✅'); return; }
    cur.splice(i, 1);
  } else cur.push({ by: S.me.id, at: Date.now() });
  // se guarda sólo el historial de los últimos 30 días
  const upd = { [`log.${t}.${r.id}`]: cur };
  await S.db.update('pets', p.id, upd);
  try { navigator.vibrate && navigator.vibrate(25); } catch { }
  const { done, need } = careProgress({ ...p, log: { ...(p.log || {}), [t]: { ...todayLog(p), [r.id]: cur } } });
  if (cur.length > (todayLog(p)[r.id] || []).length) {
    if (done >= need) { hooks.celebrate(innerWidth / 2, innerHeight / 3, 'heart', ['#ff8fab', '#ffd166', '#fff']); toast(`😻 ¡${p.name} está feliz! Todos sus cuidados de hoy listos`); }
    else toast(`${r.emoji} ${r.title} ✓`);
    // 1 punto por cuidar a la mascota
    if (S.me) S.db.update('members', S.me.id, { points: (S.me.points || 0) + 1 });
  }
}

export const petDetail = {
  render([id]) {
    const p = pet(id);
    if (!p) return `<div class="card empty"><div class="big">🐾</div>No encontramos a esta mascota. <a class="link" href="#/mascotas">Volver</a></div>`;
    const f = foodLeft(p); const vs = [...(p.vaccines || [])].sort((a, b) => (a.next || '9').localeCompare(b.next || '9'));
    const t0 = today0(); const w = [...(p.weightLog || [])].sort((a, b) => a.date.localeCompare(b.date)); const lastW = w.at(-1), prevW = w.at(-2);
    const { done, need } = careProgress(p);
    const b = p.birthday ? parseDate(p.birthday) : null; const bdToday = b && b.getMonth() === t0.getMonth() && b.getDate() === t0.getDate();
    return `<a class="link" href="#/mascotas">‹ Mascotas</a>
      <section class="card xhero deco mt pet-hero">
        <div class="row wrap" style="gap:18px">${petAvatar(p, 'xxl live')}
          <div class="grow"><div class="row between wrap"><div class="xhero-title">${esc(p.name)}${bdToday ? ' 🎂' : ''}</div><button class="btn sm" data-act="editPet" data-id="${p.id}">✏️ Editar</button></div>
            <div class="bold muted">${PET_TYPES[p.type]?.[0] || '🐾'} ${esc(p.breed || PET_TYPES[p.type]?.[1] || '')}${p.sex ? ` · ${p.sex === 'm' ? '♂ Macho' : '♀ Hembra'}` : ''}${petAge(p) ? ` · ${petAge(p)}` : ''}</div>
            ${bdToday ? `<div class="chip accent mt-s">🎉 ¡Hoy es su cumpleaños! Dale un premio</div>` : ''}
            <div class="chips mt-s">${p.likes ? `<span class="chip">😻 ${esc(p.likes)}</span>` : ''}${p.dislikes ? `<span class="chip">😾 ${esc(p.dislikes)}</span>` : ''}</div></div></div>
      </section>

      <section class="card mt deco"><div class="card-title"><h3>🗓️ Cuidados de hoy</h3><span class="chip ${done >= need && need ? 'accent' : ''}">${done}/${need}</span></div>
        ${(p.routines || []).length ? careButtons(p) : '<div class="empty small">Agrega sus cuidados diarios</div>'}
        <div class="right mt-s"><button class="link tiny" data-act="routines" data-id="${p.id}">⚙️ Cuidados y turnos</button></div></section>

      <div class="grid g2 mt">
        <section class="card"><div class="card-title"><h3>💉 Vacunas y desparasitación</h3><button class="icon-btn" data-act="addVac" data-id="${p.id}" title="Agregar">＋</button></div>
          <div class="list">${vs.map((v, i) => { const d = v.next ? daysBetween(t0, parseDate(v.next)) : null; return `<div class="item clickable" data-act="editVac" data-id="${p.id}" data-i="${(p.vaccines || []).indexOf(v)}"><span class="emoji">${v.kind === 'desparasitacion' ? '🪱' : '💉'}</span><div class="grow"><div class="bold small">${esc(v.name)}</div><div class="tiny muted">${v.date ? 'Aplicada ' + fmtShort(v.date) : ''}${v.next ? ` · Próxima ${fmtDate(v.next)}` : ''}</div></div>${d !== null ? `<span class="chip ${d < 0 ? 'danger' : d <= 14 ? 'accent' : ''}">${d < 0 ? 'Vencida' : d === 0 ? 'Hoy' : d <= 60 ? `en ${d} d` : fmtShort(v.next)}</span>` : ''}</div>`; }).join('') || '<div class="empty small">Sin registros. Anota su cartilla 💉</div>'}</div></section>

        <section class="card"><div class="card-title"><h3>🩺 Veterinario</h3><button class="icon-btn" data-act="editVet" data-id="${p.id}" title="Editar">✏️</button></div>
          ${p.vet?.name ? `<div class="bold">${esc(p.vet.name)}</div>${p.vet.clinic ? `<div class="small muted">${esc(p.vet.clinic)}</div>` : ''}${p.vet.address ? `<div class="small muted">📍 ${esc(p.vet.address)}</div>` : ''}
            <div class="row wrap mt" style="gap:8px">${p.vet.phone ? `<a class="btn sm primary" href="tel:${esc(p.vet.phone)}">📞 Llamar</a><a class="btn sm" href="https://wa.me/52${esc(String(p.vet.phone).replace(/\D/g, '').slice(-10))}" target="_blank" rel="noopener">💬 WhatsApp</a>` : ''}${p.vet.emergency ? `<a class="btn sm danger" href="tel:${esc(p.vet.emergency)}">🚑 Urgencias 24 h</a>` : ''}</div>`
            : '<div class="empty small">Guarda los datos de su veterinario para tenerlos a la mano</div>'}
          ${p.chip || p.neutered || p.notes ? `<div class="divider"></div><div class="small">${p.chip ? `<div>🏷️ Chip/placa: <b>${esc(p.chip)}</b></div>` : ''}${p.neutered ? `<div>✂️ Esterilizado: <b>${p.neutered === 'si' ? 'Sí' : 'No'}</b></div>` : ''}${p.notes ? `<div class="mt-s">📝 ${esc(p.notes)}</div>` : ''}</div>` : ''}</section>

        <section class="card"><div class="card-title"><h3>🍖 Comida</h3><button class="icon-btn" data-act="editFood" data-id="${p.id}" title="Editar">✏️</button></div>
          ${f ? `<div class="bold">${esc(p.food.brand || 'Su croqueta')}</div><div class="tiny muted">Bolsa de ${p.food.bagKg} kg · come ~${p.food.dailyG} g al día</div>
            <div class="food-bag mt"><i style="height:${f.pct * 100}%;background:${f.days <= 3 ? '#e34948' : f.days <= 7 ? '#eda100' : 'var(--accent)'}"></i></div>
            <p class="bold mt-s center">${f.days === 0 ? '😿 ¡Ya se acabó!' : `Le alcanza para ~${f.days} día${f.days === 1 ? '' : 's'}`}</p>
            <div class="row wrap" style="gap:8px;justify-content:center"><button class="btn sm" data-act="foodShop" data-id="${p.id}">🛒 Agregar a compras</button><button class="btn sm primary" data-act="foodNew" data-id="${p.id}">🛍️ Compré bolsa nueva</button></div>`
            : '<div class="empty small">Anota su croqueta y te avisamos antes de que se acabe</div>'}</section>

        <section class="card"><div class="card-title"><h3>⚖️ Peso</h3><button class="icon-btn" data-act="addWeight" data-id="${p.id}" title="Anotar peso">＋</button></div>
          ${lastW ? `<div class="row between"><div><div style="font-size:30px;font-weight:900">${lastW.kg} kg</div><div class="tiny muted">${fmtDate(lastW.date)}</div></div>${prevW ? `<span class="chip">${lastW.kg > prevW.kg ? '▲' : lastW.kg < prevW.kg ? '▼' : '='} ${Math.abs(Math.round((lastW.kg - prevW.kg) * 100) / 100)} kg</span>` : ''}</div>${sparkline(w)}` : '<div class="empty small">Anota su peso en cada visita al vete</div>'}</section>
      </div>`;
  },
  theme() { return null; },
  actions: {
    editPet(el) { petForm(pet(el.dataset.id)); },
    care(el) { const p = pet(el.dataset.pet); const r = (p?.routines || []).find(x => x.id === el.dataset.r); if (p && r) logCare(p, r); },
    routines(el) {
      const p = pet(el.dataset.id); let rs = (p.routines || []).map(r => ({ ...r, who: [...(r.who || [])] }));
      const row = (r, i) => `<div class="card pad-sm mb" data-i="${i}"><div class="frow"><div class="field" style="max-width:70px"><label>Emoji</label><input class="input" data-k="emoji" value="${esc(r.emoji)}" maxlength="4"></div><div class="field"><label>Cuidado</label><input class="input" data-k="title" value="${esc(r.title)}"></div><div class="field" style="max-width:90px"><label>Veces/día</label><input class="input" type="number" min="1" max="6" data-k="times" value="${r.times || 1}"></div></div>
        <div class="tiny bold muted mb">Turnos (se rotan cada día):</div><div class="chips">${members().map(m => `<label class="chip chip-btn"><input type="checkbox" data-who="${m.id}" ${r.who.includes(m.id) ? 'checked' : ''}> ${esc(m.emoji || '')} ${esc(m.name)}</label>`).join('')}</div>
        <div class="right mt-s"><button type="button" class="link tiny" data-del="${i}">Quitar</button></div></div>`;
      let read = () => { };
      modal({
        title: `⚙️ Cuidados de ${esc(p.name)}`, wide: true, body: `<div data-rs></div><button type="button" class="btn sm" data-add>＋ Agregar cuidado</button>`,
        onOpen(f) {
          const box = f.querySelector('[data-rs]');
          read = () => box.querySelectorAll('[data-i]').forEach(c => { const r = rs[+c.dataset.i]; c.querySelectorAll('[data-k]').forEach(i => r[i.dataset.k] = i.dataset.k === 'times' ? Math.max(1, +i.value || 1) : i.value); r.who = [...c.querySelectorAll('[data-who]:checked')].map(i => i.dataset.who); });
          const paint = () => { box.innerHTML = rs.map(row).join(''); box.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { read(); rs.splice(+b.dataset.del, 1); paint(); }); };
          paint(); f.querySelector('[data-add]').onclick = () => { read(); rs.push({ id: rid(), emoji: '🐾', title: '', times: 1, who: [] }); paint(); };
        },
        submit: async () => { read(); await S.db.update('pets', p.id, { routines: rs.filter(r => r.title.trim()) }); toast('✅ Cuidados guardados'); }
      });
    },
    addVac(el) { vacForm(pet(el.dataset.id)); },
    editVac(el) { vacForm(pet(el.dataset.id), +el.dataset.i); },
    editVet(el) {
      const p = pet(el.dataset.id); const v = p.vet || {};
      modal({
        title: '🩺 Veterinario', body: `<div class="frow"><div class="field"><label>Doctor(a)</label><input class="input" name="name" value="${esc(v.name || '')}" placeholder="Dra. Pérez"></div><div class="field"><label>Clínica</label><input class="input" name="clinic" value="${esc(v.clinic || '')}"></div></div>
          <div class="frow"><div class="field"><label>Teléfono</label><input class="input" type="tel" name="phone" value="${esc(v.phone || '')}"></div><div class="field"><label>Urgencias 24 h</label><input class="input" type="tel" name="emergency" value="${esc(v.emergency || '')}"></div></div>
          <div class="field"><label>Dirección</label><input class="input" name="address" value="${esc(v.address || '')}"></div>`,
        submit: async d => { await S.db.update('pets', p.id, { vet: d }); toast('✅ Guardado'); }
      });
    },
    editFood(el) {
      const p = pet(el.dataset.id); const f = p.food || {};
      modal({
        title: '🍖 Su comida', body: `<div class="field"><label>Marca / tipo</label><input class="input" name="brand" value="${esc(f.brand || '')}" placeholder="Croqueta adulto sabor pollo"></div>
          <div class="frow"><div class="field"><label>Tamaño de la bolsa (kg)</label><input class="input" type="number" step="any" name="bagKg" value="${f.bagKg || ''}"></div><div class="field"><label>Come al día (gramos)</label><input class="input" type="number" name="dailyG" value="${f.dailyG || ''}" placeholder="60"></div></div>
          <div class="field"><label>¿Cuándo se abrió la bolsa?</label><input class="input" type="date" name="boughtAt" value="${f.boughtAt || isoDate()}"></div>`,
        submit: async d => { await S.db.update('pets', p.id, { food: { brand: d.brand, bagKg: Number(d.bagKg) || 0, dailyG: Number(d.dailyG) || 0, boughtAt: d.boughtAt } }); toast('✅ Guardado'); }
      });
    },
    async foodNew(el) { const p = pet(el.dataset.id); await S.db.update('pets', p.id, { 'food.boughtAt': isoDate() }); hooks.celebrate(innerWidth / 2, innerHeight / 2, 'confetti'); toast(`🍖 ¡${p.name} tiene comida para rato!`); },
    async foodShop(el) {
      const p = pet(el.dataset.id);
      await S.db.add('shopping', { text: `${p.food?.brand || 'Comida'} para ${p.name} 🐾`, list: 'Súper', done: false, by: S.me.id });
      toast('🛒 Agregado a la lista de compras');
    },
    addWeight(el) {
      const p = pet(el.dataset.id);
      modal({
        title: `⚖️ Peso de ${esc(p.name)}`, body: `<div class="frow"><div class="field"><label>Peso (kg)</label><input class="input" type="number" step="0.01" inputmode="decimal" name="kg" required></div><div class="field"><label>Fecha</label><input class="input" type="date" name="date" value="${isoDate()}"></div></div>`,
        submit: async d => { const kg = Number(d.kg); if (!kg) return false; await S.db.update('pets', p.id, { weightLog: [...(p.weightLog || []).filter(x => x.date !== d.date), { date: d.date, kg }] }); toast('⚖️ Anotado'); }
      });
    }
  }
};

function vacForm(p, i = -1) {
  const v = i >= 0 ? p.vaccines[i] : {};
  const plus = (months) => { const d = today0(); d.setMonth(d.getMonth() + months); return isoDate(d); };
  const sugg = p.type === 'perro' ? ['Múltiple (quíntuple)', 'Rabia', 'Bordetella', 'Desparasitación interna', 'Pipeta / antipulgas'] : p.type === 'gato' ? ['Triple felina', 'Rabia', 'Leucemia felina', 'Desparasitación interna', 'Pipeta / antipulgas'] : ['Revisión general', 'Desparasitación'];
  modal({
    title: i >= 0 ? '💉 Editar registro' : '💉 Nueva vacuna o desparasitación',
    body: `<div class="chips mb">${sugg.map(s => `<button type="button" class="chip chip-btn" data-s="${esc(s)}">${esc(s)}</button>`).join('')}</div>
      <div class="field"><label>Nombre</label><input class="input" name="name" required value="${esc(v.name || '')}"></div>
      <div class="frow"><div class="field"><label>Se aplicó</label><input class="input" type="date" name="date" value="${esc(v.date || isoDate())}"></div><div class="field"><label>Próxima dosis</label><input class="input" type="date" name="next" value="${esc(v.next || '')}"></div></div>
      <div class="chips"><span class="tiny muted bold">Próxima en:</span>${[[1, '1 mes'], [3, '3 meses'], [6, '6 meses'], [12, '1 año']].map(([m, l]) => `<button type="button" class="chip chip-btn" data-plus="${m}">${l}</button>`).join('')}</div>`,
    danger: i >= 0 ? { label: 'Borrar', confirm: '¿Borrar este registro?', action: async () => { const vs = [...p.vaccines]; vs.splice(i, 1); await S.db.update('pets', p.id, { vaccines: vs }); } } : undefined,
    onOpen(f) {
      f.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { f.querySelector('[name=name]').value = b.dataset.s; });
      f.querySelectorAll('[data-plus]').forEach(b => b.onclick = () => { const base = parseDate(f.querySelector('[name=date]').value) || today0(); base.setMonth(base.getMonth() + +b.dataset.plus); f.querySelector('[name=next]').value = isoDate(base); });
    },
    submit: async d => {
      if (!d.name.trim()) return false;
      const rec = { name: d.name.trim(), date: d.date, next: d.next, kind: /desparasit|pipeta|pulga/i.test(d.name) ? 'desparasitacion' : 'vacuna' };
      const vs = [...(p.vaccines || [])]; if (i >= 0) vs[i] = rec; else vs.push(rec);
      await S.db.update('pets', p.id, { vaccines: vs }); toast('💉 Guardado');
    }
  });
}
