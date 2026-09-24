// 👋 Bienvenida guiada (4 pasos) para quien entra por primera vez
import { S, hooks, members } from './store.js';
import { esc, avatar, toast } from './ui.js';
import { randomAvatar, renderAvatar } from './avatar.js';
import { askPermission } from './notifications.js';
import { sfx } from './reveal.js';

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

export function maybeOnboard() { if (!S.me || S.me.onboarded || S.isDemo || document.querySelector('.onb')) return; openOnboarding(); }

export function openOnboarding() {
  if (document.querySelector('.onb')) return;
  const me = S.me; let step = 0; let picks = Array.from({ length: 6 }, () => randomAvatar()); let chosen = me.avatar ? -1 : null;
  const draft = { birthday: me.birthday || '', phone: me.phone || '' };
  const el = document.createElement('div'); el.className = 'onb';
  document.body.appendChild(el); document.documentElement.classList.add('modal-open');
  const finish = async (goAvatar) => {
    const upd = { onboarded: true };
    if (draft.birthday) upd.birthday = draft.birthday; if (draft.phone) upd.phone = draft.phone;
    if (chosen != null && chosen >= 0) upd.avatar = picks[chosen];
    try { await S.db.update('members', me.id, upd); } catch (e) { console.warn(e); }
    el.classList.add('out'); document.documentElement.classList.remove('modal-open'); setTimeout(() => el.remove(), 350);
    for (let i = 0; i < 5; i++) setTimeout(() => hooks.celebrate(innerWidth * (.2 + Math.random() * .6), innerHeight * .3, 'confetti'), i * 150);
    toast('🪺 ¡Bienvenido al nido!'); if (goAvatar) hooks.go('avatar/' + me.id);
  };
  const steps = [
    () => `<div class="onb-hero">🪺</div><h2>¡Bienvenido a Nido, ${esc(me.name.split(' ')[0])}!</h2><p>El lugar de ${esc(S.family?.name || 'tu familia')} para la agenda, los intercambios, las fotos, las cuentas claras y mucho más.</p>
      <div class="onb-fam">${members().slice(0, 8).map((m, i) => `<span style="--d:${i * .08}s">${avatar(m, 'lg')}</span>`).join('')}</div><p class="tiny">Te toma 1 minuto dejar todo listo ✨</p>`,
    () => `<div class="onb-hero">🎂</div><h2>Para que te celebremos</h2><p>Con tu cumpleaños la app se pone de fiesta ese día y le avisa a toda la familia.</p>
      <div class="field"><label>Tu cumpleaños</label><input class="input" type="date" data-k="birthday" value="${esc(draft.birthday)}"></div>
      <div class="field"><label>Tu celular (para el botón SOS y WhatsApp)</label><input class="input" type="tel" inputmode="tel" data-k="phone" value="${esc(draft.phone)}" placeholder="10 dígitos"></div>`,
    () => `<div class="onb-hero">🐾</div><h2>Elige tu animalito</h2><p>Tu avatar aparece en toda la app. Luego puedes cambiarle todo.</p>
      <div class="onb-avas">${me.avatar ? `<button class="onb-ava ${chosen === -1 ? 'on' : ''}" data-av="-1"><span class="avatar ava lg live">${renderAvatar(me.avatar, { raw: true })}</span><span class="tiny">El mío</span></button>` : ''}${picks.map((a, i) => `<button class="onb-ava ${chosen === i ? 'on' : ''}" data-av="${i}"><span class="avatar ava lg live">${renderAvatar(a, { raw: true })}</span></button>`).join('')}</div>
      <button class="btn sm" data-shuffle>🎲 Ver otros</button>`,
    () => `<div class="onb-hero">🔔</div><h2>¡Casi listo!</h2><p>Activa los avisos para enterarte del sorteo, los cumpleaños, los pagos y los mensajes.</p>
      <div class="col" style="gap:10px;width:100%">${'Notification' in window && Notification.permission !== 'granted' ? '<button class="btn block" data-perm>🔔 Activar notificaciones</button>' : '<div class="chip accent" style="justify-content:center">✅ Avisos activados</div>'}
      ${standalone() ? '' : S.installPrompt ? '<button class="btn block" data-install>📲 Instalar Nido en el teléfono</button>' : isIOS() ? '<div class="onb-tip">📲 Para instalarla en iPhone: toca <b>Compartir</b> en Safari → <b>Agregar a pantalla de inicio</b></div>' : ''}</div>`
  ];
  const paint = () => {
    el.innerHTML = `<div class="onb-card"><div class="onb-dots">${steps.map((_, i) => `<i class="${i === step ? 'on' : i < step ? 'done' : ''}"></i>`).join('')}</div>
      <div class="onb-body" style="animation:onbIn .45s cubic-bezier(.2,1,.3,1)">${steps[step]()}</div>
      <div class="onb-foot">${step ? '<button class="btn ghost" data-back>Atrás</button>' : '<button class="btn ghost" data-skip>Después</button>'}
        ${step < steps.length - 1 ? '<button class="btn primary" data-next>Siguiente →</button>' : `<button class="btn primary" data-done>🎉 ¡Empezar!</button>`}</div>
      ${step === 2 ? '<button class="link tiny onb-custom" data-custom>Prefiero crear el mío con detalle →</button>' : ''}</div>`;
    el.querySelectorAll('[data-k]').forEach(i => i.oninput = () => draft[i.dataset.k] = i.value);
  };
  el.addEventListener('click', async e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.av !== undefined) { chosen = +t.dataset.av; try { sfx.pop(); } catch { } return paint(); }
    if (t.hasAttribute('data-shuffle')) { picks = Array.from({ length: 6 }, () => randomAvatar()); if (chosen >= 0) chosen = null; return paint(); }
    if (t.hasAttribute('data-next')) { step++; try { sfx.soft(); } catch { } return paint(); }
    if (t.hasAttribute('data-back')) { step--; return paint(); }
    if (t.hasAttribute('data-skip')) return finish(false);
    if (t.hasAttribute('data-done')) return finish(false);
    if (t.hasAttribute('data-custom')) return finish(true);
    if (t.hasAttribute('data-perm')) { await askPermission(); return paint(); }
    if (t.hasAttribute('data-install')) { const p = S.installPrompt; if (p) { p.prompt(); await p.userChoice; S.installPrompt = null; } return paint(); }
  });
  paint();
}
