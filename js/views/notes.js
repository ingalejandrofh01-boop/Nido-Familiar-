// 📝 Notas familiares  ·  🔎 ¿Dónde está todo? (inventario de la casa)
import { S, hooks, priv, allNotes } from '../store.js';
import { esc, modal, toast, compressImage, pickFiles } from '../ui.js';

const NCATS = { Casa: '🏠', Auto: '🚗', Viaje: '✈️', Salud: '🩺', Escuela: '🎒', Contactos: '📇', Otros: '📌' };
let ncat = 'Todas';
const shown = new Set();

function noteForm(n = null) {
  modal({
    title: n ? 'Editar nota' : 'Nueva nota',
    body: `<div class="field"><label>Título</label><input class="input" name="title" required value="${esc(n?.title || '')}" placeholder="Wi-Fi, plomero, seguro del auto…"></div>
      <div class="field"><label>Categoría</label><div class="chips">${Object.entries(NCATS).map(([k, e]) => `<label class="chip chip-btn"><input type="radio" name="category" value="${k}" ${(n?.category || 'Casa') === k ? 'checked' : ''}> ${e} ${k}</label>`).join('')}</div></div>
      <div class="field"><label>Contenido</label><textarea class="input" name="body" rows="6">${esc(n?.body || '')}</textarea></div>
      <label class="row small bold"><input type="checkbox" name="secret" ${n?.secret ? 'checked' : ''}> 🙈 Ocultar hasta tocar (contraseñas, datos sensibles)</label>
      <label class="toggle mt-s"><input type="checkbox" name="private" ${n?._private ? 'checked' : ''}> 🔒 Nota privada: sólo yo la veo</label>`,
    submit: async d => {
      const data = { title: d.title.trim(), category: d.category || 'Otros', body: d.body, secret: !!d.secret, by: S.me.id };
      if (!data.title) return false;
      const isPriv = !!d.private, path = isPriv ? priv('notes') : 'notes';
      if (n && !!n._private === isPriv) await S.db.update(path, n.id, data);
      else { if (n) await S.db.remove(n._private ? priv('notes') : 'notes', n.id); await S.db.add(path, data); }
    },
    danger: n ? { label: '🗑️', confirm: '¿Eliminar nota?', action: () => S.db.remove(n._private ? priv('notes') : 'notes', n.id) } : null
  });
}

export const notes = {
  render() {
    const cats = ['Todas', 'Privadas', ...Object.keys(NCATS)];
    const list = allNotes().filter(n => ncat === 'Todas' || (ncat === 'Privadas' ? n._private : n.category === ncat)).sort((a, b) => a.title.localeCompare(b.title));
    return `
      <div class="page-head"><div><h1>Notas familiares</h1><p>Wi-Fi, contactos, seguros, reservaciones… todo a la mano</p></div>
        <button class="btn primary" data-act="new">＋ Nueva nota</button></div>
      <div class="chips mb">${cats.map(c => `<button class="chip chip-btn ${ncat === c ? 'sel' : ''}" data-act="cat" data-c="${c}">${c === 'Privadas' ? '🔒' : NCATS[c] || '📚'} ${c}</button>`).join('')}</div>
      ${list.length ? `<div class="grid auto">${list.map(n => `<section class="card deco">
        <div class="card-title"><h3>${n._private ? '🔒' : NCATS[n.category] || '📌'} ${esc(n.title)}</h3><div class="row"><button class="icon-btn" data-act="copy" data-id="${n.id}" title="Copiar">📋</button><button class="icon-btn" data-act="edit" data-id="${n.id}" title="Editar">✏️</button></div></div>
        <div class="${n.secret && !shown.has(n.id) ? 'secret' : ''}" ${n.secret ? `data-act="reveal" data-id="${n.id}" style="cursor:pointer"` : ''} style="white-space:pre-wrap;font-weight:600">${esc(n.body || '')}</div>
        ${n.secret && !shown.has(n.id) ? '<div class="tiny muted mt-s">🔒 Toca para ver</div>' : ''}</section>`).join('')}</div>` : '<div class="card empty"><div class="big">📝</div>Sin notas en esta categoría</div>'}`;
  },
  actions: {
    new() { noteForm(); },
    edit(el) { noteForm(allNotes().find(n => n.id === el.dataset.id)); },
    cat(el) { ncat = el.dataset.c; hooks.rerender(); },
    reveal(el) { const id = el.dataset.id; shown.has(id) ? shown.delete(id) : shown.add(id); hooks.rerender(); },
    async copy(el) { const n = allNotes().find(x => x.id === el.dataset.id); try { await navigator.clipboard.writeText(n.body || ''); toast('📋 Copiado'); } catch { toast('No se pudo copiar'); } }
  }
};

