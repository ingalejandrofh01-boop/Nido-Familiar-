// ============================================================
//  TEMAS POR TEMPORADA: paleta, escena SVG, adornos y partículas
// ============================================================

// generador aleatorio con semilla (escenas estables)
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

const VB = 'viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice"';

function stars(n, seed, maxY = 600, color = '#fff') {
  const r = rng(seed); let s = '';
  for (let i = 0; i < n; i++) {
    const x = r() * 1600, y = r() * maxY, rad = r() * 1.6 + 0.3;
    s += `<circle class="tw" style="animation-delay:${(r() * 5).toFixed(2)}s;animation-duration:${(2 + r() * 4).toFixed(2)}s" cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${rad.toFixed(2)}" fill="${color}"/>`;
  }
  return s;
}
function pine(x, y, h, color, snow) {
  const w = h * 0.42; let s = `<rect x="${x - h * 0.03}" y="${y - h * 0.12}" width="${h * 0.06}" height="${h * 0.14}" fill="#2b1a12"/>`;
  for (let i = 0; i < 3; i++) {
    const ty = y - h * 0.1 - i * h * 0.27, tw = w * (1 - i * 0.22), th = h * 0.42;
    s += `<path d="M${x - tw} ${ty} L${x} ${ty - th} L${x + tw} ${ty} Z" fill="${color}"/>`;
    if (snow) s += `<path d="M${x - tw * 0.45} ${ty - th * 0.55} Q${x} ${ty - th * 0.45} ${x + tw * 0.45} ${ty - th * 0.55} L${x} ${ty - th} Z" fill="${snow}"/>`;
  }
  return s;
}
function hillsPath(y0, amp, seed, n = 7) {
  const r = rng(seed); let d = `M0 900 L0 ${y0}`;
  const step = 1600 / n;
  for (let i = 0; i < n; i++) {
    const x1 = i * step + step / 2, x2 = (i + 1) * step;
    d += ` Q${x1} ${y0 - amp * (0.4 + r())} ${x2} ${y0 + (r() - 0.5) * amp * 0.5}`;
  }
  return d + ' L1600 900 Z';
}
function mountains(y0, peaks, seed, h = 260) {
  const r = rng(seed); let d = `M0 900 L0 ${y0}`; const pts = [];
  const step = 1600 / peaks;
  for (let i = 0; i < peaks; i++) {
    const px = i * step + step * (0.3 + r() * 0.4), py = y0 - h * (0.5 + r() * 0.5);
    d += ` L${px} ${py} L${(i + 1) * step} ${y0 - h * r() * 0.3}`; pts.push([px, py]);
  }
  return { d: d + ' L1600 900 Z', pts };
}
function snowCaps(pts, color = '#fff') {
  return pts.map(([x, y]) => `<path d="M${x} ${y} L${x - 38} ${y + 44} Q${x - 18} ${y + 34} ${x - 6} ${y + 50} Q${x + 10} ${y + 36} ${x + 24} ${y + 48} L${x + 40} ${y + 46} Z" fill="${color}" opacity=".95"/>`).join('');
}
function skyline(y0, seed, color, winColor, winOpacity = 0.7) {
  const r = rng(seed); let s = '', x = 0;
  while (x < 1600) {
    const w = 40 + r() * 90, h = 80 + r() * 260;
    s += `<rect x="${x}" y="${y0 - h}" width="${w}" height="${h + 200}" fill="${color}"/>`;
    if (r() < 0.3) s += `<rect x="${x + w / 2 - 2}" y="${y0 - h - 30}" width="4" height="30" fill="${color}"/>`;
    for (let wy = y0 - h + 14; wy < y0 - 10; wy += 18) for (let wx = x + 8; wx < x + w - 10; wx += 14)
      if (r() < 0.35) s += `<rect class="${r() < 0.15 ? 'flick' : ''}" style="animation-delay:${(r() * 6).toFixed(1)}s" x="${wx}" y="${wy}" width="6" height="9" fill="${winColor}" opacity="${(winOpacity * (0.4 + r() * 0.6)).toFixed(2)}"/>`;
    x += w + 2;
  }
  return s;
}
function flower(x, y, r, petal, center, n = 10) {
  let s = '';
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; s += `<ellipse cx="${(x + Math.cos(a) * r * .6).toFixed(1)}" cy="${(y + Math.sin(a) * r * .6).toFixed(1)}" rx="${r * .5}" ry="${r * .3}" transform="rotate(${a * 57.3} ${(x + Math.cos(a) * r * .6).toFixed(1)} ${(y + Math.sin(a) * r * .6).toFixed(1)})" fill="${petal}"/>`; }
  return s + `<circle cx="${x}" cy="${y}" r="${r * .35}" fill="${center}"/>`;
}
function marigold(x, y, r, seed) {
  const rr = rng(seed); let s = '';
  for (let k = 3; k > 0; k--) {
    const rad = r * k / 3, n = 8 + k * 5;
    for (let i = 0; i < n; i++) { const a = i / n * 6.283 + rr(); s += `<circle cx="${(x + Math.cos(a) * rad * .7).toFixed(1)}" cy="${(y + Math.sin(a) * rad * .7).toFixed(1)}" r="${(r * .28).toFixed(1)}" fill="${['#ff8c00', '#ffa500', '#ffb700', '#ff7b00'][k % 4]}"/>`; }
  }
  return s + `<circle cx="${x}" cy="${y}" r="${r * .22}" fill="#e05a00"/>`;
}
function candle(x, y, h, i) {
  return `<g><rect x="${x - 7}" y="${y - h}" width="14" height="${h}" rx="3" fill="#f7ecd9"/><rect x="${x - 7}" y="${y - h}" width="14" height="6" rx="3" fill="#fff"/>
  <ellipse class="glow-pulse" style="animation-delay:${i * .37}s" cx="${x}" cy="${y - h - 10}" rx="34" ry="34" fill="url(#flameGlow)"/>
  <path class="flame" style="animation-delay:${i * .21}s;transform-origin:${x}px ${y - h}px" d="M${x} ${y - h - 22} Q${x + 7} ${y - h - 8} ${x} ${y - h} Q${x - 7} ${y - h - 8} ${x} ${y - h - 22}Z" fill="#ffd166"/></g>`;
}

