// ＋ Agregar cualquier cosa desde cualquier pantalla
import { S, hooks, isAdult } from './store.js';
import { esc, modal, toast } from './ui.js';
import { openEventForm } from './views/agenda.js';
import { sfx } from './reveal.js';

const ITEMS = () => [
  ['📅', 'Evento', 'Cita, junta, viaje', () => openEventForm()],
  ['🤝', 'Cuenta dividida', 'Renta, súper, préstamo', () => hooks.runAction('cuentas', 'newBill')],
  isAdult() && ['💸', 'Gasto familiar', 'Lo que gastó la casa', () => hooks.runAction('dinero', 'new', { t: 'familia' }, 'mtab')],
  ['💰', 'Mi gasto o ingreso', 'Finanzas privadas', () => hooks.runAction('dinero', 'addGasto', { t: 'personal' }, 'mtab')],
  ['🎯', 'Meta o aporte', 'Carro, casa, viaje', () => hooks.go('metas')],
  ['🧹', 'Tarea', 'Con puntos', () => hooks.runAction('tareas', 'new')],
  ['📸', 'Fotos', 'Al libro familiar', () => hooks.go('fotos')],
  ['📝', 'Nota', 'Wi-Fi, contactos…', () => hooks.runAction('notas', 'new')],
  ['🎉', 'Fiesta', 'Quién trae qué', () => hooks.runAction('fiestas', 'newParty')],
  ['🍽️', 'Menú', 'Qué se come', () => hooks.go('menu')],
  ['🗳️', 'Encuesta', 'Que decida la familia', () => hooks.runAction('encuestas', 'newPoll')],
  ['🐾', 'Cuidado mascota', 'Comida, paseo…', () => hooks.go((S.data.pets || []).length === 1 ? 'mascota/' + S.data.pets[0].id : 'mascotas')],
  ['⏳', 'Cápsula', 'Para el futuro', () => hooks.runAction('capsula', 'new')],
  ['✈️', 'Viaje', 'Itinerario y maleta', () => hooks.runAction('viajes', 'new')],
  ['💬', 'Mensaje', 'Al chat familiar', () => hooks.go('chat')],
  ['🎡', 'Ruleta', '¿A quién le toca?', () => hooks.go('ruleta')]
].filter(Boolean);

export function openQuickAdd() {
  const items = ITEMS();
  const m = modal({
    title: '＋ ¿Qué quieres agregar?',
    body: `<div class="qa-shop" data-qa-shop><span>🛒</span><input class="input" id="qa-shop" placeholder="Agregar a la lista del súper…" autocomplete="off" enterkeyhint="done"><button class="btn primary" type="button" data-qa-add>＋</button></div>
      <div class="qa-grid">${items.map(([e, t, d], i) => `<button type="button" class="qa-i" data-i="${i}" style="--d:${i * 22}ms"><span class="qa-e">${e}</span><b>${t}</b><span class="tiny muted">${d}</span></button>`).join('')}</div>`,
    foot: '',
    onOpen(f, close) {
      f.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { close(); try { sfx.pop(); } catch { } setTimeout(() => items[+b.dataset.i][3](), 120); });
      const shop = f.querySelector('[data-qa-shop]'), inp = f.querySelector('#qa-shop');
      const add = async () => { const t = inp.value.trim(); if (!t) return; inp.value = ''; await S.db.add('shopping', { text: t, list: 'Súper', done: false, by: S.me.id }); try { sfx.pop(); navigator.vibrate && navigator.vibrate(15); } catch { } toast(`🛒 “${t}” agregado`); inp.focus(); };
      f.querySelector('[data-qa-add]').onclick = add;
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); add(); } });
    }
  });
  m.el.classList.add('qa-modal');
}
