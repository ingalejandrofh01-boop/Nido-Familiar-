// 🎨 Escenarios de fondo para las invitaciones (dibujados con vectores, como marca de agua)
// terror, muertos, navidad, fuegos, globos, verano, fuego, patrias, amor, flores, hojas, estrellas, deporte, musica, noche

// ---------- Figuras ----------
function heart(g, x, y, s) { g.beginPath(); g.moveTo(x, y + s * .3); g.bezierCurveTo(x, y, x - s * .5, y, x - s * .5, y + s * .3); g.bezierCurveTo(x - s * .5, y + s * .6, x, y + s * .8, x, y + s); g.bezierCurveTo(x, y + s * .8, x + s * .5, y + s * .6, x + s * .5, y + s * .3); g.bezierCurveTo(x + s * .5, y, x, y, x, y + s * .3); g.fill(); }
function star(g, x, y, r, pts = 5, inner = .45) { g.beginPath(); for (let i = 0; i < pts * 2; i++) { const a = i * Math.PI / pts - Math.PI / 2, rr = i % 2 ? r * inner : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); }
function sparkle(g, x, y, r) { star(g, x, y, r, 4, .22); }
function snowflake(g, x, y, r) {
  g.save(); g.translate(x, y); g.lineWidth = Math.max(2, r / 9); g.lineCap = 'round';
  for (let i = 0; i < 6; i++) { g.rotate(Math.PI / 3); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -r); g.moveTo(0, -r * .55); g.lineTo(-r * .25, -r * .78); g.moveTo(0, -r * .55); g.lineTo(r * .25, -r * .78); g.moveTo(0, -r * .3); g.lineTo(-r * .18, -r * .45); g.moveTo(0, -r * .3); g.lineTo(r * .18, -r * .45); g.stroke(); }
  g.restore();
}
function pine(g, x, base, h) { const w = h * .62; for (let i = 0; i < 3; i++) { const top = base - h + i * h * .25, bw = w * (.55 + i * .22); g.beginPath(); g.moveTo(x, top); g.lineTo(x - bw / 2, top + h * .42); g.lineTo(x + bw / 2, top + h * .42); g.closePath(); g.fill(); } g.fillRect(x - h * .05, base - h * .1, h * .1, h * .12); }
function bat(g, x, y, s, flip = 1) {
  g.save(); g.translate(x, y); g.scale(s / 100 * flip, s / 100); g.beginPath();
  g.moveTo(0, -8); g.bezierCurveTo(6, -18, 10, -10, 10, -4); g.bezierCurveTo(22, -24, 40, -20, 52, -10); g.bezierCurveTo(44, -6, 42, 2, 44, 8); g.bezierCurveTo(36, 2, 30, 4, 28, 12); g.bezierCurveTo(22, 4, 14, 6, 10, 12);
  g.bezierCurveTo(6, 8, 2, 8, 0, 14); g.bezierCurveTo(-2, 8, -6, 8, -10, 12); g.bezierCurveTo(-14, 6, -22, 4, -28, 12); g.bezierCurveTo(-30, 4, -36, 2, -44, 8); g.bezierCurveTo(-42, 2, -44, -6, -52, -10); g.bezierCurveTo(-40, -20, -22, -24, -10, -4); g.bezierCurveTo(-10, -10, -6, -18, 0, -8);
  g.fill(); g.restore();
}
function web(g, cx, cy, r, a0, a1) {
  const spokes = 7; g.lineWidth = 2; g.beginPath();
  for (let i = 0; i <= spokes; i++) { const a = a0 + (a1 - a0) * i / spokes; g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
  for (let k = 1; k <= 6; k++) { const rr = r * k / 6; for (let i = 0; i <= spokes; i++) { const a = a0 + (a1 - a0) * i / spokes, px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr; if (i === 0) g.moveTo(px, py); else { const am = a0 + (a1 - a0) * (i - .5) / spokes; g.quadraticCurveTo(cx + Math.cos(am) * rr * .86, cy + Math.sin(am) * rr * .86, px, py); } } }
  g.stroke();
}
function deadTree(g, x, base, h, R) {
  g.lineCap = 'round';
  const branch = (x0, y0, len, ang, w, d) => { if (d > 5 || len < 8) return; const x1 = x0 + Math.cos(ang) * len, y1 = y0 + Math.sin(ang) * len; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); const n = 2 + (R() < .4 ? 1 : 0); for (let i = 0; i < n; i++) branch(x1, y1, len * (.6 + R() * .2), ang + (R() - .5) * 1.3, w * .65, d + 1); };
  branch(x, base, h * .38, -Math.PI / 2 + (R() - .5) * .2, h * .06, 0);
}
function tomb(g, x, base, w, h) { g.beginPath(); g.moveTo(x - w / 2, base); g.lineTo(x - w / 2, base - h + w / 2); g.arc(x, base - h + w / 2, w / 2, Math.PI, 0); g.lineTo(x + w / 2, base); g.closePath(); g.fill(); }
function moon(g, x, y, r, col) { const rg = g.createRadialGradient(x, y, r * .6, x, y, r * 2.4); rg.addColorStop(0, col); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.save(); g.fillStyle = rg; g.globalAlpha *= .5; g.beginPath(); g.arc(x, y, r * 2.4, 0, 7); g.fill(); g.restore(); g.save(); g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.globalAlpha *= .25; g.fillStyle = '#000'; [[-.3, -.2, .18], [.25, .15, .12], [-.05, .35, .1]].forEach(([a, b, c]) => { g.beginPath(); g.arc(x + a * r, y + b * r, c * r, 0, 7); g.fill(); }); g.restore(); }
function crescent(g, x, y, r, bgCol) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.save(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(x + r * .45, y - r * .2, r * .85, 0, 7); g.fill(); g.restore(); }
function skull(g, x, y, s) {
  g.beginPath(); g.arc(x, y, s * .5, Math.PI * .85, Math.PI * .15); g.lineTo(x + s * .3, y + s * .55); g.lineTo(x - s * .3, y + s * .55); g.closePath(); g.fill();
  g.save(); g.globalCompositeOperation = 'destination-out';
  [[-.19, .02], [.19, .02]].forEach(([a, b]) => { g.beginPath(); g.ellipse(x + a * s, y + b * s, s * .13, s * .15, 0, 0, 7); g.fill(); });
  g.beginPath(); g.moveTo(x, y + s * .16); g.lineTo(x - s * .06, y + s * .3); g.lineTo(x + s * .06, y + s * .3); g.closePath(); g.fill();
  for (let i = -2; i <= 2; i++) g.fillRect(x + i * s * .1 - s * .02, y + s * .42, s * .04, s * .13);
  g.restore();
  // adornos de calavera de azúcar
  g.save(); g.globalAlpha *= .8; for (let i = 0; i < 5; i++) { const a = Math.PI + (i + .5) * Math.PI / 5; g.beginPath(); g.arc(x + Math.cos(a) * s * .36, y - s * .1 + Math.sin(a) * s * .2, s * .035, 0, 7); g.fill(); } g.restore();
}
function marigold(g, x, y, r) { for (let k = 3; k >= 1; k--) { const rr = r * k / 3; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + k; g.beginPath(); g.ellipse(x + Math.cos(a) * rr * .55, y + Math.sin(a) * rr * .55, rr * .38, rr * .22, a, 0, 7); g.fill(); } } }
function papelPicado(g, W, y, n, colors, h = 120) {
  const w = W / n; g.save(); g.lineWidth = 3; g.strokeStyle = g.fillStyle; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
  for (let i = 0; i < n; i++) {
    const x = i * w + w * .08, ww = w * .84; g.fillStyle = colors[i % colors.length];
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + ww, y); g.lineTo(x + ww, y + h * .85);
    for (let k = 6; k >= 0; k--) g.lineTo(x + ww * k / 6, y + h * (k % 2 ? .85 : 1)); g.closePath(); g.fill();
    g.save(); g.globalCompositeOperation = 'destination-out';
    g.beginPath(); g.arc(x + ww / 2, y + h * .42, h * .16, 0, 7); g.fill();
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; g.beginPath(); g.ellipse(x + ww / 2 + Math.cos(a) * h * .28, y + h * .42 + Math.sin(a) * h * .22, h * .07, h * .035, a, 0, 7); g.fill(); }
    g.fillRect(x + ww * .15, y + h * .72, ww * .7, h * .04);
    g.restore();
  }
  g.restore();
}
function balloon(g, x, y, r, col) { g.save(); g.fillStyle = col; g.beginPath(); g.ellipse(x, y, r * .82, r, 0, 0, 7); g.fill(); g.beginPath(); g.moveTo(x, y + r); g.lineTo(x - r * .12, y + r * 1.14); g.lineTo(x + r * .12, y + r * 1.14); g.fill(); g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y + r * 1.14); g.bezierCurveTo(x - r * .4, y + r * 1.6, x + r * .4, y + r * 1.9, x, y + r * 2.5); g.stroke(); g.globalAlpha *= .35; g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x - r * .3, y - r * .35, r * .16, r * .28, -.5, 0, 7); g.fill(); g.restore(); }
function burst(g, x, y, r, col) { g.save(); g.strokeStyle = col; g.fillStyle = col; g.lineCap = 'round'; for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; g.lineWidth = 3; g.beginPath(); g.moveTo(x + Math.cos(a) * r * .25, y + Math.sin(a) * r * .25); g.lineTo(x + Math.cos(a) * r * .85, y + Math.sin(a) * r * .85); g.stroke(); g.beginPath(); g.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, 4, 0, 7); g.fill(); } g.restore(); }
function flame(g, x, base, h) { g.beginPath(); g.moveTo(x, base); g.bezierCurveTo(x - h * .45, base - h * .15, x - h * .25, base - h * .6, x, base - h); g.bezierCurveTo(x + h * .08, base - h * .7, x + h * .2, base - h * .55, x + h * .22, base - h * .45); g.bezierCurveTo(x + h * .45, base - h * .3, x + h * .35, base - h * .05, x, base); g.fill(); }
function sun(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.lineWidth = r * .12; g.lineCap = 'round'; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.beginPath(); g.moveTo(x + Math.cos(a) * r * 1.3, y + Math.sin(a) * r * 1.3); g.lineTo(x + Math.cos(a) * r * 1.75, y + Math.sin(a) * r * 1.75); g.stroke(); } }
function flower(g, x, y, r) { for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; g.beginPath(); g.ellipse(x + Math.cos(a) * r * .55, y + Math.sin(a) * r * .55, r * .5, r * .3, a, 0, 7); g.fill(); } g.save(); g.globalAlpha *= .6; g.beginPath(); g.arc(x, y, r * .28, 0, 7); g.fill(); g.restore(); }
function leaf(g, x, y, s, a) { g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); g.moveTo(0, -s); g.bezierCurveTo(s * .7, -s * .5, s * .6, s * .5, 0, s); g.bezierCurveTo(-s * .6, s * .5, -s * .7, -s * .5, 0, -s); g.fill(); g.restore(); }
function note(g, x, y, s) { g.beginPath(); g.ellipse(x, y, s * .32, s * .24, -.4, 0, 7); g.fill(); g.fillRect(x + s * .24, y - s * 1.1, s * .08, s * 1.1); g.beginPath(); g.moveTo(x + s * .32, y - s * 1.1); g.quadraticCurveTo(x + s * .8, y - s * .8, x + s * .6, y - s * .4); g.quadraticCurveTo(x + s * .6, y - s * .75, x + s * .32, y - s * .8); g.fill(); }
function ball(g, x, y, r) { g.save(); g.lineWidth = r * .08; g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke(); star(g, x, y, r * .38, 5, .8); for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 - Math.PI / 2; g.beginPath(); g.moveTo(x + Math.cos(a) * r * .38, y + Math.sin(a) * r * .38); g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); g.stroke(); } g.restore(); }
function pumpkin(g, x, y, r) {
  g.save(); g.fillStyle = '#f97316';
  [-.5, 0, .5].forEach(o => { g.beginPath(); g.ellipse(x + o * r * .7, y, r * .55, r * .8, 0, 0, 7); g.fill(); });
  g.fillStyle = '#c2410c'; g.globalAlpha *= .5; [-.35, .35].forEach(o => { g.beginPath(); g.ellipse(x + o * r * .7, y, r * .12, r * .7, 0, 0, 7); g.fill(); }); g.globalAlpha /= .5;
  g.fillStyle = '#3f6212'; g.fillRect(x - r * .08, y - r * 1.05, r * .16, r * .3);
  g.fillStyle = '#fde047'; // cara iluminada
  [[-1, 1], [1, 1]].forEach(([sx]) => { g.beginPath(); g.moveTo(x + sx * r * .45, y - r * .1); g.lineTo(x + sx * r * .2, y - r * .1); g.lineTo(x + sx * r * .32, y - r * .38); g.closePath(); g.fill(); });
  g.beginPath(); g.moveTo(x - r * .55, y + r * .2); for (let i = 0; i <= 6; i++) g.lineTo(x - r * .55 + i * r * .183, y + r * (i % 2 ? .32 : .5)); g.lineTo(x + r * .55, y + r * .2); g.quadraticCurveTo(x, y + r * .75, x - r * .55, y + r * .2); g.fill();
  g.restore();
}
function ghost(g, x, y, s) {
  g.beginPath(); g.moveTo(x - s * .4, y + s * .5); g.lineTo(x - s * .4, y); g.arc(x, y, s * .4, Math.PI, 0); g.lineTo(x + s * .4, y + s * .5);
  for (let i = 0; i < 4; i++) g.quadraticCurveTo(x + s * .4 - (i + .5) * s * .2, y + s * (i % 2 ? .62 : .38), x + s * .4 - (i + 1) * s * .2, y + s * .5);
  g.closePath(); g.fill();
  g.save(); g.globalCompositeOperation = 'destination-out'; [-1, 1].forEach(k => { g.beginPath(); g.ellipse(x + k * s * .13, y - s * .02, s * .06, s * .09, 0, 0, 7); g.fill(); }); g.beginPath(); g.ellipse(x, y + s * .18, s * .07, s * .1, 0, 0, 7); g.fill(); g.restore();
}
function rings(g, x, y, r) { g.save(); g.lineWidth = r * .16; g.beginPath(); g.arc(x - r * .45, y, r, 0, 7); g.stroke(); g.beginPath(); g.arc(x + r * .45, y, r, 0, 7); g.stroke(); g.restore(); }