// ---------------- ESCENAS ----------------
const scenes = {
  navidad() {
    const m1 = mountains(620, 6, 11, 300), m2 = mountains(680, 8, 23, 170);
    let trees = ''; const r = rng(5);
    for (let i = 0; i < 26; i++) { const x = r() * 1600; trees += pine(x, 740 + r() * 30, 70 + r() * 60, '#16343f', '#e8f1ff'); }
    let front = ''; for (let i = 0; i < 9; i++) { const x = i * 190 + r() * 80; if (x > 900 && x < 1250) continue; front += pine(x, 880 + r() * 20, 180 + r() * 90, '#0c2626', '#f4f9ff'); }
    return `<svg ${VB}><defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050b22"/><stop offset=".45" stop-color="#0d2352"/><stop offset=".8" stop-color="#2c4f88"/><stop offset="1" stop-color="#6c88b8"/></linearGradient>
      <linearGradient id="aur" x1="0" x2="1"><stop offset="0" stop-color="#00ffa3" stop-opacity="0"/><stop offset=".3" stop-color="#3cffb4" stop-opacity=".55"/><stop offset=".65" stop-color="#52a7ff" stop-opacity=".45"/><stop offset="1" stop-color="#b06bff" stop-opacity="0"/></linearGradient>
      <radialGradient id="mg"><stop offset="0" stop-color="#fff8e1" stop-opacity=".7"/><stop offset="1" stop-color="#fff8e1" stop-opacity="0"/></radialGradient>
      <radialGradient id="wg"><stop offset="0" stop-color="#ffcf6b" stop-opacity=".9"/><stop offset="1" stop-color="#ff9a3c" stop-opacity="0"/></radialGradient>
      <filter id="b30"><feGaussianBlur stdDeviation="30"/></filter></defs>
      <rect width="1600" height="900" fill="url(#sky)"/>${stars(160, 3, 520)}
      <g class="aurora" filter="url(#b30)"><path d="M-100 260 C200 120 400 330 700 200 S1200 90 1700 230 L1700 330 C1300 200 1000 380 700 300 S200 260 -100 360Z" fill="url(#aur)"/></g>
      <circle cx="1280" cy="160" r="170" fill="url(#mg)"/><circle cx="1280" cy="160" r="52" fill="#fdf6e3"/><circle cx="1262" cy="150" r="9" fill="#efe6cc"/><circle cx="1295" cy="175" r="6" fill="#efe6cc"/>
      <path d="${m1.d}" fill="#8ea8d2" opacity=".75"/>${snowCaps(m1.pts, '#f4f8ff')}
      <path d="${m2.d}" fill="#b8cbe8"/>${snowCaps(m2.pts, '#ffffff')}
      <path d="${hillsPath(760, 70, 7)}" fill="#dfe9f7"/>${trees}
      <g transform="translate(1030 770)">
        <circle cx="90" cy="20" r="160" fill="url(#wg)" class="glow-pulse"/>
        <rect x="0" y="-40" width="190" height="110" fill="#4a2f22"/>        <path d="M-25 -35 L95 -120 L215 -35 Z" fill="#2c1c15"/><path d="M-30 -32 Q20 -60 95 -125 Q170 -60 220 -32 Q180 -44 160 -38 Q120 -52 95 -40 Q60 -54 30 -38 Q0 -46 -30 -32Z" fill="#f7fbff"/>
        <rect x="140" y="-120" width="24" height="50" fill="#3a2319"/><rect x="136" y="-126" width="32" height="10" fill="#f7fbff"/>
        <circle class="smoke" cx="152" cy="-140" r="12" fill="#cfd8e6" opacity=".5"/><circle class="smoke" style="animation-delay:1.3s" cx="152" cy="-140" r="10" fill="#cfd8e6" opacity=".5"/><circle class="smoke" style="animation-delay:2.6s" cx="152" cy="-140" r="14" fill="#cfd8e6" opacity=".5"/>
        <rect class="flick" x="22" y="-10" width="42" height="40" fill="#ffcf6b"/><rect x="41" y="-10" width="4" height="40" fill="#4a2f22"/><rect x="22" y="8" width="42" height="4" fill="#4a2f22"/>
        <rect x="120" y="-10" width="42" height="40" fill="#ffc15a"/><rect x="139" y="-10" width="4" height="40" fill="#4a2f22"/><rect x="120" y="8" width="42" height="4" fill="#4a2f22"/>
        <rect x="78" y="15" width="30" height="55" fill="#2c1c15"/><circle cx="93" cy="8" r="12" fill="#1f5c3a" stroke="#c62828" stroke-width="3"/>
      </g>
      <path d="${hillsPath(840, 50, 17, 5)}" fill="#eef4fd"/>${front}
      <path d="${hillsPath(880, 30, 31, 4)}" fill="#f8fbff"/></svg>`;
  },

  halloween() {
    const r = rng(9); let graves = '', pumpkins = '';
    for (let i = 0; i < 7; i++) { const x = 80 + i * 230 + r() * 60, h = 50 + r() * 40; graves += `<path d="M${x} 860 L${x} ${860 - h} Q${x + 25} ${840 - h - 20} ${x + 50} ${860 - h} L${x + 50} 860Z" fill="#140a1c"/><rect x="${x + 18}" y="${870 - h}" width="14" height="3" fill="#2a1638"/>`; }
    [[240, 880, 46], [340, 890, 30], [1380, 880, 52], [1480, 892, 32]].forEach(([x, y, s], i) => {
      pumpkins += `<g><ellipse cx="${x}" cy="${y}" rx="${s * 1.6}" ry="${s * 1.3}" fill="url(#pglow)" class="glow-pulse" style="animation-delay:${i * .4}s"/>
      <ellipse cx="${x - s * .45}" cy="${y}" rx="${s * .6}" ry="${s * .85}" fill="#d9600f"/><ellipse cx="${x + s * .45}" cy="${y}" rx="${s * .6}" ry="${s * .85}" fill="#d9600f"/><ellipse cx="${x}" cy="${y}" rx="${s * .6}" ry="${s * .9}" fill="#f07b16"/>
      <rect x="${x - 4}" y="${y - s * 1.05}" width="8" height="${s * .3}" rx="3" fill="#3b5b1e"/>
      <path class="flick" d="M${x - s * .5} ${y - s * .2} l${s * .2} ${-s * .25} l${s * .2} ${s * .25}Z M${x + s * .1} ${y - s * .2} l${s * .2} ${-s * .25} l${s * .2} ${s * .25}Z M${x - s * .55} ${y + s * .15} Q${x} ${y + s * .6} ${x + s * .55} ${y + s * .15} l-${s * .15} ${s * .12} l-${s * .12} -${s * .1} l-${s * .14} ${s * .12} l-${s * .14} -${s * .12} l-${s * .12} ${s * .1}Z" fill="#ffd54a"/></g>`;
    });
    return `<svg ${VB}><defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05020a"/><stop offset=".45" stop-color="#1c0a2c"/><stop offset=".8" stop-color="#3b1244"/><stop offset="1" stop-color="#5e2437"/></linearGradient>
      <radialGradient id="moon"><stop offset="0" stop-color="#fff4c2"/><stop offset=".6" stop-color="#ffc163"/><stop offset="1" stop-color="#e8801f"/></radialGradient>
      <radialGradient id="mglow"><stop offset="0" stop-color="#ff9a3c" stop-opacity=".55"/><stop offset="1" stop-color="#ff9a3c" stop-opacity="0"/></radialGradient>
      <radialGradient id="pglow"><stop offset="0" stop-color="#ffb347" stop-opacity=".7"/><stop offset="1" stop-color="#ff7b00" stop-opacity="0"/></radialGradient>
      <filter id="b8"><feGaussianBlur stdDeviation="8"/></filter></defs>
      <rect width="1600" height="900" fill="url(#sky)"/>${stars(70, 8, 450, '#e9d8ff')}
      <circle cx="1080" cy="300" r="380" fill="url(#mglow)" class="glow-pulse"/>
      <circle cx="1080" cy="300" r="190" fill="url(#moon)"/><circle cx="1020" cy="250" r="28" fill="#f2b25a" opacity=".5"/><circle cx="1140" cy="340" r="40" fill="#f2b25a" opacity=".45"/><circle cx="1110" cy="220" r="16" fill="#f2b25a" opacity=".5"/>
      <g class="cloud-drift" filter="url(#b8)" opacity=".85"><ellipse cx="900" cy="330" rx="220" ry="26" fill="#1a0b25"/><ellipse cx="1200" cy="250" rx="170" ry="20" fill="#1a0b25"/></g>
      <path d="${hillsPath(700, 110, 41, 5)}" fill="#1a0b22"/>
      <g transform="translate(260 520)" fill="#0b0510">
        <path d="M0 200 L0 60 L40 60 L40 20 L20 -40 L60 -110 L100 -40 L80 20 L80 60 L180 60 L180 0 L230 -80 L280 0 L280 60 L330 60 L330 200Z"/>
        <rect x="200" y="-10" width="60" height="70"/><path d="M190 -10 L230 -60 L270 -10Z"/>
        <rect class="flick" x="50" y="-30" width="18" height="26" rx="9" fill="#ffae42"/><rect x="120" y="90" width="22" height="30" fill="#ff9a2a" class="flick" style="animation-delay:1.2s"/><rect x="215" y="10" width="14" height="20" fill="#ffc15a"/><rect x="250" y="100" width="22" height="30" fill="#ff9a2a"/><rect x="25" y="100" width="22" height="30" fill="#ffb347" class="flick" style="animation-delay:2.1s"/>
      </g>
      <g stroke="#07030b" stroke-linecap="round" fill="none">
        <path d="M1380 900 C1370 760 1400 650 1360 520" stroke-width="44"/>
        <path d="M1365 600 C1300 540 1260 520 1180 500" stroke-width="18"/><path d="M1240 512 C1210 470 1200 440 1170 420" stroke-width="9"/>
        <path d="M1370 560 C1440 500 1480 470 1560 450" stroke-width="16"/><path d="M1500 462 C1530 420 1550 400 1590 390" stroke-width="7"/>
        <path d="M1362 530 C1350 460 1330 420 1300 370" stroke-width="12"/><path d="M1310 385 C1280 350 1260 340 1230 330" stroke-width="6"/>
        <path d="M1365 700 C1420 680 1460 660 1520 650" stroke-width="10"/>
      </g>
      <path d="M1180 500 l0 40" stroke="#555" stroke-width="1.5"/><circle cx="1180" cy="548" r="8" fill="#0b0510"/>
      ${graves}<path d="${hillsPath(860, 30, 43, 4)}" fill="#07030b"/>${pumpkins}</svg>`;
  },

  muertos() {
    const r = rng(12); let flowers = '', candles = '';
    for (let i = 0; i < 26; i++) { const side = i % 2 ? 1600 - r() * 420 : r() * 420; flowers += marigold(side, 800 + r() * 120, 18 + r() * 16, i + 3); }
    [620, 700, 780, 820, 900, 980].forEach((x, i) => candles += candle(x, 870 - (i % 2) * 12, 50 + (i * 17) % 40, i));
    return `<svg ${VB}><defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14052a"/><stop offset=".4" stop-color="#43104f"/><stop offset=".72" stop-color="#95265c"/><stop offset="1" stop-color="#f08a24"/></linearGradient>
      <radialGradient id="flameGlow"><stop offset="0" stop-color="#ffd166" stop-opacity=".8"/><stop offset="1" stop-color="#ff7b00" stop-opacity="0"/></radialGradient>
      <radialGradient id="hglow" cx=".5" cy="1" r=".8"><stop offset="0" stop-color="#ffb347" stop-opacity=".6"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient></defs>
      <rect width="1600" height="900" fill="url(#sky)"/>${stars(110, 14, 420, '#ffe8f7')}
      <rect y="500" width="1600" height="400" fill="url(#hglow)"/>
      <path d="${hillsPath(720, 90, 51, 6)}" fill="#3a0e3e"/>
      <g transform="translate(800 740)" fill="#220726">
        <rect x="-150" y="-160" width="300" height="160"/><path d="M-70 -160 Q0 -300 70 -160Z"/><rect x="-6" y="-330" width="12" height="60"/><rect x="-22" y="-310" width="44" height="10"/>
        <rect x="-230" y="-290" width="80" height="290"/><path d="M-240 -290 L-190 -380 L-140 -290Z"/><rect x="150" y="-290" width="80" height="290"/><path d="M140 -290 L190 -380 L240 -290Z"/>
        <path d="M-40 0 L-40 -80 Q0 -120 40 -80 L40 0Z" fill="#ffb347" opacity=".85" class="flick"/>
        <circle cx="-190" cy="-230" r="14" fill="#ffc163" opacity=".8"/><circle cx="190" cy="-230" r="14" fill="#ffc163" opacity=".8"/><circle cx="0" cy="-200" r="22" fill="#ffc163" opacity=".6"/>
      </g>
      <path d="${hillsPath(840, 40, 53, 4)}" fill="#1b0520"/>${candles}${flowers}</svg>`;
  },

  anio_nuevo() {
    return `<svg ${VB}><defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#01020a"/><stop offset=".6" stop-color="#0a0f2e"/><stop offset="1" stop-color="#241f52"/></linearGradient>
      <linearGradient id="hz" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd27a" stop-opacity="0"/><stop offset="1" stop-color="#ffd27a" stop-opacity=".25"/></linearGradient></defs>
      <rect width="1600" height="900" fill="url(#sky)"/>${stars(140, 21, 600)}<rect y="600" width="1600" height="300" fill="url(#hz)"/>
      <g opacity=".55">${skyline(820, 3, '#101335', '#ffd27a', .5)}</g>${skyline(900, 7, '#05061a', '#ffe08a', .85)}</svg>`;
  },

  amor() {
    const r = rng(33); let bokeh = '';
    for (let i = 0; i < 40; i++) bokeh += `<circle class="tw" style="animation-duration:${4 + r() * 5}s;animation-delay:${r() * 4}s" cx="${r() * 1600}" cy="${r() * 900}" r="${10 + r() * 60}" fill="${['#ff4d6d', '#ff8fab', '#ffc2d1', '#c9184a'][i % 4]}" opacity="${.08 + r() * .2}"/>`;
    return `<svg ${VB}><defs><linearGradient id="sky" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2b0718"/><stop offset=".5" stop-color="#7a1238"/><stop offset="1" stop-color="#e0527a"/></linearGradient><filter id="b6"><feGaussianBlur stdDeviation="6"/></filter></defs>
      <rect width="1600" height="900" fill="url(#sky)"/><g filter="url(#b6)">${bokeh}</g>
      <path d="M800 820 C 560 660 520 460 680 420 C 740 405 790 440 800 490 C 810 440 860 405 920 420 C 1080 460 1040 660 800 820Z" fill="#ff4d6d" opacity=".18" class="beat"/></svg>`;
  },

  primavera() {
    const r = rng(44); let blossoms = '', fl = '';
    for (let i = 0; i < 70; i++) { const a = r() * 6.28, d = r() * 190; blossoms += `<circle cx="${230 + Math.cos(a) * d * 1.3}" cy="${260 + Math.sin(a) * d * .8}" r="${18 + r() * 26}" fill="${['#ffc2d9', '#ffadc9', '#ffd6e6', '#ff9ebf'][i % 4]}" opacity=".92"/>`; }
    for (let i = 0; i < 40; i++) fl += flower(r() * 1600, 800 + r() * 90, 8 + r() * 6, ['#fff', '#ffd6e6', '#ffe066', '#c3b1ff'][i % 4], '#ffb703', 6);
    return `<svg ${VB}><defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fd8ff"/><stop offset=".6" stop-color="#d7eeff"/><stop offset="1" stop-color="#ffe3ec"/></linearGradient><radialGradient id="sun"><stop offset="0" stop-color="#fffbe0"/><stop offset="1" stop-color="#fffbe0" stop-opacity="0"/></radialGradient></defs>
      <rect width="1600" height="900" fill="url(#sky)"/><circle cx="1250" cy="180" r="240" fill="url(#sun)"/><circle cx="1250" cy="180" r="70" fill="#fff6c9"/>
      <g class="cloud-drift" fill="#fff" opacity=".85"><ellipse cx="500" cy="170" rx="120" ry="34"/><ellipse cx="560" cy="150" rx="80" ry="40"/><ellipse cx="1000" cy="260" rx="140" ry="30"/></g>
      <path d="${hillsPath(680, 90, 61, 5)}" fill="#b7e4c7"/><path d="${hillsPath(760, 70, 63, 6)}" fill="#74c69d"/><path d="${hillsPath(840, 40, 65, 4)}" fill="#52b788"/>
      <path d="M240 900 C250 760 200 620 260 480 C280 420 250 360 200 300 M255 520 C320 440 380 400 430 330 M235 600 C160 540 110 470 80 380" stroke="#6b4226" stroke-width="30" fill="none" stroke-linecap="round"/>
      <g class="sway" style="transform-origin:240px 600px">${blossoms}</g>${fl}</svg>`;
  },

  madres() {
    const r = rng(55); let fl = '';
    for (let i = 0; i < 26; i++) { const x = r() * 1600, y = 760 + r() * 130, h = 80 + r() * 90; fl += `<path d="M${x} 900 Q${x + 10} ${y + 40} ${x} ${y}" stroke="#4f9d69" stroke-width="5" fill="none"/>` + flower(x, y, 20 + r() * 14, ['#ff8fab', '#c77dff', '#ffafcc', '#ff5d8f', '#e0aaff'][i % 5], '#ffd166', 9); }
    return `<svg ${VB}><defs><linearGradient id="sky" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fde2f3"/><stop offset=".55" stop-color="#f3d1f4"/><stop offset="1" stop-color="#d9c2ff"/></linearGradient><radialGradient id="g"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
      <rect width="1600" height="900" fill="url(#sky)"/><circle cx="800" cy="380" r="420" fill="url(#g)"/>
      <path d="M800 640 C 560 480 520 280 680 240 C 740 225 790 260 800 310 C 810 260 860 225 920 240 C 1080 280 1040 480 800 640Z" fill="#ff8fab" opacity=".22" class="beat"/>
      <path d="${hillsPath(820, 50, 71, 5)}" fill="#e7c6ef"/>${fl}</svg>`;
  },

  verano() {
    let rays = ''; for (let i = 0; i < 16; i++) rays += `<rect x="-6" y="-340" width="12" height="160" rx="6" fill="#fff3b0" opacity=".45" transform="rotate(${i * 22.5})"/>`;
    const palm = (x, s, flip) => `<g transform="translate(${x} 900) scale(${flip ? -s : s} ${s})"><path d="M0 0 C 10 -120 30 -240 70 -330" stroke="#5b3a1e" stroke-width="18" fill="none" stroke-linecap="round"/>
      <g fill="#1b5e20" transform="translate(70 -330)"><path d="M0 0 C 60 -60 140 -50 190 10 C 120 -20 60 -10 0 0Z"/><path d="M0 0 C -40 -80 -130 -90 -190 -40 C -110 -50 -60 -30 0 0Z"/><path d="M0 0 C 30 -90 10 -160 -40 -200 C 0 -140 5 -80 0 0Z"/><path d="M0 0 C 90 10 150 70 160 140 C 110 70 60 30 0 0Z"/><path d="M0 0 C -80 20 -140 80 -150 150 C -100 80 -50 40 0 0Z"/></g></g>`;
    return `<svg ${VB}><defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e9be0"/><stop offset=".55" stop-color="#8fd6ff"/><stop offset=".72" stop-color="#ffe3a6"/></linearGradient>
      <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a7bc2"/><stop offset="1" stop-color="#3fc1e8"/></linearGradient><radialGradient id="sg"><stop offset="0" stop-color="#fff7c2"/><stop offset="1" stop-color="#fff7c2" stop-opacity="0"/></radialGradient></defs>
      <rect width="1600" height="900" fill="url(#sky)"/>
      <g transform="translate(1180 260)"><g class="spin">${rays}</g><circle r="260" fill="url(#sg)"/><circle r="110" fill="#fff1a1"/></g>
      <g class="cloud-drift" fill="#fff" opacity=".9"><ellipse cx="380" cy="190" rx="130" ry="34"/><ellipse cx="440" cy="168" rx="80" ry="40"/></g>
      <rect y="600" width="1600" height="300" fill="url(#sea)"/>
      <path class="wave" d="M-200 640 Q-100 625 0 640 T200 640 T400 640 T600 640 T800 640 T1000 640 T1200 640 T1400 640 T1600 640 T1800 640 V660 H-200Z" fill="#bdeeff" opacity=".6"/>
      <path class="wave slow" d="M-200 700 Q-100 685 0 700 T200 700 T400 700 T600 700 T800 700 T1000 700 T1200 700 T1400 700 T1600 700 T1800 700 V716 H-200Z" fill="#e3f8ff" opacity=".5"/>
      <path d="M0 800 Q400 760 800 790 T1600 780 L1600 900 L0 900Z" fill="#ffe0a3"/><path d="M0 830 Q500 800 900 830 T1600 820 L1600 900 L0 900Z" fill="#f7cf85"/>
      ${palm(150, 1, false)}${palm(1480, 0.85, true)}</svg>`;
  },

  patrias() {
    const pole = `<g transform="translate(800 900)"><rect x="-4" y="-560" width="8" height="560" fill="#c9c9c9"/><circle cy="-566" r="9" fill="#d4af37"/>
      <g class="flag-wave" style="transform-origin:4px -550px"><rect x="4" y="-550" width="80" height="140" fill="#006847"/><rect x="84" y="-550" width="80" height="140" fill="#fff"/><rect x="164" y="-550" width="80" height="140" fill="#ce1126"/><circle cx="124" cy="-480" r="16" fill="#8b5a2b" opacity=".8"/></g></g>`;
    return `<svg ${VB}><defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#020b10"/><stop offset=".6" stop-color="#08222a"/><stop offset="1" stop-color="#1c3b36"/></linearGradient></defs>
      <rect width="1600" height="900" fill="url(#sky)"/>${stars(120, 16, 520)}
      <g opacity=".6">${skyline(830, 11, '#0c1e22', '#ffe6a3', .5)}</g>${pole}${skyline(900, 13, '#030a0c', '#ffd27a', .8)}</svg>`;
  },

  otono() {
    const r = rng(77); let trees = '';
    for (let i = 0; i < 14; i++) {
      const x = r() * 1600, y = 780 + r() * 60, s = 50 + r() * 50, c = ['#d9480f', '#e8590c', '#f08c00', '#c92a2a', '#e67700'][i % 5];
      trees += `<rect x="${x - 5}" y="${y - s}" width="10" height="${s + 30}" fill="#3b1f0e"/><circle cx="${x}" cy="${y - s * 1.3}" r="${s * .65}" fill="${c}"/><circle cx="${x - s * .45}" cy="${y - s * 1}" r="${s * .45}" fill="${c}"/><circle cx="${x + s * .45}" cy="${y - s * 1.05}" r="${s * .5}" fill="${c}" opacity=".9"/>`;
    }
    return `<svg ${VB}><defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#241031"/><stop offset=".35" stop-color="#6d2a3a"/><stop offset=".65" stop-color="#d4692a"/><stop offset=".85" stop-color="#f6b15a"/></linearGradient><radialGradient id="sg"><stop offset="0" stop-color="#ffd48a" stop-opacity=".9"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient></defs>
      <rect width="1600" height="900" fill="url(#sky)"/>${stars(40, 19, 250)}
      <circle cx="560" cy="620" r="330" fill="url(#sg)"/><circle cx="560" cy="620" r="95" fill="#ffe0a3"/>
      <g class="cloud-drift" fill="#7a2f3f" opacity=".55"><ellipse cx="300" cy="300" rx="200" ry="18"/><ellipse cx="1100" cy="220" rx="240" ry="16"/></g>
      <path d="${hillsPath(700, 80, 81, 5)}" fill="#7a3314"/><path d="${hillsPath(760, 70, 83, 6)}" fill="#5a240e"/>${trees}<path d="${hillsPath(860, 30, 85, 4)}" fill="#2e1207"/></svg>`;
  },

  invierno() {
    const m = mountains(640, 5, 91, 330); let trees = ''; const r = rng(93);
    for (let i = 0; i < 18; i++) trees += pine(r() * 1600, 800 + r() * 40, 60 + r() * 60, '#34566e', '#f1f6fc');
    return `<svg ${VB}><defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#16304f"/><stop offset=".55" stop-color="#6f93bf"/><stop offset="1" stop-color="#dfeaf6"/></linearGradient><linearGradient id="lake" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a8c3e0"/><stop offset="1" stop-color="#e3eef9"/></linearGradient></defs>
      <rect width="1600" height="900" fill="url(#sky)"/>${stars(60, 29, 300)}
      <path d="${m.d}" fill="#7d9cc4"/>${snowCaps(m.pts)}
      <rect y="720" width="1600" height="180" fill="url(#lake)"/><g opacity=".25" transform="translate(0 1440) scale(1 -1)"><path d="${m.d}" fill="#7d9cc4"/></g>
      <path d="${hillsPath(780, 40, 95, 5)}" fill="#e8f0f9"/>${trees}<path d="${hillsPath(870, 25, 97, 4)}" fill="#f6f9fd"/></svg>`;
  },

  cumple() {
    const r = rng(101); let bokeh = '';
    for (let i = 0; i < 36; i++) bokeh += `<circle class="tw" style="animation-duration:${3 + r() * 4}s;animation-delay:${r() * 4}s" cx="${r() * 1600}" cy="${r() * 900}" r="${10 + r() * 50}" fill="${['#ffca3a', '#ff70a6', '#70d6ff', '#b15cff'][i % 4]}" opacity="${.08 + r() * .18}"/>`;
    return `<svg ${VB}><defs><linearGradient id="sky" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1b0736"/><stop offset=".5" stop-color="#5b1f8c"/><stop offset="1" stop-color="#ff5e7e"/></linearGradient><filter id="b5"><feGaussianBlur stdDeviation="5"/></filter></defs>
      <rect width="1600" height="900" fill="url(#sky)"/><g filter="url(#b5)">${bokeh}</g></svg>`;
  },

  clasico() {
    return `<svg ${VB}><defs><linearGradient id="sky" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b1026"/><stop offset=".6" stop-color="#1b1845"/><stop offset="1" stop-color="#28205e"/></linearGradient></defs>
      <rect width="1600" height="900" fill="url(#sky)"/>${stars(90, 2, 900, '#c7d2fe')}</svg>`;
  }
};

