// 🎁 Formas de revelar al amigo secreto: regalo, esfera, piñata, boleto para rascar y carta
import { hooks } from './store.js';

export const REVEAL_STYLES = [
  ['regalo', '🎁', 'Regalo'], ['esfera', '🎄', 'Esfera'], ['pinata', '🪅', 'Piñata'],
  ['rasca', '🎟️', 'Rasca y gana'], ['sobre', '💌', 'Carta secreta']
];
export function defaultStyle(type) {
  if (['navidad', 'invierno', 'anio_nuevo'].includes(type)) return 'esfera';
  if (['cumple', 'patrias', 'verano'].includes(type)) return 'pinata';
  if (['amor', 'madres'].includes(type)) return 'sobre';
  if (['halloween', 'muertos'].includes(type)) return 'rasca';
  return 'regalo';
}

// ---------------- Sonidos (sintetizados, sin archivos) ----------------
let ac = null;
const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
export const soundOn = () => lsGet('nido-sound') !== '0';
export function toggleSound() { try { localStorage.setItem('nido-sound', soundOn() ? '0' : '1'); } catch { } return soundOn(); }
function ctx() {
  if (!soundOn()) return null;
  try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); return ac; } catch { return null; }
}
function tone(f0, f1, dur, type = 'sine', vol = .25, delay = 0) {
  const c = ctx(); if (!c) return;
  const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + .02);
}
function noise(dur, freq = 2500, vol = .35, delay = 0) {
  const c = ctx(); if (!c) return;
  const t = c.currentTime + delay, len = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = buf; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = .8; g.gain.value = vol;
  s.connect(f).connect(g).connect(c.destination); s.start(t);
}
export const sfx = {
  tink() { tone(2200, 1800, .18, 'sine', .18); tone(3300, 2900, .12, 'sine', .08); },
  crash() { noise(.5, 3500, .45); noise(.35, 6000, .25, .05); [2600, 3100, 2300, 3700].forEach((f, i) => tone(f, f * .9, .25, 'triangle', .07, .05 + i * .04)); },
  thump() { tone(160, 55, .22, 'sine', .5); noise(.08, 900, .25); },
  pop() { tone(500, 900, .09, 'square', .12); },
  paper() { noise(.25, 4200, .18); },
  scratch() { noise(.05, 5200, .05); },
  chime() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0, .5, 'triangle', .16, i * .09)); },
  shake() { noise(.12, 1500, .12); }
};
const vib = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch { } };

// ---------------- Montaje (se conserva entre re-render) ----------------
const cache = new Map();
export function mountReveal(container, key, opts) {
  if (!container) return;
  const c = cache.get(key);
  if (c && c.style === opts.style && !c.done) { c.onDone = opts.onDone; container.replaceChildren(c.el); return; }
  const el = document.createElement('div'); el.className = 'rv-stage rv-' + opts.style;
  const entry = { style: opts.style, el, done: false, onDone: opts.onDone };
  cache.set(key, entry);
  const finish = (delay = 650) => {
    if (entry.done) return; entry.done = true; sfx.chime(); vib([60, 40, 140]);
    setTimeout(() => { cache.delete(key); entry.onDone && entry.onDone(); }, delay);
  };
  const burstAt = (node, kind = 'confetti', colors) => { const r = node.getBoundingClientRect(); hooks.celebrate(r.left + r.width / 2, r.top + r.height / 2, kind, colors); };
  (BUILD[opts.style] || BUILD.regalo)(el, { ...opts, finish, burstAt });
  container.replaceChildren(el);
}
export function forgetReveal(key) { cache.delete(key); }

