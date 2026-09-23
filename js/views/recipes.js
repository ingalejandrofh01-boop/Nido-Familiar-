// 🍲 Recetario familiar: las recetas de la abuela, con modo cocina paso a paso
import { S, hooks, members, member, notify, onCleanup } from '../store.js';
import { esc, avatar, modal, toast, compressImage, pickFiles, fmtShort, isoDate } from '../ui.js';

const CATS = { desayuno: ['🍳', 'Desayuno'], comida: ['🍲', 'Comida'], cena: ['🌮', 'Cena'], postre: ['🍰', 'Postre'], bebida: ['🥤', 'Bebida'], botana: ['🥨', 'Botana'], fiesta: ['🎉', 'Para fiestas'], salsa: ['🌶️', 'Salsas'] };
let q = '', cat = 'todas', favOnly = false;
const lines = (t) => (t || '').split('\n').map(s => s.replace(/^[-•*\d.)\s]+/, '').trim()).filter(Boolean);

function recipeForm(r = null) {
  let photo = r?.photo || '';
  modal({
    title: r ? 'Editar receta' : 'Nueva receta', wide: true,
    body: `<div class="row mb" style="gap:14px"><div id="rph" class="rec-ph" style="${photo ? `background-image:url('${photo}')` : ''}">${photo ? '' : '📷'}</div>
        <div class="col grow"><button type="button" class="btn sm" id="phb">📷 Foto del platillo</button><span class="tiny muted">Opcional, pero se ve delicioso 😋</span></div></div>
      <div class="frow"><div class="field"><label>Nombre</label><input class="input" name="title" required value="${esc(r?.title || '')}" placeholder="Mole de la abuela, pozole, flan…"></div>
      <div class="field"><label>Emoji</label><input class="input" name="emoji" value="${esc(r?.emoji || '🍲')}" maxlength="4"></div></div>
      <div class="field"><label>Tipo</label><div class="chips">${Object.entries(CATS).map(([k, [e, l]]) => `<label class="chip chip-btn"><input type="radio" name="category" value="${k}" ${(r?.category || 'comida') === k ? 'checked' : ''}> ${e} ${l}</label>`).join('')}</div></div>
      <div class="frow"><div class="field"><label>¿De quién es la receta?</label><input class="input" name="author" list="rauth" value="${esc(r?.author || '')}" placeholder="Abuela Rosa, tía Mari…"><datalist id="rauth">${members().map(m => `<option value="${esc(m.name)}">`).join('')}</datalist></div>
      <div class="field"><label>Tiempo · Porciones</label><div class="row"><input class="input" name="time" value="${esc(r?.time || '')}" placeholder="45 min"><input class="input" name="servings" value="${esc(r?.servings || '')}" placeholder="4 personas"></div></div></div>
      <div class="field"><label>Ingredientes (uno por renglón)</label><textarea class="input" name="ingredients" rows="6" placeholder="1 kg de pollo\n3 chiles anchos\nSal al gusto">${esc((r?.ingredients || []).join('\n'))}</textarea></div>
      <div class="field"><label>Preparación (un paso por renglón)</label><textarea class="input" name="steps" rows="7" placeholder="Lava y desvena los chiles…">${esc((r?.steps || []).join('\n'))}</textarea></div>
      <div class="field"><label>Secretos y notas 🤫</label><textarea class="input" name="notes" rows="2" placeholder="El truco es…">${esc(r?.notes || '')}</textarea></div>`,
    onOpen(f) { f.querySelector('#phb').onclick = async () => { const [file] = await pickFiles(); if (!file) return; photo = await compressImage(file, 900, .75, 180000); const d = f.querySelector('#rph'); d.style.backgroundImage = `url('${photo}')`; d.textContent = ''; }; },
    submit: async d => {
      const data = { title: d.title.trim(), emoji: d.emoji || '🍲', category: d.category || 'comida', author: d.author, time: d.time, servings: d.servings, ingredients: lines(d.ingredients), steps: lines(d.steps), notes: d.notes, photo };
      if (!data.title) return false;
      if (r) await S.db.update('recipes', r.id, data);
      else { const id = await S.db.add('recipes', { ...data, by: S.me.id, favs: [], cooked: [] }); notify({ icon: data.emoji, title: `Nueva receta: ${data.title}`, body: data.author ? `La receta de ${data.author}` : `La compartió ${S.me.name}`, link: 'receta/' + id }); hooks.go('receta/' + id); }
      toast('🍲 Receta guardada');
    },
    danger: r ? { label: '🗑️', confirm: '¿Eliminar esta receta?', action: async () => { await S.db.remove('recipes', r.id); hooks.go('recetas'); } } : null
  });
}

