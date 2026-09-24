// 🖼️ Imagen de invitación para WhatsApp / Instagram: se arma sola según el evento y el contexto (familia o amigos)
// Fondo con escenario temático (terror, muertos, navidad…) como marca de agua y 2 QR con logo: invitación y ubicación.
import { S } from './store.js';
import { esc, modal, toast, fmtDate, fmtTime, money } from './ui.js';
import { THEMES } from './themes.js';
import { inviteUrl, ensureInvite } from './guest.js';
import { PARTY_TYPES, partyTypeLabel } from './views/parties.js';
import { sceneFor, paintScene, paintWatermark, SCENE_NAMES, SCENE_BG, SCENE_ACCENT } from './scenes.js';

const PARTY_THEME = { posada: 'navidad', navidad: 'navidad', carne: 'verano', cumple: 'cumple', comida: 'otono', patrias: 'patrias', anio_nuevo: 'anio_nuevo', halloween: 'halloween', muertos: 'muertos', infantil: 'cumple', xv: 'madres', boda: 'amor', baby: 'primavera', bautizo: 'invierno', graduacion: 'clasico', despedida: 'anio_nuevo', amigos: 'verano', futbol: 'verano', karaoke: 'anio_nuevo', pijamada: 'invierno', otro: 'clasico' };
const TONES = { familia: ['🏡', 'En familia'], amigos: ['🙌', 'Con amigos'], mixto: ['💛', 'Familia y amigos'] };

// Frases según el tipo de evento y con quién es
function headline(col, x, tone) {
  if (col === 'exchanges') {
    if (x.type === 'halloween') return { familia: 'Amigo secreto… ¡de terror! 🎃', amigos: '¡Amigo secreto de terror con la banda!', mixto: '¡Un intercambio de miedo!' }[tone];
    return { familia: 'Intercambio en familia', amigos: '¡Amigo secreto con la banda!', mixto: '¡Juguemos al amigo secreto!' }[tone];
  }
  const H = {
    posada: ['¡Vamos a pedir posada!', '¡Se arma la posada!', '¡Ven a la posada!'],
    navidad: ['Cena de Navidad en familia', '¡Cena navideña con los amigos!', '¡Celebremos la Navidad juntos!'],
    carne: ['¡Carne asada familiar!', '¡Se arma la carne asada!', '¡Carnita asada, no faltes!'],
    cumple: ['¡Vamos a celebrar!', '¡Cumple con los amigos!', '¡Estás invitado al cumple!'],
    comida: ['¡La familia se reúne!', '¡Comida con la banda!', '¡Ven a comer con nosotros!'],
    patrias: ['¡Noche mexicana en familia!', '¡A dar el grito con los amigos!', '¡Viva México, ven a celebrar!'],
    anio_nuevo: ['¡Recibamos el año en familia!', '¡Fiesta de Año Nuevo!', '¡Recibe el año con nosotros!'],
    halloween: ['¡Una noche de terror en familia!', '¡Fiesta de terror! ¿Te atreves?', '¡Ven si te atreves! 👻'],
    muertos: ['Celebremos a nuestros difuntos', '¡Noche de Día de Muertos!', '¡Ven a celebrar el Día de Muertos!'],
    infantil: ['¡Fiesta para los peques!', '¡Fiesta infantil!', '¡Ven a jugar y celebrar!'],
    xv: ['¡Celebremos sus XV años!', '¡Fiesta de XV!', '¡Acompáñanos a sus XV años!'],
    boda: ['¡Nos casamos!', '¡Acompáñanos en nuestra boda!', '¡Celebra con nosotros este gran día!'],
    baby: ['¡Viene en camino un bebé!', '¡Baby shower!', '¡Celebremos al bebé!'],
    bautizo: ['Un día muy especial en familia', '¡Acompáñanos en este día!', '¡Celebra con nosotros!'],
    graduacion: ['¡Lo logró! Vamos a celebrar', '¡Fiesta de graduación!', '¡Celebremos la graduación!'],
    despedida: ['¡Hay que despedirnos bien!', '¡Despedida con la banda!', '¡Ven a la despedida!'],
    amigos: ['¡Nos juntamos!', '¡Reunión con la banda!', '¡Ven a convivir!'],
    futbol: ['¡Partido en familia!', '¡A ver el partido!', '¡Carne y fut, no faltes!'],
    karaoke: ['¡Noche de karaoke en familia!', '¡Karaoke con la banda! 🎤', '¡Ven a cantar!'],
    pijamada: ['¡Pijamada en familia!', '¡Pijamada!', '¡Trae tu pijama!']
  }[x.type];
  const i = { familia: 0, amigos: 1, mixto: 2 }[tone] ?? 0;
  if (H) return H[i];
  const what = x.type === 'otro' && x.customType ? x.customType : '';
  return what ? [`¡${what} en familia!`, `¡${what} con la banda!`, `¡Ven a ${what.toLowerCase()}!`][i] : ['¡La familia se reúne!', '¡Se arma la fiesta!', '¡Estás invitado!'][i];
}
const defaultTone = (x) => Object.keys(x.guests || {}).length ? 'mixto' : 'familia';