// ---------------- ADORNOS (capas HTML sobre la escena) ----------------
function lights() {
  const n = Math.max(10, Math.round(innerWidth / 55)); const cols = ['#ff3b3b', '#ffd23f', '#3bff6e', '#3bb4ff', '#ff5ef0'];
  let bulbs = ''; for (let i = 0; i <= n; i++) {
    const f = i / n, t = (f * 4) % 1, x = f * 100, y = 10 + 80 * t * (1 - t);
    bulbs += `<span class="bulb" style="left:${x}%;top:${y}px;--c:${cols[i % 5]};animation-delay:${(i % 5) * .3}s"></span>`;
  }
  return `<div class="deco-lights"><svg preserveAspectRatio="none" viewBox="0 0 400 60"><path d="M0 10 Q50 50 100 10 Q150 50 200 10 Q250 50 300 10 Q350 50 400 10" stroke="#1d2b1d" stroke-width="2" fill="none"/></svg>${bulbs}</div>`;
}
function papelPicado(colors) {
  const n = Math.max(6, Math.round(innerWidth / 95)); let flags = '';
  const cut = (i) => {
    const k = i % 3;
    if (k === 0) return `<circle cx="45" cy="45" r="14"/><circle cx="22" cy="28" r="6"/><circle cx="68" cy="28" r="6"/><circle cx="22" cy="68" r="6"/><circle cx="68" cy="68" r="6"/><path d="M45 72 l8 10 l-8 10 l-8 -10z"/>`;
    if (k === 1) return `<path d="M45 22 C 30 10 12 30 45 58 C 78 30 60 10 45 22Z"/><rect x="15" y="70" width="10" height="10" transform="rotate(45 20 75)"/><rect x="40" y="70" width="10" height="10" transform="rotate(45 45 75)"/><rect x="65" y="70" width="10" height="10" transform="rotate(45 70 75)"/>`;
    return `<circle cx="45" cy="42" r="18"/><circle cx="38" cy="38" r="4" fill="#fff"/><circle cx="52" cy="38" r="4" fill="#fff"/><path d="M36 50 h18" stroke="#fff" stroke-width="3"/><path d="M15 80 h60" stroke="#000" stroke-width="5" stroke-dasharray="6 5"/>`;
  };
  for (let i = 0; i < n; i++) {
    flags += `<svg class="flagp" style="animation-delay:${(i % 4) * .4}s" viewBox="0 0 90 108"><defs><mask id="pm${i}"><rect width="90" height="108" fill="#fff"/><g fill="#000">${cut(i)}</g></mask></defs>
      <path d="M0 0 H90 V96 L82 108 L75 96 L67 108 L60 96 L52 108 L45 96 L37 108 L30 96 L22 108 L15 96 L7 108 L0 96Z" fill="${colors[i % colors.length]}" mask="url(#pm${i})"/></svg>`;
  }
  return `<div class="deco-picado"><div class="picado-string"></div><div class="picado-row">${flags}</div></div>`;
}
const fog = () => `<div class="deco-fog"><i></i><i></i><i></i></div>`;

