// 🖼️ Imagen de invitación para WhatsApp / Instagram: se arma sola según el evento y el contexto (familia o amigos)
import { S } from './store.js';
import { esc, modal, toast, fmtDate, fmtTime, money } from './ui.js';
import { THEMES } from './themes.js';
import { inviteUrl, kindOf } from './guest.js';
import { PARTY_TYPES } from './views/parties.js';

const PARTY_THEME = { posada: 'navidad', navidad: 'navidad', carne: 'verano', cumple: 'cumple', comida: 'otono', patrias: 'patrias', otro: 'clasico' };
const DECO = {
  posada: ['🪅', '⭐', '🕯️', '🍬', '✨'], navidad: ['🎄', '🎁', '⭐', '❄️', '🔔'], carne: ['🔥', '🌮', '🥩', '🌽', '🥤'],
  cumple: ['🎂', '🎈', '🎉', '🎁', '🥳'], comida: ['🍲', '🥘', '🥗', '🍞', '🍮'], patrias: ['🇲🇽', '🌶️', '🎺', '🌮', '💚'],
  otro: ['🎉', '✨', '🎈', '🎊', '💫'], halloween: ['🎃', '👻', '🦇', '🍬', '🕸️'], muertos: ['💀', '🌼', '🕯️', '🍞', '💐'],
  amor: ['💘', '💌', '🌹', '💕', '✨'], anio_nuevo: ['🎆', '🥂', '✨', '🎉', '🕛'], madres: ['💐', '🌷', '💖', '🎀', '✨']
};
const TONES = { familia: ['🏡', 'En familia'], amigos: ['🙌', 'Con amigos'], mixto: ['💛', 'Familia y amigos'] };

// Frases según el tipo de evento y con quién es
function headline(col, x, tone) {
  if (col === 'exchanges') return { familia: 'Intercambio en familia', amigos: '¡Amigo secreto con la banda!', mixto: '¡Juguemos al amigo secreto!' }[tone];
  const t = x.type;
  const H = {
    posada: { familia: '¡Vamos a pedir posada!', amigos: '¡Se arma la posada!', mixto: '¡Ven a la posada!' },
    navidad: { familia: 'Cena de Navidad en familia', amigos: '¡Cena navideña con los amigos!', mixto: '¡Celebremos la Navidad juntos!' },
    carne: { familia: '¡Carne asada familiar!', amigos: '¡Se arma la carne asada!', mixto: '¡Carnita asada, no faltes!' },
    cumple: { familia: '¡Vamos a celebrar!', amigos: '¡Cumple con los amigos!', mixto: '¡Estás invitado al cumple!' },
    comida: { familia: '¡La familia se reúne!', amigos: '¡Comida con la banda!', mixto: '¡Ven a comer con nosotros!' },
    patrias: { familia: '¡Noche mexicana en familia!', amigos: '¡A dar el grito con los amigos!', mixto: '¡Viva México, ven a celebrar!' }
  };
  return (H[t] || { familia: '¡La familia se reúne!', amigos: '¡Se arma la fiesta!', mixto: '¡Estás invitado!' })[tone];
}
const defaultTone = (x) => { const g = Object.keys(x.guests || {}).length; return g ? 'mixto' : 'familia'; };

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
function qrMatrix(txt) {
  const Q = window.qrcode; if (!Q) return null;
  const q = Q(0, 'M'); q.addData(txt); q.make(); const n = q.getModuleCount();
  return { n, dark: (r, c) => q.isDark(r, c) };
}