// ---------- Qué escenario va con cada evento ----------
const PARTY_SCENE = { posada: 'posada', navidad: 'navidad', carne: 'fuego', cumple: 'globos', infantil: 'globos', comida: 'hojas', patrias: 'patrias', anio_nuevo: 'fuegos', despedida: 'fuegos', halloween: 'terror', muertos: 'muertos', xv: 'amor', boda: 'amor', baby: 'flores', bautizo: 'flores', graduacion: 'estrellas', amigos: 'verano', futbol: 'deporte', karaoke: 'musica', pijamada: 'noche', otro: 'estrellas' };
const X_SCENE = { halloween: 'terror', muertos: 'muertos', navidad: 'navidad', invierno: 'navidad', anio_nuevo: 'fuegos', cumple: 'globos', amor: 'amor', madres: 'flores', primavera: 'flores', verano: 'verano', otono: 'hojas', patrias: 'patrias', clasico: 'estrellas' };
export const sceneFor = (col, x) => (col === 'exchanges' ? X_SCENE[x.type] : PARTY_SCENE[x.type]) || 'estrellas';
export const SCENE_NAMES = { terror: '🦇 Terror', muertos: '💀 Día de Muertos', navidad: '❄️ Navidad', posada: '🪅 Posada', fuegos: '🎆 Fuegos artificiales', globos: '🎈 Globos', verano: '☀️ Verano', fuego: '🔥 Asador', patrias: '🇲🇽 Mexicano', amor: '💕 Amor', flores: '🌸 Flores', hojas: '🍂 Otoño', estrellas: '✨ Estrellas', deporte: '⚽ Fútbol', musica: '🎤 Música', noche: '🌙 Noche' };
// Algunos escenarios tiñen el fondo (el de terror siempre es oscuro)
// Color de acento propio de algunos escenarios (etiqueta, brillo del título, aro del QR)
export const SCENE_ACCENT = { terror: '#f97316', muertos: '#ec4899', noche: '#818cf8', patrias: '#16a34a', navidad: '#dc2626', posada: '#db2777' };
export const SCENE_BG = { terror: ['#07060d', '#1c0f2e', '#3b1d0a'], muertos: ['#1a0b2e', '#4a1552', '#b4400f'], noche: ['#050b1f', '#122255', '#2b1f5c'] };

