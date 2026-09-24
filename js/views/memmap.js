// 🗺️ Mapa de recuerdos: lugares con fotos, capítulos del libro y viajes
import { S, hooks, members, member, onCleanup } from '../store.js';
import { esc, modal, toast, fmtDate, isoDate } from '../ui.js';
import { loadLeaflet } from './location.js';

const EMOJIS = ['📍', '🏖️', '⛰️', '🏙️', '🏡', '🎢', '⛪', '🌳', '🍽️', '🎉', '✈️', '🏕️', '🎄', '🏟️', '🌅'];
const place = (id) => (S.data.places || []).find(p => p.id === id);
const photosOf = (pl) => S.data.photos.filter(ph => ph.placeId === pl.id || (pl.albumId && ph.albumId === pl.albumId));
let map = null, sel = null;

// Buscar lugares (OpenStreetMap, gratis)
async function geocode(q) {
  const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=6&accept-language=es&q=${encodeURIComponent(q)}`, { headers: { Accept: 'application/json' } });
  return (await r.json()).map(x => ({ name: x.display_name.split(',').slice(0, 3).join(','), lat: +x.lat, lng: +x.lon }));
}
async function reverse(lat, lng) {
  try { const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&zoom=14&accept-language=es&lat=${lat}&lon=${lng}`); const j = await r.json(); return (j.address && (j.address.city || j.address.town || j.address.village || j.address.suburb || j.address.state)) || j.display_name?.split(',').slice(0, 2).join(',') || 'Aquí'; } catch { return 'Aquí'; }
}

// GPS de una foto (EXIF de JPEG), si el teléfono lo conservó
export async function exifGPS(file) {
  try {
    const buf = new DataView(await file.slice(0, 196608).arrayBuffer());
    if (buf.getUint16(0) !== 0xFFD8) return null;
    let o = 2;
    while (o < buf.byteLength - 4) {
      const mk = buf.getUint16(o), len = buf.getUint16(o + 2);
      if (mk === 0xFFE1 && buf.getUint32(o + 4) === 0x45786966) {
        const t = o + 10, le = buf.getUint16(t) === 0x4949; const u16 = (p) => buf.getUint16(p, le), u32 = (p) => buf.getUint32(p, le);
        const ifd = (start) => { const n = u16(start), out = {}; for (let i = 0; i < n; i++) { const e = start + 2 + i * 12; out[u16(e)] = { type: u16(e + 2), count: u32(e + 4), off: e + 8 }; } return out; };
        const ifd0 = ifd(t + u32(t + 4)); if (!ifd0[0x8825]) return null;
        const g = ifd(t + u32(ifd0[0x8825].off));
        const rat3 = (tag) => { if (!g[tag]) return null; const p = t + u32(g[tag].off); const v = [0, 1, 2].map(k => u32(p + k * 8) / (u32(p + k * 8 + 4) || 1)); return v[0] + v[1] / 60 + v[2] / 3600; };
        const ref = (tag) => g[tag] ? String.fromCharCode(buf.getUint8(g[tag].off)) : '';
        let lat = rat3(2), lng = rat3(4); if (lat == null || lng == null) return null;
        if (ref(1) === 'S') lat = -lat; if (ref(3) === 'W') lng = -lng;
        return (lat || lng) ? { lat: Math.round(lat * 1e5) / 1e5, lng: Math.round(lng * 1e5) / 1e5 } : null;
      }
      if ((mk & 0xFF00) !== 0xFF00) break; o += 2 + len;
    }
  } catch { }
  return null;
}

