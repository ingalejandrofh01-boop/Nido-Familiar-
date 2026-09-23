// 📖 Libro familiar: capítulos (álbumes), fotos tipo polaroid y libro con páginas que se voltean
import { S, hooks, member, onCleanup } from '../store.js';
import { esc, fmtDate, isoDate, modal, toast, compressImage, pickFiles, confirmBox } from '../ui.js';
import { THEMES } from '../themes.js';

const THEME_OPTS = Object.entries(THEMES).map(([k, t]) => [k, t.emoji, t.name]);
const fullCache = {};
async function fullImage(p) {
  if (fullCache[p.id]) return fullCache[p.id];
  if (S.isDemo) return p.thumb;
  try { const f = await S.db.get('photoFiles', p.id); fullCache[p.id] = f?.data || p.thumb; } catch { fullCache[p.id] = p.thumb; }
  return fullCache[p.id];
}
const albumPhotos = (id) => S.data.photos.filter(p => p.albumId === id);
const coverColor = (a) => ({ navidad: '#8b1e2d', halloween: '#3b1650', muertos: '#7a1f5c', anio_nuevo: '#1c2350', amor: '#9d174d', primavera: '#be5a86', madres: '#a2457f', verano: '#0f6e99', patrias: '#0b5d3b', otono: '#8a3b12', invierno: '#2c4a6e', cumple: '#6b2fa3', clasico: '#3b3486' }[a.theme] || '#5b3a29');

function albumForm(a = null) {
  modal({
    title: a ? 'Editar capítulo' : 'Nuevo capítulo del libro',
    body: `<div class="field"><label>Título</label><input class="input" name="title" required value="${esc(a?.title || '')}" placeholder="Navidad 2026, Viaje a Oaxaca…"></div>
      <div class="field"><label>Subtítulo o dedicatoria</label><input class="input" name="subtitle" value="${esc(a?.subtitle || '')}" placeholder="Los mejores momentos de…"></div>
      <div class="frow"><div class="field"><label>Año</label><input class="input" type="number" name="year" value="${esc(a?.year || new Date().getFullYear())}"></div>
      <div class="field"><label>Estilo del capítulo</label><select class="input" name="theme">${THEME_OPTS.map(([k, e, n]) => `<option value="${k}" ${a?.theme === k ? 'selected' : ''}>${e} ${n}</option>`).join('')}</select></div></div>`,
    submit: async (d) => {
      const data = { title: d.title.trim(), subtitle: d.subtitle, year: Number(d.year) || new Date().getFullYear(), theme: d.theme };
      if (!data.title) return false;
      if (a) await S.db.update('albums', a.id, data);
      else { const id = await S.db.add('albums', { ...data, cover: '', order: S.data.albums.length + 1 }); hooks.go('album/' + id); }
    },
    danger: a ? { label: '🗑️ Eliminar', confirm: 'Se eliminará el capítulo y sus fotos. ¿Continuar?', action: async () => { for (const p of albumPhotos(a.id)) { await S.db.remove('photos', p.id); if (!S.isDemo) await S.db.remove('photoFiles', p.id); } await S.db.remove('albums', a.id); hooks.go('fotos'); } } : null
  });
}

async function uploadTo(albumId) {
  const files = await pickFiles({ multiple: true }); if (!files.length) return;
  toast(`⏳ Subiendo ${files.length} foto${files.length > 1 ? 's' : ''}…`);
  let n = 0;
  for (const f of files) {
    try {
      const thumb = await compressImage(f, S.isDemo ? 900 : 520, 0.72, S.isDemo ? 160000 : 70000);
      const id = await S.db.add('photos', { albumId, caption: '', thumb, date: isoDate(new Date(f.lastModified || Date.now())), by: S.me.id });
      if (!S.isDemo) { const full = await compressImage(f, 1600, 0.82, 850000); await S.db.set('photoFiles', id, { data: full }); fullCache[id] = full; }
      const a = S.data.albums.find(x => x.id === albumId); if (a && !a.cover) await S.db.update('albums', albumId, { cover: thumb });
      n++;
    } catch (e) { console.error(e); toast('⚠️ No se pudo subir ' + f.name); }
  }
  toast(`📸 ${n} foto${n === 1 ? '' : 's'} agregada${n === 1 ? '' : 's'}`);
}