export const recipesView = {
  render() {
    const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const list = S.data.recipes.filter(r => (cat === 'todas' || r.category === cat) && (!favOnly || (r.favs || []).includes(S.me.id)) && (!q || norm(r.title + ' ' + (r.author || '') + ' ' + (r.ingredients || []).join(' ')).includes(norm(q))))
      .sort((a, b) => (b.favs || []).length - (a.favs || []).length || a.title.localeCompare(b.title));
    return `<div class="page-head"><div><h1>Recetario familiar</h1><p>Los sabores de la familia, para que nunca se pierdan 👵🍲</p></div><button class="btn primary" data-act="new">＋ Nueva receta</button></div>
      <input class="input mb" id="rec-q" placeholder="🔎 Buscar por nombre, ingrediente o quién la hace…" value="${esc(q)}" data-change="search" oninput="this.dispatchEvent(new Event('change',{bubbles:true}))">
      <div class="chips mb"><button class="chip chip-btn ${cat === 'todas' ? 'sel' : ''}" data-act="cat" data-c="todas">📚 Todas</button><button class="chip chip-btn ${favOnly ? 'sel' : ''}" data-act="fav">❤️ Mis favoritas</button>${Object.entries(CATS).map(([k, [e, l]]) => `<button class="chip chip-btn ${cat === k ? 'sel' : ''}" data-act="cat" data-c="${k}">${e} ${l}</button>`).join('')}</div>
      ${list.length ? `<div class="grid auto">${list.map(r => `<a class="card rec-card" href="#/receta/${r.id}" style="text-decoration:none">
        <div class="rec-img" style="${r.photo ? `background-image:url('${r.photo}')` : ''}">${r.photo ? '' : `<span>${esc(r.emoji || '🍲')}</span>`}${(r.favs || []).length ? `<span class="rec-fav">❤️ ${r.favs.length}</span>` : ''}</div>
        <div style="padding:14px 16px"><div class="bold" style="font-size:17px">${esc(r.title)}</div><div class="tiny muted mt-s">${r.author ? '👩‍🍳 ' + esc(r.author) + ' · ' : ''}${CATS[r.category]?.[0] || ''} ${r.time ? '⏱️ ' + esc(r.time) : ''}</div></div></a>`).join('')}</div>`
        : `<div class="card empty"><div class="big">🍲</div><p class="bold">${q ? 'No encontramos esa receta' : 'Empieza con la receta favorita de la familia'}</p><button class="btn primary" data-act="new">Agregar receta</button></div>`}`;
  },
  actions: { new() { recipeForm(); }, cat(el) { cat = el.dataset.c; favOnly = false; hooks.rerender(); }, fav() { favOnly = !favOnly; hooks.rerender(); }, search(el) { q = el.value; hooks.rerender(); } }
};

