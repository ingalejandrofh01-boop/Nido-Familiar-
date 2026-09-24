// ✨ Movimiento: entrada en cascada, números que cuentan y sonidos/vibraciones sutiles
import { sfx, soundOn } from './reveal.js';
import { cash } from './debts.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const lastVals = new Map();

export function animateView(view, routeChanged) {
  if (!view) return;
  if (routeChanged && !reduced) {
    const items = [...view.children].flatMap(c => c.classList.contains('grid') || c.classList.contains('col') ? [...c.children] : [c]).slice(0, 14);
    items.forEach((el, i) => { el.style.setProperty('--i', i); el.classList.remove('stg'); void el.offsetWidth; el.classList.add('stg'); });
  }
  // Números que cuentan (sólo cuando cambian o al entrar a la sección)
  view.querySelectorAll('[data-count]').forEach((el, idx) => {
    const to = Number(el.dataset.count) || 0, fmt = el.dataset.fmt || 'int', key = location.hash + '|' + idx + '|' + fmt;
    const from = routeChanged ? 0 : (lastVals.has(key) ? lastVals.get(key) : to);
    lastVals.set(key, to);
    if (from === to || reduced) return;
    const f = (v) => fmt === 'cash' ? cash(v) : fmt === 'money' ? '$' + Math.round(v).toLocaleString('es-MX') : Math.round(v).toLocaleString('es-MX');
    const t0 = performance.now(), d = 900;
    const step = (t) => { const k = Math.min(1, (t - t0) / d), v = from + (to - from) * (1 - Math.pow(1 - k, 3)); if (!el.isConnected) return; el.textContent = f(v); if (k < 1) requestAnimationFrame(step); else el.textContent = f(to); };
    requestAnimationFrame(step);
  });
}

const vibOn = () => { try { return localStorage.getItem('nido-haptics') !== '0'; } catch { return true; } };
export const haptic = (p = 10) => { if (!vibOn()) return; try { navigator.vibrate && navigator.vibrate(p); } catch { } };
const MAP = {
  toggle: 'check', check: 'check', checkin: 'check', care: 'check', bring: 'check', bringDone: 'check', togglePack: 'check', done: 'check',
  rsvp: 'pop', claimWish: 'pop', pick: 'pop', vote: 'pop', filter: 'soft', tab: 'soft', scope: 'soft', mtab: 'soft', cat: 'soft', wk: 'soft', prev: 'soft', next: 'soft',
  quickAdd: 'whoosh', search: 'soft', notifs: 'soft', sos: null
};
export function playFor(act, el) {
  const k = MAP[act]; if (k === undefined) return;
  if (k && soundOn()) { try { sfx[k](); } catch { } }
  haptic(k === 'check' ? [12, 30, 12] : 8);
}
export const coin = () => { if (soundOn()) try { sfx.coin(); } catch { } haptic([20, 40, 30]); };
