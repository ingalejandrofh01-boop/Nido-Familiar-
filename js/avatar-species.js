// ============================================================
//  Especies adicionales para los avatares (lobo, mapache, ajolote, dragón…)
//  Cada especie define sus piezas: orejas, cara, nariz, detrás de la cabeza y extras.
// ============================================================
import { shade } from './avatar-color.js';

const mirror = (svg) => `<g transform="translate(200 0) scale(-1 1)">${svg}</g>`;
const pair = (l) => `<g class="av-ear l">${l}</g><g class="av-ear r">${mirror(l)}</g>`;
const S = (c, w = 3) => `stroke="${shade(c, -.35)}" stroke-width="${w}" stroke-linejoin="round"`;
const top = (g) => g.cy - g.ry;

export const NEW_SPECIES = {
  lobo: { n: 'Lobito', e: '🐺', fur: '#8d96a3', sec: '#eef0f3', extra: '#4b5260', pattern: 'ninguno' },
  mapache: { n: 'Mapache', e: '🦝', fur: '#9a959f', sec: '#f5f3f6', extra: '#2e2b33', pattern: 'ninguno' },
  ardilla: { n: 'Ardillita', e: '🐿️', fur: '#c8743a', sec: '#fbe7cf', extra: '#9a4f1f', pattern: 'ninguno' },
  elefante: { n: 'Elefantito', e: '🐘', fur: '#9fadc0', sec: '#f4c7d3', extra: '#fffdf5', pattern: 'ninguno' },
  jirafa: { n: 'Jirafita', e: '🦒', fur: '#f5c45a', sec: '#fbe4ad', extra: '#b0692b', pattern: 'jirafa' },
  mono: { n: 'Changuito', e: '🐵', fur: '#7d5236', sec: '#f3caa2', extra: '#5a3822', pattern: 'ninguno' },
  vaca: { n: 'Vaquita', e: '🐮', fur: '#fbfbfb', sec: '#ffbcc6', extra: '#2b2b2e', pattern: 'vaca' },
  oveja: { n: 'Borreguito', e: '🐑', fur: '#f5e3cf', sec: '#ffffff', extra: '#f7c6d0', pattern: 'ninguno' },
  pollito: { n: 'Pollito', e: '🐥', fur: '#ffd84d', sec: '#fff2b3', extra: '#ff9f1c', pattern: 'ninguno' },
  dragon: { n: 'Dragoncito', e: '🐲', fur: '#5ec27a', sec: '#e2f6c9', extra: '#f6c343', pattern: 'ninguno' },
  ajolote: { n: 'Ajolote', e: '🦎', fur: '#ffb3c7', sec: '#ffd9e3', extra: '#ff5d8f', pattern: 'ninguno' },
  jaguar: { n: 'Jaguar', e: '🐆', fur: '#f2a93b', sec: '#fff6e5', extra: '#3a2618', pattern: 'rosetas' },
  perezoso: { n: 'Perezoso', e: '🦥', fur: '#a4876a', sec: '#ecdcc6', extra: '#4a3a2c', pattern: 'ninguno' },
  llama: { n: 'Llamita', e: '🦙', fur: '#f3e1c7', sec: '#fff8ec', extra: '#c89b6d', pattern: 'ninguno' }
};

const G = (h) => ({ cx: 100, cy: 106, rx: 56, ry: 51, eyeY: 102, eyeGap: 23, noseY: 121, mouthY: 133, ...h });
export const NEW_GEOM = {
  lobo: G({ rx: 57, ry: 50, cy: 108, noseY: 122 }), mapache: G({ rx: 58 }), ardilla: G({ rx: 53, ry: 50, cy: 110, eyeY: 106, noseY: 124, mouthY: 134 }),
  elefante: G({ rx: 52, ry: 52, cy: 104, eyeY: 100, noseY: 114, mouthY: 138 }), jirafa: G({ rx: 50, ry: 54, cy: 108, eyeY: 100, noseY: 128, mouthY: 140 }),
  mono: G({ rx: 52, ry: 52, cy: 108, eyeY: 104, noseY: 124, mouthY: 136 }), vaca: G({ rx: 56, ry: 50, cy: 108, eyeY: 100, noseY: 128, mouthY: 142 }),
  oveja: G({ rx: 44, ry: 45, cy: 114, eyeY: 110, eyeGap: 19, noseY: 128, mouthY: 138 }), pollito: G({ rx: 57, ry: 55, cy: 108, noseY: 122, mouthY: 137 }),
  dragon: G({ rx: 56, ry: 50, cy: 110, noseY: 126, mouthY: 140 }), ajolote: G({ rx: 63, ry: 45, cy: 114, eyeY: 108, eyeGap: 30, noseY: 120, mouthY: 130 }),
  jaguar: G({ rx: 58 }), perezoso: G({ rx: 55, ry: 51, cy: 108, eyeY: 104, noseY: 122, mouthY: 134 }), llama: G({ rx: 48, ry: 52, cy: 112, eyeY: 106, eyeGap: 20, noseY: 128, mouthY: 138 })
};
export const FLUFFY = new Set(['gato', 'perro', 'zorro', 'oso', 'koala', 'raton', 'tigre', 'conejo', 'lobo', 'mapache', 'ardilla', 'jaguar', 'perezoso', 'llama', 'mono']);

