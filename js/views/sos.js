// 🚨 Botón de emergencia
import { S, members } from '../store.js';
import { esc, avatar, modal, toast } from '../ui.js';
import { getLocation, mapsLink } from './chat.js';

const TYPES = [['🚗', 'Accidente'], ['🏥', 'Emergencia médica'], ['🔧', 'Problema con el auto'], ['⚠️', 'Estoy en peligro'], ['❓', 'Otro']];

export function openSOS() {
  if (!S.me) return;
  let type = null;
  const contacts = members().filter(m => m.id !== S.me.id && m.phone);
  const m = modal({
    title: '🚨 Necesito ayuda',
    body: `<a class="sos-big" href="tel:911" style="display:block;text-align:center;text-decoration:none">📞 Llamar al 911</a>
      <p class="bold mt">¿Qué pasa? Avisaremos a toda la familia con tu ubicación:</p>
      <div class="grid g2" id="sos-types">${TYPES.map(([e, t]) => `<button type="button" class="sos-opt" data-t="${t}"><span style="font-size:24px">${e}</span>${t}</button>`).join('')}</div>
      <textarea class="input mt" id="sos-msg" placeholder="Mensaje opcional (dónde estás, qué necesitas)…" rows="2"></textarea>
      <button type="button" class="btn danger lg block mt" id="sos-send" disabled style="opacity:.5">Enviar alerta a la familia</button>
      ${contacts.length ? `<div class="divider">Llamar directo</div><div class="list">${contacts.map(c => `<a class="item clickable" href="tel:${esc(c.phone)}" style="text-decoration:none">${avatar(c, 'sm')}<span class="grow bold">${esc(c.name)}</span><span class="chip">📞 ${esc(c.phone)}</span></a>`).join('')}</div>` : ''}
      ${S.me.emergencyPhone ? `<a class="item clickable mt" href="tel:${esc(S.me.emergencyPhone)}" style="text-decoration:none"><span class="emoji">🆘</span><span class="grow bold">${esc(S.me.emergencyName || 'Mi contacto de emergencia')}</span></a>` : ''}`,
    foot: ''
  });
  const send = m.el.querySelector('#sos-send');
  m.el.querySelectorAll('.sos-opt').forEach(b => b.onclick = () => {
    type = b.dataset.t; m.el.querySelectorAll('.sos-opt').forEach(x => x.classList.toggle('on', x === b));
    send.disabled = false; send.style.opacity = 1;
  });
  send.onclick = async () => {
    send.disabled = true; send.textContent = '📍 Obteniendo ubicación…';
    const loc = await getLocation();
    const extra = m.el.querySelector('#sos-msg').value.trim();
    const text = `🚨 SOS · ${type}: ${S.me.name} necesita ayuda.${extra ? ' ' + extra : ''}${loc ? ' 📍 ' + mapsLink(loc) : ''}`;
    try { await S.db.add('messages', { text, author: S.me.id, pinned: true, kind: 'sos', createdAt: Date.now() }); } catch (e) { console.error(e); }
    toast('🚨 Alerta enviada al chat familiar');
    m.el.querySelector('.modal-body').innerHTML = `<div class="center"><div style="font-size:60px">📣</div><h3 style="font-size:20px;font-weight:900">Alerta publicada en el chat</h3>
      <p class="muted bold">Para que les llegue al instante, mándala también por WhatsApp:</p>
      <a class="btn primary lg block mt" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(text)}">💬 Enviar por WhatsApp</a>
      <a class="sos-big mt" href="tel:911" style="display:block;text-decoration:none">📞 Llamar al 911</a>
      <button type="button" class="btn block mt" data-close>Cerrar</button></div>`;
  };
}
