// 💾 Respaldo de la familia: un .zip con todos los datos, las fotos y las recetas; y restauración
import { S } from './store.js';
import { toast, isoDate, esc } from './ui.js';

// Colecciones que se respaldan (las mismas que ve la app)
export const BACKUP_COLS = ['members', 'events', 'exchanges', 'albums', 'photos', 'shopping', 'chores', 'expenses', 'messages', 'notes', 'inventory', 'backgrounds', 'rewards',
  'recipes', 'capsules', 'polls', 'trips', 'challenges', 'pets', 'parties', 'wheels', 'spins', 'menus', 'bills', 'famgoals'];
const PRIVATE_COLS = ['events', 'notes', 'accounts', 'txns', 'categories', 'budgets', 'goals'];

// ---------------- ZIP (sin librerías) ----------------
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (u8) => { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
const enc = new TextEncoder();
export function makeZip(files) {
  const parts = [], central = []; let offset = 0;
  const d = new Date(), dosTime = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), dosDate = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  for (const f of files) {
    const name = enc.encode(f.name), data = typeof f.data === 'string' ? enc.encode(f.data) : f.data, crc = crc32(data);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
    h.setUint16(10, dosTime, true); h.setUint16(12, dosDate, true); h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true);
    h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
    parts.push(new Uint8Array(h.buffer), name, data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
    c.setUint16(12, dosTime, true); c.setUint16(14, dosDate, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true);
    c.setUint16(28, name.length, true); c.setUint32(42, offset, true);
    central.push(new Uint8Array(c.buffer), name);
    offset += 30 + name.length + data.length;
  }
  const csize = central.reduce((a, p) => a + p.length, 0);
  const e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, csize, true); e.setUint32(16, offset, true);
  return new Blob([...parts, ...central, new Uint8Array(e.buffer)], { type: 'application/zip' });
}
// Lee un zip (sin comprimir o "deflate", por si lo volvieron a comprimir en la compu)
export async function readZip(buf) {
  const u8 = new Uint8Array(buf), dv = new DataView(buf); let eo = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 66000); i--) if (dv.getUint32(i, true) === 0x06054b50) { eo = i; break; }
  if (eo < 0) throw new Error('No parece un archivo .zip');
  const n = dv.getUint16(eo + 10, true); let p = dv.getUint32(eo + 16, true); const out = {};
  for (let k = 0; k < n; k++) {
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nl));
    const start = lo + 30 + dv.getUint16(lo + 26, true) + dv.getUint16(lo + 28, true); const raw = u8.subarray(start, start + csize);
    out[name] = { method, raw };
    p += 46 + nl + xl + cl;
  }
  const get = async (name) => {
    const f = out[name]; if (!f) return null;
    if (f.method === 0) return f.raw;
    if (f.method === 8 && 'DecompressionStream' in window) return new Uint8Array(await new Response(new Blob([f.raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
    throw new Error('Formato de compresión no soportado');
  };
  return { names: Object.keys(out), get };
}

const dataUrlBytes = (u) => { const b = atob(u.split(',')[1] || ''); const a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; };
const safe = (s, n = 40) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').slice(0, n) || 'sin-nombre';
const clean = (o) => JSON.parse(JSON.stringify(o));

// ---------------- Crear respaldo ----------------
export async function createBackup({ fullPhotos = true, includePrivate = true, onProgress = () => { } } = {}) {
  const data = { app: 'Nido', version: 2, createdAt: new Date().toISOString(), by: S.me?.name || '', uid: S.user?.uid || '', family: clean({ ...S.family, id: undefined }), cols: {}, sub: {}, private: {} };
  for (const c of BACKUP_COLS) data.cols[c] = (S.data[c] || []).map(clean);
  // Deseos y apartados de cada intercambio
  for (const x of S.data.exchanges || []) {
    for (const sub of ['wishes', 'claims']) { try { const rows = await S.db.list(`exchanges/${x.id}/${sub}`); if (rows.length) data.sub[`exchanges/${x.id}/${sub}`] = rows.map(clean); } catch { } }
  }
  if (includePrivate && S.user) for (const c of PRIVATE_COLS) { try { data.private[c] = (await S.db.list(`private/${S.user.uid}/${c}`)).map(clean); } catch { } }
  const files = [];
  // Fotos: una carpeta por capítulo del libro
  const albums = Object.fromEntries((S.data.albums || []).map(a => [a.id, a]));
  const photos = S.data.photos || []; let i = 0;
  for (const p of photos) {
    i++; onProgress(`📸 Foto ${i} de ${photos.length}`);
    let src = p.thumb;
    if (fullPhotos && !S.isDemo) { try { const f = await S.db.get('photoFiles', p.id); if (f?.data) src = f.data; } catch { } }
    if (src && src.startsWith('data:')) {
      const ext = src.startsWith('data:image/png') ? 'png' : 'jpg';
      files.push({ name: `fotos/${safe(albums[p.albumId]?.title || 'Sin capitulo')}/${String(i).padStart(4, '0')}-${safe(p.caption || p.date || 'foto', 30)}.${ext}`, data: dataUrlBytes(src) });
    }
  }
  // Recetas en texto, para leerlas sin la app
  for (const r of S.data.recipes || []) files.push({ name: `recetas/${safe(r.title, 50)}.txt`, data: `${r.title}\n${r.author ? 'Receta de ' + r.author + '\n' : ''}${r.time ? 'Tiempo: ' + r.time + '\n' : ''}${r.servings ? 'Porciones: ' + r.servings + '\n' : ''}\nINGREDIENTES\n${(r.ingredients || []).map(x => '• ' + x).join('\n')}\n\nPREPARACIÓN\n${(r.steps || []).map((x, k) => `${k + 1}. ${x}`).join('\n')}${r.notes ? '\n\nSECRETOS\n' + r.notes : ''}\n` });
  const counts = Object.entries(data.cols).filter(([, v]) => v.length).map(([k, v]) => `  ${k}: ${v.length}`).join('\n');
  files.unshift({ name: 'LEEME.txt', data: `Respaldo de ${S.family?.name || 'la familia'} · Nido 🪺\nCreado el ${new Date().toLocaleString('es-MX')} por ${S.me?.name || ''}\n\n• datos.json: toda la información (para restaurar en Ajustes → Respaldo)\n• fotos/: las fotos del libro familiar, por capítulo\n• recetas/: el recetario en texto\n\nContenido:\n${counts}\n` });
  files.unshift({ name: 'datos.json', data: JSON.stringify(data) });
  onProgress('📦 Empaquetando…');
  const blob = makeZip(files);
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `nido-respaldo-${safe(S.family?.name || 'familia')}-${isoDate()}.zip`;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  return { size: blob.size, photos: photos.length, files: files.length };
}

// ---------------- Restaurar ----------------
export async function readBackupFile(file) {
  const buf = await file.arrayBuffer();
  let text;
  if (/\.json$/i.test(file.name)) text = new TextDecoder().decode(buf);
  else { const z = await readZip(buf); const d = await z.get('datos.json'); if (!d) throw new Error('El zip no tiene datos.json'); text = new TextDecoder().decode(d); }
  const data = JSON.parse(text);
  if (data.app !== 'Nido' || !data.cols) throw new Error('Este archivo no es un respaldo de Nido');
  return data;
}
export async function restoreBackup(data, { onProgress = () => { } } = {}) {
  let n = 0;
  const put = async (path, row) => { const { id, ...rest } = row; if (!id) return; await S.db.set(path, id, rest); n++; if (n % 20 === 0) onProgress(`♻️ ${n} registros…`); };
  for (const [c, rows] of Object.entries(data.cols || {})) { if (!BACKUP_COLS.includes(c)) continue; if (c === 'expenses' && !['admin', 'adulto'].includes(S.me?.role)) continue; for (const r of rows) await put(c, r); }
  for (const [path, rows] of Object.entries(data.sub || {})) { if (!/^exchanges\/[\w-]+\/(wishes|claims)$/.test(path)) continue; for (const r of rows) await put(path, r); }
  if (data.uid && data.uid === S.user?.uid) for (const [c, rows] of Object.entries(data.private || {})) { if (!PRIVATE_COLS.includes(c)) continue; for (const r of rows) await put(`private/${S.user.uid}/${c}`, r); }
  return n;
}
export const backupSummary = (d) => Object.entries(d.cols || {}).filter(([, v]) => v.length).map(([k, v]) => `${esc(k)}: ${v.length}`).join(' · ');