// ---------- Fondo completo (orillas visibles) ----------
export function paintScene(g, kind, W, H, R, accent) {
  g.save();
  const A = (a) => { g.globalAlpha = a; };
  const white = 'rgba(255,255,255,1)', dark = 'rgba(0,0,0,1)';
  switch (kind) {
    case 'terror': {
      moon(g, W * .78, H * .1, 95, '#f3e6c4');
      A(.35); g.fillStyle = '#fff'; for (let i = 0; i < 40; i++) { g.beginPath(); g.arc(R() * W, R() * H * .35, R() * 2 + .5, 0, 7); g.fill(); }
      A(.9); g.fillStyle = '#05040a'; g.strokeStyle = '#05040a';
      // árboles secos, tumbas y piso
      deadTree(g, W * .06, H + 20, H * .75, R); deadTree(g, W * .95, H + 20, H * .6, R);
      g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 40) g.lineTo(x, H - 60 - Math.sin(x / 90) * 18); g.lineTo(W, H); g.fill();
      [[.18, 90, 120], [.3, 70, 95], [.72, 80, 110], [.84, 65, 85]].forEach(([p, w, h]) => tomb(g, W * p, H - 50, w, h));
      g.save(); g.globalCompositeOperation = 'destination-out'; A(.7); g.fillRect(W * .18 - 4, H - 150, 8, 40); g.fillRect(W * .18 - 16, H - 140, 32, 8); g.restore();
      A(.85); for (let i = 0; i < 9; i++) bat(g, W * (.15 + R() * .7), 60 + R() * H * .3, 60 + R() * 70, R() < .5 ? 1 : -1);
      A(.28); g.strokeStyle = white; web(g, 0, 0, 330, 0, Math.PI / 2); web(g, W, H * .42, 260, Math.PI * .6, Math.PI * 1.4);
      A(.95); [[.1, H - 70, 46], [.9, H - 64, 52], [.62, H - 58, 34], [.4, H - 55, 30]].forEach(([p, yy, r]) => pumpkin(g, W * p, yy, r));
      A(.3); g.fillStyle = white; ghost(g, W * .06, H * .45, 110); ghost(g, W * .95, H * .3, 90);
      // neblina
      const fg = g.createLinearGradient(0, H - 260, 0, H); fg.addColorStop(0, 'rgba(180,160,220,0)'); fg.addColorStop(1, 'rgba(180,160,220,.35)'); g.globalAlpha = 1; g.fillStyle = fg; g.fillRect(0, H - 260, W, 260);
      break;
    }
    case 'muertos': {
      A(.95); papelPicado(g, W, 26, 7, ['#ff4fa3', '#ff9f1c', '#8b5cf6', '#22c55e', '#06b6d4', '#facc15', '#ef4444']);
      A(.85); g.fillStyle = '#ff9f1c'; [[.05, .92, 70], [.14, .97, 55], [.92, .9, 75], [.84, .98, 50], [.03, .5, 45], [.97, .55, 50]].forEach(([a, b, r]) => marigold(g, W * a, H * b, r));
      A(.2); g.fillStyle = white; skull(g, W * .08, H * .28, 110); skull(g, W * .93, H * .74, 120);
      break;
    }
    case 'posada':
      A(.95); papelPicado(g, W, 26, 7, ['#ef4444', '#22c55e', '#facc15', '#ec4899', '#3b82f6', '#f97316', '#a855f7']);
      A(.6); g.fillStyle = '#ffe58a'; for (let i = 0; i < 14; i++) star(g, R() * W, 200 + R() * (H - 260), 10 + R() * 18);
      A(.35); g.fillStyle = white; for (let i = 0; i < 8; i++) sparkle(g, R() * W, R() * H, 20 + R() * 20);
      break;
    case 'navidad':
      A(.5); g.strokeStyle = white; for (let i = 0; i < 22; i++) snowflake(g, R() * W, R() * H, 14 + R() * 34);
      A(.55); g.fillStyle = '#0b3d20'; [[.06, 300], [.15, 220], [.9, 320], [.97, 230], [.8, 190]].forEach(([p, h]) => pine(g, W * p, H + 10, h));
      A(.8); g.fillStyle = '#ffe58a'; star(g, W * .88, 70, 34);
      break;
    case 'fuegos':
      A(.55); ['#facc15', '#f472b6', '#60a5fa', '#34d399', '#fb923c', '#fff'].forEach((c, i) => burst(g, W * (.1 + R() * .8), (i % 2 ? H * .8 : 90) + R() * 120 - 60, 70 + R() * 70, c));
      A(.5); g.fillStyle = white; for (let i = 0; i < 20; i++) sparkle(g, R() * W, R() * H, 6 + R() * 16);
      break;
    case 'globos':
      A(.7); ['#f43f5e', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6'].forEach((c, i) => balloon(g, i % 2 ? W * (.03 + R() * .08) : W * (.89 + R() * .08), 180 + i * (H - 380) / 7, 48 + R() * 30, c));
      A(.6); for (let i = 0; i < 50; i++) { g.fillStyle = ['#fde047', '#f472b6', '#60a5fa', '#4ade80', '#fff'][i % 5]; g.save(); g.translate(R() * W, R() * H); g.rotate(R() * 3); g.fillRect(-6, -3, 12, 6); g.restore(); }
      break;
    case 'verano':
      A(.55); g.fillStyle = '#fff3a3'; g.strokeStyle = '#fff3a3'; sun(g, W * .86, 110, 60);
      A(.35); g.fillStyle = white; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 20) g.lineTo(x, H - 50 - k * 38 - Math.sin(x / 60 + k) * 14); g.lineTo(W, H); g.fill(); }
      break;
    case 'fuego':
      A(.75); for (let i = 0; i < 16; i++) { const x = (i + .5) * W / 16, h = 110 + R() * 130; g.fillStyle = '#ea580c'; flame(g, x, H + 10, h); g.fillStyle = '#facc15'; flame(g, x, H + 10, h * .55); }
      A(.25); g.strokeStyle = dark; g.lineWidth = 10; for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(0, 40 + i * 26); g.lineTo(W, 40 + i * 26); g.stroke(); }
      break;
    case 'patrias':
      A(.95); papelPicado(g, W, 26, 6, ['#16a34a', '#ffffff', '#dc2626']);
      A(.35); [['#16a34a', 0], ['#ffffff', 1], ['#dc2626', 2]].forEach(([c, i]) => { g.fillStyle = c; g.fillRect(0, H - 90 + i * 30, W, 30); });
      break;
    case 'amor':
      A(.45); for (let i = 0; i < 20; i++) { g.fillStyle = ['#fb7185', '#f9a8d4', '#fff'][i % 3]; heart(g, R() * W, R() * H, 30 + R() * 50); }
      A(.35); g.strokeStyle = '#fde68a'; rings(g, W * .88, H * .9, 40);
      break;
    case 'flores':
      A(.55); for (let i = 0; i < 22; i++) { g.fillStyle = ['#f9a8d4', '#fde68a', '#c4b5fd', '#a7f3d0', '#fff'][i % 5]; flower(g, i % 2 ? R() * 120 : W - R() * 120, R() * H, 22 + R() * 26); }
      break;
    case 'hojas':
      A(.6); for (let i = 0; i < 26; i++) { g.fillStyle = ['#f97316', '#b45309', '#facc15', '#dc2626'][i % 4]; leaf(g, R() * W, R() * H, 22 + R() * 26, R() * 6); }
      break;
    case 'deporte':
      A(.3); g.strokeStyle = white; g.lineWidth = 6; g.strokeRect(30, 30, W - 60, H - 60); g.beginPath(); g.moveTo(30, H / 2); g.lineTo(W - 30, H / 2); g.stroke(); g.beginPath(); g.arc(W / 2, H / 2, 150, 0, 7); g.stroke();
      A(.55); g.fillStyle = white; g.strokeStyle = white; for (let i = 0; i < 6; i++) ball(g, i % 2 ? R() * 110 + 40 : W - R() * 110 - 40, 120 + R() * (H - 240), 30 + R() * 22);
      break;
    case 'musica':
      A(.55); g.fillStyle = white; for (let i = 0; i < 18; i++) note(g, R() * W, R() * H, 34 + R() * 34);
      A(.35); ['#f472b6', '#60a5fa', '#facc15'].forEach(c => burst(g, R() * W, R() * H, 90, c));
      break;
    case 'noche':
      A(.8); g.fillStyle = '#fef3c7'; crescent(g, W * .82, 120, 70);
      A(.7); g.fillStyle = '#fff'; for (let i = 0; i < 60; i++) { g.beginPath(); g.arc(R() * W, R() * H, R() * 2.4 + .6, 0, 7); g.fill(); }
      A(.5); for (let i = 0; i < 10; i++) sparkle(g, R() * W, R() * H, 10 + R() * 14);
      break;
    default:
      A(.55); g.fillStyle = white; for (let i = 0; i < 26; i++) sparkle(g, R() * W, R() * H, 8 + R() * 22);
      A(.35); g.fillStyle = accent || white; for (let i = 0; i < 10; i++) star(g, R() * W, R() * H, 10 + R() * 16);
  }
  g.restore();
}

