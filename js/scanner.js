// 🧾 Escáner de tickets: foto → lectura (OCR en el propio teléfono) → gasto, cuenta dividida o gasto personal
import { S } from './store.js';
import { esc, modal, toast, isoDate, compressImage } from './ui.js';
import { sfx } from './reveal.js';

const TESS = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
const STORES = [['WALMART', 'Walmart', 'super'], ['WAL-MART', 'Walmart', 'super'], ['WAL MART', 'Walmart', 'super'], ['BODEGA AURRERA', 'Bodega Aurrera', 'super'], ['AURRERA', 'Bodega Aurrera', 'super'], ['SORIANA', 'Soriana', 'super'], ['CHEDRAUI', 'Chedraui', 'super'], ['COSTCO', 'Costco', 'super'], ["SAM'S", "Sam's Club", 'super'], ['SAMS', "Sam's Club", 'super'], ['LA COMER', 'La Comer', 'super'], ['CITY MARKET', 'City Market', 'super'], ['SUPERAMA', 'Superama', 'super'], ['HEB', 'HEB', 'super'], ['H-E-B', 'HEB', 'super'], ['OXXO', 'Oxxo', 'super'], ['7-ELEVEN', '7-Eleven', 'super'], ['7 ELEVEN', '7-Eleven', 'super'], ['FARMACIA GUADALAJARA', 'Farmacia Guadalajara', 'salud'], ['FARMACIAS DEL AHORRO', 'Farmacias del Ahorro', 'salud'], ['SIMILARES', 'Farmacias Similares', 'salud'], ['BENAVIDES', 'Farmacias Benavides', 'salud'], ['SAN PABLO', 'Farmacia San Pablo', 'salud'], ['PEMEX', 'Gasolina', 'transporte'], ['SHELL', 'Gasolina', 'transporte'], ['BP ', 'Gasolina', 'transporte'], ['MOBIL', 'Gasolina', 'transporte'], ['GASOLIN', 'Gasolina', 'transporte'], ['LIVERPOOL', 'Liverpool', 'casa'], ['HOME DEPOT', 'Home Depot', 'casa'], ['COPPEL', 'Coppel', 'casa'], ['SEARS', 'Sears', 'casa'], ['STARBUCKS', 'Starbucks', 'comida'], ['MCDONALD', "McDonald's", 'comida'], ['BURGER KING', 'Burger King', 'comida'], ['DOMINO', "Domino's", 'comida'], ['LITTLE CAESARS', 'Little Caesars', 'comida'], ['VIPS', 'Vips', 'comida'], ['SANBORNS', 'Sanborns', 'comida'], ['CINEPOLIS', 'Cinépolis', 'ocio'], ['CINEMEX', 'Cinemex', 'ocio']];
const SKIP = /(sub\s*-?total|total|iva|i\.v\.a|ieps|cambio|efectivo|tarjeta|pago|visa|master|amex|debito|d[eé]bito|credito|cr[eé]dito|art[ií]culos|arts|rfc|tel[eé]fono|tel\.|fecha|folio|ticket|caja|cajero|atendi|gracias|vuelva|redondeo|descuento|ahorro|puntos|saldo|autoriz|aprob|referencia|no\.? de|transac|clave|c\.p\.|col\.|calle|av\.|www|\.com|factura|importe|magna|premium|diesel)/i;
const AMT = /\$?\s*(\d{1,3}(?:,\d{3})+(?:\.\d{2})|\d+[.,]\d{2})(?!\d)/g;
const num = (s) => Number(String(s).replace(/,(?=\d{3}\b)/g, '').replace(',', '.'));

let libP = null;
function loadTesseract() {
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  return libP || (libP = new Promise((res, rej) => { const s = document.createElement('script'); s.src = TESS; s.onload = () => res(window.Tesseract); s.onerror = () => { libP = null; rej(new Error('No se pudo cargar el lector (¿hay internet?)')); }; document.head.appendChild(s); }));
}

