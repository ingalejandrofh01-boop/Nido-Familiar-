// 🐾 Creador de avatar: animalito animado totalmente personalizable
import { S, hooks, member, isAdmin } from '../store.js';
import { esc, toast, confirmBox } from '../ui.js';
import { renderAvatar, defaultAvatar, randomAvatar, SPECIES, OPTIONS, FUR_COLORS, SEC_COLORS, EXTRA_COLORS, EYE_COLORS, BLUSH_COLORS, ACC_COLORS, BG_COLORS } from '../avatar.js';
import { THEMES } from '../themes.js';

let draft = null, draftFor = null, tab = 'animal', previewSeason = null, dirty = false;
const TABS = [['animal', '🐾 Animal'], ['colores', '🎨 Colores'], ['ojos', '👀 Ojos'], ['boca', '😊 Boca'], ['cabeza', '🎩 Cabeza'], ['lentes', '🕶️ Lentes'], ['cuello', '🧣 Cuello'], ['fondo', '🖼️ Fondo'], ['anim', '✨ Animación']];
const FACE_VB = '38 58 124 104';

const tile = (patch, label, on, vb, live) => `<button class="ava-tile ${on ? 'on' : ''} ${vb ? 'zoom' : ''}" data-act="set" data-patch='${esc(JSON.stringify(patch))}'>
  <span class="avatar ava ${live ? 'live' : ''}">${renderAvatar({ ...draft, ...patch }, { raw: true, vb })}</span>${esc(label)}</button>`;
const swatches = (key, colors, extra = '') => `<div class="swatches">${colors.map(c => `<button class="swatch ${draft[key] === c ? 'on' : ''}" style="background:${c}" data-act="set" data-patch='${esc(JSON.stringify({ [key]: c }))}' title="${c}"></button>`).join('')}
  <label class="swatch custom" title="Otro color"><input type="color" value="${esc(draft[key] || '#ffffff')}" data-change="color" data-k="${key}"></label>${extra}</div>`;
const optTiles = (key, vb, live) => `<div class="ava-grid">${Object.entries(OPTIONS[key]).map(([k, l]) => tile({ [key]: k }, l, draft[key] === k, vb, live)).join('')}</div>`;

function panel() {
  switch (tab) {
    case 'animal': return `<div class="ava-sec"><h4>Elige tu animalito</h4><div class="ava-grid">${Object.entries(SPECIES).map(([k, s]) => {
      const d = defaultAvatar(k); const patch = { species: k, fur: d.fur, sec: d.sec, extra: d.extra, pattern: d.pattern };
      return tile(patch, s.n, draft.species === k);
    }).join('')}</div></div>`;
    case 'colores': return `
      <div class="ava-sec"><h4>Pelaje</h4>${swatches('fur', FUR_COLORS)}</div>
      <div class="ava-sec"><h4>Detalles (hocico, pancita, cara)</h4>${swatches('sec', SEC_COLORS)}</div>
      <div class="ava-sec"><h4>Marcas (rayas, manchas, melena, cuerno…)</h4>${swatches('extra', EXTRA_COLORS)}</div>
      <div class="ava-sec"><h4>Patrón del pelaje</h4>${optTiles('pattern')}</div>`;
    case 'ojos': return `
      <div class="ava-sec"><h4>Forma de los ojos</h4>${optTiles('eyes', FACE_VB)}</div>
      <div class="ava-sec"><h4>Color de ojos</h4>${swatches('eyeColor', EYE_COLORS)}</div>
      <div class="ava-sec"><h4>Cejas</h4>${optTiles('brows', FACE_VB)}</div>`;
    case 'boca': return `
      <div class="ava-sec"><h4>Expresión</h4>${optTiles('mouth', FACE_VB)}</div>
      <div class="ava-sec"><h4>Mejillas sonrojadas</h4><label class="toggle"><input type="checkbox" ${draft.blush ? 'checked' : ''} data-change="toggle" data-k="blush"> ${draft.blush ? 'Sí, chapeadito' : 'Sin chapitas'}</label>
        ${draft.blush ? `<div class="mt-s">${swatches('blushColor', BLUSH_COLORS)}</div>` : ''}</div>`;
    case 'cabeza': return `<div class="ava-sec"><h4>Sombreros y accesorios</h4>${optTiles('head')}</div>
      <div class="ava-sec"><h4>Color del accesorio</h4>${swatches('acc', ACC_COLORS)}</div>`;
    case 'lentes': return `<div class="ava-sec"><h4>Lentes y cara</h4>${optTiles('face', FACE_VB)}</div>`;
    case 'cuello': return `<div class="ava-sec"><h4>Cuello</h4>${optTiles('neck')}</div>
      <div class="ava-sec"><h4>Color</h4>${swatches('acc', ACC_COLORS)}</div>`;
    case 'fondo': return `<div class="ava-sec"><h4>Fondo</h4><div class="swatches">${BG_COLORS.map(([a, b]) => `<button class="swatch ${draft.bg?.[0] === a && draft.bg?.[1] === b ? 'on' : ''}" style="width:52px;height:52px;background:radial-gradient(circle at 35% 30%, ${a}, ${b})" data-act="set" data-patch='${esc(JSON.stringify({ bg: [a, b] }))}'></button>`).join('')}</div></div>`;
    case 'anim': return `<div class="ava-sec"><h4>¿Cómo se mueve?</h4>${optTiles('anim', null, true)}</div>
      <div class="ava-sec"><h4>Accesorios de temporada</h4>
        <label class="toggle"><input type="checkbox" ${draft.seasonal !== false ? 'checked' : ''} data-change="toggle" data-k="seasonal"> Ponerle gorro navideño en Navidad, sombrero de bruja en Halloween, flores en Día de Muertos…</label>
        <p class="tiny muted mt-s">Sólo se agregan si no tiene ya algo puesto en ese lugar. Y el día de su cumpleaños, ¡lleva corona! 👑</p></div>`;
  }
  return '';
}