// ---------- Emblema gigante y tenue dentro de la tarjeta (marca de agua) ----------
export function paintWatermark(g, kind, cx, cy, s, R) {
  g.save(); g.globalAlpha = .11; g.fillStyle = '#fff'; g.strokeStyle = '#fff';
  switch (kind) {
    case 'terror': g.lineWidth = 3; web(g, cx - s * .9, cy - s * .9, s * 1.3, 0, Math.PI / 2); bat(g, cx + s * .25, cy - s * .1, s * 1.1); ghost(g, cx - s * .45, cy + s * .45, s * .5); break;
    case 'muertos': skull(g, cx, cy, s * 1.2); break;
    case 'navidad': case 'posada': g.lineWidth = s * .05; snowflake(g, cx, cy, s * .75); break;
    case 'fuegos': burst(g, cx, cy, s * .8, '#fff'); break;
    case 'globos': balloon(g, cx, cy - s * .3, s * .5, '#fff'); break;
    case 'verano': sun(g, cx, cy, s * .38); break;
    case 'fuego': flame(g, cx, cy + s * .6, s * 1.2); break;
    case 'patrias': star(g, cx, cy, s * .7); break;
    case 'amor': heart(g, cx, cy - s * .5, s); break;
    case 'flores': flower(g, cx, cy, s * .6); break;
    case 'hojas': leaf(g, cx, cy, s * .7, .5); break;
    case 'deporte': ball(g, cx, cy, s * .6); break;
    case 'musica': note(g, cx - s * .1, cy + s * .4, s * .8); break;
    case 'noche': crescent(g, cx, cy, s * .6); break;
    default: sparkle(g, cx, cy, s * .7);
  }
  g.restore();
}
