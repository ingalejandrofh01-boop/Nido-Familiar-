// ============================================================
//  Motor de partículas: nieve, pétalos, hojas, murciélagos,
//  corazones, confeti, globos, fuegos artificiales...
// ============================================================
const TAU = Math.PI * 2;
const R = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];

let canvas, ctx, W = 0, H = 0, DPR = 1, raf = 0;
let particles = [];
let fireworks = null;       // {colors, rate}
let rockets = [], sparks = [];
let wind = 0, windTarget = 0, pointerX = null, lastPX = null;
let reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let running = false;
let currentCfg = null;
let intensity = 1;

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = innerWidth; H = innerHeight;
  canvas.width = W * DPR; canvas.height = H * DPR;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

// ---------- fábricas de partículas ----------
const makers = {
  snow: (o) => { const z = R(0.3, 1); return { t: 'snow', x: R(0, W), y: R(-H, H), z, r: 1 + z * (o.big ? 4.2 : 3), vy: 0.3 + z * 1.3, ph: R(0, TAU), a: 0.35 + z * 0.6 }; },
  petal: (o) => { const z = R(0.4, 1); return { t: 'petal', x: R(0, W), y: R(-H, H), z, s: 5 + z * 7, vy: 0.4 + z * 1.1, vx: R(0.2, 0.9), rot: R(0, TAU), vr: R(-0.04, 0.04), flip: R(0, TAU), c: pick(o.colors || ['#ffc2d9', '#ffb3cf', '#ffd6e6', '#fff0f5']) }; },
  marigold: (o) => { const z = R(0.4, 1); return { t: 'petal', x: R(0, W), y: R(-H, H), z, s: 4 + z * 6, vy: 0.5 + z * 1.2, vx: R(-0.3, 0.6), rot: R(0, TAU), vr: R(-0.06, 0.06), flip: R(0, TAU), c: pick(o.colors || ['#ff9f1c', '#ffbf00', '#ff7b00', '#ffd23f']) }; },
  leaf: (o) => { const z = R(0.4, 1); return { t: 'leaf', x: R(0, W), y: R(-H, H), z, s: 8 + z * 12, vy: 0.5 + z * 1.2, vx: R(-0.2, 0.8), rot: R(0, TAU), vr: R(-0.05, 0.05), flip: R(0, TAU), c: pick(o.colors || ['#e76f51', '#f4a261', '#d62828', '#e9c46a', '#bc4b1a']) }; },
  heart: (o) => { const z = R(0.4, 1); return { t: 'heart', x: R(0, W), y: R(0, H * 2), z, s: 6 + z * 12, vy: -(0.3 + z * 0.9), ph: R(0, TAU), c: pick(o.colors || ['#ff4d6d', '#ff758f', '#ffb3c1', '#ff8fab']), a: 0.4 + z * 0.5 }; },
  confetti: (o) => { const z = R(0.4, 1); return { t: 'confetti', x: R(0, W), y: R(-H, H), z, w: 5 + z * 6, h: 8 + z * 8, vy: 0.8 + z * 1.8, vx: R(-0.5, 0.5), rot: R(0, TAU), vr: R(-0.1, 0.1), flip: R(0, TAU), c: pick(o.colors || ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#ff70a6']) }; },
  bat: () => ({ t: 'bat', x: R(-200, W), y: R(40, H * 0.55), s: R(10, 22), vx: R(0.8, 2.2) * (Math.random() < .5 ? 1 : -1), ph: R(0, TAU), bob: R(0.6, 1.6) }),
  ember: (o) => ({ t: 'ember', x: R(0, W), y: R(0, H), r: R(1, 2.8), vx: R(-0.25, 0.25), vy: R(-0.5, -0.1), ph: R(0, TAU), c: pick(o.colors || ['#ffb347', '#ff7b00', '#ffd27a']) }),
  sparkle: (o) => ({ t: 'sparkle', x: R(0, W), y: R(0, H), s: R(1.5, 4), ph: R(0, TAU), sp: R(0.02, 0.06), c: pick(o.colors || ['#fff', '#ffe8a3', '#fff6d5']) }),
  bubble: (o) => ({ t: 'bubble', x: R(0, W), y: R(H * 0.3, H * 1.4), r: R(4, 16), vy: -R(0.3, 1), ph: R(0, TAU), c: o.colors ? pick(o.colors) : 'rgba(255,255,255,.8)' }),
  balloon: (o) => ({ t: 'balloon', x: R(0, W), y: R(H, H * 2.2), r: R(16, 30), vy: -R(0.5, 1.3), ph: R(0, TAU), c: pick(o.colors || ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#b15cff', '#ff70a6']) }),
  orb: (o) => ({ t: 'orb', x: R(0, W), y: R(0, H), r: R(30, 120), vx: R(-0.15, 0.15), vy: R(-0.15, 0.15), c: pick(o.colors || ['#6366f1', '#8b5cf6', '#06b6d4']), a: R(0.05, 0.14) }),
  butterfly: (o) => ({ t: 'butterfly', x: R(0, W), y: R(H * 0.2, H * 0.8), s: R(7, 12), vx: R(0.4, 1) * (Math.random() < .5 ? 1 : -1), ph: R(0, TAU), c: pick(o.colors || ['#ff9ecd', '#ffd166', '#9bf6ff', '#caffbf']) })
};

// ---------- dibujo ----------
function heartPath(c, s) {
  c.beginPath();
  c.moveTo(0, s * 0.3);
  c.bezierCurveTo(-s, -s * 0.4, -s * 0.5, -s * 1.1, 0, -s * 0.5);
  c.bezierCurveTo(s * 0.5, -s * 1.1, s, -s * 0.4, 0, s * 0.3);
  c.closePath();
}
function leafPath(c, s) {
  // hoja de maple estilizada
  c.beginPath();
  const pts = [[0, -1], [0.2, -0.55], [0.55, -0.7], [0.45, -0.3], [0.95, -0.2], [0.6, 0.05], [0.75, 0.35], [0.25, 0.25], [0.1, 0.6], [0, 0.45], [-0.1, 0.6], [-0.25, 0.25], [-0.75, 0.35], [-0.6, 0.05], [-0.95, -0.2], [-0.45, -0.3], [-0.55, -0.7], [-0.2, -0.55]];
  pts.forEach(([x, y], i) => i ? c.lineTo(x * s, y * s) : c.moveTo(x * s, y * s));
  c.closePath();
}

function drawParticle(p, t) {
  const c = ctx;
  switch (p.t) {
    case 'snow': {
      p.ph += 0.01;
      p.y += p.vy * speed; p.x += (Math.sin(p.ph) * 0.4 + wind * p.z) * speed;
      if (p.y > H + 10) { p.y = -10; p.x = R(0, W); }
      if (p.x > W + 10) p.x = -10; if (p.x < -10) p.x = W + 10;
      const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      g.addColorStop(0, `rgba(255,255,255,${p.a})`); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fill();
      break;
    }
    case 'petal': case 'leaf': case 'confetti': {
      p.flip += 0.05 * speed; p.rot += p.vr * speed;
      p.y += p.vy * speed; p.x += (p.vx + Math.sin(p.flip * 0.5) * 0.6 + wind * p.z) * speed;
      if (p.y > H + 20) { p.y = -20; p.x = R(-50, W); }
      if (p.x > W + 20) p.x = -20; if (p.x < -20) p.x = W + 20;
      c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.scale(1, Math.cos(p.flip));
      c.fillStyle = p.c; c.globalAlpha = 0.9;
      if (p.t === 'petal') { c.beginPath(); c.ellipse(0, 0, p.s, p.s * 0.55, 0, 0, TAU); c.fill(); }
      else if (p.t === 'leaf') { leafPath(c, p.s); c.fill(); c.strokeStyle = 'rgba(0,0,0,.15)'; c.lineWidth = 1; c.beginPath(); c.moveTo(0, -p.s * .8); c.lineTo(0, p.s * .6); c.stroke(); }
      else { c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); }
      c.restore(); c.globalAlpha = 1;
      break;
    }
    case 'heart': {
      p.ph += 0.02; p.y += p.vy * speed; p.x += (Math.sin(p.ph) * 0.5 + wind * .5) * speed;
      if (p.y < -30) { p.y = H + 30; p.x = R(0, W); }
      c.save(); c.translate(p.x, p.y); c.rotate(Math.sin(p.ph) * 0.2); c.globalAlpha = p.a;
      c.fillStyle = p.c; c.shadowColor = p.c; c.shadowBlur = 12; heartPath(c, p.s); c.fill(); c.restore(); c.globalAlpha = 1;
      break;
    }
    case 'bat': {
      p.ph += 0.25 * speed; p.x += p.vx * speed; p.y += Math.sin(p.ph * 0.15) * p.bob * speed;
      if (p.x > W + 60) { p.x = -60; p.y = R(40, H * 0.55); } if (p.x < -60) { p.x = W + 60; p.y = R(40, H * 0.55); }
      const f = Math.sin(p.ph) * 0.8, s = p.s;
      c.save(); c.translate(p.x, p.y); c.scale(p.vx < 0 ? -1 : 1, 1); c.fillStyle = '#0a0410';
      c.beginPath(); c.moveTo(0, 0);
      c.quadraticCurveTo(-s * 0.6, -s * f - s * .3, -s * 1.6, -s * f * 1.2);
      c.quadraticCurveTo(-s * 1.2, -s * f * .3 + s * .1, -s * 1.0, s * .15);
      c.quadraticCurveTo(-s * .6, 0, -s * .3, s * .3);
      c.lineTo(0, s * .15); c.lineTo(s * .3, s * .3);
      c.quadraticCurveTo(s * .6, 0, s * 1.0, s * .15);
      c.quadraticCurveTo(s * 1.2, -s * f * .3 + s * .1, s * 1.6, -s * f * 1.2);
      c.quadraticCurveTo(s * 0.6, -s * f - s * .3, 0, 0);
      c.fill();
      c.beginPath(); c.ellipse(0, 0, s * .25, s * .35, 0, 0, TAU); c.fill();
      c.restore();
      break;
    }
    case 'ember': {
      p.ph += 0.03; p.x += (p.vx + Math.sin(p.ph) * .3) * speed; p.y += p.vy * speed;
      if (p.y < -10) { p.y = H + 10; p.x = R(0, W); }
      const a = 0.4 + Math.sin(p.ph * 2) * 0.35;
      c.globalAlpha = Math.max(0, a); c.fillStyle = p.c; c.shadowColor = p.c; c.shadowBlur = 14;
      c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fill(); c.shadowBlur = 0; c.globalAlpha = 1;
      break;
    }
    case 'sparkle': {
      p.ph += p.sp * speed; const a = Math.max(0, Math.sin(p.ph));
      c.save(); c.translate(p.x, p.y); c.globalAlpha = a; c.fillStyle = p.c; c.shadowColor = p.c; c.shadowBlur = 8;
      const s = p.s * (0.6 + a * 0.6);
      c.beginPath(); c.moveTo(0, -s * 2); c.quadraticCurveTo(0, 0, s * 2, 0); c.quadraticCurveTo(0, 0, 0, s * 2); c.quadraticCurveTo(0, 0, -s * 2, 0); c.quadraticCurveTo(0, 0, 0, -s * 2); c.fill();
      c.restore(); c.globalAlpha = 1;
      if (p.ph > Math.PI) { p.ph = 0; p.x = R(0, W); p.y = R(0, H); }
      break;
    }
    case 'bubble': {
      p.ph += 0.02; p.y += p.vy * speed; p.x += Math.sin(p.ph) * 0.4 * speed;
      if (p.y < -30) { p.y = H + 30; p.x = R(0, W); }
      c.strokeStyle = p.c; c.globalAlpha = 0.5; c.lineWidth = 1.2; c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.stroke();
      c.globalAlpha = 0.6; c.fillStyle = '#fff'; c.beginPath(); c.arc(p.x - p.r * .35, p.y - p.r * .35, p.r * .2, 0, TAU); c.fill(); c.globalAlpha = 1;
      break;
    }
    case 'balloon': {
      p.ph += 0.02; p.y += p.vy * speed; p.x += Math.sin(p.ph) * 0.5 * speed;
      if (p.y < -120) { p.y = H + 80; p.x = R(0, W); }
      c.save(); c.translate(p.x, p.y); c.rotate(Math.sin(p.ph) * 0.08);
      c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 1; c.beginPath(); c.moveTo(0, p.r * 1.2);
      c.quadraticCurveTo(Math.sin(p.ph * 2) * 8, p.r * 2.2, 0, p.r * 3.4); c.stroke();
      const g = c.createRadialGradient(-p.r * .35, -p.r * .4, p.r * .1, 0, 0, p.r * 1.3);
      g.addColorStop(0, '#ffffffcc'); g.addColorStop(0.25, p.c); g.addColorStop(1, p.c);
      c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, p.r, p.r * 1.2, 0, 0, TAU); c.fill();
      c.beginPath(); c.moveTo(-4, p.r * 1.18); c.lineTo(4, p.r * 1.18); c.lineTo(0, p.r * 1.32); c.fill();
      c.restore();
      break;
    }
    case 'orb': {
      p.x += p.vx * speed; p.y += p.vy * speed;
      if (p.x < -p.r) p.x = W + p.r; if (p.x > W + p.r) p.x = -p.r; if (p.y < -p.r) p.y = H + p.r; if (p.y > H + p.r) p.y = -p.r;
      const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      g.addColorStop(0, p.c); g.addColorStop(1, 'transparent');
      c.globalAlpha = p.a; c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fill(); c.globalAlpha = 1;
      break;
    }
    case 'butterfly': {
      p.ph += 0.2 * speed; p.x += p.vx * speed; p.y += Math.sin(p.ph * 0.1) * 0.8 * speed;
      if (p.x > W + 30) p.x = -30; if (p.x < -30) p.x = W + 30;
      const f = Math.abs(Math.sin(p.ph));
      c.save(); c.translate(p.x, p.y); c.fillStyle = p.c; c.globalAlpha = .9;
      c.save(); c.scale(f, 1); c.beginPath(); c.ellipse(-p.s * .6, -p.s * .3, p.s * .7, p.s * .55, -0.5, 0, TAU); c.ellipse(p.s * .6, -p.s * .3, p.s * .7, p.s * .55, 0.5, 0, TAU); c.fill();
      c.beginPath(); c.ellipse(-p.s * .45, p.s * .35, p.s * .4, p.s * .35, 0.4, 0, TAU); c.ellipse(p.s * .45, p.s * .35, p.s * .4, p.s * .35, -0.4, 0, TAU); c.fill(); c.restore();
      c.fillStyle = '#2b2b2b'; c.fillRect(-1, -p.s * .6, 2, p.s * 1.2); c.restore(); c.globalAlpha = 1;
      break;
    }
  }
}

// ---------- fuegos artificiales ----------
function launchRocket(x, colors) {
  rockets.push({ x: x ?? R(W * 0.15, W * 0.85), y: H + 10, vx: R(-0.6, 0.6), vy: -R(9, 13) * Math.min(1, H / 800 + 0.3), ty: R(H * 0.12, H * 0.45), c: pick(colors), trail: [] });
}
export function burst(x, y, colors, n = 70, kind = 'spark') {
  const c0 = pick(colors);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + R(-0.05, 0.05), sp = R(1.5, 5.5);
    sparks.push({ x, y, px: x, py: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, decay: R(0.009, 0.018), c: Math.random() < .7 ? c0 : pick(colors), kind, rot: R(0, TAU) });
  }
}
function drawFireworks() {
  const c = ctx;
  if (fireworks && Math.random() < fireworks.rate * speed * intensity) launchRocket(null, fireworks.colors);
  for (let i = rockets.length - 1; i >= 0; i--) {
    const r = rockets[i];
    r.trail.push([r.x, r.y]); if (r.trail.length > 10) r.trail.shift();
    r.x += r.vx; r.y += r.vy; r.vy += 0.12;
    c.strokeStyle = r.c; c.lineWidth = 2; c.globalAlpha = .8; c.beginPath();
    r.trail.forEach(([x, y], j) => j ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); c.globalAlpha = 1;
    if (r.y <= r.ty || r.vy >= -1) { burst(r.x, r.y, fireworks ? fireworks.colors : [r.c], Math.floor(R(60, 110))); rockets.splice(i, 1); }
  }
  c.globalCompositeOperation = 'lighter';
  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i];
    s.px = s.x; s.py = s.y;
    s.x += s.vx; s.y += s.vy; s.vx *= 0.975; s.vy = s.vy * 0.975 + 0.05; s.life -= s.decay;
    if (s.life <= 0) { sparks.splice(i, 1); continue; }
    c.globalAlpha = s.life;
    if (s.kind === 'heart') { c.save(); c.translate(s.x, s.y); c.fillStyle = s.c; heartPath(c, 6 * s.life + 2); c.fill(); c.restore(); }
    else if (s.kind === 'confetti') { s.rot += 0.2; c.save(); c.translate(s.x, s.y); c.rotate(s.rot); c.fillStyle = s.c; c.fillRect(-3, -5, 6, 10); c.restore(); }
    else { c.strokeStyle = s.c; c.lineWidth = 2.2; c.beginPath(); c.moveTo(s.px, s.py); c.lineTo(s.x, s.y); c.stroke(); }
  }
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
}

let speed = 1;
function frame() {
  if (!running) return;
  ctx.clearRect(0, 0, W, H);
  wind += (windTarget - wind) * 0.02; windTarget *= 0.98;
  const t = performance.now();
  for (const p of particles) drawParticle(p, t);
  if (fireworks || rockets.length || sparks.length) drawFireworks();
  raf = requestAnimationFrame(frame);
}

export function initFx(el) {
  canvas = el; ctx = canvas.getContext('2d');
  resize(); addEventListener('resize', resize);
  addEventListener('pointermove', e => {
    if (lastPX != null) windTarget = Math.max(-3, Math.min(3, windTarget + (e.clientX - lastPX) * 0.02));
    lastPX = e.clientX;
  }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { running = false; cancelAnimationFrame(raf); }
    else if (currentCfg && intensity > 0) { running = true; frame(); }
  });
}

