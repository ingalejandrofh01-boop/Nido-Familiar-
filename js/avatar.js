// ============================================================
//  AVATARES DE ANIMALITOS (SVG vectorial, sin imágenes)
//  renderAvatar(cfg, { season, crown }) -> string <svg>
// ============================================================
let uid = 0;

// ---------- utilidades de color ----------
function hex2rgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function rgb2hex(r, g, b) { return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
export function shade(hex, p) { const [r, g, b] = hex2rgb(hex); const t = p < 0 ? 0 : 255, k = Math.abs(p); return rgb2hex(r + (t - r) * k, g + (t - g) * k, b + (t - b) * k); }
const lum = (hex) => { const [r, g, b] = hex2rgb(hex); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
const INK = '#2a2130';

// ---------- OPCIONES ----------
export const SPECIES = {
  gato: { n: 'Gatito', e: '🐱', fur: '#f4a259', sec: '#fff4e6', extra: '#d9772b', pattern: 'rayas' },
  perro: { n: 'Perrito', e: '🐶', fur: '#c98c5a', sec: '#f7e8d6', extra: '#7a4a2a', pattern: 'parche' },
  zorro: { n: 'Zorrito', e: '🦊', fur: '#ec7a32', sec: '#fffaf2', extra: '#3b2a24', pattern: 'ninguno' },
  conejo: { n: 'Conejito', e: '🐰', fur: '#f3eee9', sec: '#ffffff', extra: '#ffb3c6', pattern: 'ninguno' },
  oso: { n: 'Osito', e: '🐻', fur: '#94603f', sec: '#ecc9a2', extra: '#5e3a24', pattern: 'ninguno' },
  panda: { n: 'Panda', e: '🐼', fur: '#fbfbfb', sec: '#2d2d33', extra: '#2d2d33', pattern: 'ninguno' },
  koala: { n: 'Koala', e: '🐨', fur: '#9ea9b5', sec: '#eef1f4', extra: '#3a3f47', pattern: 'ninguno' },
  leon: { n: 'Leoncito', e: '🦁', fur: '#f3bb4d', sec: '#fff1d6', extra: '#b8621e', pattern: 'ninguno' },
  tigre: { n: 'Tigrito', e: '🐯', fur: '#f7931e', sec: '#fffaf0', extra: '#3a2a20', pattern: 'rayas' },
  pinguino: { n: 'Pingüino', e: '🐧', fur: '#34405a', sec: '#ffffff', extra: '#ff9f1c', pattern: 'ninguno' },
  buho: { n: 'Buhito', e: '🦉', fur: '#8f6c4f', sec: '#f5e6cc', extra: '#f2a33a', pattern: 'ninguno' },
  rana: { n: 'Ranita', e: '🐸', fur: '#79cc68', sec: '#dcf6cf', extra: '#4f9a42', pattern: 'manchas' },
  cerdito: { n: 'Cerdito', e: '🐷', fur: '#ffb9c6', sec: '#ff96ab', extra: '#e8798f', pattern: 'ninguno' },
  raton: { n: 'Ratoncito', e: '🐭', fur: '#bcbcc6', sec: '#f3f3f6', extra: '#ffb3c6', pattern: 'ninguno' },
  unicornio: { n: 'Unicornio', e: '🦄', fur: '#fcf5ff', sec: '#ffffff', extra: '#ffcf5a', pattern: 'ninguno' }
};
export const FUR_COLORS = ['#f4a259', '#ec7a32', '#c98c5a', '#94603f', '#5e3a24', '#3a2e2a', '#f3bb4d', '#f3eee9', '#fbfbfb', '#bcbcc6', '#6b6f7a', '#34405a', '#79cc68', '#ffb9c6', '#c9a7ff', '#8fd3ff', '#9ee6c9', '#ffe066', '#ff8fa3', '#e0c3a8'];
export const SEC_COLORS = ['#ffffff', '#fff4e6', '#f7e8d6', '#ecc9a2', '#fff1d6', '#eef1f4', '#dcf6cf', '#ffd6e0', '#e8dcff', '#d6f0ff', '#2d2d33', '#ff96ab'];
export const EXTRA_COLORS = ['#3a2a20', '#5e3a24', '#b8621e', '#d9772b', '#2d2d33', '#7a4a2a', '#ffcf5a', '#ffb3c6', '#ff9f1c', '#4f9a42', '#9d4edd', '#3a86ff', '#ffffff'];
export const EYE_COLORS = ['#3b2a20', '#1f6feb', '#2e9d5b', '#8a5a2b', '#7b3fe4', '#e0457b', '#1b1b1f', '#d4a017'];
export const BLUSH_COLORS = ['#ff8fab', '#ff6b6b', '#ffb4a2', '#c77dff', '#ffa94d'];
export const ACC_COLORS = ['#e63946', '#ff8fab', '#ffb703', '#2a9d8f', '#3a86ff', '#8338ec', '#1d3557', '#2b2d42', '#fb5607', '#06d6a0'];
export const BG_COLORS = [['#ffd6e0', '#ffafcc'], ['#cde7ff', '#8ec5ff'], ['#d8f3dc', '#95d5b2'], ['#fff3b0', '#ffd166'], ['#e9d5ff', '#c4a1ff'], ['#ffe5d9', '#ffb4a2'], ['#caf0f8', '#48cae4'], ['#2b2d42', '#5c5f84'], ['#1b1340', '#6a4c93'], ['#ffffff', '#e9ecef'], ['#fde2e4', '#bee1e6'], ['#ffcad4', '#b28dff']];

export const OPTIONS = {
  pattern: { ninguno: 'Liso', rayas: 'Rayas', manchas: 'Manchas', parche: 'Parche', antifaz: 'Antifaz', frente: 'Estrella en la frente' },
  eyes: { brillantes: 'Brillantes', redondos: 'Redondos', felices: 'Felices', dormilones: 'Dormilones', guino: 'Guiño', estrellas: 'Estrellas', corazones: 'Enamorados', grandes: 'Súper tiernos' },
  brows: { ninguna: 'Sin cejas', suaves: 'Suaves', picaras: 'Pícaras', decididas: 'Decididas', tristes: 'Tiernas' },
  mouth: { gatuna: 'Gatuna :3', sonrisa: 'Sonrisa', risa: 'Carcajada', lengua: 'Lengüita', dienton: 'Dientón', sorpresa: 'Sorpresa', picara: 'Pícara' },
  head: { ninguno: 'Nada', corona: 'Corona', mono: 'Moño', gorra: 'Gorra', gorro: 'Gorro de invierno', flores: 'Corona de flores', flor: 'Florecita', audifonos: 'Audífonos', fiesta: 'Gorro de fiesta', mago: 'Sombrero de mago', charro: 'Sombrero charro', santa: 'Gorro navideño', reno: 'Cuernos de reno', bruja: 'Sombrero de bruja' },
  face: { ninguno: 'Nada', redondos: 'Lentes redondos', sol: 'Lentes de sol', corazon: 'Lentes de corazón', estrella: 'Lentes de estrella', monoculo: 'Monóculo', antifaz: 'Antifaz de héroe', catrina: 'Maquillaje de catrina' },
  neck: { ninguno: 'Nada', bufanda: 'Bufanda', corbatin: 'Corbatín', collar: 'Collar con placa', paliacate: 'Paliacate', hawaiano: 'Collar de flores', capa: 'Capa de héroe' },
  anim: { respirar: 'Tranquilo', rebote: 'Saltarín', orejas: 'Mueve orejas', menear: 'Bailarín', flotar: 'Flotando', brillos: 'Brillitos', corazones: 'Corazones' }
};

export function defaultAvatar(species = 'gato') {
  const s = SPECIES[species] || SPECIES.gato;
  return { species, fur: s.fur, sec: s.sec, extra: s.extra, pattern: s.pattern, eyes: species === 'buho' ? 'grandes' : 'brillantes', eyeColor: species === 'buho' ? '#d4a017' : '#3b2a20', brows: 'ninguna', mouth: species === 'conejo' ? 'dienton' : species === 'gato' ? 'gatuna' : 'sonrisa', blush: true, blushColor: '#ff8fab', head: 'ninguno', face: 'ninguno', neck: 'ninguno', acc: '#e63946', bg: BG_COLORS[0], anim: 'respirar', seasonal: true };
}
const pick = a => a[Math.floor(Math.random() * a.length)];
export function randomAvatar() {
  const sp = pick(Object.keys(SPECIES)); const a = defaultAvatar(sp);
  if (Math.random() < .35) a.fur = pick(FUR_COLORS);
  a.eyes = pick(Object.keys(OPTIONS.eyes)); a.mouth = pick(Object.keys(OPTIONS.mouth)); a.eyeColor = pick(EYE_COLORS);
  a.brows = Math.random() < .5 ? 'ninguna' : pick(Object.keys(OPTIONS.brows));
  a.head = Math.random() < .5 ? 'ninguno' : pick(['corona', 'mono', 'gorra', 'gorro', 'flores', 'flor', 'audifonos', 'fiesta', 'mago', 'charro']);
  a.face = Math.random() < .7 ? 'ninguno' : pick(['redondos', 'sol', 'corazon', 'estrella', 'monoculo']);
  a.neck = Math.random() < .5 ? 'ninguno' : pick(['bufanda', 'corbatin', 'collar', 'paliacate', 'hawaiano']);
  a.acc = pick(ACC_COLORS); a.bg = pick(BG_COLORS); a.anim = pick(Object.keys(OPTIONS.anim)); a.blushColor = pick(BLUSH_COLORS);
  return a;
}

// Accesorios automáticos por temporada (sólo llenan huecos vacíos)
const SEASONAL = {
  navidad: { head: 'santa', neck: 'bufanda', acc: '#c1121f' }, halloween: { head: 'bruja', acc: '#ff8c1a' }, muertos: { head: 'flores', face: 'catrina' },
  anio_nuevo: { head: 'fiesta', face: 'estrella', acc: '#ffd166' }, amor: { face: 'corazon' }, madres: { head: 'flor' }, patrias: { head: 'charro', neck: 'paliacate' },
  invierno: { head: 'gorro', neck: 'bufanda', acc: '#3a86ff' }, verano: { face: 'sol', neck: 'hawaiano' }, cumple: { head: 'fiesta' }, primavera: { head: 'flor' }, otono: { neck: 'bufanda', acc: '#bc4b1a' }
};
export function withSeason(a, season, crown) {
  const o = { ...a };
  if (crown) { o.head = 'corona'; return o; }
  const s = a.seasonal !== false && SEASONAL[season];
  if (!s) return o;
  for (const k of ['head', 'face', 'neck']) if (s[k] && (!o[k] || o[k] === 'ninguno')) { o[k] = s[k]; if (s.acc) o.acc = s.acc; }
  return o;
}

// ---------- piezas ----------
const G = (h) => ({ cx: 100, cy: 106, rx: 56, ry: 51, eyeY: 102, eyeGap: 23, noseY: 121, mouthY: 133, ...h });
const GEOM = {
  gato: G({}), perro: G({ ry: 52 }), zorro: G({ rx: 58, ry: 49, cy: 108 }), conejo: G({ cy: 112, ry: 48, eyeY: 108, noseY: 125, mouthY: 136 }),
  oso: G({ rx: 58 }), panda: G({ rx: 58 }), koala: G({ rx: 55, ry: 50, noseY: 122, mouthY: 139 }), leon: G({ rx: 52, ry: 48, cy: 108 }),
  tigre: G({ rx: 58 }), pinguino: G({ rx: 55, ry: 54, cy: 104, noseY: 122, mouthY: 136 }), buho: G({ rx: 56, ry: 55, cy: 106, eyeY: 100, eyeGap: 25, noseY: 123, mouthY: 138 }),
  rana: G({ rx: 64, ry: 44, cy: 116, eyeY: 72, eyeGap: 30, noseY: 118, mouthY: 130 }), cerdito: G({ rx: 57, noseY: 124, mouthY: 142 }),
  raton: G({ rx: 52, ry: 48, cy: 110, eyeY: 106, noseY: 124, mouthY: 134 }), unicornio: G({ rx: 52, ry: 53, cy: 108, eyeY: 104, noseY: 126, mouthY: 137 })
};

function ears(a, g) {
  const f = a.fur, o = shade(f, -.35), inner = a.species === 'panda' ? a.sec : (a.species === 'conejo' || a.species === 'raton' || a.species === 'cerdito' ? a.extra : shade(a.sec === '#ffffff' ? '#ffc2d1' : a.sec, -.05));
  const S = `stroke="${o}" stroke-width="3" stroke-linejoin="round"`;
  const pair = (l, r) => `<g class="av-ear l">${l}</g><g class="av-ear r">${r}</g>`;
  const mirror = (svg) => `<g transform="translate(200 0) scale(-1 1)">${svg}</g>`;
  switch (a.species) {
    case 'gato': case 'tigre': {
      if (a.species === 'tigre') { const e = `<circle cx="56" cy="66" r="17" fill="${f}" ${S}/><circle cx="57" cy="67" r="9" fill="${a.sec}"/>`; return pair(e, mirror(e)); }
      const e = `<path d="M52 80 L54 34 Q56 30 60 33 L90 60 Z" fill="${f}" ${S}/><path d="M60 72 L61 44 L81 61 Z" fill="${inner}"/>`; return pair(e, mirror(e));
    }
    case 'zorro': { const e = `<path d="M50 84 L48 26 Q50 22 55 25 L92 62 Z" fill="${f}" ${S}/><path d="M50 40 L48 26 Q50 22 55 25 L64 34 Z" fill="${a.extra}"/><path d="M58 74 L57 42 L80 62 Z" fill="${a.sec}" opacity=".85"/>`; return pair(e, mirror(e)); }
    case 'perro': { const e = `<path d="M60 64 C40 58 28 76 30 104 C32 124 44 132 52 124 C58 116 58 96 66 80 Z" fill="${a.extra}" ${S.replace(o, shade(a.extra, -.35))}/>`; return pair(e, mirror(e)); }
    case 'conejo': { const e = `<g transform="rotate(-12 78 70)"><ellipse cx="78" cy="36" rx="15" ry="40" fill="${f}" ${S}/><ellipse cx="78" cy="38" rx="7.5" ry="30" fill="${inner}"/></g>`; return pair(e, mirror(e).replace('rotate(-12 78 70)', 'rotate(-12 78 70)')); }
    case 'oso': case 'panda': case 'leon': {
      const r = a.species === 'leon' ? 14 : 18, c = a.species === 'panda' ? a.sec : f;
      const e = `<circle cx="58" cy="66" r="${r}" fill="${c}" ${S.replace(o, shade(c, -.35))}/>${a.species === 'panda' ? '' : `<circle cx="59" cy="67" r="${r * .52}" fill="${shade(a.sec, -.08)}"/>`}`; return pair(e, mirror(e));
    }
    case 'koala': { const e = `<circle cx="47" cy="74" r="25" fill="${f}" ${S}/><circle cx="49" cy="76" r="15" fill="${a.sec}"/><path d="M36 70 q4 -6 8 0 M42 84 q4 -6 8 0" stroke="${shade(a.sec, -.15)}" stroke-width="2" fill="none"/>`; return pair(e, mirror(e)); }
    case 'raton': { const e = `<circle cx="52" cy="62" r="28" fill="${f}" ${S}/><circle cx="53" cy="63" r="18" fill="${inner}"/>`; return pair(e, mirror(e)); }
    case 'cerdito': { const e = `<path d="M56 72 L52 42 Q54 38 58 40 L84 58 Q70 60 66 76 Z" fill="${f}" ${S}/><path d="M59 64 L57 48 L74 58 Z" fill="${a.sec}"/>`; return pair(e, mirror(e)); }
    case 'unicornio': { const e = `<path d="M62 72 Q52 44 60 32 Q72 44 80 64 Z" fill="${f}" ${S}/><path d="M64 64 Q58 48 61 40 Q68 50 72 62 Z" fill="#ffc2e2"/>`; return pair(e, mirror(e)); }
    case 'buho': { const e = `<path d="M56 70 L50 38 Q52 34 56 37 L82 58 Z" fill="${shade(f, -.1)}" ${S}/>`; return pair(e, mirror(e)); }
    default: return '';
  }
}

function behindHead(a, g) {
  if (a.species === 'leon') {
    let s = ''; const n = 18, R = 70;
    for (let i = 0; i < n; i++) { const t = i / n * Math.PI * 2; s += `<circle cx="${(100 + Math.cos(t) * R * .95).toFixed(1)}" cy="${(g.cy + Math.sin(t) * R * .9).toFixed(1)}" r="20" fill="${a.extra}"/>`; }
    return `<g class="av-mane">${s}<ellipse cx="100" cy="${g.cy}" rx="${R}" ry="${R * .9}" fill="${a.extra}"/><ellipse cx="100" cy="${g.cy}" rx="${R - 6}" ry="${R * .9 - 6}" fill="${shade(a.extra, .12)}" opacity=".6"/></g>`;
  }
  if (a.species === 'unicornio') {
    const cols = ['#ff9ecd', '#c9a7ff', '#8fd3ff', '#9ee6c9', '#ffe066'];
    return cols.map((c, i) => `<path d="M${104 + i * 6} ${54 + i * 3} C ${150 + i * 7} ${40 + i * 8} ${176 - i * 2} ${96 + i * 6} ${158 - i * 4} ${150 - i * 2} C ${168 - i * 6} ${110 + i * 2} ${146 - i * 4} ${76 + i * 4} ${104 + i * 6} ${54 + i * 3} Z" fill="${c}" stroke="${shade(c, -.2)}" stroke-width="1.5"/>`).join('');
  }
  return '';
}

function headShape(a, g) {
  const o = shade(a.fur, -.35);
  const base = `<ellipse cx="${g.cx}" cy="${g.cy}" rx="${g.rx}" ry="${g.ry}" fill="${a.fur}" stroke="${o}" stroke-width="3"/>`;
  let cheeks = '';
  if (['gato', 'tigre', 'leon', 'zorro'].includes(a.species)) {
    // mejillas esponjosas
    const y = g.cy + g.ry * .35; cheeks = `<path d="M${g.cx - g.rx + 2} ${y - 10} l-8 6 l9 3 l-7 7 l12 0" fill="${a.fur}" stroke="${o}" stroke-width="3" stroke-linejoin="round"/><path d="M${g.cx + g.rx - 2} ${y - 10} l8 6 l-9 3 l7 7 l-12 0" fill="${a.fur}" stroke="${o}" stroke-width="3" stroke-linejoin="round"/>`;
  }
  return cheeks + base;
}

function pattern(a, g, id) {
  const c = a.extra; let s = '';
  switch (a.pattern) {
    case 'rayas': s = `<path d="M100 ${g.cy - g.ry} l-6 18 l6 4 l6 -4 Z M82 ${g.cy - g.ry + 3} l-2 15 l6 2 Z M118 ${g.cy - g.ry + 3} l2 15 l-6 2 Z" fill="${c}"/>
      <path d="M${g.cx - g.rx} ${g.cy - 6} l20 4 l-20 5 Z M${g.cx - g.rx} ${g.cy + 10} l16 3 l-16 4 Z M${g.cx + g.rx} ${g.cy - 6} l-20 4 l20 5 Z M${g.cx + g.rx} ${g.cy + 10} l-16 3 l16 4 Z" fill="${c}"/>`; break;
    case 'manchas': s = [[70, -30, 9], [128, -22, 7], [118, -38, 5], [62, 18, 6], [140, 16, 8], [84, -40, 4]].map(([x, dy, r]) => `<circle cx="${x}" cy="${g.cy + dy}" r="${r}" fill="${c}" opacity=".9"/>`).join(''); break;
    case 'parche': s = `<ellipse cx="${100 + g.eyeGap}" cy="${g.eyeY - 2}" rx="19" ry="17" fill="${c}" transform="rotate(-15 ${100 + g.eyeGap} ${g.eyeY})"/>`; break;
    case 'antifaz': s = `<path d="M${g.cx - g.rx} ${g.eyeY - 8} Q100 ${g.eyeY - 22} ${g.cx + g.rx} ${g.eyeY - 8} L${g.cx + g.rx} ${g.eyeY + 12} Q100 ${g.eyeY + 2} ${g.cx - g.rx} ${g.eyeY + 12} Z" fill="${c}"/>`; break;
    case 'frente': s = `<path d="M100 ${g.cy - g.ry + 10} l4 9 l10 1 l-8 6 l3 10 l-9 -6 l-9 6 l3 -10 l-8 -6 l10 -1 Z" fill="${a.sec}"/>`; break;
  }
  if (!s) return '';
  return `<clipPath id="${id}h"><ellipse cx="${g.cx}" cy="${g.cy}" rx="${g.rx - 1.5}" ry="${g.ry - 1.5}"/></clipPath><g clip-path="url(#${id}h)">${s}</g>`;
}

function faceArea(a, g) {
  const s = a.sec, y = g.noseY;
  switch (a.species) {
    case 'gato': case 'tigre': case 'raton': return `<ellipse cx="89" cy="${y + 7}" rx="13" ry="10" fill="${s}"/><ellipse cx="111" cy="${y + 7}" rx="13" ry="10" fill="${s}"/>`;
    case 'perro': case 'oso': return `<ellipse cx="100" cy="${y + 8}" rx="${a.species === 'oso' ? 24 : 27}" ry="19" fill="${s}"/>`;
    case 'zorro': return `<path d="M${g.cx - g.rx + 4} ${g.cy + 2} Q80 ${g.cy - 4} 100 ${y - 6} Q120 ${g.cy - 4} ${g.cx + g.rx - 4} ${g.cy + 2} Q128 ${g.cy + g.ry} 100 ${g.cy + g.ry - 1} Q72 ${g.cy + g.ry} ${g.cx - g.rx + 4} ${g.cy + 2} Z" fill="${s}"/>`;
    case 'conejo': return `<ellipse cx="91" cy="${y + 6}" rx="11" ry="9" fill="${s}"/><ellipse cx="109" cy="${y + 6}" rx="11" ry="9" fill="${s}"/>`;
    case 'panda': return `<ellipse cx="${100 - g.eyeGap}" cy="${g.eyeY + 1}" rx="15" ry="18" fill="${a.extra}" transform="rotate(28 ${100 - g.eyeGap} ${g.eyeY})"/><ellipse cx="${100 + g.eyeGap}" cy="${g.eyeY + 1}" rx="15" ry="18" fill="${a.extra}" transform="rotate(-28 ${100 + g.eyeGap} ${g.eyeY})"/><ellipse cx="100" cy="${y + 8}" rx="22" ry="16" fill="#ffffff"/>`;
    case 'koala': return `<ellipse cx="100" cy="${g.cy + 20}" rx="30" ry="20" fill="${s}"/>`;
    case 'leon': return `<ellipse cx="100" cy="${y + 8}" rx="22" ry="16" fill="${s}"/>`;
    case 'pinguino': return `<path d="M100 ${g.cy - 18} C 88 ${g.cy - 40} 50 ${g.cy - 30} 52 ${g.cy + 4} C 54 ${g.cy + 40} 84 ${g.cy + 50} 100 ${g.cy + 50} C 116 ${g.cy + 50} 146 ${g.cy + 40} 148 ${g.cy + 4} C 150 ${g.cy - 30} 112 ${g.cy - 40} 100 ${g.cy - 18} Z" fill="${s}"/>`;
    case 'buho': return `<circle cx="${100 - g.eyeGap}" cy="${g.eyeY}" r="24" fill="${s}"/><circle cx="${100 + g.eyeGap}" cy="${g.eyeY}" r="24" fill="${s}"/><path d="M80 ${g.cy + 30} q5 5 10 0 M95 ${g.cy + 36} q5 5 10 0 M110 ${g.cy + 30} q5 5 10 0" stroke="${shade(a.fur, -.3)}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
    case 'rana': return `<ellipse cx="100" cy="${g.cy + 18}" rx="42" ry="20" fill="${s}" opacity=".9"/>`;
    case 'cerdito': return '';
    case 'unicornio': return `<ellipse cx="100" cy="${y + 6}" rx="24" ry="17" fill="#ffe3f1"/>`;
    default: return '';
  }
}

function frogEyeBumps(a, g) {
  if (a.species !== 'rana') return '';
  const o = shade(a.fur, -.35);
  return [100 - g.eyeGap, 100 + g.eyeGap].map(x => `<circle cx="${x}" cy="${g.eyeY}" r="21" fill="${a.fur}" stroke="${o}" stroke-width="3"/><circle cx="${x}" cy="${g.eyeY}" r="15" fill="#fff"/>`).join('');
}

function eye(style, x, y, color) {
  switch (style) {
    case 'redondos': return `<circle cx="${x}" cy="${y}" r="7.5" fill="${INK}"/><circle cx="${x - 2.4}" cy="${y - 2.6}" r="2.5" fill="#fff"/>`;
    case 'grandes': return `<ellipse cx="${x}" cy="${y}" rx="11" ry="12.5" fill="#fff" stroke="${INK}" stroke-width="2"/><ellipse cx="${x + 1}" cy="${y + 1.5}" rx="8" ry="9.5" fill="${color}"/><ellipse cx="${x + 1}" cy="${y + 2}" rx="5" ry="6" fill="${INK}"/><circle cx="${x - 2.5}" cy="${y - 2.5}" r="3.4" fill="#fff"/><circle cx="${x + 4}" cy="${y + 5}" r="1.6" fill="#fff"/>`;
    case 'felices': return `<path d="M${x - 8} ${y + 2} Q${x} ${y - 9} ${x + 8} ${y + 2}" stroke="${INK}" stroke-width="3.6" fill="none" stroke-linecap="round"/>`;
    case 'dormilones': return `<path d="M${x - 8} ${y} Q${x} ${y + 6} ${x + 8} ${y}" stroke="${INK}" stroke-width="3.4" fill="none" stroke-linecap="round"/><path d="M${x - 7} ${y + 2} l-3 3 M${x + 7} ${y + 2} l3 3" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`;
    case 'estrellas': { const p = []; for (let i = 0; i < 10; i++) { const r = i % 2 ? 4 : 10, t = -Math.PI / 2 + i * Math.PI / 5; p.push(`${(x + Math.cos(t) * r).toFixed(1)},${(y + Math.sin(t) * r).toFixed(1)}`); } return `<polygon points="${p.join(' ')}" fill="#ffd166" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>`; }
    case 'corazones': return `<path d="M${x} ${y + 8} C ${x - 12} ${y} ${x - 10} ${y - 10} ${x} ${y - 4} C ${x + 10} ${y - 10} ${x + 12} ${y} ${x} ${y + 8} Z" fill="#ff4d6d" stroke="${INK}" stroke-width="1.6"/><circle cx="${x - 4}" cy="${y - 3}" r="1.8" fill="#fff"/>`;
    default: /* brillantes */ return `<ellipse cx="${x}" cy="${y}" rx="8.5" ry="10" fill="${INK}"/><ellipse cx="${x}" cy="${y + 2.5}" rx="6" ry="6.5" fill="${color}" opacity=".85"/><ellipse cx="${x}" cy="${y + 3}" rx="3.6" ry="4" fill="${INK}"/><circle cx="${x - 2.8}" cy="${y - 3.5}" r="3.1" fill="#fff"/><circle cx="${x + 3}" cy="${y + 3.5}" r="1.4" fill="#fff"/>`;
  }
}
function eyes(a, g) {
  const L = 100 - g.eyeGap, Rr = 100 + g.eyeGap, y = g.eyeY;
  const l = a.eyes === 'guino' ? eye('brillantes', L, y, a.eyeColor) : eye(a.eyes, L, y, a.eyeColor);
  const r = a.eyes === 'guino' ? eye('felices', Rr, y, a.eyeColor) : eye(a.eyes, Rr, y, a.eyeColor);
  const blink = ['felices', 'dormilones', 'guino', 'estrellas', 'corazones'].includes(a.eyes) ? '' : ' av-blink';
  return `<g class="av-eyes${blink}">${l}${r}</g>`;
}
function brows(a, g) {
  const L = 100 - g.eyeGap, R = 100 + g.eyeGap, y = g.eyeY - (a.eyes === 'grandes' ? 20 : 16);
  const st = `stroke="${shade(a.fur, lum(a.fur) > .5 ? -.55 : .5)}" stroke-width="3.4" fill="none" stroke-linecap="round"`;
  switch (a.brows) {
    case 'suaves': return `<path d="M${L - 7} ${y + 1} Q${L} ${y - 4} ${L + 7} ${y + 1}" ${st}/><path d="M${R - 7} ${y + 1} Q${R} ${y - 4} ${R + 7} ${y + 1}" ${st}/>`;
    case 'picaras': return `<path d="M${L - 7} ${y + 2} Q${L} ${y - 2} ${L + 7} ${y + 2}" ${st}/><path d="M${R - 7} ${y - 3} Q${R} ${y - 9} ${R + 7} ${y - 2}" ${st}/>`;
    case 'decididas': return `<path d="M${L - 8} ${y - 3} L${L + 7} ${y + 2}" ${st}/><path d="M${R + 8} ${y - 3} L${R - 7} ${y + 2}" ${st}/>`;
    case 'tristes': return `<path d="M${L - 7} ${y + 2} L${L + 7} ${y - 3}" ${st}/><path d="M${R + 7} ${y + 2} L${R - 7} ${y - 3}" ${st}/>`;
    default: return '';
  }
}
function nose(a, g) {
  const y = g.noseY, dark = '#3a2a2a';
  switch (a.species) {
    case 'gato': case 'tigre': case 'raton': case 'conejo': {
      const c = a.species === 'tigre' ? '#e2687f' : '#ff8fab';
      const wh = a.species === 'conejo' ? '' : `<g stroke="${shade(a.fur, -.45)}" stroke-width="1.8" stroke-linecap="round" opacity=".7"><path d="M72 ${y + 4} L50 ${y}"/><path d="M72 ${y + 9} L50 ${y + 11}"/><path d="M128 ${y + 4} L150 ${y}"/><path d="M128 ${y + 9} L150 ${y + 11}"/></g>`;
      return `${wh}<path d="M94 ${y - 3} Q100 ${y - 6} 106 ${y - 3} Q104 ${y + 3} 100 ${y + 4} Q96 ${y + 3} 94 ${y - 3} Z" fill="${c}"/>`;
    }
    case 'perro': case 'oso': case 'panda': case 'leon': case 'zorro': return `<ellipse cx="100" cy="${y}" rx="${a.species === 'zorro' ? 6.5 : 9}" ry="${a.species === 'zorro' ? 5 : 6.5}" fill="${dark}"/><ellipse cx="97" cy="${y - 2}" rx="2.6" ry="1.6" fill="#fff" opacity=".7"/>`;
    case 'koala': return `<ellipse cx="100" cy="${y}" rx="12" ry="15" fill="${a.extra}"/><ellipse cx="96" cy="${y - 6}" rx="3" ry="4" fill="#fff" opacity=".35"/>`;
    case 'pinguino': case 'buho': return `<path d="M91 ${y - 5} Q100 ${y - 9} 109 ${y - 5} L100 ${y + 8} Z" fill="${a.extra}" stroke="${shade(a.extra, -.3)}" stroke-width="2" stroke-linejoin="round"/>`;
    case 'rana': return `<circle cx="95" cy="${y}" r="1.8" fill="${shade(a.fur, -.5)}"/><circle cx="105" cy="${y}" r="1.8" fill="${shade(a.fur, -.5)}"/>`;
    case 'cerdito': return `<ellipse cx="100" cy="${y}" rx="17" ry="12" fill="${a.sec}" stroke="${shade(a.sec, -.25)}" stroke-width="2.5"/><ellipse cx="94" cy="${y}" rx="3" ry="4.5" fill="${shade(a.sec, -.45)}"/><ellipse cx="106" cy="${y}" rx="3" ry="4.5" fill="${shade(a.sec, -.45)}"/>`;
    case 'unicornio': return `<ellipse cx="93" cy="${y}" rx="2.2" ry="3" fill="#d17ba6"/><ellipse cx="107" cy="${y}" rx="2.2" ry="3" fill="#d17ba6"/>`;
    default: return '';
  }
}
function mouth(a, g) {
  const y = g.mouthY, st = `stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
  const w = a.species === 'rana' ? 1.8 : 1;
  switch (a.mouth) {
    case 'gatuna': return `<path d="M${100 - 9 * w} ${y - 2} Q${100 - 4.5 * w} ${y + 5} 100 ${y - 1} Q${100 + 4.5 * w} ${y + 5} ${100 + 9 * w} ${y - 2}" ${st}/>`;
    case 'risa': return `<path d="M${100 - 11 * w} ${y - 3} Q100 ${y + 16} ${100 + 11 * w} ${y - 3} Z" fill="#6b2737" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><path d="M${100 - 6} ${y + 6} Q100 ${y + 1} ${100 + 6} ${y + 6} Q100 ${y + 11} ${100 - 6} ${y + 6} Z" fill="#ff7a95"/>`;
    case 'lengua': return `<path d="M${100 + 1} ${y + 1} q4 0 5 3 q1 8 -5 8 q-6 0 -5 -8 q1 -3 5 -3 Z" fill="#ff7a95" stroke="${INK}" stroke-width="2"/><path d="M${100 - 10 * w} ${y - 2} Q100 ${y + 6} ${100 + 10 * w} ${y - 2}" ${st}/>`;
    case 'dienton': return `<path d="M${100 - 9 * w} ${y - 2} Q100 ${y + 5} ${100 + 9 * w} ${y - 2}" ${st}/><rect x="95" y="${y + 1}" width="5" height="7" rx="1.5" fill="#fff" stroke="${INK}" stroke-width="1.6"/><rect x="100" y="${y + 1}" width="5" height="7" rx="1.5" fill="#fff" stroke="${INK}" stroke-width="1.6"/>`;
    case 'sorpresa': return `<ellipse cx="100" cy="${y + 2}" rx="5" ry="6.5" fill="#6b2737" stroke="${INK}" stroke-width="2.4"/>`;
    case 'picara': return `<path d="M${100 - 8 * w} ${y} Q${102} ${y + 6} ${100 + 10 * w} ${y - 5}" ${st}/>`;
    default: return `<path d="M${100 - 10 * w} ${y - 2} Q100 ${y + 8} ${100 + 10 * w} ${y - 2}" ${st}/>`;
  }
}
function cheeks(a, g) {
  if (!a.blush) return '';
  const y = g.species === 'rana' ? g.mouthY - 4 : g.eyeY + 19, dx = g.eyeGap + 10;
  return `<ellipse cx="${100 - dx}" cy="${y}" rx="9" ry="5.5" fill="${a.blushColor}" opacity=".55"/><ellipse cx="${100 + dx}" cy="${y}" rx="9" ry="5.5" fill="${a.blushColor}" opacity=".55"/>`;
}
function horn(a, g) {
  if (a.species !== 'unicornio') return '';
  const top = g.cy - g.ry;
  const cols = ['#ff9ecd', '#c9a7ff', '#8fd3ff'];
  const lock = cols.map((c, i) => `<path d="M${112 - i * 9} ${top + 2 + i * 2} C ${96 - i * 10} ${top + 6} ${76 - i * 6} ${top + 18 + i * 4} ${70 - i * 4} ${top + 34 + i * 4} C ${86 - i * 6} ${top + 26 + i * 2} ${100 - i * 8} ${top + 18} ${112 - i * 9} ${top + 2 + i * 2} Z" fill="${c}" stroke="${shade(c, -.2)}" stroke-width="1.5"/>`).reverse().join('');
  return lock + `<path d="M92 ${top + 8} L100 ${top - 34} L108 ${top + 8} Z" fill="${a.extra}" stroke="${shade(a.extra, -.3)}" stroke-width="2.5" stroke-linejoin="round"/><path d="M94 ${top} l12 -6 M96 ${top - 10} l9 -5 M98 ${top - 20} l5 -3" stroke="${shade(a.extra, -.3)}" stroke-width="2" stroke-linecap="round"/>`;
}

// ---------- accesorios ----------
function headAcc(a, g) {
  const top = g.cy - g.ry, c = a.acc, dk = shade(c, -.3);
  const S = (col) => `stroke="${shade(col, -.35)}" stroke-width="2.5" stroke-linejoin="round"`;
  switch (a.head) {
    case 'corona': return `<path d="M70 ${top + 10} L66 ${top - 18} L83 ${top - 4} L100 ${top - 26} L117 ${top - 4} L134 ${top - 18} L130 ${top + 10} Z" fill="#ffd23f" ${S('#ffd23f')}/><rect x="69" y="${top + 2}" width="62" height="8" rx="3" fill="#f4b400"/><circle cx="100" cy="${top - 8}" r="4.5" fill="#e63946"/><circle cx="82" cy="${top + 1}" r="3" fill="#3a86ff"/><circle cx="118" cy="${top + 1}" r="3" fill="#06d6a0"/><circle cx="66" cy="${top - 19}" r="3" fill="#ffd23f"/><circle cx="100" cy="${top - 27}" r="3.4" fill="#ffd23f"/><circle cx="134" cy="${top - 19}" r="3" fill="#ffd23f"/>`;
    case 'mono': return `<g transform="translate(66 ${top + 12}) rotate(-20)"><path d="M0 0 L-22 -14 Q-26 0 -22 14 Z" fill="${c}" ${S(c)}/><path d="M0 0 L22 -14 Q26 0 22 14 Z" fill="${c}" ${S(c)}/><circle r="6" fill="${dk}"/></g>`;
    case 'gorra': return `<path d="M52 ${top + 24} Q54 ${top - 14} 100 ${top - 16} Q146 ${top - 14} 148 ${top + 24} Z" fill="${c}" ${S(c)}/><path d="M100 ${top - 16} L100 ${top + 22}" stroke="${dk}" stroke-width="2"/><path d="M40 ${top + 24} Q100 ${top + 10} 160 ${top + 24} Q162 ${top + 34} 150 ${top + 32} Q100 ${top + 22} 50 ${top + 32} Q38 ${top + 34} 40 ${top + 24} Z" fill="${dk}"/><circle cx="100" cy="${top - 16}" r="4" fill="${dk}"/>`;
    case 'gorro': return `<path d="M50 ${top + 26} Q50 ${top - 26} 100 ${top - 28} Q150 ${top - 26} 150 ${top + 26} Z" fill="${c}" ${S(c)}/><path d="M68 ${top - 10} Q70 ${top + 6} 70 ${top + 20} M86 ${top - 20} Q88 ${top} 88 ${top + 20} M114 ${top - 20} Q112 ${top} 112 ${top + 20} M132 ${top - 10} Q130 ${top + 6} 130 ${top + 20}" stroke="${dk}" stroke-width="2" fill="none" opacity=".5"/><rect x="46" y="${top + 16}" width="108" height="18" rx="9" fill="${shade(c, .35)}" ${S(c)}/><circle cx="100" cy="${top - 32}" r="11" fill="${shade(c, .55)}" ${S(c)}/>`;
    case 'flores': { const cols = ['#ff8c00', '#ff3e9a', '#ffd000', '#8a4dff', '#ff8c00', '#ff3e9a', '#ffd000']; return cols.map((col, i) => { const t = Math.PI * (1.2 + i * 0.1); const x = 100 + Math.cos(t) * (g.rx - 2), y = g.cy + Math.sin(t) * (g.ry - 2); return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">${[0, 72, 144, 216, 288].map(r => `<ellipse rx="5" ry="8" cy="-6" fill="${col}" transform="rotate(${r})"/>`).join('')}<circle r="4.5" fill="#fff3b0"/></g>`; }).join('') + `<path d="M${100 - g.rx + 8} ${g.cy - 20} Q100 ${top - 12} ${100 + g.rx - 8} ${g.cy - 20}" stroke="#2d6a4f" stroke-width="0" fill="none"/>`; }
    case 'flor': return `<g transform="translate(${100 + g.rx * .62} ${top + 16})">${[0, 60, 120, 180, 240, 300].map(r => `<ellipse rx="6" ry="10" cy="-8" fill="${c}" transform="rotate(${r})" ${S(c)}/>`).join('')}<circle r="6" fill="#ffd166" ${S('#ffd166')}/></g><path d="M${100 + g.rx * .5} ${top + 30} q-6 6 -14 4" stroke="#2d9d6a" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    case 'audifonos': return `<path d="M${100 - g.rx - 2} ${g.cy} Q${100 - g.rx} ${top - 22} 100 ${top - 22} Q${100 + g.rx} ${top - 22} ${100 + g.rx + 2} ${g.cy}" stroke="${dk}" stroke-width="8" fill="none" stroke-linecap="round"/><rect x="${100 - g.rx - 12}" y="${g.cy - 16}" width="20" height="32" rx="9" fill="${c}" ${S(c)}/><rect x="${100 + g.rx - 8}" y="${g.cy - 16}" width="20" height="32" rx="9" fill="${c}" ${S(c)}/>`;
    case 'fiesta': return `<g transform="rotate(14 100 ${top})"><path d="M78 ${top + 8} L100 ${top - 46} L122 ${top + 8} Z" fill="${c}" ${S(c)}/><path d="M86 ${top - 12} L114 ${top - 12} M92 ${top - 28} L108 ${top - 28} M82 ${top} L118 ${top}" stroke="#fff" stroke-width="4" opacity=".75"/><circle cx="100" cy="${top - 48}" r="7" fill="#ffd166" ${S('#ffd166')}/></g>`;
    case 'mago': return `<path d="M60 ${top + 14} Q100 ${top} 140 ${top + 14} L112 ${top - 56} Q106 ${top - 66} 98 ${top - 60} Z" fill="${c === '#e63946' ? '#3a0ca3' : c}" ${S('#3a0ca3')}/><path d="M48 ${top + 16} Q100 ${top - 4} 152 ${top + 16} Q100 ${top + 30} 48 ${top + 16} Z" fill="${shade(c === '#e63946' ? '#3a0ca3' : c, -.2)}"/><path d="M96 ${top - 26} l3 6 l6 1 l-5 4 l2 6 l-6 -3 l-6 3 l2 -6 l-5 -4 l6 -1 Z" fill="#ffd166"/><circle cx="116" cy="${top - 4}" r="2.5" fill="#ffd166"/><circle cx="84" cy="${top - 10}" r="2" fill="#ffd166"/>`;
    case 'charro': return `<ellipse cx="100" cy="${top + 12}" rx="80" ry="16" fill="#d4a373" stroke="#8a5a2b" stroke-width="2.5"/><path d="M28 ${top + 10} Q100 ${top + 34} 172 ${top + 10}" stroke="#8a5a2b" stroke-width="2" fill="none"/><path d="M72 ${top + 10} Q72 ${top - 34} 100 ${top - 36} Q128 ${top - 34} 128 ${top + 10} Z" fill="#e6c08f" stroke="#8a5a2b" stroke-width="2.5"/><path d="M73 ${top + 2} Q100 ${top + 8} 127 ${top + 2}" stroke="#c1121f" stroke-width="5" fill="none"/><path d="M30 ${top + 12} Q100 ${top + 26} 170 ${top + 12}" stroke="#006847" stroke-width="2.5" fill="none" stroke-dasharray="4 5"/>`;
    case 'santa': return `<path d="M54 ${top + 20} Q58 ${top - 24} 100 ${top - 30} Q140 ${top - 34} 160 ${top - 4} Q166 ${top + 8} 172 ${top + 22} L150 ${top + 18} Q146 ${top + 12} 146 ${top + 20} Z" fill="#d62828" stroke="#8d1616" stroke-width="2.5" stroke-linejoin="round"/><rect x="48" y="${top + 12}" width="104" height="18" rx="9" fill="#fff" stroke="#d9d9d9" stroke-width="2"/><circle cx="172" cy="${top + 24}" r="10" fill="#fff" stroke="#d9d9d9" stroke-width="2"/>`;
    case 'reno': { const ant = (s) => `<g transform="${s}"><path d="M78 ${top + 6} C 72 ${top - 12} 66 ${top - 24} 58 ${top - 34}" stroke="#8a5a2b" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M68 ${top - 18} L52 ${top - 20} M63 ${top - 27} L66 ${top - 42}" stroke="#8a5a2b" stroke-width="6" fill="none" stroke-linecap="round"/></g>`; return ant('') + ant('translate(200 0) scale(-1 1)'); }
    case 'bruja': return `<path d="M40 ${top + 16} Q100 ${top - 4} 160 ${top + 16} Q100 ${top + 30} 40 ${top + 16} Z" fill="#2b1d3a" stroke="#120a1a" stroke-width="2.5"/><path d="M66 ${top + 12} Q100 ${top + 2} 134 ${top + 12} L118 ${top - 34} Q112 ${top - 56} 132 ${top - 64} Q100 ${top - 60} 96 ${top - 40} Z" fill="#3c2752" stroke="#120a1a" stroke-width="2.5" stroke-linejoin="round"/><path d="M68 ${top + 6} Q100 ${top - 2} 132 ${top + 6} L130 ${top + 12} Q100 ${top + 4} 70 ${top + 12} Z" fill="${c}"/><rect x="94" y="${top + 1}" width="12" height="11" rx="2" fill="none" stroke="#ffd166" stroke-width="2.5"/>`;
    default: return '';
  }
}
function faceAcc(a, g) {
  const L = 100 - g.eyeGap, R = 100 + g.eyeGap, y = g.eyeY, fr = '#2b2d42';
  switch (a.face) {
    case 'redondos': return `<g fill="#fff" fill-opacity=".18" stroke="${fr}" stroke-width="3.2"><circle cx="${L}" cy="${y}" r="15"/><circle cx="${R}" cy="${y}" r="15"/></g><path d="M${L + 15} ${y} Q100 ${y - 6} ${R - 15} ${y} M${L - 15} ${y - 2} L${L - 26} ${y - 6} M${R + 15} ${y - 2} L${R + 26} ${y - 6}" stroke="${fr}" stroke-width="3" fill="none"/>`;
    case 'sol': return `<path d="M${L - 17} ${y - 10} H${L + 15} Q${L + 16} ${y + 14} ${L} ${y + 14} Q${L - 17} ${y + 14} ${L - 17} ${y - 10} Z M${R - 15} ${y - 10} H${R + 17} Q${R + 17} ${y + 14} ${R} ${y + 14} Q${R - 16} ${y + 14} ${R - 15} ${y - 10} Z" fill="#1d1d26" stroke="${fr}" stroke-width="2.5"/><path d="M${L + 15} ${y - 8} Q100 ${y - 12} ${R - 15} ${y - 8}" stroke="${fr}" stroke-width="3.5" fill="none"/><path d="M${L - 11} ${y - 5} l8 0 M${R - 9} ${y - 5} l8 0" stroke="#fff" stroke-width="2.5" opacity=".6" stroke-linecap="round"/>`;
    case 'corazon': { const h = (x) => `<path d="M${x} ${y + 12} C ${x - 20} ${y} ${x - 16} ${y - 16} ${x} ${y - 7} C ${x + 16} ${y - 16} ${x + 20} ${y} ${x} ${y + 12} Z" fill="#ff4d6d" fill-opacity=".75" stroke="#c9184a" stroke-width="3"/>`; return h(L) + h(R) + `<path d="M${L + 14} ${y - 4} Q100 ${y - 9} ${R - 14} ${y - 4}" stroke="#c9184a" stroke-width="3" fill="none"/>`; }
    case 'estrella': { const st = (x) => { const p = []; for (let i = 0; i < 10; i++) { const r = i % 2 ? 8 : 18, t = -Math.PI / 2 + i * Math.PI / 5; p.push(`${(x + Math.cos(t) * r).toFixed(1)},${(y + 1 + Math.sin(t) * r).toFixed(1)}`); } return `<polygon points="${p.join(' ')}" fill="#ffd166" fill-opacity=".7" stroke="#e09f00" stroke-width="3" stroke-linejoin="round"/>`; }; return st(L) + st(R) + `<path d="M${L + 12} ${y - 2} Q100 ${y - 8} ${R - 12} ${y - 2}" stroke="#e09f00" stroke-width="3" fill="none"/>`; }
    case 'monoculo': return `<circle cx="${R}" cy="${y}" r="15" fill="#fff" fill-opacity=".2" stroke="#c9a227" stroke-width="3.2"/><path d="M${R + 12} ${y + 10} Q${R + 22} ${y + 40} ${R + 6} ${y + 64}" stroke="#c9a227" stroke-width="2" fill="none" stroke-dasharray="3 3"/>`;
    case 'antifaz': return `<path fill-rule="evenodd" d="M${L - 26} ${y - 8} Q100 ${y - 18} ${R + 26} ${y - 8} Q${R + 24} ${y + 14} ${R} ${y + 14} Q100 ${y + 6} ${L} ${y + 14} Q${L - 24} ${y + 14} ${L - 26} ${y - 8} Z M${L - 10} ${y} a10 9 0 1 0 20 0 a10 9 0 1 0 -20 0 Z M${R - 10} ${y} a10 9 0 1 0 20 0 a10 9 0 1 0 -20 0 Z" fill="${a.acc}" stroke="${shade(a.acc, -.35)}" stroke-width="2.5"/>`;
    case 'catrina': {
      const ring = (x) => { let s = ''; for (let i = 0; i < 10; i++) { const t = i / 10 * Math.PI * 2; s += `<circle cx="${(x + Math.cos(t) * 16).toFixed(1)}" cy="${(y + Math.sin(t) * 16).toFixed(1)}" r="2.8" fill="${['#ff3e9a', '#00c2a8', '#ffd000', '#8a4dff'][i % 4]}"/>`; } return s; };
      return ring(L) + ring(R) + `<g transform="translate(100 ${y - 26})">${[0, 72, 144, 216, 288].map(r => `<ellipse rx="3.5" ry="6" cy="-4" fill="#ff3e9a" transform="rotate(${r})"/>`).join('')}<circle r="3" fill="#ffd000"/></g><path d="M86 ${g.mouthY + 1} h28 M90 ${g.mouthY - 3} v8 M95 ${g.mouthY - 3} v8 M100 ${g.mouthY - 3} v8 M105 ${g.mouthY - 3} v8 M110 ${g.mouthY - 3} v8" stroke="${INK}" stroke-width="1.6" opacity=".6"/>`;
    }
    default: return '';
  }
}
function neckAcc(a) {
  const c = a.acc, dk = shade(c, -.3), S = `stroke="${shade(c, -.35)}" stroke-width="2.5" stroke-linejoin="round"`;
  switch (a.neck) {
    case 'bufanda': return `<path d="M52 158 Q100 176 148 158 L150 174 Q100 192 50 174 Z" fill="${c}" ${S}/><path d="M122 170 L130 206 L112 206 L108 174 Z" fill="${c}" ${S}/><path d="M60 162 l0 14 M76 166 l0 14 M92 168 l0 14 M108 168 l0 14 M124 166 l0 14 M140 162 l0 14" stroke="${shade(c, .35)}" stroke-width="4" opacity=".7"/>`;
    case 'corbatin': return `<path d="M100 166 L78 154 Q74 166 78 178 Z M100 166 L122 154 Q126 166 122 178 Z" fill="${c}" ${S}/><circle cx="100" cy="166" r="6.5" fill="${dk}"/>`;
    case 'collar': return `<path d="M58 158 Q100 176 142 158" stroke="${c}" stroke-width="9" fill="none" stroke-linecap="round"/><circle cx="100" cy="178" r="9" fill="#ffd23f" stroke="#c99a00" stroke-width="2.5"/><path d="M95 178 h10" stroke="#c99a00" stroke-width="2"/>`;
    case 'paliacate': return `<path d="M58 156 Q100 170 142 156 L100 196 Z" fill="#c1121f" stroke="#7d0a14" stroke-width="2.5" stroke-linejoin="round"/>${[[84, 166], [100, 170], [116, 166], [92, 178], [108, 178], [100, 188]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.2" fill="#fff"/>`).join('')}`;
    case 'hawaiano': return Array.from({ length: 9 }, (_, i) => { const t = Math.PI * (0.12 + i * 0.095); const x = 100 - Math.cos(t) * 48, y = 156 + Math.sin(t) * 18; return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">${[0, 72, 144, 216, 288].map(r => `<ellipse rx="4" ry="6.5" cy="-4.5" fill="${['#ff4d6d', '#ffd166', '#ff8fab', '#06d6a0', '#c77dff'][i % 5]}" transform="rotate(${r})"/>`).join('')}<circle r="2.6" fill="#fff3b0"/></g>`; }).join('');
    case 'capa': return `<path d="M44 162 Q100 150 156 162 L176 210 L24 210 Z" fill="${c}" ${S}/><path d="M60 160 Q100 172 140 160" stroke="${dk}" stroke-width="5" fill="none"/><circle cx="100" cy="167" r="6" fill="#ffd166"/>`;
    default: return '';
  }
}
function fx(a) {
  if (a.anim === 'brillos') return [[30, 40, 0], [170, 56, .6], [26, 130, 1.1], [176, 136, 1.6], [150, 24, 2]].map(([x, y, d]) => `<path class="av-spark" style="animation-delay:${d}s" d="M${x} ${y - 9} Q${x} ${y} ${x + 9} ${y} Q${x} ${y} ${x} ${y + 9} Q${x} ${y} ${x - 9} ${y} Q${x} ${y} ${x} ${y - 9} Z" fill="#fff"/>`).join('');
  if (a.anim === 'corazones') return [[36, 120, 0], [164, 110, .9], [150, 150, 1.8], [50, 150, 2.4]].map(([x, y, d]) => `<path class="av-heart" style="animation-delay:${d}s" d="M${x} ${y + 6} C ${x - 10} ${y} ${x - 8} ${y - 8} ${x} ${y - 3} C ${x + 8} ${y - 8} ${x + 10} ${y} ${x} ${y + 6} Z" fill="#ff4d6d"/>`).join('');
  return '';
}

// ---------- render principal ----------
export function renderAvatar(cfg, opts = {}) {
  const a0 = { ...defaultAvatar(cfg?.species), ...(cfg || {}) };
  const a = opts.raw ? a0 : withSeason(a0, opts.season, opts.crown);
  const g = GEOM[a.species] || GEOM.gato; g.species = a.species;
  const id = 'av' + (++uid);
  const [b1, b2] = a.bg || BG_COLORS[0];
  const bodyC = a.species === 'pinguino' ? a.fur : a.fur;
  const noBg = opts.noBg;
  return `<svg class="av anim-${a.anim}" viewBox="${opts.vb || '0 0 200 200'}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs><radialGradient id="${id}b" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="${b1}"/><stop offset="1" stop-color="${b2}"/></radialGradient>
    <clipPath id="${id}c"><circle cx="100" cy="100" r="96"/></clipPath></defs>
    ${noBg ? '' : `<circle cx="100" cy="100" r="96" fill="url(#${id}b)"/>`}
    <g clip-path="url(#${id}c)">
      <ellipse cx="100" cy="212" rx="66" ry="54" fill="${bodyC}" stroke="${shade(a.fur, -.35)}" stroke-width="3"/>
      <ellipse cx="100" cy="206" rx="36" ry="34" fill="${a.species === 'panda' ? '#fbfbfb' : a.sec}" opacity=".95"/>
      ${neckAcc(a)}
    </g>
    ${noBg ? '' : `<circle cx="100" cy="100" r="96" fill="none" stroke="#fff" stroke-width="5" opacity=".85"/>`}
    <g class="av-char"><g class="av-head">
      ${behindHead(a, g)}${ears(a, g)}${headShape(a, g)}${pattern(a, g, id)}
      <ellipse cx="${g.cx - g.rx * .35}" cy="${g.cy - g.ry * .5}" rx="${g.rx * .35}" ry="${g.ry * .2}" fill="#fff" opacity=".13"/>
      ${faceArea(a, g)}${frogEyeBumps(a, g)}${horn(a, g)}${cheeks(a, g)}${brows(a, g)}${eyes(a, g)}${nose(a, g)}${mouth(a, g)}
      ${faceAcc(a, g)}${headAcc(a, g)}
    </g></g>
    ${fx(a)}
  </svg>`;
}