let checked = {}, cookStep = null, wake = null;
export const recipeDetail = {
  render([id]) {
    const r = S.data.recipes.find(x => x.id === id);
    if (!r) return `<div class="card empty">Receta no encontrada. <a class="link" href="#/recetas">Volver</a></div>`;
    const fav = (r.favs || []).includes(S.me.id); checked[id] = checked[id] || {};
    const cooked = (r.cooked || []).slice(-5).reverse();
    return `<a class="link" href="#/recetas">‹ Recetario</a>
      <section class="card rec-hero mt" style="${r.photo ? `background-image:linear-gradient(180deg,transparent 30%,rgba(0,0,0,.75)),url('${r.photo}')` : ''}">
        ${r.photo ? '' : `<div class="rec-big-emoji">${esc(r.emoji || '🍲')}</div>`}
        <div class="rec-hero-t"><div class="chip">${CATS[r.category]?.[0] || ''} ${CATS[r.category]?.[1] || ''}</div><h1 class="display" style="font-size:clamp(30px,6vw,48px);margin-top:8px">${esc(r.title)}</h1>
          <div class="row wrap small bold" style="gap:14px">${r.author ? `<span>👩‍🍳 Receta de ${esc(r.author)}</span>` : ''}${r.time ? `<span>⏱️ ${esc(r.time)}</span>` : ''}${r.servings ? `<span>🍽️ ${esc(r.servings)}</span>` : ''}</div></div></section>
      <div class="row wrap mt"><button class="btn primary" data-act="cook">👩‍🍳 Modo cocina</button><button class="btn" data-act="toggleFav">${fav ? '❤️ En favoritas' : '🤍 Favorita'}</button><button class="btn" data-act="toShop">🛒 Ingredientes a la lista</button><button class="btn" data-act="cooked">✅ Lo preparé hoy</button><button class="btn ghost" data-act="edit">✏️</button></div>
      <div class="grid mt" style="grid-template-columns:minmax(0,1fr) minmax(0,1.4fr)" id="rec-grid">
        <section class="card deco"><div class="card-title"><h3>🧺 Ingredientes</h3><span class="tiny muted">${Object.values(checked[id]).filter(Boolean).length}/${(r.ingredients || []).length}</span></div>
          <div class="list">${(r.ingredients || []).map((ing, i) => `<div class="item clickable" data-act="check" data-i="${i}"><span class="check ${checked[id][i] ? 'on' : ''}">${checked[id][i] ? '✓' : ''}</span><span class="grow ${checked[id][i] ? 'done-text' : ''}">${esc(ing)}</span></div>`).join('') || '<div class="empty small">Sin ingredientes</div>'}</div></section>
        <section class="card deco"><div class="card-title"><h3>📝 Preparación</h3></div>
          <ol class="rec-steps">${(r.steps || []).map(s => `<li>${esc(s)}</li>`).join('')}</ol>
          ${r.notes ? `<div class="rec-note">🤫 <b>El secreto:</b> ${esc(r.notes)}</div>` : ''}
          ${cooked.length ? `<div class="divider">La han preparado</div><div class="row wrap">${cooked.map(c => `<span class="chip">${member(c.by) ? esc(member(c.by).name) : ''} · ${fmtShort(c.date)}</span>`).join('')}</div>` : ''}</section>
      </div><style>@media(max-width:800px){#rec-grid{grid-template-columns:1fr!important}}</style>`;
  },
  after(root, [id]) {
    if (cookStep == null) return;
    const r = S.data.recipes.find(x => x.id === id); if (!r) return;
    const steps = r.steps || []; const el = document.createElement('div'); el.className = 'cook-mode';
    const draw = () => { el.innerHTML = `<button class="icon-btn cook-x">✕</button><div class="tiny bold" style="opacity:.7;letter-spacing:2px">PASO ${cookStep + 1} DE ${steps.length}</div>
      <div class="progress" style="width:min(420px,80vw);margin:10px auto 0"><i style="width:${(cookStep + 1) / steps.length * 100}%"></i></div>
      <div class="cook-text">${esc(steps[cookStep] || '¡Listo! Buen provecho 😋')}</div>
      <div class="row" style="justify-content:center;gap:14px"><button class="btn lg" ${cookStep === 0 ? 'disabled' : ''} data-c="-1">‹ Anterior</button>${cookStep < steps.length - 1 ? '<button class="btn primary lg" data-c="1">Siguiente ›</button>' : '<button class="btn primary lg" data-c="end">🎉 Terminé</button>'}</div>
      <div class="tiny" style="opacity:.6;margin-top:14px">La pantalla se queda encendida mientras cocinas</div>`; };
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-c]');
      if (e.target.closest('.cook-x') || b?.dataset.c === 'end') { if (b?.dataset.c === 'end') hooks.celebrate(innerWidth / 2, innerHeight / 3, 'confetti'); cookStep = null; el.remove(); try { wake?.release(); } catch { } return; }
      if (b) { cookStep = Math.max(0, Math.min(steps.length - 1, cookStep + Number(b.dataset.c))); draw(); }
    });
    draw(); document.body.appendChild(el);
    try { navigator.wakeLock?.request('screen').then(w => wake = w).catch(() => { }); } catch { }
    onCleanup(() => { el.remove(); });
  },
  actions: {
    edit() { recipeForm(S.data.recipes.find(x => x.id === S.route.params[0])); },
    check(el) { const id = S.route.params[0]; checked[id][el.dataset.i] = !checked[id][el.dataset.i]; hooks.rerender(); },
    cook() { const r = S.data.recipes.find(x => x.id === S.route.params[0]); if (!(r.steps || []).length) return toast('Esta receta no tiene pasos todavía'); cookStep = 0; hooks.rerender(); },
    async toggleFav() { const r = S.data.recipes.find(x => x.id === S.route.params[0]); const f = new Set(r.favs || []); f.has(S.me.id) ? f.delete(S.me.id) : f.add(S.me.id); await S.db.update('recipes', r.id, { favs: [...f] }); },
    async cooked() { const r = S.data.recipes.find(x => x.id === S.route.params[0]); await S.db.update('recipes', r.id, { cooked: [...(r.cooked || []), { by: S.me.id, date: isoDate() }] }); toast('👩‍🍳 ¡Qué rico! Quedó registrado'); },
    async toShop() {
      const r = S.data.recipes.find(x => x.id === S.route.params[0]); const id = r.id;
      const pending = (r.ingredients || []).filter((_, i) => !checked[id][i]);
      for (const t of pending) await S.db.add('shopping', { text: t, list: 'Súper', done: false, by: S.me.id, from: r.title });
      toast(`🛒 ${pending.length} ingrediente${pending.length === 1 ? '' : 's'} agregados a la lista`);
    }
  }
};