// ---------- Visor ----------
function lightbox(list, idx) {
  const el = document.createElement('div'); el.className = 'lightbox';
  const show = async () => {
    const p = list[idx];
    el.innerHTML = `<button class="icon-btn lb-close" data-x>✕</button>
      ${list.length > 1 ? '<button class="icon-btn lb-nav lb-prev" data-p>‹</button><button class="icon-btn lb-nav lb-next" data-n>›</button>' : ''}
      <img src="${p.thumb}" alt="">
      <div class="cap">${esc(p.caption || '')}</div>
      <div class="small" style="opacity:.7">${p.date ? fmtDate(p.date, { year: true }) : ''}${member(p.by) ? ' · subida por ' + esc(member(p.by).name) : ''}</div>
      <div class="row wrap mt" style="justify-content:center">
        <button class="btn sm" data-cap>✏️ Pie de foto</button><button class="btn sm" data-cover>⭐ Portada</button>
        <button class="btn sm" data-bg>🖼️ Usar de fondo</button><button class="btn sm" data-dl>⬇️ Descargar</button><button class="btn sm danger" data-del>🗑️</button></div>`;
    const src = await fullImage(p); const img = el.querySelector('img'); if (img && list[idx] === p) img.src = src;
  };
  el.addEventListener('click', async e => {
    const p = list[idx];
    if (e.target === el || e.target.closest('[data-x]')) return el.remove();
    if (e.target.closest('[data-p]')) { idx = (idx - 1 + list.length) % list.length; return show(); }
    if (e.target.closest('[data-n]')) { idx = (idx + 1) % list.length; return show(); }
    if (e.target.closest('[data-cap]')) {
      modal({ title: 'Pie de foto', body: `<div class="field"><input class="input" name="c" value="${esc(p.caption || '')}" placeholder="¿Qué pasó en este momento?"></div>`, submit: async d => { await S.db.update('photos', p.id, { caption: d.c }); p.caption = d.c; show(); } });
    }
    if (e.target.closest('[data-cover]')) { await S.db.update('albums', p.albumId, { cover: p.thumb }); toast('⭐ Portada actualizada'); }
    if (e.target.closest('[data-dl]')) { const a = document.createElement('a'); a.href = await fullImage(p); a.download = (p.caption || 'foto') + '.jpg'; a.click(); }
    if (e.target.closest('[data-bg]')) {
      const cur = document.body.dataset.theme;
      if (await confirmBox(`¿Usar esta foto como fondo del tema <b>${THEMES[cur]?.name}</b> para toda la familia?`, 'Usar de fondo')) {
        await S.db.set('backgrounds', cur, { data: await fullImage(p), updatedAt: Date.now() }); toast('🖼️ Fondo actualizado');
      }
    }
    if (e.target.closest('[data-del]')) {
      if (!(await confirmBox('¿Eliminar esta foto?'))) return;
      await S.db.remove('photos', p.id); if (!S.isDemo) await S.db.remove('photoFiles', p.id);
      list.splice(idx, 1); if (!list.length) return el.remove(); idx = idx % list.length; show();
    }
  });
  const key = e => { if (!el.isConnected) return removeEventListener('keydown', key); if (e.key === 'Escape') el.remove(); if (e.key === 'ArrowLeft') el.querySelector('[data-p]')?.click(); if (e.key === 'ArrowRight') el.querySelector('[data-n]')?.click(); };
  addEventListener('keydown', key);
  document.body.appendChild(el); show();
}