export const PARTS = {
  lobo: {
    ears: (a, g) => pair(`<path d="M52 88 L50 20 Q52 15 58 19 L92 60 Z" fill="${a.fur}" ${S(a.fur)}/><path d="M58 76 L57 36 L82 60 Z" fill="${a.sec}" opacity=".9"/><path d="M50 32 L50 20 Q52 15 58 19 L64 26 Z" fill="${a.extra}"/>`),
    face: (a, g) => `<path d="M100 ${top(g) + 2} L80 ${top(g) + 10} Q100 ${g.eyeY - 4} 120 ${top(g) + 10} Z" fill="${a.extra}" opacity=".55"/>
      <path d="M${g.cx - g.rx + 4} ${g.cy + 4} Q80 ${g.cy - 2} 100 ${g.noseY - 8} Q120 ${g.cy - 2} ${g.cx + g.rx - 4} ${g.cy + 4} Q126 ${g.cy + g.ry} 100 ${g.cy + g.ry - 1} Q74 ${g.cy + g.ry} ${g.cx - g.rx + 4} ${g.cy + 4} Z" fill="${a.sec}"/>`,
    nose: (a, g) => `<path d="M92 ${g.noseY - 3} Q100 ${g.noseY - 7} 108 ${g.noseY - 3} Q106 ${g.noseY + 4} 100 ${g.noseY + 5} Q94 ${g.noseY + 4} 92 ${g.noseY - 3} Z" fill="#2c2a30"/><ellipse cx="97" cy="${g.noseY - 2}" rx="2.4" ry="1.4" fill="#fff" opacity=".6"/>`
  },
  mapache: {
    ears: (a, g) => pair(`<path d="M54 80 Q46 46 60 38 Q78 46 86 62 Z" fill="${a.fur}" ${S(a.fur)}/><path d="M60 72 Q56 50 63 46 Q74 52 78 62 Z" fill="${a.extra}" opacity=".7"/>`),
    face: (a, g) => { const L = 100 - g.eyeGap, R = 100 + g.eyeGap, y = g.eyeY; return `<ellipse cx="${L}" cy="${y - 20}" rx="15" ry="6" fill="${a.sec}"/><ellipse cx="${R}" cy="${y - 20}" rx="15" ry="6" fill="${a.sec}"/>
      <path d="M${L - 22} ${y - 4} Q${L - 18} ${y - 16} ${L} ${y - 13} Q${L + 12} ${y - 12} 100 ${y - 3} Q${R - 12} ${y - 12} ${R} ${y - 13} Q${R + 18} ${y - 16} ${R + 22} ${y - 4} Q${R + 20} ${y + 14} ${R} ${y + 13} Q${R - 10} ${y + 12} 100 ${y + 6} Q${L + 10} ${y + 12} ${L} ${y + 13} Q${L - 20} ${y + 14} ${L - 22} ${y - 4} Z" fill="${a.extra}"/>
      <ellipse cx="100" cy="${g.noseY + 6}" rx="21" ry="15" fill="${a.sec}"/>`; },
    nose: (a, g) => `<ellipse cx="100" cy="${g.noseY}" rx="8" ry="5.5" fill="#1f1c22"/><ellipse cx="97.5" cy="${g.noseY - 1.8}" rx="2.3" ry="1.3" fill="#fff" opacity=".6"/>`
  },
  ardilla: {
    ears: (a, g) => pair(`<path d="M60 74 L58 36 Q60 30 66 34 L86 60 Z" fill="${a.fur}" ${S(a.fur)}/><path d="M64 66 L63 44 L78 58 Z" fill="${a.sec}"/><path d="M60 38 l-4 -10 M63 36 l0 -11 M66 37 l4 -9" stroke="${a.extra}" stroke-width="3" stroke-linecap="round"/>`),
    behind: (a, g) => `<path d="M132 176 C 196 162 198 70 156 40 C 134 26 116 46 132 60 C 158 76 164 128 126 154 Z" fill="${a.extra}" ${S(a.extra)}/><path d="M140 150 C 172 130 170 84 150 62" stroke="${shade(a.extra, .35)}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".6"/>`,
    face: (a, g) => `<ellipse cx="86" cy="${g.noseY + 5}" rx="17" ry="13" fill="${a.sec}"/><ellipse cx="114" cy="${g.noseY + 5}" rx="17" ry="13" fill="${a.sec}"/>`,
    nose: (a, g) => `<path d="M95 ${g.noseY - 3} Q100 ${g.noseY - 6} 105 ${g.noseY - 3} Q103 ${g.noseY + 3} 100 ${g.noseY + 3} Q97 ${g.noseY + 3} 95 ${g.noseY - 3} Z" fill="#6b3a2a"/>`
  },
  elefante: {
    behind: (a, g) => [0, 1].map(i => { const e = `<ellipse cx="44" cy="${g.cy - 2}" rx="34" ry="42" fill="${a.fur}" ${S(a.fur)} transform="rotate(-12 44 ${g.cy})"/><ellipse cx="46" cy="${g.cy}" rx="21" ry="29" fill="${a.sec}" transform="rotate(-12 44 ${g.cy})"/>`; return `<g class="av-ear ${i ? 'r' : 'l'}">${i ? mirror(e) : e}</g>`; }).join(''),
    nose: (a, g) => { const y = g.noseY; return `<path d="M111 ${y + 12} q10 4 12 14" stroke="${a.extra}" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M89 ${y + 12} q-10 4 -12 14" stroke="${a.extra}" stroke-width="6" fill="none" stroke-linecap="round"/>
      <path d="M91 ${y - 8} Q88 ${y + 22} 95 ${y + 40} Q100 ${y + 48} 108 ${y + 42} Q114 ${y + 36} 108 ${y + 30} Q104 ${y + 30} 104 ${y + 34} Q100 ${y + 20} 109 ${y - 8} Z" fill="${a.fur}" ${S(a.fur)}/>
      <path d="M93 ${y + 8} q7 3 13 0 M93 ${y + 16} q7 3 12 0 M95 ${y + 24} q6 3 10 0" stroke="${shade(a.fur, -.3)}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`; },
    mouthFirst: true
  },
  jirafa: {
    ears: (a, g) => pair(`<ellipse cx="46" cy="${g.eyeY - 14}" rx="18" ry="8" fill="${a.fur}" ${S(a.fur)} transform="rotate(-25 46 ${g.eyeY - 14})"/><ellipse cx="48" cy="${g.eyeY - 14}" rx="10" ry="4" fill="${a.sec}" transform="rotate(-25 46 ${g.eyeY - 14})"/>`),
    extra: (a, g) => [0, 1].map(i => { const e = `<path d="M84 ${top(g) + 8} L80 ${top(g) - 20}" stroke="${shade(a.fur, -.1)}" stroke-width="7" stroke-linecap="round"/><circle cx="80" cy="${top(g) - 22}" r="7" fill="${a.extra}" ${S(a.extra, 2)}/>`; return i ? mirror(e) : e; }).join(''),
    face: (a, g) => `<ellipse cx="100" cy="${g.noseY + 2}" rx="27" ry="19" fill="${a.sec}"/>`,
    nose: (a, g) => `<ellipse cx="92" cy="${g.noseY}" rx="3" ry="4" fill="${shade(a.fur, -.5)}"/><ellipse cx="108" cy="${g.noseY}" rx="3" ry="4" fill="${shade(a.fur, -.5)}"/>`
  },
  mono: {
    ears: (a, g) => pair(`<circle cx="46" cy="${g.eyeY + 4}" r="15" fill="${a.fur}" ${S(a.fur)}/><circle cx="47" cy="${g.eyeY + 5}" r="8.5" fill="${a.sec}"/>`),
    face: (a, g) => `<path d="M100 ${g.eyeY - 12} C 86 ${g.eyeY - 30} 58 ${g.eyeY - 20} 62 ${g.eyeY + 6} C 64 ${g.cy + 30} 84 ${g.cy + 44} 100 ${g.cy + 44} C 116 ${g.cy + 44} 136 ${g.cy + 30} 138 ${g.eyeY + 6} C 142 ${g.eyeY - 20} 114 ${g.eyeY - 30} 100 ${g.eyeY - 12} Z" fill="${a.sec}"/>`,
    extra: (a, g) => `<path d="M96 ${top(g) + 4} q-2 -12 6 -16 M102 ${top(g) + 4} q2 -10 10 -12" stroke="${a.fur}" stroke-width="5" fill="none" stroke-linecap="round"/>`,
    nose: (a, g) => `<ellipse cx="96" cy="${g.noseY}" rx="2.2" ry="3" fill="${shade(a.sec, -.5)}"/><ellipse cx="104" cy="${g.noseY}" rx="2.2" ry="3" fill="${shade(a.sec, -.5)}"/>`
  },
  vaca: {
    ears: (a, g) => pair(`<ellipse cx="44" cy="${g.eyeY - 8}" rx="19" ry="9" fill="${a.fur}" ${S(a.fur)} transform="rotate(-20 44 ${g.eyeY - 8})"/><ellipse cx="46" cy="${g.eyeY - 8}" rx="11" ry="5" fill="${a.sec}" transform="rotate(-20 44 ${g.eyeY - 8})"/>`),
    extra: (a, g) => [0, 1].map(i => { const e = `<path d="M70 ${top(g) + 10} Q60 ${top(g) - 6} 66 ${top(g) - 18} Q74 ${top(g) - 4} 80 ${top(g) + 6} Z" fill="#fff1d0" ${S('#fff1d0', 2.5)}/>`; return i ? mirror(e) : e; }).join('') + `<path d="M92 ${top(g) + 6} q4 -12 10 -4 q4 -10 8 2" fill="${a.extra}"/>`,
    face: (a, g) => `<ellipse cx="100" cy="${g.noseY + 4}" rx="32" ry="20" fill="${a.sec}" ${S(a.sec, 2.5)}/>`,
    nose: (a, g) => `<ellipse cx="89" cy="${g.noseY}" rx="4.5" ry="6" fill="${shade(a.sec, -.45)}"/><ellipse cx="111" cy="${g.noseY}" rx="4.5" ry="6" fill="${shade(a.sec, -.45)}"/>`
  },
  oveja: {
    behind: (a, g) => { let s = ''; const n = 14; for (let i = 0; i < n; i++) { const t = i / n * Math.PI * 2; s += `<circle cx="${(100 + Math.cos(t) * 56).toFixed(1)}" cy="${(g.cy - 6 + Math.sin(t) * 54).toFixed(1)}" r="20" fill="${a.sec}" stroke="${shade(a.sec, -.14)}" stroke-width="2.5"/>`; } return s + `<ellipse cx="100" cy="${g.cy - 6}" rx="58" ry="56" fill="${a.sec}"/>`; },
    ears: (a, g) => pair(`<ellipse cx="50" cy="${g.eyeY + 2}" rx="17" ry="8" fill="${a.fur}" ${S(a.fur)} transform="rotate(25 50 ${g.eyeY})"/><ellipse cx="51" cy="${g.eyeY + 2}" rx="10" ry="4" fill="${a.extra}" transform="rotate(25 50 ${g.eyeY})"/>`),
    extra: (a, g) => [[88, 0, 11], [100, -4, 12], [112, 0, 11], [94, 8, 9], [106, 8, 9]].map(([x, dy, r]) => `<circle cx="${x}" cy="${top(g) + 6 + dy}" r="${r}" fill="${a.sec}" stroke="${shade(a.sec, -.14)}" stroke-width="2"/>`).join(''),
    nose: (a, g) => `<path d="M95 ${g.noseY - 2} Q100 ${g.noseY + 3} 105 ${g.noseY - 2}" stroke="${shade(a.fur, -.5)}" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M100 ${g.noseY + 1} v4" stroke="${shade(a.fur, -.5)}" stroke-width="2.5" stroke-linecap="round"/>`
  },
  pollito: {
    extra: (a, g) => `<path d="M96 ${top(g) + 3} q-10 -14 2 -18 M100 ${top(g) + 2} q2 -16 12 -14 M104 ${top(g) + 4} q10 -8 16 0" stroke="${shade(a.fur, -.12)}" stroke-width="5" fill="none" stroke-linecap="round"/>`,
    nose: (a, g) => `<path d="M88 ${g.noseY - 4} Q100 ${g.noseY - 12} 112 ${g.noseY - 4} Q100 ${g.noseY + 2} 88 ${g.noseY - 4} Z" fill="${a.extra}" ${S(a.extra, 2)}/><path d="M91 ${g.noseY - 2} Q100 ${g.noseY + 10} 109 ${g.noseY - 2} Z" fill="${shade(a.extra, -.12)}" ${S(a.extra, 2)}/>`
  },
  dragon: {
    ears: (a, g) => pair(`<path d="M50 96 L20 74 L32 98 L16 108 L42 112 L50 104 Z" fill="${a.extra}" ${S(a.extra, 2.5)} opacity=".95"/>`),
    extra: (a, g) => [0, 1].map(i => { const e = `<path d="M76 ${top(g) + 10} Q62 ${top(g) - 8} 50 ${top(g) - 12} Q64 ${top(g) - 2} 70 ${top(g) + 14} Z" fill="${a.extra}" ${S(a.extra, 2.5)}/>`; return i ? mirror(e) : e; }).join('') + [90, 100, 110].map((x, i) => `<path d="M${x - 5} ${top(g) + 4 + (i === 1 ? -2 : 0)} L${x} ${top(g) - 8 + (i === 1 ? -4 : 0)} L${x + 5} ${top(g) + 4 + (i === 1 ? -2 : 0)} Z" fill="${shade(a.extra, -.1)}" ${S(a.extra, 2)}/>`).join(''),
    face: (a, g) => `<ellipse cx="100" cy="${g.noseY + 4}" rx="27" ry="18" fill="${a.sec}"/>`,
    nose: (a, g) => `<path d="M92 ${g.noseY - 1} q2 -3 5 0 M103 ${g.noseY - 1} q3 -3 5 0" stroke="${shade(a.fur, -.5)}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`
  },
  ajolote: {
    behind: (a, g) => [0, 1].map(i => { const stalk = (y1, x2, y2) => `<path d="M58 ${y1} Q${(58 + x2) / 2} ${(y1 + y2) / 2 - 6} ${x2} ${y2}" stroke="${a.extra}" stroke-width="7" fill="none" stroke-linecap="round"/>` + [0.35, 0.6, 0.85].map(t => { const x = 58 + (x2 - 58) * t, y = y1 + (y2 - y1) * t - 4; return `<circle cx="${x.toFixed(1)}" cy="${(y - 5).toFixed(1)}" r="3.4" fill="${shade(a.extra, .25)}"/><circle cx="${x.toFixed(1)}" cy="${(y + 5).toFixed(1)}" r="3.4" fill="${shade(a.extra, .25)}"/>`; }).join('');
      const e = stalk(g.cy - 18, 18, g.cy - 42) + stalk(g.cy - 4, 12, g.cy - 8) + stalk(g.cy + 10, 20, g.cy + 28); return `<g class="av-ear ${i ? 'r' : 'l'}">${i ? mirror(e) : e}</g>`; }).join(''),
    face: (a, g) => `<ellipse cx="100" cy="${g.cy + 18}" rx="40" ry="18" fill="${a.sec}" opacity=".85"/>`,
    nose: (a, g) => `<circle cx="95" cy="${g.noseY}" r="1.6" fill="${shade(a.fur, -.45)}"/><circle cx="105" cy="${g.noseY}" r="1.6" fill="${shade(a.fur, -.45)}"/>`,
    wide: true
  },
  jaguar: {
    ears: (a, g) => pair(`<circle cx="56" cy="66" r="16" fill="${a.fur}" ${S(a.fur)}/><circle cx="57" cy="67" r="8.5" fill="${a.extra}" opacity=".8"/><circle cx="57" cy="68" r="4" fill="${a.sec}"/>`),
    face: (a, g) => `<ellipse cx="89" cy="${g.noseY + 7}" rx="14" ry="10.5" fill="${a.sec}"/><ellipse cx="111" cy="${g.noseY + 7}" rx="14" ry="10.5" fill="${a.sec}"/>`,
    nose: (a, g) => `<g stroke="${shade(a.fur, -.45)}" stroke-width="1.8" stroke-linecap="round" opacity=".7"><path d="M72 ${g.noseY + 4} L50 ${g.noseY}"/><path d="M72 ${g.noseY + 9} L50 ${g.noseY + 11}"/><path d="M128 ${g.noseY + 4} L150 ${g.noseY}"/><path d="M128 ${g.noseY + 9} L150 ${g.noseY + 11}"/></g><path d="M93 ${g.noseY - 3} Q100 ${g.noseY - 7} 107 ${g.noseY - 3} Q104 ${g.noseY + 3} 100 ${g.noseY + 4} Q96 ${g.noseY + 3} 93 ${g.noseY - 3} Z" fill="#b5566a"/>`
  },
  perezoso: {
    face: (a, g) => { const L = 100 - g.eyeGap, R = 100 + g.eyeGap; return `<ellipse cx="100" cy="${g.cy + 4}" rx="45" ry="36" fill="${a.sec}"/>
      <ellipse cx="${L - 3}" cy="${g.eyeY + 5}" rx="10" ry="15" fill="${a.extra}" transform="rotate(35 ${L} ${g.eyeY})"/><ellipse cx="${R + 3}" cy="${g.eyeY + 5}" rx="10" ry="15" fill="${a.extra}" transform="rotate(-35 ${R} ${g.eyeY})"/>
      <path d="M78 ${top(g) + 14} Q100 ${top(g) + 4} 122 ${top(g) + 14}" stroke="${shade(a.fur, -.18)}" stroke-width="4" fill="none" stroke-linecap="round"/>`; },
    nose: (a, g) => `<ellipse cx="100" cy="${g.noseY}" rx="8" ry="5.5" fill="#3a2a22"/><ellipse cx="97.5" cy="${g.noseY - 1.8}" rx="2.3" ry="1.3" fill="#fff" opacity=".6"/>`
  },
  llama: {
    ears: (a, g) => pair(`<path d="M64 76 C 50 52 52 26 62 16 C 72 26 78 50 78 72 Z" fill="${a.fur}" ${S(a.fur)}/><path d="M66 66 C 58 50 58 34 63 26 C 69 36 72 50 72 64 Z" fill="${a.extra}" opacity=".55"/>`),
    extra: (a, g) => [[88, 2, 11], [100, -3, 13], [112, 2, 11], [94, -9, 9], [106, -9, 9]].map(([x, dy, r]) => `<circle cx="${x}" cy="${top(g) + 4 + dy}" r="${r}" fill="${a.sec}" stroke="${shade(a.fur, -.2)}" stroke-width="2"/>`).join(''),
    face: (a, g) => `<ellipse cx="100" cy="${g.noseY + 4}" rx="23" ry="18" fill="${a.sec}"/>`,
    nose: (a, g) => `<path d="M95 ${g.noseY - 3} q5 5 10 0 M100 ${g.noseY + 1} v5" stroke="${shade(a.fur, -.55)}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`
  }
};

