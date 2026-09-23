// ☁️ Indicador de sincronización: guardado / guardando / sin conexión con cambios pendientes
import { S } from './store.js';
import { toast } from './ui.js';

let pending = 0, online = navigator.onLine !== false, idleT = null, slowT = null, slow = false, hadOffline = false;

export function initSync(db) {
  for (const k of ['add', 'set', 'update', 'remove', 'updateFamily']) {
    const orig = db[k]; if (typeof orig !== 'function') continue;
    db[k] = function (...args) {
      pending++; paint();
      clearTimeout(slowT); slowT = setTimeout(() => { if (pending) { slow = true; paint(); } }, 6000);
      let p; try { p = orig.apply(db, args); } catch (e) { done(); throw e; }
      return Promise.resolve(p).finally(done);
    };
  }
  addEventListener('online', () => { online = true; paint(); if (!pending && hadOffline) { toast('☁️ De vuelta en línea · todo al día'); hadOffline = false; } });
  addEventListener('offline', () => { online = false; hadOffline = true; paint(); toast('📴 Sin conexión · tus cambios se guardarán en cuanto vuelva la señal'); });
  paint();
}
function done() {
  pending = Math.max(0, pending - 1);
  if (!pending) { clearTimeout(slowT); if (slow || hadOffline) { if (online) { toast('☁️ Todo sincronizado'); hadOffline = false; } } slow = false; }
  paint();
}

export function syncState() {
  if (!online) return { k: 'off', ico: '📴', t: pending ? `Sin conexión · ${pending} cambio${pending > 1 ? 's' : ''} esperando` : 'Sin conexión' };
  if (pending) return { k: 'busy', ico: '⟳', t: slow ? 'Guardando… (señal lenta)' : 'Guardando…' };
  return { k: 'ok', ico: '✓', t: S.isDemo ? 'Guardado en este equipo' : 'Todo guardado' };
}
export function syncPill() { const s = syncState(); return `<button class="sync-pill ${s.k}" data-act="syncInfo" aria-live="polite" title="${s.t}"><span class="sp-ico">${s.ico}</span><span class="sp-t">${s.t}</span></button>`; }

export function paint() {
  const s = syncState();
  document.querySelectorAll('.sync-pill').forEach(el => {
    el.className = 'sync-pill ' + s.k; el.title = s.t;
    el.querySelector('.sp-ico').textContent = s.ico; el.querySelector('.sp-t').textContent = s.t;
  });
  // Después de unos segundos "Todo guardado" se hace discreto
  clearTimeout(idleT);
  if (s.k === 'ok') idleT = setTimeout(() => document.querySelectorAll('.sync-pill.ok').forEach(el => el.classList.add('idle')), 2500);
}

export function syncInfo() {
  const s = syncState();
  const msg = s.k === 'off' ? '📴 No hay internet. Puedes seguir usando Nido: todo lo que hagas se guarda en tu teléfono y se sube solito cuando vuelva la señal.'
    : s.k === 'busy' ? '⟳ Subiendo tus cambios a la nube de la familia…'
      : S.isDemo ? '💾 Modo demo: los datos se guardan sólo en este navegador.' : '☁️ Todo está guardado en la nube y tu familia ya lo ve.';
  toast(msg);
}