// ---------- Inicio de fotos ----------
export const photosHome = {
  render() {
    const albums = [...S.data.albums].sort((a, b) => (b.year || 0) - (a.year || 0) || (a.order || 0) - (b.order || 0));
    return `
      <div class="page-head"><div><h1>Libro familiar</h1><p>Nuestra historia, capítulo por capítulo 📖</p></div>
        <button class="btn primary" data-act="newAlbum">＋ Nuevo capítulo</button></div>
      ${albums.length ? `<div class="grid auto">${albums.map(a => {
        const n = albumPhotos(a.id).length;
        return `<article class="card album-card" onclick="location.hash='#/album/${a.id}'">
          <div class="album-cover" style="background-image:url('${a.cover || ''}');background-color:${coverColor(a)}"><div class="album-spine"></div>
            <div class="t"><h3>${esc(a.title)}</h3><div class="small bold" style="opacity:.85">${THEMES[a.theme]?.emoji || '📷'} ${a.year || ''} · ${n} foto${n === 1 ? '' : 's'}</div></div></div>
          <div class="row between" style="padding:12px 16px"><span class="small muted ellipsis">${esc(a.subtitle || '')}</span><button class="btn sm" onclick="event.stopPropagation();location.hash='#/libro/${a.id}'">📖 Leer</button></div>
        </article>`;
      }).join('')}</div>` : `<div class="card empty"><div class="big">📖</div><p class="bold">Empieza el libro de tu familia</p><button class="btn primary" data-act="newAlbum">Crear el primer capítulo</button></div>`}`;
  },
  actions: { newAlbum() { albumForm(); } }
};

// ---------- Álbum ----------
export const albumView = {
  theme([id]) { return S.data.albums.find(a => a.id === id)?.theme || null; },
  render([id]) {
    const a = S.data.albums.find(x => x.id === id);
    if (!a) return `<div class="card empty">Capítulo no encontrado. <a class="link" href="#/fotos">Volver</a></div>`;
    const ps = albumPhotos(id);
    return `<a class="link" href="#/fotos">‹ Libro familiar</a>
      <div class="page-head mt"><div><h1>${esc(a.title)}</h1><p>${esc(a.subtitle || '')} ${a.year ? '· ' + a.year : ''}</p></div>
        <div class="row wrap"><button class="btn" data-act="editAlbum">✏️</button><a class="btn" href="#/libro/${id}">📖 Ver como libro</a><button class="btn primary" data-act="upload">📸 Agregar fotos</button></div></div>
      ${ps.length ? `<div class="photos-grid">${ps.map((p, i) => `<div class="polaroid" data-act="view" data-i="${i}"><img src="${p.thumb}" alt="" loading="lazy"><div class="cap">${esc(p.caption || '')}</div></div>`).join('')}</div>`
        : `<div class="card empty"><div class="big">📸</div><p class="bold">Este capítulo aún no tiene fotos</p><button class="btn primary" data-act="upload">Agregar fotos</button></div>`}`;
  },
  actions: {
    upload() { uploadTo(S.route.params[0]); },
    editAlbum() { albumForm(S.data.albums.find(x => x.id === S.route.params[0])); },
    view(el) { lightbox([...albumPhotos(S.route.params[0])], +el.dataset.i); }
  }
};

