// 👆 Gestos de celular: deslizar filas, jalar para actualizar, visor de fotos y "atrás" desde la orilla
import { S } from './store.js';
import { haptic } from './motion.js';

const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const blocked = () => document.documentElement.classList.contains('modal-open') || document.querySelector('.wrapped, .lightbox, .search-ov, .live-draw, .notif-panel, .cook-mode');
let inited = false;

export function initGestures() {
  if (inited) return; inited = true;

  // 1) Deslizar filas: → completar · ← borrar
  let sw = null;
  document.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' || e.button) return;
    const row = e.target.closest('.swipe'); if (!row || e.target.closest('input, textarea, select, a')) return;
    sw = { row, x0: e.clientX, y0: e.clientY, dx: 0, on: false };
  }, { passive: true });
  document.addEventListener('pointermove', e => {
    if (!sw) return;
    const dx = e.clientX - sw.x0, dy = e.clientY - sw.y0;
    if (!sw.on) { if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) { sw = null; return; } if (Math.abs(dx) > 14) { sw.on = true; sw.row.classList.add('swiping'); } else return; }
    let v = dx; if (v < 0 && !sw.row.dataset.sl) v = Math.max(v, -24); if (v > 0 && !sw.row.dataset.sr) v = Math.min(v, 24);
    v = Math.sign(v) * Math.min(Math.abs(v), 160);
    sw.dx = v; sw.row.style.setProperty('--dx', v + 'px');
    const armed = Math.abs(v) > 90; if (armed !== sw.armed) { sw.armed = armed; if (armed) haptic(12); }
    sw.row.classList.toggle('sw-r', v > 0); sw.row.classList.toggle('sw-l', v < 0); sw.row.classList.toggle('armed', armed);
  }, { passive: true });
  const end = () => {
    if (!sw) return; const { row, dx, on } = sw; sw = null; if (!on) return;
    const act = dx > 90 ? row.dataset.sr : dx < -90 ? row.dataset.sl : null;
    row.classList.add('sw-back'); row.style.setProperty('--dx', act === row.dataset.sl && act ? '-110%' : '0px');
    setTimeout(() => { row.classList.remove('swiping', 'sw-back', 'sw-r', 'sw-l', 'armed'); row.style.removeProperty('--dx'); }, act && dx < 0 ? 260 : 220);
    if (act) { const t = row.querySelector(`[data-act="${act}"]`); if (t) setTimeout(() => t.click(), dx < 0 ? 220 : 110); }
    // evita que el "click" del final active otra cosa
    const stop = (ev) => { ev.stopPropagation(); ev.preventDefault(); }; document.addEventListener('click', stop, { capture: true, once: true }); setTimeout(() => document.removeEventListener('click', stop, { capture: true }), 60);
  };
  document.addEventListener('pointerup', end, { passive: true });
  document.addEventListener('pointercancel', () => { if (sw) { sw.row.classList.remove('swiping', 'sw-r', 'sw-l', 'armed'); sw.row.style.removeProperty('--dx'); sw = null; } }, { passive: true });

  // 2) Jalar hacia abajo para actualizar (celular)
  const ptr = document.createElement('div'); ptr.className = 'ptr'; ptr.innerHTML = '<span>🪺</span>'; document.body.appendChild(ptr);
  let pull = null;
  document.addEventListener('touchstart', e => { if (innerWidth > 860 || scrollY > 2 || blocked() || e.touches.length > 1 || e.target.closest('.swipe, .wheel-stage, .scratch, .inst, .rec-pick, .leaflet-container')) return; pull = { y0: e.touches[0].clientY, x0: e.touches[0].clientX, d: 0 }; }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (!pull) return; const d = e.touches[0].clientY - pull.y0, dxx = Math.abs(e.touches[0].clientX - pull.x0);
    if (d < 0 || scrollY > 2 || dxx > d) { pull.d = 0; ptr.style.cssText = ''; return; }
    pull.d = d; const k = Math.min(1, d / 110); ptr.style.transform = `translate(-50%, ${Math.min(d * .55, 80)}px) rotate(${d * 2}deg)`; ptr.style.opacity = k; ptr.classList.toggle('ready', d > 110);
    if (d > 110 && !pull.buzz) { pull.buzz = true; haptic(15); }
  }, { passive: true });
  document.addEventListener('touchend', () => {
    if (!pull) return; const go = pull.d > 110; pull = null;
    if (go) { ptr.classList.add('spin'); setTimeout(() => location.reload(), 450); } else { ptr.style.cssText = ''; ptr.classList.remove('ready'); }
  }, { passive: true });

  // 3) "Atrás" deslizando desde la orilla izquierda (app instalada)
  let edge = null;
  const ind = document.createElement('div'); ind.className = 'edge-back'; ind.textContent = '‹'; document.body.appendChild(ind);
  document.addEventListener('touchstart', e => { if (!standalone() || blocked() || S.route?.name === 'inicio') return; const t = e.touches[0]; if (t.clientX < 22) edge = { x0: t.clientX, y0: t.clientY, d: 0 }; }, { passive: true });
  document.addEventListener('touchmove', e => { if (!edge) return; const t = e.touches[0]; edge.d = t.clientX - edge.x0; if (Math.abs(t.clientY - edge.y0) > 70) { edge = null; ind.style.cssText = ''; return; } ind.style.transform = `translate(${Math.min(edge.d * .5, 60) - 40}px, -50%)`; ind.style.opacity = Math.min(1, edge.d / 90); ind.classList.toggle('ready', edge.d > 90); }, { passive: true });
  document.addEventListener('touchend', () => { if (!edge) return; const go = edge.d > 90; edge = null; ind.style.cssText = ''; ind.classList.remove('ready'); if (go) { haptic(10); history.length > 1 ? history.back() : (location.hash = '#/inicio'); } }, { passive: true });

  // 4) Visor de fotos: ← → para cambiar, ↓ para cerrar
  let lb = null;
  document.addEventListener('touchstart', e => { const box = e.target.closest('.lightbox'); if (!box || e.target.closest('button') || e.touches.length > 1) return; lb = { box, x0: e.touches[0].clientX, y0: e.touches[0].clientY, dx: 0, dy: 0 }; }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (!lb) return; lb.dx = e.touches[0].clientX - lb.x0; lb.dy = e.touches[0].clientY - lb.y0;
    const img = lb.box.querySelector('img'); if (!img) return;
    if (Math.abs(lb.dy) > Math.abs(lb.dx) && lb.dy > 0) { img.style.transform = `translateY(${lb.dy}px) scale(${1 - Math.min(lb.dy, 300) / 1200})`; lb.box.style.background = `rgba(0,0,0,${.92 - Math.min(lb.dy, 300) / 500})`; }
    else img.style.transform = `translateX(${lb.dx * .6}px)`;
  }, { passive: true });
  document.addEventListener('touchend', () => {
    if (!lb) return; const { box, dx, dy } = lb; lb = null; const img = box.querySelector('img');
    if (dy > 120 && Math.abs(dy) > Math.abs(dx)) { box.querySelector('[data-x]')?.click() || box.remove(); return; }
    if (img) { img.style.transition = 'transform .2s'; img.style.transform = ''; setTimeout(() => img && (img.style.transition = ''), 220); } box.style.background = '';
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) box.querySelector(dx < 0 ? '[data-n]' : '[data-p]')?.click();
  }, { passive: true });
}
