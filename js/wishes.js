// 🎁 Lista de deseos inteligente: link con foto y tienda, prioridad y "apartar" en secreto
import { S } from './store.js';
import { esc, modal, toast, money, compressImage, pickFiles } from './ui.js';

const STORES = [
  ['amazon.', 'Amazon', '📦'], ['amzn.', 'Amazon', '📦'], ['mercadolibre.', 'Mercado Libre', '🤝'], ['mercadolivre.', 'Mercado Libre', '🤝'], ['meli.', 'Mercado Libre', '🤝'],
  ['liverpool.', 'Liverpool', '🛍️'], ['elpalaciodehierro.', 'Palacio de Hierro', '🛍️'], ['walmart.', 'Walmart', '🛒'], ['coppel.', 'Coppel', '🛋️'],
  ['sears.', 'Sears', '🛍️'], ['sanborns.', 'Sanborns', '📚'], ['costco.', 'Costco', '🛒'], ['homedepot.', 'Home Depot', '🔨'], ['shein.', 'Shein', '👗'],
  ['temu.', 'Temu', '🛒'], ['aliexpress.', 'AliExpress', '📦'], ['elektra.', 'Elektra', '📺'], ['bestbuy.', 'Best Buy', '🎧'], ['target.', 'Target', '🎯'],
  ['nike.', 'Nike', '👟'], ['adidas.', 'Adidas', '👟'], ['apple.', 'Apple', '🍎'], ['zara.', 'Zara', '👕'], ['hm.com', 'H&M', '👕'], ['ikea.', 'IKEA', '🪑'],
  ['sephora.', 'Sephora', '💄'], ['gandhi.', 'Gandhi', '📚'], ['etsy.', 'Etsy', '🧶'], ['steampowered.', 'Steam', '🎮'], ['nintendo.', 'Nintendo', '🎮'],
  ['playstation.', 'PlayStation', '🎮'], ['xbox.', 'Xbox', '🎮'], ['suburbia.', 'Suburbia', '👕'], ['innovasport.', 'Innovasport', '👟'], ['martimx.', 'Martí', '⚽']
];
export const PRIORITY = { 1: ['❤️', 'Me gustaría'], 2: ['❤️❤️', 'Me encantaría'], 3: ['❤️❤️❤️', '¡Lo sueño!'] };

export function storeFromUrl(url) {
  try {
    const h = new URL(url).hostname.toLowerCase();
    const s = STORES.find(([k]) => h.includes(k));
    return s ? { store: s[1], storeIcon: s[2] } : { store: h.replace(/^www\./, '').split('.')[0].replace(/^./, c => c.toUpperCase()), storeIcon: '🔗' };
  } catch { return { store: '', storeIcon: '🔗' }; }
}
const priceIn = (t = '') => { const m = String(t).match(/\$\s?([\d.,]{2,})/); return m ? Number(m[1].replace(/,/g, '')) || '' : ''; };

// Busca título y foto del producto (servicio público microlink, sin llaves). Si falla, sólo usa la tienda.
export async function fetchLinkInfo(url) {
  const base = storeFromUrl(url);
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 7000);
    const r = await fetch('https://api.microlink.io/?url=' + encodeURIComponent(url), { signal: ctl.signal });
    clearTimeout(t);
    const j = await r.json();
    if (j.status !== 'success') return base;
    const d = j.data || {};
    let title = (d.title || '').replace(/\s*[|:–-]\s*(Amazon|Mercado Libre|Liverpool|Walmart).*$/i, '').replace(/^Amazon\.com(\.mx)?\s*:\s*/i, '').trim();
    if (title.length > 90) title = title.slice(0, 88).replace(/\s+\S*$/, '') + '…';
    return { ...base, title, image: d.image?.url || d.logo?.url || '', price: priceIn(d.description) || priceIn(d.title) };
  } catch { return base; }
}