// ---------- Libro con páginas ----------
let bookPos = 0, bookId = null;
export const bookView = {
  theme([id]) { return S.data.albums.find(a => a.id === id)?.theme || null; },
  render([id]) {
    const a = S.data.albums.find(x => x.id === id);
    if (!a) return `<div class="card empty">Capítulo no encontrado.</div>`;
    if (bookId !== id) { bookId = id; bookPos = 0; }
    const ps = albumPhotos(id);
    const pages = [
      `<div class="face cover" style="--bookc:${coverColor(a)}"><div class="frame"><div style="font-size:44px">${THEMES[a.theme]?.emoji || '📖'}</div><h2>${esc(a.title)}</h2><div class="fam">${esc(S.family?.name || '')}</div>${a.subtitle ? `<p style="font-family:Caveat,cursive;font-size:22px;opacity:.9">${esc(a.subtitle)}</p>` : ''}<p class="tiny" style="opacity:.7;letter-spacing:3px">${a.year || ''}</p></div></div>`,
      ...ps.map((p, i) => `<div class="page-photo"><img data-full="${p.id}" src="${p.thumb}" alt="" style="--rot:${[-2, 1.5, -1, 2][i % 4]}deg"></div><div class="page-cap">${esc(p.caption || '')}</div><div class="page-date">${p.date ? fmtDate(p.date, { year: true }) : ''}</div><span class="tape"></span>`),
      `<div class="page-photo" style="flex-direction:column;text-align:center"><div style="font-size:48px">❤️</div><div class="page-cap" style="font-size:34px">Continuará…</div><div class="page-date">con más recuerdos juntos</div></div>`
    ];
    if (pages.length % 2) pages.push(`<div class="page-photo"><div class="page-cap" style="opacity:.4">~</div></div>`);
    const leaves = pages.length / 2;
    bookPos = Math.min(bookPos, leaves);
    let html = '';
    for (let i = 0; i < leaves; i++) {
      const flipped = i < bookPos;
      const front = pages[2 * i], back = pages[2 * i + 1];
      const wrapFace = (c, side, n) => c.startsWith('<div class="face') ? c.replace('class="face', `class="face ${side}`) : `<div class="face ${side}">${c}<span class="page-num">${n}</span></div>`;
      html += `<div class="leaf ${flipped ? 'flipped' : ''}" data-act="flip" data-i="${i}" style="z-index:${flipped ? i + 1 : leaves - i}">${wrapFace(front, 'front', 2 * i)}${wrapFace(back, 'back', 2 * i + 1)}</div>`;
    }
    const shift = bookPos === 0 ? 'translateX(-25%)' : bookPos === leaves ? 'translateX(25%)' : 'none';
    return `<div class="row between wrap"><a class="link" href="#/album/${id}">‹ ${esc(a.title)}</a><span class="small muted bold">Toca las páginas o usa ← →</span></div>
      <div class="book-wrap"><div class="book" id="book" style="transform:${shift};transition:transform 1s">${bookPos > 0 ? '' : ''}${html}</div></div>
      <div class="book-controls"><button class="btn" data-act="bprev">‹ Anterior</button><span class="bold small">${bookPos} / ${leaves}</span><button class="btn primary" data-act="bnext">Siguiente ›</button></div>`;
  },
  after(root) {
    const book = root.querySelector('#book'); if (!book) return;
    const ps = albumPhotos(S.route.params[0]);
    root.querySelectorAll('img[data-full]').forEach(async img => { const p = ps.find(x => x.id === img.dataset.full); if (p) img.src = await fullImage(p); });
    const key = e => { if (e.key === 'ArrowRight') this.actions.bnext(); if (e.key === 'ArrowLeft') this.actions.bprev(); };
    addEventListener('keydown', key); onCleanup(() => removeEventListener('keydown', key));
    let sx = null;
    book.addEventListener('touchstart', e => sx = e.touches[0].clientX, { passive: true });
    book.addEventListener('touchend', e => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) (dx < 0 ? this.actions.bnext : this.actions.bprev)(); sx = null; });
  },
  actions: {
    flip(el) { const i = +el.dataset.i; bookPos = i < bookPos ? i : i + 1; turn(); },
    bnext() { const n = document.querySelectorAll('#book .leaf').length; if (bookPos < n) { bookPos++; turn(); } },
    bprev() { if (bookPos > 0) { bookPos--; turn(); } }
  }
};
// voltear sin re-renderizar (para que la animación 3D se vea)
let turnT;
function turn() {
  const leaves = [...document.querySelectorAll('#book .leaf')]; const n = leaves.length;
  leaves.forEach((l, i) => { const f = i < bookPos; if (l.classList.contains('flipped') !== f) { l.style.zIndex = 1000; l.classList.toggle('flipped', f); } });
  clearTimeout(turnT); turnT = setTimeout(() => leaves.forEach((l, i) => l.style.zIndex = i < bookPos ? i + 1 : n - i), 1000);
  const book = document.getElementById('book'); book.style.transform = bookPos === 0 ? 'translateX(-25%)' : bookPos === n ? 'translateX(25%)' : 'none';
  const lbl = document.querySelector('.book-controls span'); if (lbl) lbl.textContent = `${bookPos} / ${n}`;
}