// Mejora la foto para leerla: tamaño, gris y contraste
function prep(dataUrl) {
  return new Promise(res => {
    const img = new Image(); img.onload = () => {
      const k = Math.min(1, 1700 / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      const x = c.getContext('2d'); x.drawImage(img, 0, 0, c.width, c.height);
      const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
      for (let i = 0; i < p.length; i += 4) { let g = .299 * p[i] + .587 * p[i + 1] + .114 * p[i + 2]; g = Math.max(0, Math.min(255, (g - 128) * 1.5 + 140)); p[i] = p[i + 1] = p[i + 2] = g; }
      x.putImageData(d, 0, 0); res(c.toDataURL('image/jpeg', .9));
    }; img.src = dataUrl;
  });
}

export function parseReceipt(text) {
  const lines = String(text || '').split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const up = text.toUpperCase();
  const st = STORES.find(([k]) => up.includes(k));
  let store = st ? st[1] : (lines.slice(0, 5).find(l => /[a-záéíóúñ]{3,}/i.test(l) && !/\d{4,}/.test(l) && l.length < 40) || '');
  store = store.replace(/[^\wÁÉÍÓÚÑáéíóúñ&'´ .-]/g, '').trim();
  const category = st ? st[2] : 'super';
  // Fecha dd/mm/aa(aa)
  let date = '';
  const dm = text.match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/);
  if (dm) { let [, d, m, y] = dm.map(Number); if (y < 100) y += 2000; if (m > 12 && d <= 12) [d, m] = [m, d]; if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y > 2015 && y <= new Date().getFullYear() + 1) date = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`; }
  // Total: la línea "TOTAL" (no subtotal); si no, la cantidad más grande de la parte de abajo
  let total = 0;
  const totLines = lines.filter(l => /\btotal\b/i.test(l) && !/sub\s*-?total|art[ií]culos|arts|ahorro|descuento/i.test(l));
  for (const l of totLines) { const ms = [...l.matchAll(AMT)].map(m => num(m[1])); if (ms.length) total = Math.max(total, ms[ms.length - 1]); }
  if (!total) { const all = lines.slice(Math.floor(lines.length / 3)).flatMap(l => [...l.matchAll(AMT)].map(m => num(m[1]))).filter(v => v < 200000); total = all.length ? Math.max(...all) : 0; }
  // Artículos: renglones con nombre y precio al final
  const items = [];
  for (const l of lines) {
    if (SKIP.test(l)) continue;
    const ms = [...l.matchAll(AMT)]; if (!ms.length) continue;
    const last = ms[ms.length - 1]; const price = num(last[1]); if (!price || price > 50000) continue;
    let name = l.slice(0, last.index).replace(/\b\d{5,}\b/g, '').replace(/^\s*\d{1,3}\s*(x|pz|pza|kg|lt)?\s+/i, '').replace(/[^\wÁÉÍÓÚÑáéíóúñ%/ .-]/g, ' ').replace(/\s+/g, ' ').trim();
    if (name.replace(/[^a-záéíóúñ]/gi, '').length < 3) continue;
    items.push({ name: name.slice(0, 40), price });
  }
  return { store, category, date: date || isoDate(), total: Math.round(total * 100) / 100, items: items.slice(0, 60) };
}

function pick(capture) {
  return new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; if (capture) i.setAttribute('capture', 'environment'); i.onchange = () => res(i.files[0] || null); i.click(); });
}

export function openScanner() {
  const m = modal({
    title: '🧾 Escanear ticket',
    body: `<div class="scan-start"><div class="scan-ill">🧾📷</div><p class="bold">Toma una foto del ticket completo, derechito y con buena luz.</p><p class="small muted">Lo leemos aquí en tu teléfono y te proponemos el gasto. Tú revisas antes de guardar.</p>
      <div class="row wrap mt" style="gap:10px;justify-content:center"><button type="button" class="btn primary lg" data-cam>📷 Tomar foto</button><button type="button" class="btn lg" data-gal>🖼️ De la galería</button></div></div>`,
    foot: '', wide: true,
    onOpen(f, close) {
      const go = async (cap) => { const file = await pick(cap); if (!file) return; close(); readTicket(file); };
      f.querySelector('[data-cam]').onclick = () => go(true); f.querySelector('[data-gal]').onclick = () => go(false);
    }
  });
}

async function readTicket(file) {
  const dataUrl = await compressImage(file, 2000, .92, 2500000);
  let cancelled = false;
  const m = modal({ title: '🧾 Leyendo tu ticket…', body: `<div class="scan-read"><div class="scan-img" style="background-image:url('${dataUrl}')"><i class="scan-line"></i></div><div class="progress mt"><i data-p style="width:3%"></i></div><p class="small bold muted center mt-s" data-s>Preparando el lector…</p></div>`, foot: '', onClose: () => { cancelled = true; } });
  const setP = (p, s) => { const b = m.el.querySelector('[data-p]'); if (b) b.style.width = Math.round(p * 100) + '%'; const t = m.el.querySelector('[data-s]'); if (t && s) t.textContent = s; };
  try {
    const T = await loadTesseract(); if (cancelled) return;
    setP(.08, 'Descargando el lector en español (sólo la primera vez)…');
    const worker = await T.createWorker('spa', 1, { logger: (l) => { if (l.status === 'recognizing text') setP(.3 + l.progress * .68, `Leyendo… ${Math.round(l.progress * 100)}%`); else if (/loading|initializ/.test(l.status)) setP(.1 + (l.progress || 0) * .2, 'Preparando el lector…'); } });
    const img = await prep(dataUrl);
    const { data } = await worker.recognize(img); await worker.terminate();
    if (cancelled) return;
    m.close(); showResult(parseReceipt(data.text), dataUrl, data.text);
  } catch (e) { console.warn(e); m.close(); toast('⚠️ ' + (e.message || 'No se pudo leer el ticket')); showResult({ store: '', category: 'super', date: isoDate(), total: 0, items: [] }, dataUrl, ''); }
}

function showResult(r, img, raw) {
  try { sfx.check(); } catch { }
  const adult = ['admin', 'adulto'].includes(S.me.role);
  const m = modal({
    title: r.total ? '🧾 ¡Listo! Revisa tu ticket' : '🧾 Revisa los datos', wide: true,
    body: `<div class="scan-res"><div class="scan-thumb" style="background-image:url('${img}')" data-zoom></div><div class="grow" style="min-width:0">
        <div class="field"><label>Tienda / concepto</label><input class="input" name="store" value="${esc(r.store || '')}" placeholder="Súper, gasolina…"></div>
        <div class="frow"><div class="field"><label>Total</label><input class="input" name="total" type="number" step="0.01" inputmode="decimal" value="${r.total || ''}" style="font-size:22px;font-weight:900"></div><div class="field"><label>Fecha</label><input class="input" type="date" name="date" value="${r.date}"></div></div></div></div>
      ${r.total ? '' : '<p class="small bold muted">No alcanzamos a leer el total. Escríbelo y listo.</p>'}
      ${r.items.length ? `<details class="scan-items" ${r.items.length <= 8 ? 'open' : ''}><summary class="bold small">🛒 ${r.items.length} artículo${r.items.length > 1 ? 's' : ''} detectado${r.items.length > 1 ? 's' : ''} · suman $${r.items.reduce((a, i) => a + i.price, 0).toFixed(2)}</summary><div class="col mt-s" style="gap:4px">${r.items.map(i => `<div class="scan-it"><span class="grow">${esc(i.name)}</span><b>$${i.price.toFixed(2)}</b></div>`).join('')}</div></details>` : ''}
      <div class="scan-acts">${adult ? '<button type="button" class="btn primary" data-a="exp">💸 Gasto familiar</button>' : ''}<button type="button" class="btn ${adult ? '' : 'primary'}" data-a="bill">🤝 Dividir la cuenta</button><button type="button" class="btn" data-a="mine">💰 Mi gasto</button>${r.items.length ? '<button type="button" class="btn ghost" data-a="shop">✅ Palomear en la lista del súper</button>' : ''}</div>`,
    foot: '',
    onOpen(f, close) {
      const val = () => ({ title: (f.querySelector('[name=store]').value || 'Compra').trim(), amount: Number(f.querySelector('[name=total]').value) || 0, date: f.querySelector('[name=date]').value || isoDate() });
      f.querySelector('[data-zoom]').onclick = () => { const lb = document.createElement('div'); lb.className = 'lightbox'; lb.innerHTML = `<button class="icon-btn lb-close" data-x>✕</button><img src="${img}" alt="">`; lb.onclick = ev => { if (ev.target === lb || ev.target.closest('[data-x]')) lb.remove(); }; document.body.appendChild(lb); };
      f.querySelectorAll('[data-a]').forEach(b => b.onclick = async () => {
        const v = val(), a = b.dataset.a;
        if (a === 'shop') {
          const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
          const words = new Set(r.items.flatMap(i => norm(i.name).split(/\W+/).filter(w => w.length >= 4)));
          const hits = S.data.shopping.filter(s => !s.done && norm(s.text).split(/\W+/).some(w => w.length >= 4 && [...words].some(x => x.startsWith(w.slice(0, 5)) || w.startsWith(x.slice(0, 5)))));
          for (const s of hits) await S.db.update('shopping', s.id, { done: true, doneAt: Date.now(), doneBy: S.me.id });
          toast(hits.length ? `✅ Palomeamos ${hits.length} cosa${hits.length > 1 ? 's' : ''} de la lista` : 'No encontramos coincidencias en la lista'); b.disabled = true; return;
        }
        if (!v.amount) { toast('Escribe el total'); return; }
        close();
        if (a === 'exp') (await import('./views/money.js')).expenseForm({ title: v.title, amount: v.amount, category: r.category, date: v.date });
        if (a === 'bill') (await import('./views/bills.js')).billForm({ title: v.title, total: v.amount, category: r.category === 'transporte' ? 'auto' : r.category === 'salud' ? 'salud' : r.category === 'comida' ? 'comida' : 'super', date: v.date });
        if (a === 'mine') (await import('./views/myfinance.js')).txForm('gasto', { kind: 'gasto', amount: v.amount, note: v.title, date: v.date });
      });
    }
  });
}