export function setIntensity(v) { intensity = v; if (currentCfg) setFx(currentCfg); }

export function setFx(cfg) {
  currentCfg = cfg;
  cancelAnimationFrame(raf);
  particles = []; rockets = []; sparks = []; fireworks = null;
  const k = intensity * (reduced ? 0.35 : 1) * (W < 700 ? 0.6 : 1);
  speed = reduced ? 0.5 : 1;
  if (!cfg || k <= 0) { running = false; ctx && ctx.clearRect(0, 0, W, H); return; }
  for (const layer of cfg.particles || []) {
    const n = Math.round(layer.count * k);
    for (let i = 0; i < n; i++) particles.push(makers[layer.type](layer));
  }
  if (cfg.fireworks) fireworks = { colors: cfg.fireworks.colors, rate: cfg.fireworks.rate || 0.02 };
  running = true; frame();
}

// Explosión al tocar el fondo o en celebraciones
export function celebrate(x = W / 2, y = H / 3, kind = 'spark', colors) {
  const cols = colors || ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#ff70a6', '#ffffff'];
  burst(x, y, cols, kind === 'spark' ? 90 : 60, kind);
  if (!running) { running = true; frame(); setTimeout(() => { if (!currentCfg || intensity <= 0) { running = false; } }, 4000); }
}
