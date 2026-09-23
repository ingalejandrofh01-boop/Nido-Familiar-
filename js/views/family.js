// 👨‍👩‍👧‍👦 Integrantes, perfiles, roles y código de invitación
import { S, hooks, members, member, isAdmin } from '../store.js';
import { esc, avatar, fmtDate, nextBirthday, isoDate, today0, modal, toast, compressImage, pickFiles, EMOJIS_PEOPLE, COLORS, ROLES, relDay, fmtTime } from '../ui.js';
import { occurrences, EVENT_TYPES } from '../events.js';

export function memberForm(m = null) {
  let photo = m?.photo || '';
  const canRole = isAdmin() && (!m || m.id !== S.me.id || members().filter(x => x.role === 'admin').length > 1);
  modal({
    title: m ? `Editar a ${esc(m.name)}` : 'Agregar integrante',
    body: `<div class="row mb"><span id="avp">${avatar(m || { name: '?', emoji: '🙂', color: COLORS[members().length % COLORS.length] }, 'lg')}</span>
        <div class="col" style="gap:6px">${m ? `<a class="btn sm primary" href="#/avatar/${m.id}" data-close>🐾 Avatar animado</a>` : ''}<button type="button" class="btn sm" id="ph">📷 Foto</button>${photo ? '<button type="button" class="btn sm ghost" id="phx">Quitar foto</button>' : ''}</div></div>
      <div class="frow"><div class="field"><label>Nombre</label><input class="input" name="name" required value="${esc(m?.name || '')}"></div>
      <div class="field"><label>Parentesco</label><input class="input" name="relation" value="${esc(m?.relation || '')}" placeholder="Mamá, abuelo, prima…"></div></div>
      <div class="frow"><div class="field"><label>Cumpleaños</label><input class="input" type="date" name="birthday" value="${esc(m?.birthday || '')}"></div>
      <div class="field"><label>Teléfono</label><input class="input" type="tel" name="phone" value="${esc(m?.phone || '')}"></div></div>
      <div class="field"><label>Emoji</label><div class="chips">${EMOJIS_PEOPLE.map(e => `<label class="chip chip-btn"><input type="radio" name="emoji" value="${e}" ${(m?.emoji || '🙂') === e ? 'checked' : ''} hidden>${e}</label>`).join('')}</div></div>
      <div class="field"><label>Color</label><div class="chips">${COLORS.map(c => `<label class="chip chip-btn" style="background:${c};width:34px;height:30px;padding:0;justify-content:center"><input type="radio" name="color" value="${c}" ${(m?.color || COLORS[members().length % COLORS.length]) === c ? 'checked' : ''} style="accent-color:#fff"></label>`).join('')}</div></div>
      <div class="frow"><div class="field"><label>Contacto de emergencia</label><input class="input" name="emergencyName" value="${esc(m?.emergencyName || '')}" placeholder="Nombre"></div>
      <div class="field"><label>Tel. de emergencia</label><input class="input" type="tel" name="emergencyPhone" value="${esc(m?.emergencyPhone || '')}"></div></div>
      <div class="field"><label>Información importante</label><textarea class="input" name="info" placeholder="Alergias, tipo de sangre, medicamentos, talla…">${esc(m?.info || '')}</textarea></div>
      ${canRole ? `<div class="field"><label>Rol y permisos</label><select class="input" name="role">${Object.entries(ROLES).map(([k, v]) => `<option value="${k}" ${(m?.role || 'nino') === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
        <span class="tiny muted">Adolescentes y niños no ven la sección de Dinero. Sólo administradores gestionan integrantes.</span></div>` : ''}`,
    onOpen(f) {
      const refresh = () => { const d = Object.fromEntries(new FormData(f)); f.querySelector('#avp').innerHTML = avatar({ name: d.name || '?', emoji: d.emoji, color: d.color, photo }, 'lg'); };
      f.addEventListener('change', refresh);
      f.querySelector('#ph').onclick = async () => { const [file] = await pickFiles(); if (!file) return; photo = await compressImage(file, 320, 0.8, 60000); refresh(); };
      const x = f.querySelector('#phx'); if (x) x.onclick = () => { photo = ''; refresh(); };
    },
    submit: async d => {
      const data = { name: d.name.trim(), relation: d.relation, birthday: d.birthday, phone: d.phone, emoji: d.emoji || '🙂', color: d.color || COLORS[0], emergencyName: d.emergencyName, emergencyPhone: d.emergencyPhone, info: d.info, photo };
      if (!data.name) return false;
      if (canRole && d.role) data.role = d.role;
      if (m) {
        await S.db.update('members', m.id, data);
        if (data.role && m.uid && data.role !== m.role && !S.isDemo) await S.db.updateFamily({ [`roles.${m.uid}`]: data.role });
      } else await S.db.add('members', { ...data, role: data.role || 'nino', points: 0 });
      toast('✅ Guardado');
    },
    danger: m && isAdmin() && m.id !== S.me.id ? { label: '🗑️ Quitar', confirm: `¿Quitar a ${esc(m.name)} de la familia?`, action: async () => { await S.db.remove('members', m.id); hooks.go('familia'); } } : null
  });
}

function inviteBox() {
  const url = location.href.split('#')[0];
  const text = `¡Únete a ${S.family?.name} en Nido! 🪺\nEntra a ${url} y usa el código: ${S.family?.code}`;
  return `<section class="card deco"><div class="card-title"><h3>🔑 Invitar a la familia</h3></div>
    <p class="small muted bold">Comparte este código. Cada quien entra con su cuenta y elige su perfil.</p>
    <div class="row wrap mt"><div style="font-size:32px;font-weight:900;letter-spacing:8px;padding:8px 16px;border-radius:14px;background:var(--input);border:1px dashed var(--accent)">${esc(S.family?.code || '—')}</div>
    <button class="btn" data-act="copyCode">📋 Copiar</button><a class="btn primary" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(text)}">💬 Enviar por WhatsApp</a></div></section>`;
}

export const familia = {
  render() {
    const ms = members();
    return `
      <div class="page-head"><div><h1>${esc(S.family?.name || 'Familia')}</h1><p>${ms.length} integrantes · perfiles, cumpleaños e info importante</p></div>
        ${isAdmin() ? '<button class="btn primary" data-act="add">＋ Agregar integrante</button>' : ''}</div>
      <div class="grid auto">${ms.map(m => { const nb = nextBirthday(m); return `<a class="card deco center" href="#/perfil/${m.id}" style="text-decoration:none">
        ${avatar(m, 'xl')}<h3 style="font-size:20px;font-weight:900;margin-top:12px">${esc(m.name)}</h3>
        <div class="small muted bold">${esc(m.relation || '')}${nb ? ` · ${nb.age - (nb.days === 0 ? 0 : 1)} años` : ''}</div>
        <div class="chips mt" style="justify-content:center"><span class="chip">${ROLES[m.role] || 'Integrante'}</span>${nb ? `<span class="chip accent">🎂 ${nb.days === 0 ? '¡Hoy!' : `en ${nb.days} días`}</span>` : ''}${m.uid ? '<span class="chip">📱 Con cuenta</span>' : ''}</div></a>`; }).join('')}</div>
      <div class="mt">${inviteBox()}</div>`;
  },
  actions: {
    add() { memberForm(); },
    async copyCode() { try { await navigator.clipboard.writeText(S.family.code); toast('📋 Código copiado'); } catch { toast(S.family.code); } }
  }
};

export const perfil = {
  render([id]) {
    const m = member(id); if (!m) return `<div class="card empty">Integrante no encontrado</div>`;
    const nb = nextBirthday(m);
    const t0 = today0(); const end = new Date(t0); end.setDate(end.getDate() + 30);
    const evs = occurrences(t0, end).filter(o => (o.ev?.participants || []).includes(m.id)).slice(0, 8);
    const canEdit = isAdmin() || m.id === S.me.id;
    const chores = S.data.chores.filter(c => c.assignee === m.id && !c.done).slice(0, 5);
    return `<a class="link" href="#/familia">‹ Familia</a>
      <section class="card deco hero mt"><div class="row wrap" style="gap:20px">${avatar(m, 'xl')}
        <div class="grow"><div class="hero-greet" style="font-size:clamp(32px,5vw,50px)">${esc(m.name)}</div>
        <div class="hero-sub">${esc(m.relation || '')} · ${ROLES[m.role] || ''}${m.points ? ` · 🏆 ${m.points} pts` : ''}</div>
        ${nb ? `<div class="mt bold">🎂 ${fmtDate(isoDate(nb.date))} · ${nb.days === 0 ? `¡Hoy cumple ${nb.age}! 🎉` : `cumple ${nb.age} en ${nb.days} días`}</div>` : ''}</div>
        ${canEdit ? `<div class="col"><a class="btn primary" href="#/avatar/${m.id}">🐾 ${m.avatar ? 'Editar avatar' : 'Crear avatar'}</a><button class="btn" data-act="edit">✏️ Editar datos</button></div>` : ''}</div></section>
      <div class="grid g2 mt">
        <section class="card deco"><div class="card-title"><h3>📇 Contacto</h3></div><div class="list">
          ${m.phone ? `<a class="item clickable" href="tel:${esc(m.phone)}" style="text-decoration:none"><span class="emoji">📞</span><div class="grow bold">${esc(m.phone)}</div><span class="chip">Llamar</span></a>
            <a class="item clickable" href="https://wa.me/52${esc(m.phone.replace(/\D/g, '').slice(-10))}" target="_blank" rel="noopener" style="text-decoration:none"><span class="emoji">💬</span><div class="grow bold">WhatsApp</div></a>` : '<div class="item muted small">Sin teléfono</div>'}
          ${m.emergencyName || m.emergencyPhone ? `<a class="item clickable" href="tel:${esc(m.emergencyPhone || '')}" style="text-decoration:none"><span class="emoji">🚨</span><div class="grow"><div class="bold">${esc(m.emergencyName || 'Emergencia')}</div><div class="small muted">${esc(m.emergencyPhone || '')}</div></div></a>` : ''}
        </div>
        ${m.info ? `<div class="card-title mt"><h3>⚕️ Información importante</h3></div><div style="white-space:pre-wrap;font-weight:600" class="item">${esc(m.info)}</div>` : ''}</section>
        <section class="card deco"><div class="card-title"><h3>📅 Sus próximos eventos</h3></div>
          <div class="list">${evs.map(o => `<div class="item"><span class="emoji">${(EVENT_TYPES[o.type] || EVENT_TYPES.familiar).e}</span><div class="grow"><div class="bold ellipsis">${esc(o.title)}</div><div class="small muted">${relDay(o.date)}${o.time ? ' · ' + fmtTime(o.time) : ''}</div></div></div>`).join('') || '<div class="empty small">Nada en los próximos 30 días</div>'}</div>
          ${chores.length ? `<div class="card-title mt"><h3>🧹 Tareas pendientes</h3></div><div class="list">${chores.map(c => `<div class="item"><span class="emoji">🧽</span><span class="grow bold">${esc(c.title)}</span><span class="chip">+${c.points || 0}</span></div>`).join('')}</div>` : ''}
        </section></div>`;
  },
  actions: { edit() { memberForm(member(S.route.params[0])); } }
};