let uid = 0;
const hint = (t) => `<p class="rv-hint bold">${t}</p>`;
const BUILD = {
  // 🎁 Regalo clásico
  regalo(el, o) {
    el.innerHTML = `<div class="gift-stage"><div class="gift"><div class="bow"></div><div class="lid"></div><div class="box"></div><div class="ribbon-v"></div></div></div>${hint('👆 Toca el regalo para descubrirlo')}`;
    const g = el.querySelector('.gift');
    g.onclick = () => {
      if (g.classList.contains('shake') || g.classList.contains('open')) return;
      g.classList.add('shake'); sfx.shake(); vib(30); setTimeout(() => { sfx.shake(); vib(30); }, 500);
      setTimeout(() => {
        g.classList.remove('shake'); g.classList.add('open'); sfx.pop(); sfx.paper();
        o.burstAt(g, 'confetti', o.colors); o.burstAt(g, 'spark', o.colors); o.finish();
      }, 1000);
    };
  },

  // 🎄 Esfera navideña: 3 toques la estrellan
  esfera(el, o) {
    const u = 'o' + (++uid);
    const cracks = ['M100 60 L92 88 L104 104 L96 128', 'M100 60 L118 84 L110 112 L126 132 M104 104 L80 118', 'M70 96 L96 128 L88 150 M126 132 L140 112 M96 128 L120 150 L112 168'];
    el.innerHTML = `<div class="orn-wrap"><div class="orn">
      <svg viewBox="0 0 200 220" width="200" height="220" aria-hidden="true">
        <defs><radialGradient id="${u}G" cx="38%" cy="34%" r="70%"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".18" style="stop-color:var(--accent)"/><stop offset="1" style="stop-color:color-mix(in srgb, var(--accent) 45%, #000)"/></radialGradient>
        <linearGradient id="${u}C" x1="0" x2="1"><stop offset="0" stop-color="#8a6d1f"/><stop offset=".5" stop-color="#ffe7a0"/><stop offset="1" stop-color="#8a6d1f"/></linearGradient></defs>
        <line x1="100" y1="0" x2="100" y2="30" stroke="#d9c38a" stroke-width="2"/>
        <path d="M92 32 a8 8 0 1 1 16 0" fill="none" stroke="url(#${u}C)" stroke-width="4"/>
        <rect x="84" y="34" width="32" height="18" rx="4" fill="url(#${u}C)"/>
        <g class="orn-ball"><circle cx="100" cy="128" r="76" fill="url(#${u}G)"/>
          <path d="M28 112 Q100 140 172 112" style="stroke:var(--accent2)" stroke-width="10" fill="none" opacity=".85"/>
          <path d="M26 138 Q100 168 174 138" stroke="#fff" stroke-width="3" fill="none" stroke-dasharray="2 9" stroke-linecap="round" opacity=".8"/>
          <ellipse cx="72" cy="92" rx="18" ry="11" fill="#fff" opacity=".45" transform="rotate(-30 72 92)"/>
          ${[[60, 150], [132, 96], [146, 150], [88, 180], [120, 190]].map(([x, y], i) => `<circle class="glit" style="animation-delay:${i * .3}s" cx="${x}" cy="${y}" r="2.4" fill="#fff"/>`).join('')}
          ${cracks.map((d, i) => `<path class="crack c${i}" d="${d}" stroke="#fff" stroke-width="2.4" fill="none" stroke-linejoin="round"/>`).join('')}
        </g></svg></div></div>${hint('❄️ Toca la esfera 3 veces para romperla')}`;
    const orn = el.querySelector('.orn'); let hits = 0;
    orn.onclick = () => {
      if (hits >= 3) return; hits++;
      orn.classList.remove('hit'); void orn.offsetWidth; orn.classList.add('hit');
      el.querySelector('.crack.c' + (hits - 1)).classList.add('on');
      if (hits < 3) { sfx.tink(); vib(25); el.querySelector('.rv-hint').textContent = hits === 1 ? '✨ ¡Otra vez!' : '💥 ¡Una más!'; return; }
      sfx.crash(); vib([40, 30, 90]);
      const r = orn.querySelector('.orn-ball').getBoundingClientRect(), wrap = el.querySelector('.orn-wrap').getBoundingClientRect();
      orn.querySelector('.orn-ball').style.opacity = 0;
      for (let i = 0; i < 16; i++) {
        const s = document.createElement('i'); s.className = 'shard';
        const a = Math.random() * Math.PI * 2, d = 90 + Math.random() * 140;
        s.style.cssText = `left:${r.left - wrap.left + r.width / 2}px;top:${r.top - wrap.top + r.height / 2}px;--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d + 60}px;--rot:${Math.random() * 720 - 360}deg;clip-path:polygon(${Array.from({ length: 3 }, () => `${Math.random() * 100}% ${Math.random() * 100}%`).join(',')});width:${18 + Math.random() * 26}px;height:${18 + Math.random() * 26}px`;
        el.querySelector('.orn-wrap').appendChild(s);
      }
      o.burstAt(orn, 'spark', ['#fff', '#ffe7a0', o.colors?.[0] || '#e63946']); o.burstAt(orn, 'confetti', o.colors);
      o.finish(900);
    };
  },

  // 🪅 Piñata de estrella: dale, dale, dale
  pinata(el, o) {
    const cols = ['#ff4d6d', '#ffbe0b', '#3a86ff', '#06d6a0', '#8338ec', '#fb5607', '#ff70a6'];
    const cone = (i) => { const a = i / 7 * 360 - 90; return `<g class="pt p${i}" style="--r:${a}deg"><g transform="rotate(${a + 90} 110 120)"><path d="M92 76 L110 8 L128 76 Z" fill="${cols[i]}"/><path d="M98 62 L122 62 M101 48 L119 48 M104 34 L116 34" stroke="#fff" stroke-width="4" opacity=".75"/><path d="M110 8 l-6 -8 M110 8 l0 -10 M110 8 l6 -8" stroke="${cols[(i + 3) % 7]}" stroke-width="3" stroke-linecap="round"/></g></g>`; };
    el.innerHTML = `<div class="pin-wrap"><div class="pin"><div class="pin-rope"></div>
      <svg viewBox="0 0 220 240" width="210" height="230" aria-hidden="true">${Array.from({ length: 7 }, (_, i) => cone(i)).join('')}
        <g class="pin-body"><circle cx="110" cy="120" r="50" fill="#ffd166"/>
        ${[0, 1, 2, 3, 4].map(i => `<path d="M60 ${96 + i * 12} Q110 ${104 + i * 12} 160 ${96 + i * 12}" stroke="${cols[i]}" stroke-width="6" fill="none" opacity=".9"/>`).join('')}
        <circle cx="110" cy="120" r="50" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="4 6" opacity=".7"/></g></svg></div>
      <div class="pin-count"></div></div>${hint('🪅 ¡Dale, dale, dale! Tócala para pegarle')}`;
    const pin = el.querySelector('.pin'), wrap = el.querySelector('.pin-wrap'), cnt = el.querySelector('.pin-count');
    const NEED = 6; let hits = 0; const order = [3, 5, 1, 6, 2, 4, 0];
    const dale = ['¡Dale!', '¡Dale, dale!', '¡No pierdas el tino!', '¡Ya casi!', '¡Mide la distancia!', '¡Rómpela!'];
    pin.onclick = (e) => {
      if (hits >= NEED) return; hits++;
      pin.classList.remove('hit'); void pin.offsetWidth; pin.classList.add('hit'); sfx.thump(); vib(35);
      const w = wrap.getBoundingClientRect();
      const t = document.createElement('b'); t.className = 'dale'; t.textContent = dale[hits - 1];
      t.style.left = (e.clientX - w.left) + 'px'; t.style.top = (e.clientY - w.top) + 'px'; wrap.appendChild(t); setTimeout(() => t.remove(), 900);
      cnt.textContent = '⭐'.repeat(hits) + '☆'.repeat(NEED - hits);
      const drop = hits < NEED ? [order[hits - 1]] : order.slice(hits - 1);
      drop.forEach(i => pin.querySelector('.p' + i)?.classList.add('off'));
      hooks.celebrate(e.clientX, e.clientY, 'confetti', cols.slice(0, 3));
      if (hits < NEED) return;
      sfx.crash(); vib([50, 30, 120]); pin.classList.add('broken');
      const r = pin.getBoundingClientRect();
      for (let i = 0; i < 6; i++) setTimeout(() => hooks.celebrate(r.left + r.width * (.2 + Math.random() * .6), r.top + r.height * .4, 'confetti', cols), i * 110);
      const candies = ['🍬', '🍭', '🍫', '🥜', '🍊', '🍡', '🍬', '🍭', '🎊', '🍬'];
      candies.forEach((c, i) => { const s = document.createElement('i'); s.className = 'candy'; s.textContent = c; s.style.cssText = `left:${40 + Math.random() * 20}%;--dx:${(Math.random() - .5) * 260}px;--rot:${Math.random() * 540 - 270}deg;animation-delay:${i * 40}ms`; wrap.appendChild(s); });
      o.finish(1100);
    };
  },

  // 🎟️ Boleto para rascar (el nombre está debajo de verdad)
  rasca(el, o) {
    el.innerHTML = `<div class="scratch"><div class="scratch-under">${o.nameHTML || ''}</div><canvas></canvas></div>${hint('🪙 Rasca con el dedo o el mouse')}`;
    const box = el.querySelector('.scratch'), cv = el.querySelector('canvas');
    let c2d, W, H, moves = 0, down = false, last = null, finished = false;
    const setup = () => {
      const r = box.getBoundingClientRect(); if (!r.width) return requestAnimationFrame(setup);
      const dpr = Math.min(2, devicePixelRatio || 1); W = r.width; H = r.height;
      cv.width = W * dpr; cv.height = H * dpr; c2d = cv.getContext('2d'); c2d.scale(dpr, dpr);
      const g = c2d.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, '#b8860b'); g.addColorStop(.25, '#ffe9a8'); g.addColorStop(.5, '#d4a52c'); g.addColorStop(.75, '#fff3c4'); g.addColorStop(1, '#a8740a');
      c2d.fillStyle = g; c2d.fillRect(0, 0, W, H);
      for (let i = 0; i < 900; i++) { c2d.fillStyle = `rgba(255,255,255,${Math.random() * .35})`; c2d.fillRect(Math.random() * W, Math.random() * H, 1.5, 1.5); }
      c2d.fillStyle = 'rgba(90,60,0,.55)'; c2d.font = '900 22px Nunito, sans-serif'; c2d.textAlign = 'center';
      c2d.fillText('✨ RASCA AQUÍ ✨', W / 2, H / 2 + 8);
      c2d.font = '800 12px Nunito, sans-serif'; c2d.fillText('Tu amigo secreto está debajo', W / 2, H / 2 + 30);
      c2d.globalCompositeOperation = 'destination-out'; c2d.lineCap = 'round'; c2d.lineJoin = 'round'; c2d.lineWidth = 42;
    };
    requestAnimationFrame(setup);
    const pt = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const cleared = () => {
      const d = c2d.getImageData(0, 0, cv.width, cv.height).data; let clear = 0, tot = 0;
      for (let i = 3; i < d.length; i += 4 * 24) { tot++; if (d[i] < 40) clear++; }
      return clear / tot;
    };
    const scratch = (e) => {
      if (!down || !c2d || finished) return; e.preventDefault();
      const p = pt(e); c2d.beginPath(); c2d.moveTo(...(last || p)); c2d.lineTo(...p); c2d.stroke(); last = p;
      if (++moves % 6 === 0) { sfx.scratch(); vib(5); }
      if (moves % 12 === 0 && cleared() > .5) {
        finished = true; cv.classList.add('gone'); o.burstAt(box, 'spark', ['#ffe7a0', '#fff', '#d4a52c']); o.burstAt(box, 'confetti', o.colors); o.finish(900);
      }
    };
    cv.addEventListener('pointerdown', e => { down = true; last = pt(e); try { cv.setPointerCapture(e.pointerId); } catch { } scratch(e); });
    cv.addEventListener('pointermove', scratch);
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(n => cv.addEventListener(n, () => { down = false; last = null; }));
  },

  // 💌 Carta con sello de cera
  sobre(el, o) {
    el.innerHTML = `<div class="env-wrap"><div class="env"><div class="env-back"></div><div class="env-letter"><div class="tiny bold">Querido Santa secreto:</div><div class="env-lines"><i></i><i></i><i></i></div><div class="tiny bold">te toca regalarle a…</div></div><div class="env-front"></div><div class="env-flap"></div><button class="env-seal" aria-label="Romper sello">🤫</button></div></div>${hint('🔴 Toca el sello para abrir la carta')}`;
    const env = el.querySelector('.env');
    env.onclick = () => {
      if (env.classList.contains('open')) return;
      env.classList.add('open'); sfx.pop(); vib(30);
      setTimeout(() => { sfx.paper(); vib(20); }, 450);
      setTimeout(() => { o.burstAt(env, 'heart', ['#ff4d6d', '#ff8fab', '#fff']); o.finish(700); }, 1100);
    };
  }
};