export async function drawInvite(canvas, col, x, { format = 'square', tone = 'familia', head, qr = true } = {}) {
  const W = 1080, H = format === 'story' ? 1920 : 1350; canvas.width = W; canvas.height = H;
  const g = canvas.getContext('2d');
  const themeKey = col === 'exchanges' ? (THEMES[x.type] ? x.type : 'clasico') : (PARTY_THEME[x.type] || 'clasico');
  const t = THEMES[themeKey] || THEMES.clasico;
  const display = (t.font || "'Pacifico', cursive").replace(/;$/, '');
  try { await Promise.all([document.fonts.load(`900 60px Nunito`), document.fonts.load(`700 90px ${display}`)]); } catch { }
  const R = rng(x.id + format);

  // Fondo: degradado del tema + brillos
  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, t.dark ? '#0b0f24' : t.accent); bg.addColorStop(.55, t.accent); bg.addColorStop(1, t.accent2);
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 5; i++) { const cx = R() * W, cy = R() * H, r = 250 + R() * 350; const rg = g.createRadialGradient(cx, cy, 0, cx, cy, r); rg.addColorStop(0, 'rgba(255,255,255,.22)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(0, 0, W, H); }
  // Confeti de emojis en las orillas
  const deco = DECO[col === 'exchanges' ? x.type : x.type] || (col === 'exchanges' ? ['🎁', '🤫', '✨', '🎀', '💫'] : DECO.otro);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let i = 0; i < 26; i++) {
    const edge = R(); let px, py; const top = format === 'story' ? 220 : 90;
    if (edge < .5) { px = R() * W; py = R() < .5 ? 20 + R() * (top - 20) : H - 20 - R() * (top - 10); } else { px = R() < .5 ? 10 + R() * 70 : W - 10 - R() * 70; py = R() * H; }
    const s = 40 + R() * 46; g.save(); g.globalAlpha = .55 + R() * .45; g.translate(px, py); g.rotate((R() - .5) * .9); g.font = `${s}px ${EMO}`; g.fillText(deco[i % deco.length], 0, 0); g.restore();
  }

  // Tarjeta central
  const M = 90, cardY = format === 'story' ? 250 : 110, cardH = H - cardY - (format === 'story' ? 250 : 105);
  g.save(); g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 60; g.shadowOffsetY = 20;
  rr(g, M, cardY, W - M * 2, cardH, 56); g.fillStyle = 'rgba(12,10,28,.84)'; g.fill(); g.restore();
  rr(g, M, cardY, W - M * 2, cardH, 56); g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 3; g.stroke();

  const cx = W / 2, story = format === 'story'; let y = cardY + (story ? 90 : 62);
  // Etiqueta de contexto
  const [tIco, tLab] = TONES[tone] || TONES.familia;
  g.font = `900 30px ${TXT}`; const lab = `${tIco}  ${tLab.toUpperCase()}`; const lw = g.measureText(lab).width + 60;
  rr(g, cx - lw / 2, y - 28, lw, 56, 28); g.fillStyle = t.accent; g.fill(); g.fillStyle = '#fff'; g.fillText(lab, cx, y + 1);
  y += story ? 100 : 74;
  // Frase
  g.font = `800 ${story ? 48 : 40}px ${TXT}`; g.fillStyle = 'rgba(255,255,255,.88)';
  for (const l of wrap(g, head || headline(col, x, tone), W - M * 2 - 100, 2)) { g.fillText(l, cx, y); y += story ? 58 : 48; }
  // Emoji grande
  const bigEmo = x.emoji || (col === 'exchanges' ? '🎁' : (PARTY_TYPES[x.type] || PARTY_TYPES.otro)[0]);
  y += story ? 110 : 58; g.font = `${story ? 170 : 104}px ${EMO}`; g.fillText(bigEmo, cx, y); y += story ? 170 : 100;
  // Título
  let size = story ? 104 : 86; g.font = `700 ${size}px ${display}`; let lines = wrap(g, x.title, W - M * 2 - 90, 3);
  while (lines.length > 2 && size > 64) { size -= 8; g.font = `700 ${size}px ${display}`; lines = wrap(g, x.title, W - M * 2 - 90, 3); }
  g.fillStyle = '#fff'; g.shadowColor = t.glow || t.accent; g.shadowBlur = 24;
  for (const l of lines) { g.fillText(l, cx, y); y += size * 1.08; }
  g.shadowBlur = 0; y += story ? 50 : 8;

  // Datos
  const rows = [];
  const when = fmtDate(x.date, { weekday: true }); rows.push(['🕑', when.charAt(0).toUpperCase() + when.slice(1) + (x.time ? ' · ' + fmtTime(x.time) : '')]);
  if (x.place || x.location) rows.push(['📍', x.place || x.location]);
  if (x.address) rows.push(['🗺️', x.address]);
  if (col === 'exchanges' && x.budget) rows.push(['💰', `Regalo de ${money(x.budget)}`]);
  if (col === 'parties' && x.host && x.people?.[x.host]?.name) rows.push(['🏠', `Te espera ${x.people[x.host].name}`]);
  else if (col === 'parties' && x.host) { const h = S.data.members.find(m => m.id === x.host); if (h) rows.push(['🏠', `Te espera ${h.name}`]); }
  if (x.notes || x.rules) rows.push(['✨', x.notes || x.rules]);
  const bottomReserve = qr && x.inviteCode && x.inviteOpen ? 300 : 110;
  const maxY = cardY + cardH - bottomReserve;
  g.textAlign = 'left';
  for (const [ico, txt] of rows) {
    if (y > maxY - 10) break;
    g.font = `${story ? 48 : 40}px ${EMO}`; g.fillText(ico, M + 62, y + 2);
    g.font = `800 ${story ? 40 : 35}px ${TXT}`; g.fillStyle = '#fff';
    const ls = wrap(g, txt, W - M * 2 - 190, 2);
    for (const l of ls) { g.fillText(l, M + 118, y); y += story ? 52 : 44; }
    y += story ? 18 : 12;
  }
  g.textAlign = 'center';

  // QR para confirmar / unirse
  const by = cardY + cardH - bottomReserve + 20;
  if (qr && x.inviteCode && x.inviteOpen) {
    const url = inviteUrl(col, x), m = qrMatrix(url);
    if (m) {
      const box = 230, qx = M + 70, qy = by; rr(g, qx, qy, box, box, 24); g.fillStyle = '#fff'; g.fill();
      const cell = (box - 30) / m.n; g.fillStyle = '#111';
      for (let r = 0; r < m.n; r++) for (let c = 0; c < m.n; c++) if (m.dark(r, c)) g.fillRect(qx + 15 + c * cell, qy + 15 + r * cell, Math.ceil(cell), Math.ceil(cell));
      g.textAlign = 'left'; g.fillStyle = '#fff'; g.font = `900 40px ${TXT}`;
      const tx = qx + box + 40, tw = W - M - 60 - tx;
      let yy = qy + 60;
      for (const l of wrap(g, col === 'exchanges' ? '¡Únete al sorteo!' : '¡Confirma si vas!', tw, 2)) { g.fillText(l, tx, yy); yy += 48; }
      g.font = `700 30px ${TXT}`; g.fillStyle = 'rgba(255,255,255,.8)';
      for (const l of wrap(g, 'Escanea el código o abre el link que te mandamos 📲', tw, 3)) { g.fillText(l, tx, yy + 8); yy += 40; }
      g.textAlign = 'center';
    }
  } else {
    g.font = `800 34px ${TXT}`; g.fillStyle = 'rgba(255,255,255,.85)';
    g.fillText(col === 'exchanges' ? '🎁 ¡Prepara tu lista de deseos!' : '🙋 ¡Confirma en Nido si vas!', cx, by + 40);
  }
  // Pie
  g.font = `800 32px ${TXT}`; g.fillStyle = 'rgba(255,255,255,.92)';
  g.fillText(`🪺 Nido${x.familyName || S.family?.name ? ' · ' + (x.familyName || S.family.name) : ''}`, cx, H - (format === 'story' ? 150 : 52));
  return canvas;
}

