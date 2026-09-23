// 🍽️ Menú semanal: qué se come cada día, quién cocina y la lista del súper automática
import { S, hooks, members, member, notify } from '../store.js';
import { esc, avatar, modal, toast, isoDate, parseDate, today0, confirmBox } from '../ui.js';

export const MEALS = { desayuno: ['🍳', 'Desayuno'], comida: ['🍲', 'Comida'], cena: ['🌮', 'Cena'] };
const DOW = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const QUICK = ['🍕 Comemos fuera', '🥡 Sobras', '🥪 Cada quien', '🌯 Pedimos algo', '🎉 En la fiesta'];
let offset = 0; // semanas desde la actual

export const weekStart = (d = today0()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
const weekDays = (ws) => Array.from({ length: 7 }, (_, i) => { const d = new Date(ws); d.setDate(d.getDate() + i); return d; });
const curWeek = () => { const ws = weekStart(); ws.setDate(ws.getDate() + offset * 7); return ws; };
const menuDoc = (ws) => (S.data.menus || []).find(m => m.id === isoDate(ws));
const recipe = (id) => S.data.recipes.find(r => r.id === id);
const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();

export function todayMenu() {
  const t = today0(), m = menuDoc(weekStart(t)); const day = (m?.days || {})[isoDate(t)] || {};
  return Object.keys(MEALS).map(k => ({ meal: k, ...day[k] })).filter(x => x.recipeId || x.text);
}
export const slotLabel = (s) => { const r = s.recipeId && recipe(s.recipeId); return r ? `${r.emoji || '🍲'} ${r.title}` : s.text || ''; };

async function saveSlot(ws, dayIso, meal, val) {
  const id = isoDate(ws);
  if (!menuDoc(ws)) await S.db.set('menus', id, { days: { [dayIso]: { [meal]: val } }, meals: ['comida', 'cena'] });
  else await S.db.update('menus', id, { [`days.${dayIso}.${meal}`]: val });
}

function slotForm(ws, dayIso, meal) {
  const cur = ((menuDoc(ws)?.days || {})[dayIso] || {})[meal] || {};
  let pick = cur.recipeId || '';
  const recs = [...S.data.recipes].sort((a, b) => (b.favs || []).length - (a.favs || []).length || a.title.localeCompare(b.title));
  const d = parseDate(dayIso);
  modal({
    title: `${MEALS[meal][0]} ${MEALS[meal][1]} del ${DOW[(d.getDay() + 6) % 7].toLowerCase()} ${d.getDate()}`, wide: true,
    body: `<div class="field"><label>Del recetario</label><input class="input" data-q placeholder="🔎 Buscar receta…"><div class="rec-pick mt-s">${recs.map(r => `<button type="button" class="rp ${pick === r.id ? 'on' : ''}" data-r="${r.id}"><span class="rp-e" ${r.photo ? `style="background-image:url('${r.photo}')"` : ''}>${r.photo ? '' : esc(r.emoji || '🍲')}</span><span class="small bold">${esc(r.title)}</span></button>`).join('') || '<div class="tiny muted">Aún no hay recetas. Agrégalas en 🍲 Recetario.</div>'}</div></div>
      <div class="field"><label>…o escríbelo</label><input class="input" name="text" value="${esc(cur.recipeId ? '' : cur.text || '')}" placeholder="Tacos de canasta, sopa de fideo…"><div class="chips mt-s">${QUICK.map(q => `<button type="button" class="chip chip-btn" data-quick="${esc(q)}">${esc(q)}</button>`).join('')}</div></div>
      <div class="field"><label>¿Quién cocina?</label><div class="chips"><label class="chip chip-btn"><input type="radio" name="cook" value="" ${!cur.cook ? 'checked' : ''}> Nadie en especial</label>${members().map(m => `<label class="chip chip-btn"><input type="radio" name="cook" value="${m.id}" ${cur.cook === m.id ? 'checked' : ''}> ${esc(m.emoji || '')} ${esc(m.name)}</label>`).join('')}</div></div>`,
    danger: cur.recipeId || cur.text ? { label: 'Quitar', confirm: '¿Dejar vacío este espacio?', action: async () => saveSlot(ws, dayIso, meal, {}) } : undefined,
    onOpen(f) {
      const t = f.querySelector('[name=text]');
      f.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { pick = pick === b.dataset.r ? '' : b.dataset.r; f.querySelectorAll('[data-r]').forEach(x => x.classList.toggle('on', x.dataset.r === pick)); if (pick) t.value = ''; });
      f.querySelectorAll('[data-quick]').forEach(b => b.onclick = () => { t.value = b.dataset.quick; pick = ''; f.querySelectorAll('[data-r]').forEach(x => x.classList.remove('on')); });
      t.addEventListener('input', () => { if (t.value) { pick = ''; f.querySelectorAll('[data-r]').forEach(x => x.classList.remove('on')); } });
      f.querySelector('[data-q]').addEventListener('input', e => { const q = norm(e.target.value); f.querySelectorAll('[data-r]').forEach(b => b.style.display = !q || norm(b.textContent).includes(q) ? '' : 'none'); });
    },
    submit: async data => {
      const val = pick ? { recipeId: pick, text: '', cook: data.cook || '' } : { recipeId: '', text: (data.text || '').trim(), cook: data.cook || '' };
      if (!val.recipeId && !val.text) { toast('Elige una receta o escribe qué se come'); return false; }
      await saveSlot(ws, dayIso, meal, val);
      if (val.cook && val.cook !== S.me.id) notify({ to: [val.cook], icon: '👩‍🍳', title: `Te toca cocinar: ${slotLabel(val)}`, body: `${MEALS[meal][1]} del ${DOW[(d.getDay() + 6) % 7].toLowerCase()} ${d.getDate()}`, link: 'menu' });
      toast('🍽️ Anotado en el menú');
    }
  });
}