// ---------------- DEFINICIÓN DE TEMAS ----------------
export const THEMES = {
  navidad: {
    name: 'Navidad', emoji: '🎄', dark: true, font: "'Mountains of Christmas', cursive",
    accent: '#ff4d5e', accent2: '#3ddc97', glow: '#ffd27a',
    particles: [{ type: 'snow', count: 180 }, { type: 'snow', count: 25, big: true }],
    deco: () => lights(), cardClass: 'snowcap', holiday: { m: 12, d: 24, label: 'Nochebuena' },
    greet: '¡Feliz Navidad!', tagline: 'La magia se vive en familia'
  },
  halloween: {
    name: 'Halloween', emoji: '🎃', dark: true, font: "'Creepster', cursive",
    accent: '#ff8c1a', accent2: '#a855f7', glow: '#ff9a3c',
    particles: [{ type: 'bat', count: 14 }, { type: 'ember', count: 50 }],
    deco: () => fog(), holiday: { m: 10, d: 31, label: 'Halloween' },
    greet: '¡Dulce o truco!', tagline: 'Noche de sustos y risas'
  },
  muertos: {
    name: 'Día de Muertos', emoji: '💀', dark: true, font: "'Sancreek', cursive",
    accent: '#ff8c00', accent2: '#ff3e9a', glow: '#ffb347',
    particles: [{ type: 'marigold', count: 90 }, { type: 'ember', count: 30, colors: ['#ffd166', '#ff9f1c'] }],
    deco: () => papelPicado(['#ff3e9a', '#ff8a00', '#8a4dff', '#00c2a8', '#ffd000', '#ff4d4d']), holiday: { m: 11, d: 2, label: 'Día de Muertos' },
    greet: 'Recordar es volver a vivir', tagline: 'Honramos a quienes amamos'
  },
  anio_nuevo: {
    name: 'Año Nuevo', emoji: '🎆', dark: true, font: "'Cinzel Decorative', serif",
    accent: '#ffd27a', accent2: '#c084fc', glow: '#ffd27a',
    particles: [{ type: 'sparkle', count: 60, colors: ['#ffe8a3', '#fff', '#ffd27a'] }],
    fireworks: { colors: ['#ffd27a', '#ff6b6b', '#4dd4ff', '#c084fc', '#ffffff', '#7CFFB2'], rate: 0.03 },
    tapKind: 'spark', holiday: { m: 1, d: 1, label: 'Año Nuevo' },
    greet: '¡Feliz Año Nuevo!', tagline: 'Nuevos sueños, la misma familia'
  },
  amor: {
    name: 'Amor y Amistad', emoji: '💘', dark: true, font: "'Great Vibes', cursive",
    accent: '#ff4d6d', accent2: '#ffb3c1', glow: '#ff8fab',
    particles: [{ type: 'heart', count: 45 }, { type: 'sparkle', count: 25, colors: ['#ffd6e0', '#fff'] }],
    tapKind: 'heart', tapColors: ['#ff4d6d', '#ff8fab', '#ffc2d1', '#fff'], holiday: { m: 2, d: 14, label: 'San Valentín' },
    greet: 'Día del Amor y la Amistad', tagline: 'Hoy y siempre, juntos'
  },
  primavera: {
    name: 'Primavera', emoji: '🌸', dark: false, font: "'Pacifico', cursive",
    accent: '#e5487a', accent2: '#2d9d6a', glow: '#ffc2d9',
    particles: [{ type: 'petal', count: 70 }, { type: 'butterfly', count: 6 }],
    greet: '¡Llegó la primavera!', tagline: 'Todo florece en familia'
  },
  madres: {
    name: 'Día de las Madres', emoji: '💐', dark: false, font: "'Great Vibes', cursive",
    accent: '#d6336c', accent2: '#9d4edd', glow: '#ffafcc',
    particles: [{ type: 'petal', count: 55, colors: ['#ff8fab', '#ffc2d9', '#e0aaff', '#fff'] }, { type: 'heart', count: 12, colors: ['#ff8fab', '#c77dff'] }],
    tapKind: 'heart', tapColors: ['#ff8fab', '#c77dff', '#ffafcc'], holiday: { m: 5, d: 10, label: 'Día de las Madres' },
    greet: '¡Feliz Día, Mamá!', tagline: 'Gracias por tanto amor'
  },
  verano: {
    name: 'Verano', emoji: '☀️', dark: false, font: "'Pacifico', cursive",
    accent: '#ff7b00', accent2: '#0096c7', glow: '#ffe066',
    particles: [{ type: 'sparkle', count: 40, colors: ['#fff', '#fff6d5'] }, { type: 'bubble', count: 20 }],
    greet: '¡Vacaciones de verano!', tagline: 'Sol, risas y aventuras'
  },
  patrias: {
    name: 'Fiestas Patrias', emoji: '🇲🇽', dark: true, font: "'Sancreek', cursive",
    accent: '#1fbf6a', accent2: '#ff3b4f', glow: '#ffffff',
    particles: [{ type: 'confetti', count: 70, colors: ['#006847', '#ffffff', '#ce1126', '#1fbf6a'] }],
    fireworks: { colors: ['#1fbf6a', '#ffffff', '#ff3b4f'], rate: 0.022 },
    deco: () => papelPicado(['#006847', '#ffffff', '#ce1126']), tapKind: 'spark', tapColors: ['#1fbf6a', '#ffffff', '#ff3b4f'],
    holiday: { m: 9, d: 16, label: 'Independencia' },
    greet: '¡Viva México!', tagline: 'Noche mexicana en familia'
  },
  otono: {
    name: 'Otoño', emoji: '🍂', dark: true, font: "'Pacifico', cursive",
    accent: '#ff9f43', accent2: '#e8590c', glow: '#ffd48a',
    particles: [{ type: 'leaf', count: 45 }],
    greet: 'Temporada de otoño', tagline: 'Tardes cálidas en casa'
  },
  invierno: {
    name: 'Invierno', emoji: '❄️', dark: true, font: "'Pacifico', cursive",
    accent: '#7dd3fc', accent2: '#a5b4fc', glow: '#e0f2fe',
    particles: [{ type: 'snow', count: 110 }],
    greet: 'Días de invierno', tagline: 'Chocolate caliente y abrazos'
  },
  cumple: {
    name: 'Cumpleaños', emoji: '🎂', dark: true, font: "'Pacifico', cursive",
    accent: '#ffca3a', accent2: '#ff70a6', glow: '#ffca3a',
    particles: [{ type: 'balloon', count: 14 }, { type: 'confetti', count: 60 }],
    tapKind: 'confetti', greet: '¡Feliz cumpleaños!', tagline: 'Hoy celebramos en grande'
  },
  clasico: {
    name: 'Clásico', emoji: '✨', dark: true, font: "'Pacifico', cursive",
    accent: '#818cf8', accent2: '#22d3ee', glow: '#a5b4fc',
    particles: [{ type: 'orb', count: 10 }, { type: 'sparkle', count: 30, colors: ['#c7d2fe', '#fff'] }],
    greet: 'Bienvenidos', tagline: 'Nuestro lugar en el mundo'
  }
};