// Formulario para agregar / editar un deseo
export function wishForm({ member: m, wish = {}, save, remove }) {
  let image = wish.image || '', info = { store: wish.store || '', storeIcon: wish.storeIcon || '' };
  const pr = wish.priority || 2;
  modal({
    title: wish.id ? '✏️ Editar deseo' : `🎁 Deseo de ${esc(m.name)}`,
    body: `<div class="field"><label>🔗 Link del producto (Amazon, Mercado Libre, Liverpool…)</label>
        <div class="row"><input class="input grow" name="link" type="url" inputmode="url" value="${esc(wish.link || '')}" placeholder="Pega aquí el link"><button type="button" class="btn sm" data-fetch>✨ Traer</button></div>
        <div class="tiny muted mt-s" data-status>Pega un link y traemos la foto y el nombre solitos.</div></div>
      <div class="wish-prev" data-prev></div>
      <div class="field"><label>¿Qué te gustaría?</label><input class="input" name="text" required value="${esc(wish.text || '')}" placeholder="Audífonos, un libro, pantuflas…"></div>
      <div class="frow"><div class="field"><label>Precio aprox.</label><input class="input" name="price" type="number" inputmode="decimal" value="${esc(wish.price || '')}" placeholder="$"></div>
        <div class="field"><label>Foto</label><button type="button" class="btn block" data-photo>📷 Subir foto</button></div></div>
      <div class="field"><label>¿Qué tanto lo quieres?</label><div class="seg wrap">${Object.entries(PRIORITY).map(([k, [h, l]]) => `<label style="padding:6px 10px"><input type="radio" name="priority" value="${k}" ${+k === pr ? 'checked' : ''}> ${h} ${l}</label>`).join('')}</div></div>
      <div class="field"><label>Detalles (talla, color, modelo…)</label><input class="input" name="note" value="${esc(wish.note || '')}" placeholder="Talla M, color azul marino"></div>`,
    danger: remove ? { label: 'Borrar', confirm: '¿Borrar este deseo?', action: remove } : undefined,
    onOpen(f) {
      const link = f.querySelector('[name=link]'), st = f.querySelector('[data-status]'), prev = f.querySelector('[data-prev]');
      const paint = () => { prev.innerHTML = image || info.store ? `<div class="wish-img" style="${image ? `background-image:url('${esc(image)}')` : ''}">${image ? '' : info.storeIcon || '🎁'}</div><div class="small bold">${esc(info.store || '')}${image ? ' · <button type="button" class="link tiny" data-noimg>quitar foto</button>' : ''}</div>` : ''; const x = prev.querySelector('[data-noimg]'); if (x) x.onclick = () => { image = ''; paint(); }; };
      paint();
      let last = wish.link || '';
      const go = async () => {
        const u = link.value.trim(); if (!/^https?:\/\//i.test(u) || u === last) return; last = u;
        st.textContent = '⏳ Buscando el producto…'; info = storeFromUrl(u); paint();
        const d = await fetchLinkInfo(u); info = { store: d.store, storeIcon: d.storeIcon };
        if (d.image) image = d.image;
        const t = f.querySelector('[name=text]'); if (d.title && !t.value.trim()) t.value = d.title;
        const p = f.querySelector('[name=price]'); if (d.price && !p.value) p.value = d.price;
        st.textContent = d.title || d.image ? `✅ Listo, lo encontramos en ${d.store}` : `🔗 Guardaremos el link de ${d.store || 'la tienda'} (escribe el nombre abajo)`; paint();
      };
      link.addEventListener('paste', () => setTimeout(go, 50)); link.addEventListener('change', go);
      f.querySelector('[data-fetch]').onclick = () => { last = ''; go(); };
      f.querySelector('[data-photo]').onclick = async () => { const [file] = await pickFiles(); if (!file) return; image = await compressImage(file, 520, .8, 90000); paint(); };
    },
    submit: async d => {
      if (!d.text.trim()) { toast('Escribe qué te gustaría'); return false; }
      const link = (d.link || '').trim();
      await save({ memberId: m.id, text: d.text.trim(), link, price: Number(d.price) || 0, priority: Number(d.priority) || 2, note: (d.note || '').trim(), image, ...(link ? info : { store: '', storeIcon: '' }) });
      toast(wish.id ? '✅ Deseo actualizado' : '🎁 Deseo agregado');
    }
  });
}

// Tarjeta de un deseo. claims: sólo llegan los de listas AJENAS (Firebase no le manda al festejado los suyos)
export function wishCard(w, { canEdit, isOwnerView, claim }) {
  const [hearts] = PRIORITY[w.priority || 2] || PRIORITY[2];
  const mineClaim = claim && claim.by === S.me.id;
  let act = '';
  if (!isOwnerView) {
    if (!claim) act = `<button class="btn sm" data-act="claimWish" data-id="${w.id}">🔒 Apartar</button>`;
    else if (mineClaim) act = `<span class="chip accent">✅ Tú lo apartaste</span><button class="btn sm ${claim.bought ? '' : 'ghost'}" data-act="boughtWish" data-id="${w.id}">${claim.bought ? '🛍️ Ya lo compré' : '🛍️ ¿Ya lo compraste?'}</button><button class="link tiny" data-act="releaseWish" data-id="${w.id}">Soltar</button>`;
    else act = `<span class="chip">🔒 Ya lo apartó alguien 🤫</span>`;
  }
  return `<div class="wish2 ${claim && !mineClaim ? 'taken' : ''} ${mineClaim ? 'mine' : ''}">
    <div class="wish-img" ${w.image ? `style="background-image:url('${esc(w.image)}')"` : ''}>${w.image ? '' : (w.storeIcon || '🎁')}</div>
    <div class="grow" style="min-width:0">
      <div class="row between" style="align-items:flex-start;gap:6px"><div class="bold small wish-t">${esc(w.text)}</div>${canEdit ? `<button class="link tiny" data-act="editWish" data-id="${w.id}" aria-label="Editar">✏️</button>` : ''}</div>
      <div class="tiny muted">${hearts}${w.price ? ` · ${money(w.price)}` : ''}${w.store ? ` · ${esc(w.store)}` : ''}</div>
      ${w.note ? `<div class="tiny mt-s">📝 ${esc(w.note)}</div>` : ''}
      <div class="row wrap mt-s" style="gap:6px">${w.link ? `<a class="btn sm ghost" href="${esc(w.link)}" target="_blank" rel="noopener">Ver ${w.store ? 'en ' + esc(w.store) : 'link'} ↗</a>` : ''}${act}</div>
    </div></div>`;
}