export function addToMenuForm(r) {
  const ws = weekStart(), days = weekDays(ws).filter(d => d >= today0()); const next = weekDays(new Date(ws.getTime() + 7 * 864e5));
  const all = [...days, ...next];
  modal({
    title: `📅 ${esc(r.title)} al menú`,
    body: `<div class="field"><label>¿Qué día?</label><select class="input" name="day">${all.map(d => `<option value="${isoDate(d)}">${DOW[(d.getDay() + 6) % 7]} ${d.getDate()} ${MES[d.getMonth()]}</option>`).join('')}</select></div>
      <div class="field"><label>¿Para cuándo?</label><div class="seg wrap">${Object.entries(MEALS).map(([k, [e, l]]) => `<label style="padding:6px 10px"><input type="radio" name="meal" value="${k}" ${k === (r.category === 'cena' ? 'cena' : 'comida') ? 'checked' : ''}> ${e} ${l}</label>`).join('')}</div></div>`,
    submit: async d => { await saveSlot(weekStart(parseDate(d.day)), d.day, d.meal, { recipeId: r.id, text: '', cook: '' }); toast('📅 ¡Agregada al menú!'); }
  });
}

export default {
  render() {
    const ws = curWeek(), days = weekDays(ws), m = menuDoc(ws) || { days: {} }, t = isoDate();
    const meals = m.meals || ['comida', 'cena'];
    const we = days[6];
    const planned = days.reduce((a, d) => a + meals.filter(k => ((m.days[isoDate(d)] || {})[k] || {}).recipeId || ((m.days[isoDate(d)] || {})[k] || {}).text).length, 0);
    const cooks = {}; days.forEach(d => meals.forEach(k => { const c = ((m.days[isoDate(d)] || {})[k] || {}).cook; if (c) cooks[c] = (cooks[c] || 0) + 1; }));
    const slot = (d, k) => { const s = (m.days[isoDate(d)] || {})[k] || {}; const r = s.recipeId && recipe(s.recipeId); const c = member(s.cook);
      return `<button class="meal ${s.recipeId || s.text ? 'set' : ''}" data-act="slot" data-d="${isoDate(d)}" data-m="${k}">
        <span class="meal-k">${MEALS[k][0]} ${MEALS[k][1]}</span>
        ${r ? `<span class="meal-t">${r.photo ? `<i class="meal-ph" style="background-image:url('${r.photo}')"></i>` : `<span class="meal-e">${esc(r.emoji || '🍲')}</span>`}<b>${esc(r.title)}</b></span>` : s.text ? `<span class="meal-t"><b>${esc(s.text)}</b></span>` : '<span class="meal-empty">＋ ¿Qué comemos?</span>'}
        ${c ? `<span class="meal-cook">${avatar(c, 'xs')} ${esc(c.name.split(' ')[0])} cocina</span>` : ''}</button>`; };
    return `<div class="page-head"><div><h1>Menú de la semana</h1><p>Se acabó el "¿qué hacemos de comer?" 🍽️</p></div></div>
      <section class="card deco menu-bar">
        <div class="cal-head" style="margin-bottom:0"><button class="icon-btn" data-act="wk" data-d="-1">‹</button><h2>${offset === 0 ? 'Esta semana' : offset === 1 ? 'Próxima semana' : offset === -1 ? 'Semana pasada' : 'Semana'} <span class="muted" style="font-size:.7em">${ws.getDate()} ${MES[ws.getMonth()]} – ${we.getDate()} ${MES[we.getMonth()]}</span></h2><div class="row">${offset ? '<button class="btn sm" data-act="wk" data-d="0">Hoy</button>' : ''}<button class="icon-btn" data-act="wk" data-d="1">›</button></div></div>
        <div class="row wrap mt" style="gap:8px;justify-content:center">
          <button class="btn sm" data-act="suggest">✨ Sugerir menú</button>
          <button class="btn sm primary" data-act="groceries">🛒 Lista del súper</button>
          <label class="chip chip-btn"><input type="checkbox" data-change="toggleBreakfast" ${meals.includes('desayuno') ? 'checked' : ''}> 🍳 Incluir desayunos</label>
          ${planned ? '<button class="btn sm ghost" data-act="clearWeek">🧹 Vaciar</button>' : ''}
        </div>
        <div class="tiny muted bold center mt-s">${planned}/${days.length * meals.length} comidas planeadas${Object.keys(cooks).length ? ' · 👩‍🍳 ' + Object.entries(cooks).map(([id, n]) => `${esc(member(id)?.name.split(' ')[0] || '?')} ${n}`).join(', ') : ''}</div>
      </section>
      <div class="menu-week mt">${days.map((d, i) => `<section class="card day-card ${isoDate(d) === t ? 'today' : ''} ${isoDate(d) < t ? 'past' : ''}">
        <div class="day-h"><b>${DOW[i]}</b><span class="muted small bold">${d.getDate()} ${MES[d.getMonth()]}</span>${isoDate(d) === t ? '<span class="chip accent">Hoy</span>' : ''}</div>
        <div class="meals">${['desayuno', 'comida', 'cena'].filter(k => meals.includes(k)).map(k => slot(d, k)).join('')}</div></section>`).join('')}</div>
      ${!S.data.recipes.length ? '<div class="card mt center small bold">💡 Agrega recetas en el <a class="link" href="#/recetas">Recetario</a> para que el menú sugiera platillos y arme la lista del súper con sus ingredientes.</div>' : ''}`;
  },
  actions: {
    wk(el) { const d = +el.dataset.d; offset = d === 0 ? 0 : offset + d; hooks.rerender(); },
    slot(el) { slotForm(curWeek(), el.dataset.d, el.dataset.m); },
    async toggleBreakfast(el) {
      const ws = curWeek(), m = menuDoc(ws); const meals = el.checked ? ['desayuno', 'comida', 'cena'] : ['comida', 'cena'];
      if (m) await S.db.update('menus', m.id, { meals }); else await S.db.set('menus', isoDate(ws), { days: {}, meals });
    },
    async suggest() {
      const ws = curWeek(), days = weekDays(ws), m = menuDoc(ws) || { days: {} }, meals = m.meals || ['comida', 'cena'], t = isoDate();
      const recs = S.data.recipes.filter(r => !['postre', 'bebida'].includes(r.category)); if (!recs.length) { toast('Primero agrega recetas al Recetario 🍲'); return; }
      const fits = (r, k) => k === 'desayuno' ? r.category === 'desayuno' : k === 'cena' ? ['cena', 'botana', 'desayuno', 'comida'].includes(r.category) : ['comida', 'fiesta', 'sopa', 'salsa'].includes(r.category) || !r.category;
      const used = new Set(); days.forEach(d => meals.forEach(k => { const s = (m.days[isoDate(d)] || {})[k]; if (s?.recipeId) used.add(s.recipeId); }));
      const upd = {}; let n = 0;
      for (const d of days) { const di = isoDate(d); if (di < t) continue; for (const k of meals) {
        const s = (m.days[di] || {})[k]; if (s && (s.recipeId || s.text)) continue;
        let pool = recs.filter(r => fits(r, k) && !used.has(r.id)); if (!pool.length) pool = recs.filter(r => fits(r, k)); if (!pool.length) continue;
        const w = pool.flatMap(r => Array(1 + (r.favs || []).length).fill(r)); const r = w[Math.floor(Math.random() * w.length)];
        used.add(r.id); upd[`days.${di}.${k}`] = { recipeId: r.id, text: '', cook: '' }; n++;
      } }
      if (!n) { toast('La semana ya está llena 😋'); return; }
      if (!menuDoc(ws)) await S.db.set('menus', isoDate(ws), { days: {}, meals });
      await S.db.update('menus', isoDate(ws), upd); toast(`✨ Sugerimos ${n} platillo${n > 1 ? 's' : ''}. Toca cualquiera para cambiarlo`);
    },
    async groceries() {
      const ws = curWeek(), days = weekDays(ws), m = menuDoc(ws) || { days: {} }, t = isoDate();
      const need = new Map();
      for (const d of days) { const di = isoDate(d); if (di < t) continue; for (const s of Object.values(m.days[di] || {})) { const r = s.recipeId && recipe(s.recipeId); if (!r) continue; for (const ing of r.ingredients || []) { const k = norm(ing); if (!need.has(k)) need.set(k, { text: ing, from: [r.title] }); else need.get(k).from.push(r.title); } } }
      if (!need.size) { toast('Agrega platillos del recetario para armar la lista 🛒'); return; }
      const have = new Set(S.data.shopping.filter(s => !s.done).map(s => norm(s.text)));
      const items = [...need.values()].filter(x => !have.has(norm(x.text)));
      modal({
        title: '🛒 Lista del súper de la semana', wide: true,
        body: items.length ? `<p class="small muted bold">Palomea lo que ya tienes en casa y agregamos lo demás a Compras:</p><div class="col" style="gap:6px">${items.map((x, i) => `<label class="groc"><input type="checkbox" data-g="${i}" checked> <span class="grow"><b>${esc(x.text)}</b><span class="tiny muted"> · ${esc([...new Set(x.from)].join(', '))}</span></span></label>`).join('')}</div>`
          : '<p class="bold">¡Todo lo del menú ya está en la lista de compras! 🙌</p>',
        submitLabel: items.length ? '🛒 Agregar a Compras' : 'Listo',
        submit: async (_, f) => {
          const sel = [...f.querySelectorAll('[data-g]:checked')].map(i => items[+i.dataset.g]);
          for (const x of sel) await S.db.add('shopping', { text: x.text, list: 'Súper', done: false, by: S.me.id, from: 'Menú semanal' });
          if (sel.length) { toast(`🛒 ${sel.length} ingrediente${sel.length > 1 ? 's' : ''} en la lista`); notify({ icon: '🛒', title: 'Lista del súper lista', body: `${S.me.name} agregó ${sel.length} cosas del menú de la semana`, link: 'listas' }); }
        }
      });
    },
    async clearWeek() {
      if (!(await confirmBox('¿Vaciar todo el menú de esta semana?', 'Vaciar'))) return;
      const m = menuDoc(curWeek()); if (m) await S.db.update('menus', m.id, { days: {} });
    }
  }
};
