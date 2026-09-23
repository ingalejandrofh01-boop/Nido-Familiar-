// ⏳ Cápsula del tiempo: mensajes y fotos que se abren en una fecha especial
import { S, hooks, members, member, notify, onCleanup } from '../store.js';
import { esc, avatar, modal, toast, compressImage, pickFiles, fmtDate, isoDate, parseDate, today0, daysBetween, memberPicker } from '../ui.js';

const canOpen = (c) => parseDate(c.openAt) <= today0();
const isFor = (c) => c.to === 'all' || (Array.isArray(c.to) && (c.to.includes(S.me.id) || c.by === S.me.id));

function capsuleForm() {
  let photo = '';
  const y = today0().getFullYear();
  modal({
    title: '⏳ Nueva cápsula del tiempo', wide: true,
    body: `<div class="field"><label>Título</label><input class="input" name="title" required placeholder="Para cuando cumplas 18, Carta para la familia en 2030…"></div>
      <div class="field"><label>Mensaje</label><textarea class="input" name="message" rows="7" required placeholder="Hoy, ${fmtDate(isoDate(), { year: true })}, quiero contarte que…"></textarea></div>
      <div class="row mb"><button type="button" class="btn sm" id="cph">📷 Agregar una foto</button><img id="cphv" style="height:60px;border-radius:10px;display:none"></div>
      <div class="frow"><div class="field"><label>Se abre el…</label><input class="input" type="date" name="openAt" required min="${isoDate(new Date(Date.now() + 864e5))}" value="${y + 1}-${String(today0().getMonth() + 1).padStart(2, '0')}-${String(today0().getDate()).padStart(2, '0')}"></div>
      <div class="field"><label>Atajos</label><div class="chips">${[['1 año', 1], ['5 años', 5], ['10 años', 10]].map(([l, n]) => `<button type="button" class="chip chip-btn" data-yrs="${n}">${l}</button>`).join('')}</div></div></div>
      <div class="field"><label>¿Para quién?</label><label class="chip chip-btn mb"><input type="checkbox" name="all" checked> 👨‍👩‍👧‍👦 Toda la familia</label>${memberPicker('to', members(), [])}</div>`,
    onOpen(f) {
      f.querySelector('#cph').onclick = async () => { const [file] = await pickFiles(); if (!file) return; photo = await compressImage(file, 1100, .78, 300000); const v = f.querySelector('#cphv'); v.src = photo; v.style.display = ''; };
      f.querySelectorAll('[data-yrs]').forEach(b => b.onclick = () => { const d = new Date(); d.setFullYear(d.getFullYear() + Number(b.dataset.yrs)); f.querySelector('[name=openAt]').value = isoDate(d); });
    },
    submit: async d => {
      if (!d.title.trim() || !d.message.trim()) return false;
      if (d.openAt <= isoDate()) { toast('Elige una fecha futura'); return false; }
      const to = d.all || !(d.to || []).length ? 'all' : [...new Set([...(d.to || []), S.me.id])];
      await S.db.add('capsules', { title: d.title.trim(), message: d.message.trim(), photo, openAt: d.openAt, to, by: S.me.id, opened: {} });
      notify({ to: to === 'all' ? 'all' : to, icon: '⏳', title: `${S.me.name} guardó una cápsula del tiempo`, body: `Se podrá abrir el ${fmtDate(d.openAt, { year: true })}`, link: 'capsula' });
      toast('⏳ Cápsula sellada. ¡Nos vemos en el futuro!');
    }
  });
}

function openCapsule(c) {
  const el = document.createElement('div'); el.className = 'cap-open';
  el.innerHTML = `<div class="cap-anim"><div class="cap-top"></div><div class="cap-body">⏳</div></div>`;
  document.body.appendChild(el);
  setTimeout(() => {
    el.classList.add('opened'); hooks.celebrate(innerWidth / 2, innerHeight / 2.5, 'spark');
    setTimeout(() => {
      el.innerHTML = `<article class="cap-letter"><button class="icon-btn cap-x">✕</button>
        <div class="tiny bold muted">Guardada el ${fmtDate(isoDate(new Date(c.createdAt)), { year: true })} por ${esc(member(c.by)?.name || 'alguien de la familia')}</div>
        <h2 class="cap-title">${esc(c.title)}</h2>${c.photo ? `<img src="${c.photo}" class="cap-photo">` : ''}
        <div class="cap-msg">${esc(c.message).replace(/\n/g, '<br>')}</div>
        <div class="cap-sign">— ${esc(member(c.by)?.name || '')} ${member(c.by) ? avatar(member(c.by), 'sm') : ''}</div></article>`;
      el.querySelector('.cap-x').onclick = () => el.remove();
    }, 900);
  }, 1300);
  if (!(c.opened || {})[S.me.id]) S.db.update('capsules', c.id, { ['opened.' + S.me.id]: Date.now() });
}

export default {
  render() {
    const list = S.data.capsules.filter(isFor).sort((a, b) => a.openAt.localeCompare(b.openAt));
    const ready = list.filter(canOpen), locked = list.filter(c => !canOpen(c));
    const card = (c) => {
      const open = canOpen(c), days = daysBetween(today0(), parseDate(c.openAt)), seen = (c.opened || {})[S.me.id];
      const to = c.to === 'all' ? 'Toda la familia' : c.to.map(id => member(id)?.name).filter(Boolean).join(', ');
      return `<article class="card deco cap-card ${open ? 'ready' : ''}">
        <div class="cap-icon">${open ? (seen ? '📜' : '✨⏳✨') : '🔒'}</div>
        <div class="bold" style="font-size:17px">${esc(c.title)}</div>
        <div class="tiny muted">De ${esc(member(c.by)?.name || '?')} · para ${esc(to)}</div>
        ${open ? `<button class="btn primary mt" data-act="open" data-id="${c.id}">${seen ? '📜 Volver a leer' : '🎉 ¡Abrir cápsula!'}</button>`
          : `<div class="cap-count mt"><b>${days > 365 ? Math.floor(days / 365) + ' año' + (days >= 730 ? 's' : '') + ' ' + (days % 365) + ' d' : days + ' días'}</b><span>para abrirla · ${fmtDate(c.openAt, { year: true })}</span></div>`}
      </article>`;
    };
    return `<div class="page-head"><div><h1>Cápsula del tiempo</h1><p>Mensajes para el futuro que sólo se abren en su fecha ⏳</p></div><button class="btn primary" data-act="new">＋ Sellar cápsula</button></div>
      ${ready.length ? `<h3 class="mb" style="font-weight:900">✨ Listas para abrir</h3><div class="grid auto mb">${ready.map(card).join('')}</div>` : ''}
      <h3 class="mb" style="font-weight:900">🔒 Selladas</h3>
      ${locked.length ? `<div class="grid auto">${locked.map(card).join('')}</div>` : '<div class="card empty"><div class="big">⏳</div><p class="bold">Escríbele algo a tu yo del futuro, o a los peques para cuando crezcan</p><button class="btn primary" data-act="new">Crear la primera</button></div>'}
      <p class="tiny faint mt center">Las cápsulas no se pueden abrir antes de su fecha dentro de la app.</p>`;
  },
  actions: { new() { capsuleForm(); }, open(el) { openCapsule(S.data.capsules.find(c => c.id === el.dataset.id)); } }
};