// Números "aleatorios" estables por evento (la imagen no cambia cada vez que la abres)
const rng = (seed) => { let h = 2166136261; for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000; }; };
const EMO = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
// Texto: Nunito y, si no cargó, la letra del sistema (los emojis caen solos a su fuente)
const TXT = 'Nunito, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, ' + EMO;

function wrap(g, text, maxW, maxLines) {
  const words = String(text || '').split(/\s+/); const lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (g.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) { const cut = lines.slice(0, maxLines); cut[maxLines - 1] = cut[maxLines - 1].replace(/\s*\S+$/, '') + '…'; return cut; }
  return lines;
}
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

// ---------- QR con logo al centro (corrección de errores alta para que siga leyéndose) ----------
function drawQR(g, url, x, y, size, logo, ring) {
  const Q = window.qrcode; if (!Q) return false;
  const q = Q(0, 'H'); q.addData(url); q.make(); const n = q.getModuleCount();
  g.save(); g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 24; rr(g, x, y, size, size, 26); g.fillStyle = '#fff'; g.fill(); g.restore();
  const pad = size * .07, cell = (size - pad * 2) / n; g.fillStyle = '#111';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) g.fillRect(x + pad + c * cell, y + pad + r * cell, Math.ceil(cell), Math.ceil(cell));
  // logo: cuadrito blanco con aro de color y emoji (ocupa ~22%: el QR nivel H aguanta hasta 30%)
  const L = size * .24, lx = x + (size - L) / 2, ly = y + (size - L) / 2;
  rr(g, lx - 4, ly - 4, L + 8, L + 8, L * .28); g.fillStyle = '#fff'; g.fill();
  rr(g, lx, ly, L, L, L * .24); g.fillStyle = ring; g.fill();
  g.font = `${L * .62}px ${EMO}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(logo, lx + L / 2, ly + L / 2 + 2);
  return true;
}
const mapsUrl = (x) => { const q = x.address || x.place || x.location; return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : ''; };

export async function drawInvite(canvas, col, x, { format = 'square', tone = 'familia', head, qrInv = true, qrMap = true, scene } = {}) {
  const W = 1080, H = format === 'story' ? 1920 : 1350, story = format === 'story'; canvas.width = W; canvas.height = H;
  const g = canvas.getContext('2d');
  const themeKey = col === 'exchanges' ? (THEMES[x.type] ? x.type : 'clasico') : (PARTY_THEME[x.type] || 'clasico');
  const kind = scene || sceneFor(col, x);
  const t0 = THEMES[themeKey] || THEMES.clasico;
  const t = SCENE_ACCENT[kind] && kind !== sceneFor(col, x) || (SCENE_ACCENT[kind] && ['terror', 'muertos', 'noche'].includes(kind)) ? { ...t0, accent: SCENE_ACCENT[kind], glow: SCENE_ACCENT[kind] } : t0;
  const display = (t.font || "'Pacifico', cursive").replace(/;$/, '');
  try { await Promise.all([document.fonts.load(`900 60px Nunito`), document.fonts.load(`700 90px ${display}`)]); } catch { }
  const R = rng(x.id + format + kind);

  // Fondo: degradado del tema (o el del escenario) + brillos
  const bgc = SCENE_BG[kind] || [t.dark ? '#0b0f24' : t.accent, t.accent, t.accent2];
  const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, bgc[0]); bg.addColorStop(.55, bgc[1]); bg.addColorStop(1, bgc[2]);
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 4; i++) { const cx = R() * W, cy = R() * H, r = 250 + R() * 350; const rg = g.createRadialGradient(cx, cy, 0, cx, cy, r); rg.addColorStop(0, 'rgba(255,255,255,.16)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(0, 0, W, H); }
  // Escenario temático en su propia capa (así los recortes no atraviesan el fondo)
  const layer = document.createElement('canvas'); layer.width = W; layer.height = H;
  paintScene(layer.getContext('2d'), kind, W, H, R, t.accent); g.drawImage(layer, 0, 0);

  // Tarjeta central
  const M = 90, cardY = story ? 250 : 110, cardH = H - cardY - (story ? 250 : 105);
  g.save(); g.shadowColor = 'rgba(0,0,0,.4)'; g.shadowBlur = 60; g.shadowOffsetY = 20;
  rr(g, M, cardY, W - M * 2, cardH, 56); g.fillStyle = 'rgba(12,10,28,.74)'; g.fill(); g.restore();
  rr(g, M, cardY, W - M * 2, cardH, 56); g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 3; g.stroke();
  // Marca de agua dentro de la tarjeta
  const wm = document.createElement('canvas'); wm.width = W; wm.height = H; const wg = wm.getContext('2d');
  rr(wg, M, cardY, W - M * 2, cardH, 56); wg.clip(); paintWatermark(wg, kind, W / 2, cardY + cardH * .5, (W - M * 2) * .55, R); g.drawImage(wm, 0, 0);

  const cx = W / 2; let y = cardY + (story ? 90 : 62);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  // Etiqueta de contexto
  const [tIco, tLab] = TONES[tone] || TONES.familia;
  g.font = `900 30px ${TXT}`; const lab = `${tIco}  ${tLab.toUpperCase()}`; const lw = g.measureText(lab).width + 60;
  rr(g, cx - lw / 2, y - 28, lw, 56, 28); g.fillStyle = t.accent; g.fill(); g.fillStyle = '#fff'; g.fillText(lab, cx, y + 1);
  y += story ? 100 : 74;
  // Frase
  g.font = `800 ${story ? 48 : 40}px ${TXT}`; g.fillStyle = 'rgba(255,255,255,.9)';
  for (const l of wrap(g, head || headline(col, x, tone), W - M * 2 - 100, 2)) { g.fillText(l, cx, y); y += story ? 58 : 48; }
  // Emoji grande
  const bigEmo = x.emoji || (col === 'exchanges' ? '🎁' : (PARTY_TYPES[x.type] || PARTY_TYPES.otro)[0]);
  y += story ? 110 : 56; g.font = `${story ? 170 : 100}px ${EMO}`; g.fillText(bigEmo, cx, y); y += story ? 170 : 96;
  // Título
  let size = story ? 104 : 84; g.font = `700 ${size}px ${display}`; let lines = wrap(g, x.title, W - M * 2 - 90, 3);
  while (lines.length > 2 && size > 60) { size -= 8; g.font = `700 ${size}px ${display}`; lines = wrap(g, x.title, W - M * 2 - 90, 3); }
  g.fillStyle = '#fff'; g.shadowColor = t.glow || t.accent; g.shadowBlur = 24;
  for (const l of lines) { g.fillText(l, cx, y); y += size * 1.08; }
  g.shadowBlur = 0; y += story ? 40 : 4;

  // Datos
  const rows = [];
  const when = fmtDate(x.date, { weekday: true }); rows.push(['🕑', when.charAt(0).toUpperCase() + when.slice(1) + (x.time ? ' · ' + fmtTime(x.time) : '')]);
  if (x.place || x.location) rows.push(['📍', x.place || x.location]);
  if (x.address) rows.push(['🗺️', x.address]);
  if (col === 'exchanges' && x.budget) rows.push(['💰', `Regalo de ${money(x.budget)}`]);
  if (col === 'parties') { const hn = x.people?.[x.host]?.name || S.data.members.find(m => m.id === x.host)?.name; if (hn) rows.push(['🏠', `Te espera ${hn}`]); }
  if (x.notes || x.rules) rows.push(['✨', x.notes || x.rules]);

  const inv = qrInv && x.inviteCode && x.inviteOpen ? inviteUrl(col, x) : '';
  const map = qrMap ? mapsUrl(x) : '';
  const nQR = (inv ? 1 : 0) + (map ? 1 : 0);
  const qs = story ? 250 : 190;
  const bottomReserve = nQR === 2 ? qs + (story ? 150 : 110) : nQR === 1 ? qs + 70 : 110;
  const maxY = cardY + cardH - bottomReserve;
  g.textAlign = 'left';
  for (const [ico, txt] of rows) {
    if (y > maxY - 10) break;
    g.font = `${story ? 48 : 38}px ${EMO}`; g.fillText(ico, M + 62, y + 2);
    g.font = `800 ${story ? 40 : 34}px ${TXT}`; g.fillStyle = '#fff';
    for (const l of wrap(g, txt, W - M * 2 - 190, 2)) { g.fillText(l, M + 118, y); y += story ? 52 : 42; }
    y += story ? 18 : 10;
  }
  g.textAlign = 'center';

  // Códigos QR (invitación 🎟️ y ubicación 📍), cada uno con su logo
  const by = cardY + cardH - bottomReserve + (story ? 40 : 18);
  if (nQR === 2) {
    const gap = story ? 130 : 110, x1 = cx - gap / 2 - qs, x2 = cx + gap / 2;
    drawQR(g, inv, x1, by, qs, '🎟️', t.accent); drawQR(g, map, x2, by, qs, '📍', '#ef4444');
    g.fillStyle = '#fff'; g.font = `900 ${story ? 36 : 29}px ${TXT}`;
    g.fillText(col === 'exchanges' ? 'Únete al sorteo' : 'Confirma aquí', x1 + qs / 2, by + qs + (story ? 42 : 32));
    g.fillText('Cómo llegar', x2 + qs / 2, by + qs + (story ? 42 : 32));
    g.font = `700 ${story ? 26 : 22}px ${TXT}`; g.fillStyle = 'rgba(255,255,255,.72)';
    g.fillText('Escanéalo con tu cámara', x1 + qs / 2, by + qs + (story ? 82 : 62)); g.fillText('Abre Google Maps', x2 + qs / 2, by + qs + (story ? 82 : 62));
  } else if (nQR === 1) {
    const isInv = !!inv, qx = M + 70;
    drawQR(g, inv || map, qx, by, qs, isInv ? '🎟️' : '📍', isInv ? t.accent : '#ef4444');
    g.textAlign = 'left'; g.fillStyle = '#fff'; g.font = `900 ${story ? 44 : 38}px ${TXT}`;
    const tx = qx + qs + 40, tw = W - M - 60 - tx; let yy = by + qs * .3;
    for (const l of wrap(g, isInv ? (col === 'exchanges' ? '¡Únete al sorteo!' : '¡Confirma si vas!') : '¿Cómo llegar?', tw, 2)) { g.fillText(l, tx, yy); yy += story ? 54 : 46; }
    g.font = `700 ${story ? 32 : 28}px ${TXT}`; g.fillStyle = 'rgba(255,255,255,.78)';
    for (const l of wrap(g, isInv ? 'Escanea el código o abre el link que te mandamos 📲' : 'Escanéalo y se abre la ubicación en Google Maps', tw, 3)) { g.fillText(l, tx, yy + 6); yy += story ? 42 : 38; }
    g.textAlign = 'center';
  } else {
    g.font = `800 34px ${TXT}`; g.fillStyle = 'rgba(255,255,255,.85)';
    g.fillText(col === 'exchanges' ? '🎁 ¡Prepara tu lista de deseos!' : '🙋 ¡Confirma en Nido si vas!', cx, by + 40);
  }
  // Pie
  g.font = `800 32px ${TXT}`; g.fillStyle = 'rgba(255,255,255,.92)';
  g.fillText(`🪺 Nido${x.familyName || S.family?.name ? ' · ' + (x.familyName || S.family.name) : ''}`, cx, H - (story ? 150 : 52));
  return canvas;
}

export async function openInviteImage(col, id) {
  // El QR de invitación necesita el link: si no existe, lo creamos aquí mismo
  if (!S.guest) { try { await ensureInvite(col, id); } catch (e) { console.warn(e); } }
  const x0 = (S.data[col] || []).find(d => d.id === id); if (!x0) return;
  if (!window.qrcode) await new Promise(res => { const s = document.createElement('script'); s.src = 'js/vendor/qrcode.js'; s.onload = res; s.onerror = res; document.head.appendChild(s); });
  const auto = sceneFor(col, x0);
  const opts = { format: 'square', tone: defaultTone(x0), head: '', qrInv: true, qrMap: true, scene: auto };
  const cur = () => (S.data[col] || []).find(d => d.id === id) || x0;
  const hasLink = () => !!(cur().inviteCode && cur().inviteOpen);
  const hasPlace = !!mapsUrl(x0);
  modal({
    title: '🖼️ Imagen para compartir', wide: true,
    body: `<div class="ic-wrap"><div class="ic-prev"><canvas id="ic-canvas"></canvas></div>
      <div class="ic-opts">
        <div class="field"><label>Formato</label><div class="seg" id="ic-format"><button type="button" class="on" data-v="square">📱 WhatsApp / post</button><button type="button" data-v="story">📸 Historia</button></div></div>
        <div class="field"><label>¿Con quién es?</label><div class="seg" id="ic-tone">${Object.entries(TONES).map(([k, [e, l]]) => `<button type="button" class="${opts.tone === k ? 'on' : ''}" data-v="${k}">${e} ${l}</button>`).join('')}</div></div>
        <div class="field"><label>Escenario de fondo</label><select class="input" id="ic-scene">${Object.entries(SCENE_NAMES).map(([k, l]) => `<option value="${k}" ${k === auto ? 'selected' : ''}>${l}${k === auto ? ' (sugerido)' : ''}</option>`).join('')}</select></div>
        <div class="field"><label>Frase principal</label><input class="input" id="ic-head" placeholder="${esc(headline(col, x0, opts.tone))}" maxlength="60"></div>
        <label class="row" style="gap:8px;cursor:pointer"><input type="checkbox" id="ic-qr" ${hasLink() ? 'checked' : 'disabled'} style="width:18px;height:18px;accent-color:var(--accent)"> <span class="small bold">🎟️ QR para ${col === 'exchanges' ? 'unirse' : 'confirmar'}</span></label>
        <label class="row mt-s" style="gap:8px;cursor:pointer"><input type="checkbox" id="ic-map" ${hasPlace ? 'checked' : 'disabled'} style="width:18px;height:18px;accent-color:var(--accent)"> <span class="small bold">📍 QR de la ubicación${hasPlace ? '' : ' (agrega lugar o dirección)'}</span></label>
        ${hasLink() ? '' : '<p class="tiny muted mt-s">Las invitaciones están cerradas: actívalas en “🎟️ Invitar” para poner el QR.</p>'}
        <div class="col mt" style="gap:8px">
          <button type="button" class="btn primary block" id="ic-share">📤 Compartir imagen</button>
          <button type="button" class="btn block" id="ic-dl">⬇️ Guardar imagen</button>
          ${hasLink() ? '<button type="button" class="btn ghost block" id="ic-link">📋 Copiar link para el mensaje</button>' : ''}
        </div>
      </div></div>`,
    foot: '<div class="modal-foot"><button type="button" class="btn" data-close>Cerrar</button></div>',
    onOpen(form) {
      const cv = form.querySelector('#ic-canvas');
      let t; const redraw = () => { clearTimeout(t); t = setTimeout(() => drawInvite(cv, col, cur(), opts), 60); };
      const seg = (sel, key) => form.querySelector(sel).addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (!b) return; form.querySelectorAll(sel + ' button').forEach(x => x.classList.toggle('on', x === b)); opts[key] = b.dataset.v; if (key === 'tone') form.querySelector('#ic-head').placeholder = headline(col, cur(), opts.tone); redraw(); });
      seg('#ic-format', 'format'); seg('#ic-tone', 'tone');
      form.querySelector('#ic-scene').addEventListener('change', e => { opts.scene = e.target.value; redraw(); });
      form.querySelector('#ic-head').addEventListener('input', e => { opts.head = e.target.value.trim(); redraw(); });
      form.querySelector('#ic-qr').addEventListener('change', e => { opts.qrInv = e.target.checked; redraw(); });
      form.querySelector('#ic-map').addEventListener('change', e => { opts.qrMap = e.target.checked; redraw(); });
      const name = () => (cur().title || 'invitacion').replace(/[^\w\sáéíóúñ-]/gi, '').trim().replace(/\s+/g, '-') + (opts.format === 'story' ? '-historia' : '') + '.png';
      const blob = () => new Promise(res => cv.toBlob(res, 'image/png'));
      const download = async () => { const b = await blob(); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name(); document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 3000); toast('🖼️ Imagen guardada'); };
      form.querySelector('#ic-dl').onclick = download;
      form.querySelector('#ic-share').onclick = async () => {
        const b = await blob(); const file = new File([b], name(), { type: 'image/png' });
        const x = cur(); const text = hasLink() ? `${x.title}\n${inviteUrl(col, x)}` : x.title;
        if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], text }); } catch { } }
        else { await download(); toast('Tu navegador no deja compartir directo: la guardamos para que la mandes 📲'); }
      };
      form.querySelector('#ic-link')?.addEventListener('click', async () => { try { await navigator.clipboard.writeText(inviteUrl(col, cur())); toast('📋 Link copiado: pégalo junto con la imagen'); } catch { } });
      drawInvite(cv, col, cur(), opts);
    }
  });
}
export { partyTypeLabel };