// ------------------ ¿DÓNDE ESTÁ TODO? ------------------
const AREAS = ['Casa', 'Documentos', 'Cocina', 'Cochera', 'Temporada', 'Otros'];
let q = '', area = 'Todo';
function itemForm(it = null) {
  let photo = it?.photo || '';
  modal({
    title: it ? 'Editar' : '¿Dónde quedó…?',
    body: `<div class="frow"><div class="field"><label>Cosa</label><input class="input" name="item" required value="${esc(it?.item || '')}" placeholder="Llave de repuesto"></div>
      <div class="field"><label>Emoji</label><input class="input" name="emoji" value="${esc(it?.emoji || '📦')}" maxlength="4"></div></div>
      <div class="field"><label>¿Dónde está?</label><input class="input" name="place" required value="${esc(it?.place || '')}" placeholder="Cajón de la entrada"></div>
      <div class="field"><label>Área</label><select class="input" name="area">${AREAS.map(a => `<option ${it?.area === a ? 'selected' : ''}>${a}</option>`).join('')}</select></div>
      <div class="field"><label>Foto (opcional)</label><div class="row"><button type="button" class="btn sm" id="ph">📷 Elegir foto</button><img id="phv" src="${photo}" style="height:54px;border-radius:10px;${photo ? '' : 'display:none'}"></div></div>`,
    onOpen(f) { f.querySelector('#ph').onclick = async () => { const [file] = await pickFiles(); if (!file) return; photo = await compressImage(file, 700, 0.7, 120000); const v = f.querySelector('#phv'); v.src = photo; v.style.display = ''; }; },
    submit: async d => {
      const data = { item: d.item.trim(), place: d.place.trim(), area: d.area, emoji: d.emoji || '📦', photo };
      if (!data.item || !data.place) return false;
      if (it) await S.db.update('inventory', it.id, data); else await S.db.add('inventory', data);
    },
    danger: it ? { label: '🗑️', confirm: '¿Eliminar?', action: () => S.db.remove('inventory', it.id) } : null
  });
}
export const donde = {
  render() {
    const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const list = S.data.inventory.filter(i => (area === 'Todo' || i.area === area) && (!q || norm(i.item + ' ' + i.place).includes(norm(q)))).sort((a, b) => a.item.localeCompare(b.item));
    return `
      <div class="page-head"><div><h1>¿Dónde está todo?</h1><p>Para que nadie vuelva a preguntar “¿dónde quedó…?”</p></div>
        <button class="btn primary" data-act="new">＋ Agregar</button></div>
      <input class="input mb" id="inv-q" placeholder="🔎 Buscar: llaves, pasaporte, focos…" value="${esc(q)}" data-change="search" oninput="this.dispatchEvent(new Event('change',{bubbles:true}))">
      <div class="chips mb">${['Todo', ...AREAS].map(a => `<button class="chip chip-btn ${area === a ? 'sel' : ''}" data-act="area" data-a="${a}">${a}</button>`).join('')}</div>
      ${list.length ? `<div class="grid auto">${list.map(i => `<section class="card deco pad-sm clickable" style="cursor:pointer" data-act="edit" data-id="${i.id}">
        <div class="row">${i.photo ? `<img src="${i.photo}" style="width:64px;height:64px;object-fit:cover;border-radius:14px">` : `<span style="font-size:40px">${esc(i.emoji || '📦')}</span>`}
        <div class="grow"><div class="bold">${esc(i.item)}</div><div class="small" style="color:var(--accent);font-weight:800">📍 ${esc(i.place)}</div><div class="tiny muted">${esc(i.area || '')}</div></div></div></section>`).join('')}</div>`
        : `<div class="card empty"><div class="big">🔎</div>${q ? 'No encontramos eso… ¿lo agregamos?' : 'Agrega dónde guardan las cosas importantes'}</div>`}`;
  },
  actions: {
    new() { itemForm(); },
    edit(el) { itemForm(S.data.inventory.find(i => i.id === el.dataset.id)); },
    area(el) { area = el.dataset.a; hooks.rerender(); },
    search(el) { q = el.value; hooks.rerender(); }
  }
};