// Patrones extra
export function extraPattern(p, a, g) {
  const c = a.extra;
  if (p === 'rosetas') return [[70, -30], [96, -40], [124, -32], [140, -8], [60, -6], [78, 18], [128, 20], [112, -18], [86, -14]].map(([x, dy], i) => `<circle cx="${x}" cy="${g.cy + dy}" r="${4 + (i % 3)}" fill="none" stroke="${c}" stroke-width="2.6" stroke-dasharray="${5 + i % 3} 3"/>`).join('');
  if (p === 'jirafa') return [[70, -30, 11], [102, -42, 9], [132, -26, 12], [58, 4, 8], [146, 4, 9], [84, -8, 7], [120, -6, 7]].map(([x, dy, r], i) => `<path d="M${x - r} ${g.cy + dy} q${r * .3} ${-r * 1.1} ${r * 1.1} ${-r * .8} q${r * .9} ${r * .2} ${r * .9} ${r * 1.1} q${-r * .2} ${r} ${-r * 1.1} ${r * .8} q${-r * .9} ${-r * .1} ${-r * .9} ${-r * 1.1} Z" fill="${c}" opacity=".9"/>`).join('');
  if (p === 'vaca') return `<path d="M${g.cx - g.rx} ${g.cy - 20} q20 -14 30 4 q6 16 -12 22 q-14 4 -18 -6 Z" fill="${c}"/><path d="M${g.cx + g.rx - 30} ${g.cy - g.ry + 6} q22 -4 28 14 q2 16 -14 14 q-18 -2 -14 -28 Z" fill="${c}"/>`;
  return '';
}