export default {
  render([id]) {
    const m = member(id || S.me.id);
    if (!m) return `<div class="card empty">Integrante no encontrado</div>`;
    if (m.id !== S.me.id && !isAdmin()) return `<div class="card empty"><div class="big">🔒</div>Sólo puedes editar tu propio avatar.</div>`;
    if (draftFor !== m.id) { draftFor = m.id; draft = { ...defaultAvatar(m.avatar?.species || 'gato'), ...(m.avatar || {}) }; if (!m.avatar) draft = randomAvatar(); dirty = !m.avatar; previewSeason = null; }
    const seasons = [['', '🙂 Normal'], ['navidad', '🎄'], ['halloween', '🎃'], ['muertos', '💀'], ['patrias', '🇲🇽'], ['anio_nuevo', '🎆'], ['invierno', '❄️'], ['verano', '☀️'], ['amor', '💘'], ['bday', '👑']];
    return `
      <a class="link" href="#/perfil/${m.id}">‹ ${esc(m.name)}</a>
      <div class="page-head mt"><div><h1>Crea tu avatar</h1><p>Elige tu animalito y dale tu estilo 🐾</p></div></div>
      <div class="ava-editor">
        <section class="card deco ava-stage">
          <span class="avatar ava xxl live">${renderAvatar(draft, previewSeason === 'bday' ? { crown: true } : previewSeason ? { season: previewSeason } : { raw: true })}</span>
          <div class="stage-info"><h2 style="font-size:24px;font-weight:900;margin-top:10px">${esc(m.name)}</h2>
          <div class="small muted bold">${esc(SPECIES[draft.species]?.n || '')} · ${esc(OPTIONS.anim[draft.anim] || '')}</div>
          <div class="row wrap mt" style="justify-content:center">
            <button class="btn" data-act="random">🎲 Sorpréndeme</button>
            <button class="btn primary" data-act="save">💾 Guardar avatar</button>
          </div></div>
          <div class="stage-extra">
            <div class="divider">Vista previa por temporada</div>
            <div class="chips" style="justify-content:center">${seasons.map(([k, l]) => `<button class="chip chip-btn ${(previewSeason || '') === k ? 'sel' : ''}" data-act="season" data-s="${k}" title="${k ? (THEMES[k]?.name || 'Cumpleaños') : 'Sin temporada'}">${l}</button>`).join('')}</div>
            ${m.avatar ? `<button class="link tiny mt" data-act="remove">Quitar avatar y usar ${m.photo ? 'mi foto' : 'emoji'}</button>` : ''}
          </div>
        </section>
        <section class="card deco">
          <div class="ava-tabs">${TABS.map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-act="tab" data-t="${k}">${l}</button>`).join('')}</div>
          ${panel()}
        </section>
      </div>`;
  },
  actions: {
    tab(el) { tab = el.dataset.t; hooks.rerender(); },
    set(el) { Object.assign(draft, JSON.parse(el.dataset.patch)); dirty = true; hooks.rerender(); },
    color(el) { draft[el.dataset.k] = el.value; dirty = true; hooks.rerender(); },
    toggle(el) { draft[el.dataset.k] = el.checked; dirty = true; hooks.rerender(); },
    season(el) { previewSeason = el.dataset.s || null; hooks.rerender(); },
    random() { const keep = draft.seasonal; draft = randomAvatar(); draft.seasonal = keep; dirty = true; hooks.rerender(); },
    async save() {
      await S.db.update('members', draftFor, { avatar: { ...draft }, avatarMode: 'animal' });
      dirty = false;
      const r = document.querySelector('.ava-stage .avatar').getBoundingClientRect();
      hooks.celebrate(r.left + r.width / 2, r.top + r.height / 3, 'confetti');
      toast('🐾 ¡Avatar guardado!');
    },
    async remove() {
      if (!(await confirmBox('¿Quitar el avatar animado?'))) return;
      await S.db.update('members', draftFor, { avatar: null });
      const id = draftFor; draftFor = null; hooks.go('perfil/' + id);
    }
  }
};
export const resetAvatarDraft = () => { draftFor = null; };