function placeForm(pl = null, preset = {}) {
  const v = pl || preset; let coords = v.lat != null ? { lat: v.lat, lng: v.lng } : null; let chosen = new Set(pl ? S.data.photos.filter(p => p.placeId === pl.id).map(p => p.id) : (v.photoIds || []));
  const albums = S.data.albums, trips = S.data.trips || [];
  modal({
    title: pl ? '✏️ Editar lugar' : '📍 Nuevo lugar en el mapa', wide: true,
    body: `<div class="field"><label>¿Dónde fue?</label><div class="row"><input class="input grow" data-q placeholder="Busca: Playa del Carmen, Casa de la abuela, Chapultepec…" value="${esc(v.name || '')}"><button type="button" class="btn sm" data-search>🔎</button></div>
        <div class="row wrap mt-s" style="gap:6px"><button type="button" class="chip chip-btn" data-here>📍 Estoy aquí</button></div><div class="geo-res" data-res></div><div class="tiny bold mt-s" data-coords>${coords ? '✅ Ubicación lista' : ''}</div></div>
      <div class="frow"><div class="field"><label>Nombre del recuerdo</label><input class="input" name="name" required value="${esc(v.name || '')}" placeholder="Vacaciones en Cancún"></div><div class="field"><label>Fecha</label><input class="input" type="date" name="date" value="${esc(v.date || isoDate())}"></div></div>
      <div class="field"><label>Ícono</label><div class="chips">${EMOJIS.map(e => `<label class="chip chip-btn"><input type="radio" name="emoji" value="${e}" ${(v.emoji || '📍') === e ? 'checked' : ''}> ${e}</label>`).join('')}</div></div>
      <div class="frow"><div class="field"><label>Capítulo del libro</label><select class="input" name="albumId"><option value="">—</option>${albums.map(a => `<option value="${a.id}" ${v.albumId === a.id ? 'selected' : ''}>${esc(a.title)}</option>`).join('')}</select></div><div class="field"><label>Viaje</label><select class="input" name="tripId"><option value="">—</option>${trips.map(t => `<option value="${t.id}" ${v.tripId === t.id ? 'selected' : ''}>${esc(t.emoji || '✈️')} ${esc(t.title)}</option>`).join('')}</select></div></div>
      <div class="field"><label>Nota</label><input class="input" name="note" value="${esc(v.note || '')}" placeholder="Lo que no queremos olvidar de este lugar"></div>
      ${S.data.photos.length ? `<details ${chosen.size ? 'open' : ''}><summary class="bold small">📸 Elegir fotos sueltas de este lugar</summary><div class="ph-pick mt-s">${S.data.photos.slice().reverse().slice(0, 80).map(p => `<button type="button" class="ph-p ${chosen.has(p.id) ? 'on' : ''}" data-ph="${p.id}" style="background-image:url('${p.thumb}')"></button>`).join('')}</div></details>` : ''}`,
    danger: pl ? { label: 'Borrar', confirm: '¿Quitar este lugar del mapa? (las fotos no se borran)', action: async () => { for (const p of S.data.photos.filter(x => x.placeId === pl.id)) await S.db.update('photos', p.id, { placeId: '' }); await S.db.remove('places', pl.id); } } : undefined,
    onOpen(f) {
      const res = f.querySelector('[data-res]'), cst = f.querySelector('[data-coords]'), nm = f.querySelector('[name=name]');
      const setC = (c, label) => { coords = c; cst.textContent = `✅ ${label || 'Ubicación lista'}`; res.innerHTML = ''; if (!nm.value && label) nm.value = label.split(',')[0]; };
      const search = async () => { const q = f.querySelector('[data-q]').value.trim(); if (!q) return; res.innerHTML = '<div class="tiny muted">Buscando…</div>'; try { const r = await geocode(q); res.innerHTML = r.length ? r.map((x, i) => `<button type="button" class="geo-i" data-i="${i}">📍 ${esc(x.name)}</button>`).join('') : '<div class="tiny muted">No encontramos ese lugar, prueba con otro nombre</div>'; res.querySelectorAll('[data-i]').forEach(b => b.onclick = () => setC(r[+b.dataset.i], r[+b.dataset.i].name)); } catch { res.innerHTML = '<div class="tiny muted">Sin conexión para buscar lugares</div>'; } };
      f.querySelector('[data-search]').onclick = search; f.querySelector('[data-q]').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); search(); } });
      f.querySelector('[data-here]').onclick = () => { cst.textContent = '⏳ Buscando tu ubicación…'; navigator.geolocation.getCurrentPosition(async p => { const c = { lat: +p.coords.latitude.toFixed(5), lng: +p.coords.longitude.toFixed(5) }; setC(c, await reverse(c.lat, c.lng)); }, () => { cst.textContent = '⚠️ No pudimos obtener tu ubicación'; }, { enableHighAccuracy: true, timeout: 15000 }); };
      f.querySelectorAll('[data-ph]').forEach(b => b.onclick = () => { chosen.has(b.dataset.ph) ? chosen.delete(b.dataset.ph) : chosen.add(b.dataset.ph); b.classList.toggle('on'); });
      f.querySelector('[name=albumId]').onchange = (e) => { if (!nm.value && e.target.value) nm.value = albums.find(a => a.id === e.target.value)?.title || ''; };
    },
    submit: async d => {
      if (!coords) { toast('Busca el lugar o usa “Estoy aquí”'); return false; }
      if (!d.name.trim()) { toast('Ponle nombre al recuerdo'); return false; }
      const data = { name: d.name.trim(), lat: coords.lat, lng: coords.lng, date: d.date, emoji: d.emoji || '📍', albumId: d.albumId || '', tripId: d.tripId || '', note: d.note || '' };
      let id = pl?.id; if (pl) await S.db.update('places', pl.id, data); else id = await S.db.add('places', { ...data, by: S.me.id });
      for (const p of S.data.photos) { const want = chosen.has(p.id); if (want && p.placeId !== id) await S.db.update('photos', p.id, { placeId: id }); else if (!want && p.placeId === id) await S.db.update('photos', p.id, { placeId: '' }); }
      sel = id; toast('📍 ¡Recuerdo en el mapa!');
    }
  });
}