// Calendario de temporadas (México). La primera que coincide gana.
const SEASONS = [
  ['anio_nuevo', [12, 31], [12, 31]], ['anio_nuevo', [1, 1], [1, 6]],
  ['invierno', [1, 7], [1, 31]], ['amor', [2, 1], [2, 16]], ['invierno', [2, 17], [3, 19]],
  ['madres', [5, 1], [5, 12]], ['primavera', [3, 20], [5, 31]], ['verano', [6, 1], [8, 31]],
  ['patrias', [9, 1], [9, 16]], ['halloween', [10, 15], [10, 30]], ['muertos', [10, 31], [11, 3]],
  ['otono', [9, 17], [11, 30]], ['navidad', [12, 1], [12, 30]]
];
export function seasonFor(date = new Date()) {
  const k = (date.getMonth() + 1) * 100 + date.getDate();
  for (const [id, a, b] of SEASONS) if (k >= a[0] * 100 + a[1] && k <= b[0] * 100 + b[1]) return id;
  return 'clasico';
}

// Próxima gran fecha para la cuenta regresiva
export function nextHoliday(date = new Date()) {
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  let best = null;
  for (const [id, t] of Object.entries(THEMES)) {
    if (!t.holiday) continue;
    let d = new Date(today.getFullYear(), t.holiday.m - 1, t.holiday.d);
    if (d < today) d = new Date(today.getFullYear() + 1, t.holiday.m - 1, t.holiday.d);
    const days = Math.round((d - today) / 864e5);
    if (!best || days < best.days) best = { id, days, label: t.holiday.label, emoji: t.emoji, date: d };
  }
  return best;
}

// Tipos de evento/intercambio -> tema
export const EVENT_THEMES = {
  navidad: 'navidad', halloween: 'halloween', muertos: 'muertos', anio_nuevo: 'anio_nuevo',
  amor: 'amor', madres: 'madres', patrias: 'patrias', cumple: 'cumple', verano: 'verano',
  primavera: 'primavera', otono: 'otono', invierno: 'invierno', clasico: 'clasico'
};

const sceneCache = {};
export function renderScene(id, prefix = '') {
  const svg = sceneCache[id] || (sceneCache[id] = (scenes[id] || scenes.clasico)());
  if (!prefix) return svg;
  return svg.replace(/id="([^"]+)"/g, `id="${prefix}$1"`).replace(/url\(#([^)]+)\)/g, `url(#${prefix}$1)`);
}
export function renderDeco(id) { const t = THEMES[id]; return t && t.deco ? t.deco() : ''; }