export async function openInviteImage(col, id) {
  const x0 = (S.data[col] || []).find(d => d.id === id); if (!x0) return;
  if (!window.qrcode) await new Promise(res => { const s = document.createElement('script'); s.src = 'js/vendor/qrcode.js'; s.onload = res; s.onerror = res; document.head.appendChild(s); });
  let opts = { format: 'square', tone: defaultTone(x0), head: '', qr: true };
  const hasLink = () => { const x = (S.data[col] || []).find(d => d.id === id) || x0; return !!(x.inviteCode && x.inviteOpen); };
  modal({
    title: '🖼️ Imagen para compartir', wide: true,
    body: `<div class="ic-wrap"><div class="ic-prev"><canvas id="ic-canvas"></canvas></div>
      <div class="ic-opts">
        <div class="field"><label>Formato</label><div class="seg" id="ic-format"><button type="button" class="on" data-v="square">📱 WhatsApp / post</button><button type="button" data-v="story">📸 Historia</button></div></div>
        <div class="field"><label>¿Con quién es?</label><div class="seg" id="ic-tone">${Object.entries(TONES).map(([k, [e, l]]) => `<button type="button" class="${opts.tone === k ? 'on' : ''}" data-v="${k}">${e} ${l}</button>`).join('')}</div></div>
        <div class="field"><label>Frase principal</label><input class="input" id="ic-head" placeholder="${esc(headline(col, x0, opts.tone))}" maxlength="60"></div>
        <label class="row" style="gap:8px;cursor:pointer"><input type="checkbox" id="ic-qr" checked style="width:18px;height:18px;accent-color:var(--accent)"> <span class="small bold">Incluir código QR para confirmar</span></label>
        ${hasLink() ? '' : '<p class="tiny muted mt-s">💡 Para que el QR aparezca, primero crea el link en “🎟️ Invitar”.</p>'}
        <div class="col mt" style="gap:8px">
          <button type="button" class="btn primary block" id="ic-share">📤 Compartir imagen</button>
          <button type="button" class="btn block" id="ic-dl">⬇️ Guardar imagen</button>
          ${hasLink() ? '<button type="button" class="btn ghost block" id="ic-link">📋 Copiar link para el mensaje</button>' : ''}
        </div>
      </div></div>`,
    foot: '<div class="modal-foot"><button type="button" class="btn" data-close>Cerrar</button></div>',
    onOpen(form) {
      const cv = form.querySelector('#ic-canvas');
      const cur = () => (S.data[col] || []).find(d => d.id === id) || x0;
      let t; const redraw = () => { clearTimeout(t); t = setTimeout(() => drawInvite(cv, col, cur(), opts), 60); };
      const seg = (sel, key) => form.querySelector(sel).addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (!b) return; form.querySelectorAll(sel + ' button').forEach(x => x.classList.toggle('on', x === b)); opts[key] = b.dataset.v; if (key === 'tone') form.querySelector('#ic-head').placeholder = headline(col, cur(), opts.tone); redraw(); });
      seg('#ic-format', 'format'); seg('#ic-tone', 'tone');
      form.querySelector('#ic-head').addEventListener('input', e => { opts.head = e.target.value.trim(); redraw(); });
      form.querySelector('#ic-qr').addEventListener('change', e => { opts.qr = e.target.checked; redraw(); });
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