function popupHTML(pl) {
  const ph = photosOf(pl), t = (S.data.trips || []).find(x => x.id === pl.tripId), a = S.data.albums.find(x => x.id === pl.albumId);
  return `<div class="mm-pop"><div class="bold">${esc(pl.emoji || '📍')} ${esc(pl.name)}</div><div class="tiny muted">${pl.date ? fmtDate(pl.date, { year: true }) : ''}${ph.length ? ` · ${ph.length} foto${ph.length > 1 ? 's' : ''}` : ''}</div>
    ${ph.length ? `<div class="mm-thumbs">${ph.slice(0, 6).map(p => `<img src="${p.thumb}" alt="">`).join('')}</div>` : ''}${pl.note ? `<div class="small mt-s">${esc(pl.note)}</div>` : ''}
    <div class="mm-links">${a ? `<a href="#/album/${a.id}">📖 Ver capítulo</a>` : ''}${t ? `<a href="#/viaje/${t.id}">✈️ Ver viaje</a>` : ''}<a href="#/mapa" data-edit-place="${pl.id}">✏️ Editar</a></div></div>`;
}

export const memMap = {
  render() {
    const pls = [...(S.data.places || [])].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const gpsPh = S.data.photos.filter(p => p.gps && !p.placeId).length;
    const nPh = pls.reduce((a, p) => a + photosOf(p).length, 0);
    const pending = S.data.albums.filter(a => !pls.some(p => p.albumId === a.id)).slice(0, 4);
    return `<div class="page-head"><div><h1>Mapa de recuerdos</h1><p>Donde hemos sido felices 🗺️</p></div><button class="btn primary" data-act="newPlace">＋ Lugar</button></div>
      <div class="chips mb"><span class="chip accent">📍 ${pls.length} lugar${pls.length === 1 ? '' : 'es'}</span><span class="chip">📸 ${nPh} fotos</span>${gpsPh ? `<span class="chip">🛰️ ${gpsPh} con ubicación</span>` : ''}</div>
      <section class="card deco mm-card"><div id="mmap" class="mm-map">${pls.length || gpsPh ? '<div class="skel" style="height:100%"></div>' : `<div class="empty"><div class="big">🗺️</div><p class="bold">Agrega los lugares de sus viajes, paseos y fiestas, con sus fotos.</p><button class="btn primary" data-act="newPlace">＋ Primer lugar</button></div>`}</div></section>
      ${pending.length ? `<section class="card mt"><div class="card-title"><h3>📖 Pon en el mapa estos capítulos</h3></div><div class="chips">${pending.map(a => `<button class="chip chip-btn" data-act="fromAlbum" data-id="${a.id}">📍 ${esc(a.title)}</button>`).join('')}</div></section>` : ''}
      ${pls.length ? `<div class="nav-group" style="margin:18px 4px 8px">Nuestros lugares</div><div class="grid g2">${pls.map(p => { const ph = photosOf(p); return `<button class="mm-item" data-act="focus" data-id="${p.id}"><span class="mm-cover" ${ph[0] ? `style="background-image:url('${ph[0].thumb}')"` : ''}>${ph[0] ? '' : esc(p.emoji || '📍')}</span><span class="grow" style="min-width:0"><b class="ellipsis">${esc(p.emoji || '📍')} ${esc(p.name)}</b><span class="tiny muted">${p.date ? fmtDate(p.date, { year: true }) : ''}${ph.length ? ` · ${ph.length} fotos` : ''}</span></span><span class="muted">›</span></button>`; }).join('')}</div>` : ''}`;
  },
  async after(root) {
    const el = root.querySelector('#mmap'); const pls = S.data.places || []; const gps = S.data.photos.filter(p => p.gps && !p.placeId);
    if (!el || (!pls.length && !gps.length)) return;
    let L; try { L = await loadLeaflet(); } catch { el.innerHTML = '<div class="empty small">No se pudo cargar el mapa (¿sin internet?)</div>'; return; }
    if (!el.isConnected) return;
    el.innerHTML = ''; map = L.map(el, { zoomControl: true, attributionControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap' }).addTo(map);
    const bounds = [], markers = {};
    for (const p of pls) {
      const ph = photosOf(p)[0];
      const icon = L.divIcon({ className: 'mm-pin', html: ph ? `<span class="mm-pin-in" style="background-image:url('${ph.thumb}')"></span><b>${photosOf(p).length}</b>` : `<span class="mm-pin-in e">${p.emoji || '📍'}</span>`, iconSize: [52, 60], iconAnchor: [26, 58], popupAnchor: [0, -52] });
      markers[p.id] = L.marker([p.lat, p.lng], { icon }).addTo(map).bindPopup(popupHTML(p), { maxWidth: 260 }); bounds.push([p.lat, p.lng]);
    }
    for (const p of gps) { L.marker([p.gps.lat, p.gps.lng], { icon: L.divIcon({ className: 'mm-pin sm', html: `<span class="mm-pin-in" style="background-image:url('${p.thumb}')"></span>`, iconSize: [36, 42], iconAnchor: [18, 40] }) }).addTo(map).bindPopup(`<div class="mm-pop"><img src="${p.thumb}" style="width:100%;border-radius:10px"><div class="tiny">${esc(p.caption || '')}</div><a href="#/album/${p.albumId}">📖 Ver</a></div>`); bounds.push([p.gps.lat, p.gps.lng]); }
    if (bounds.length === 1) map.setView(bounds[0], 11); else map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    if (sel && markers[sel]) { const p = place(sel); map.setView([p.lat, p.lng], 12); markers[sel].openPopup(); sel = null; }
    this._markers = markers;
    el.addEventListener('click', e => { const a = e.target.closest('[data-edit-place]'); if (a) { e.preventDefault(); placeForm(place(a.dataset.editPlace)); } });
    onCleanup(() => { try { map && map.remove(); } catch { } map = null; });
  },
  actions: {
    newPlace() { placeForm(); },
    fromAlbum(el) { const a = S.data.albums.find(x => x.id === el.dataset.id); placeForm(null, { name: a.title, albumId: a.id, date: a.date || '' }); },
    focus(el) { const p = place(el.dataset.id); if (map && p) { map.setView([p.lat, p.lng], 13, { animate: true }); memMap._markers?.[p.id]?.openPopup(); document.getElementById('mmap')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }
  }
};
export { placeForm };
