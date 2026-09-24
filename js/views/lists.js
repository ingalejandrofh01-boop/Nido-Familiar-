// 🛒 Compras compartidas  ·  🧹 Tareas del hogar con puntos y premios
import { S, hooks, members, member, isAdult, isAdmin, notify } from '../store.js';
import { esc, avatar, relDay, isoDate, today0, modal, toast, memberPicker, confirmBox, parseDate } from '../ui.js';

let shopList = 'Todas';
export const shopping = {
  render() {
    const items = S.data.shopping;
    const lists = ['Todas', ...new Set(['Súper', 'Farmacia', 'Casa', ...items.map(i => i.list || 'Súper')])];
    const vis = items.filter(i => shopList === 'Todas' || (i.list || 'Súper') === shopList)
      .sort((a, b) => a.done - b.done || (b.createdAt || 0) - (a.createdAt || 0));
    const pending = vis.filter(i => !i.done).length;
    return `
      <div class="page-head"><div><h1>Lista de compras</h1><p>Todos agregan, todos ven, en tiempo real</p></div>
        ${items.some(i => i.done) ? '<button class="btn" data-act="clearDone">🧹 Quitar comprados</button>' : ''}</div>
      <div class="chips mb">${lists.map(l => `<button class="chip chip-btn ${shopList === l ? 'sel' : ''}" data-act="list" data-l="${esc(l)}">${{ 'Todas': '📋', 'Súper': '🛒', 'Farmacia': '💊', 'Casa': '🏠' }[l] || '🛍️'} ${esc(l)} <span class="faint">${items.filter(i => !i.done && (l === 'Todas' || (i.list || 'Súper') === l)).length}</span></button>`).join('')}
        <button class="chip chip-btn" data-act="newList">＋ Lista</button></div>
      <section class="card deco">
        <form data-submit="addItem" class="row" style="margin-bottom:14px">
          <input class="input grow" id="shop-input" name="text" placeholder="¿Qué hace falta? Ej. leche, huevos…" autocomplete="off">
          <button class="btn primary">Agregar</button></form>
        <div class="small bold muted" style="margin-bottom:8px">${pending} pendiente${pending === 1 ? '' : 's'}</div>
        <div class="list">${vis.map(i => `<div class="item swipe" data-sr="toggle" data-sl="del" data-id="${i.id}">
          <span class="check ${i.done ? 'on' : ''}" data-act="toggle" data-id="${i.id}">${i.done ? '✓' : ''}</span>
          <div class="grow"><div class="bold ${i.done ? 'done-text' : ''}">${esc(i.text)}</div><div class="tiny muted">${esc(i.list || 'Súper')}${member(i.by) ? ' · ' + esc(member(i.by).name) : ''}</div></div>
          <button class="link tiny" data-act="del" data-id="${i.id}">✕</button></div>`).join('') || '<div class="empty"><div class="big">🎉</div>¡No falta nada!</div>'}</div>
      </section>`;
  },
  actions: {
    list(el) { shopList = el.dataset.l; hooks.rerender(); },
    newList() { modal({ title: 'Nueva lista', body: '<div class="field"><input class="input" name="n" required placeholder="Papelería, Mascotas, Fiesta…"></div>', submit: d => { if (!d.n.trim()) return false; shopList = d.n.trim(); hooks.rerender(); } }); },
    async addItem(f) {
      const input = f.querySelector('input'); const text = input.value.trim(); if (!text) return;
      input.value = '';
      for (const t of text.split(',').map(s => s.trim()).filter(Boolean))
        await S.db.add('shopping', { text: t, list: shopList === 'Todas' ? 'Súper' : shopList, done: false, by: S.me.id });
      document.getElementById('shop-input')?.focus();
    },
    toggle(el) { const i = S.data.shopping.find(x => x.id === el.dataset.id); S.db.update('shopping', i.id, { done: !i.done, doneAt: !i.done ? Date.now() : 0, doneBy: !i.done ? S.me.id : '' }); },
    del(el) { S.db.remove('shopping', el.dataset.id); },
    async clearDone() { for (const i of S.data.shopping.filter(i => i.done)) await S.db.remove('shopping', i.id); toast('🧹 Listo'); }
  }
};

// ------------------------ TAREAS ------------------------
const REP = { none: 'Una vez', daily: 'Diario', weekly: 'Semanal' };
function choreForm(c = null) {
  modal({
    title: c ? 'Editar tarea' : 'Nueva tarea',
    body: `<div class="field"><label>Tarea</label><input class="input" name="title" required value="${esc(c?.title || '')}" placeholder="Sacar la basura, lavar platos…"></div>
      <div class="field"><label>Responsable</label>${memberPicker('assignee', members(), [c?.assignee || S.me.id], true)}</div>
      <div class="frow"><div class="field"><label>Fecha</label><input class="input" type="date" name="due" value="${esc(c?.due || isoDate())}"></div>
      <div class="field"><label>Puntos</label><input class="input" type="number" name="points" min="0" value="${c?.points ?? 10}"></div></div>
      <div class="field"><label>Se repite</label><div class="seg">${Object.entries(REP).map(([k, v]) => `<label style="cursor:pointer"><input type="radio" name="repeat" value="${k}" ${(c?.repeat || 'none') === k ? 'checked' : ''}> ${v}</label>`).join('&nbsp;&nbsp;')}</div></div>`,
    submit: async d => {
      const data = { title: d.title.trim(), assignee: d.assignee, due: d.due, points: Number(d.points) || 0, repeat: d.repeat || 'none' };
      if (!data.title) return false;
      if (c) await S.db.update('chores', c.id, data); else await S.db.add('chores', { ...data, done: false });
      if (!c || c.assignee !== data.assignee) notify({ to: [data.assignee], icon: '🧹', title: `Te asignaron: ${data.title}`, body: `${relDay(data.due)} · +${data.points} puntos`, link: 'tareas' });
    },
    danger: c ? { label: '🗑️', confirm: '¿Eliminar tarea?', action: () => S.db.remove('chores', c.id) } : null
  });
}

let who = 'all';
export const chores = {
  render() {
    const t = isoDate(today0());
    const list = S.data.chores.filter(c => who === 'all' || c.assignee === who).sort((a, b) => a.done - b.done || (a.due || '').localeCompare(b.due || ''));
    const todayL = list.filter(c => (c.due || t) <= t), later = list.filter(c => (c.due || t) > t);
    const board = members().sort((a, b) => (b.points || 0) - (a.points || 0));
    const rewards = S.data.rewards || [];
    const row = c => { const m = member(c.assignee); return `<div class="item swipe" data-sr="toggle" data-id="${c.id}">
      <span class="check ${c.done ? 'on' : ''}" data-act="toggle" data-id="${c.id}">${c.done ? '✓' : ''}</span>
      <div class="grow clickable" style="cursor:pointer" data-act="edit" data-id="${c.id}"><div class="bold ${c.done ? 'done-text' : ''}">${esc(c.title)}</div>
      <div class="tiny muted">${c.due ? (c.due < t && !c.done ? '⚠️ Atrasada · ' : '') + relDay(c.due) : ''}${c.repeat && c.repeat !== 'none' ? ' · 🔁 ' + REP[c.repeat] : ''}</div></div>
      <span class="chip">+${c.points || 0}</span>${avatar(m, 'sm')}</div>`; };
    const doneT = todayL.filter(c => c.done).length;
    return `
      <div class="page-head"><div><h1>Tareas del hogar</h1><p>Entre todos es más fácil (y hay premios 🏆)</p></div>
        <button class="btn primary" data-act="new">＋ Nueva tarea</button></div>
      <div class="chips mb"><button class="chip chip-btn ${who === 'all' ? 'sel' : ''}" data-act="who" data-w="all">👨‍👩‍👧‍👦 Todos</button>${members().map(m => `<button class="chip chip-btn ${who === m.id ? 'sel' : ''}" data-act="who" data-w="${m.id}">${esc(m.emoji || '')} ${esc(m.name)}</button>`).join('')}</div>
      <div class="grid" style="grid-template-columns:minmax(0,1.5fr) minmax(0,1fr)" id="ch-grid">
        <div class="col" style="gap:16px">
          <section class="card deco"><div class="card-title"><h3>📌 Para hoy</h3><span class="small bold">${doneT}/${todayL.length}</span></div>
            <div class="progress mb"><i style="width:${todayL.length ? doneT / todayL.length * 100 : 0}%"></i></div>
            <div class="list">${todayL.map(row).join('') || '<div class="empty"><div class="big">✨</div>Todo al día</div>'}</div></section>
          ${later.length ? `<section class="card deco"><div class="card-title"><h3>🗓️ Próximas</h3></div><div class="list">${later.map(row).join('')}</div></section>` : ''}
        </div>
        <div class="col" style="gap:16px">
          <section class="card deco"><div class="card-title"><h3>🏆 Ranking</h3></div>
            <div class="list">${board.map((m, i) => `<div class="item"><b style="width:24px">${['🥇', '🥈', '🥉'][i] || i + 1}</b>${avatar(m, 'sm')}<span class="grow bold">${esc(m.name)}</span><span class="chip accent">${m.points || 0} pts</span></div>`).join('')}</div></section>
          <section class="card deco"><div class="card-title"><h3>🎁 Premios</h3>${isAdult() ? '<button class="link" data-act="newReward">＋ Premio</button>' : ''}</div>
            <div class="list">${rewards.map(r => `<div class="item"><span class="emoji">${esc(r.emoji || '🎁')}</span><div class="grow"><div class="bold">${esc(r.title)}</div><div class="tiny muted">${r.cost} puntos</div></div>
              <button class="btn sm" data-act="redeem" data-id="${r.id}" ${(S.me.points || 0) < r.cost ? 'disabled style="opacity:.5"' : ''}>Canjear</button>${isAdult() ? `<button class="link tiny" data-act="delReward" data-id="${r.id}">✕</button>` : ''}</div>`).join('') || '<div class="empty small">Agrega premios: elegir la película, 30 min más de videojuegos, postre…</div>'}</div>
            <p class="tiny muted mt-s">Tienes <b>${S.me.points || 0}</b> puntos.</p></section>
        </div>
      </div>
      <style>@media(max-width:900px){#ch-grid{grid-template-columns:1fr!important}}</style>`;
  },
  actions: {
    who(el) { who = el.dataset.w; hooks.rerender(); },
    new() { choreForm(); },
    edit(el) { choreForm(S.data.chores.find(c => c.id === el.dataset.id)); },
    async toggle(el) {
      const c = S.data.chores.find(x => x.id === el.dataset.id); const m = member(c.assignee);
      const pts = Number(c.points || 0);
      if (!c.done && c.repeat && c.repeat !== 'none') {
        const d = parseDate(c.due || isoDate()); const base = d < today0() ? today0() : d; base.setDate(base.getDate() + (c.repeat === 'daily' ? 1 : 7));
        await S.db.update('chores', c.id, { due: isoDate(base), lastDone: isoDate() });
        if (m) { const Y = new Date().getFullYear(); await S.db.update('members', m.id, { points: (m.points || 0) + pts, [`stats.${Y}.chores`]: ((m.stats || {})[Y]?.chores || 0) + 1 }); }
        toast(`🎉 +${pts} pts para ${m?.name || ''}. Próxima: ${relDay(isoDate(base))}`);
      } else {
        await S.db.update('chores', c.id, { done: !c.done, doneAt: !c.done ? Date.now() : 0, doneBy: !c.done ? S.me.id : '' });
        if (m) { const Y = new Date().getFullYear(); await S.db.update('members', m.id, { points: Math.max(0, (m.points || 0) + (c.done ? -pts : pts)), [`stats.${Y}.chores`]: Math.max(0, ((m.stats || {})[Y]?.chores || 0) + (c.done ? -1 : 1)) }); }
        if (!c.done) { const r = el.getBoundingClientRect(); hooks.celebrate(r.left + 10, r.top + 10, 'confetti'); toast(`🎉 +${pts} pts para ${m?.name || ''}`); }
      }
    },
    newReward() {
      modal({ title: 'Nuevo premio', body: `<div class="frow"><div class="field"><label>Premio</label><input class="input" name="title" required placeholder="Elegir la película del viernes"></div>
        <div class="field"><label>Costo (puntos)</label><input class="input" type="number" name="cost" value="50" min="1"></div></div><div class="field"><label>Emoji</label><input class="input" name="emoji" value="🎬" maxlength="4"></div>`,
        submit: async d => { if (!d.title.trim()) return false; await S.db.add('rewards', { title: d.title.trim(), cost: Number(d.cost) || 50, emoji: d.emoji || '🎁' }); } });
    },
    async delReward(el) { await S.db.remove('rewards', el.dataset.id); },
    async redeem(el) {
      const r = S.data.rewards.find(x => x.id === el.dataset.id);
      if ((S.me.points || 0) < r.cost) return toast('Te faltan puntos 💪');
      if (!(await confirmBox(`¿Canjear "${esc(r.title)}" por ${r.cost} puntos?`, 'Canjear 🎁'))) return;
      await S.db.update('members', S.me.id, { points: (S.me.points || 0) - r.cost });
      await S.db.add('messages', { text: `🎁 ${S.me.name} canjeó: ${r.title}`, author: S.me.id, kind: 'reward' });
      notify({ to: members().filter(m => ['admin', 'adulto'].includes(m.role)).map(m => m.id), icon: '🎁', title: `${S.me.name} canjeó un premio`, body: `${r.title} (${r.cost} pts)`, link: 'tareas' });
      hooks.celebrate(innerWidth / 2, innerHeight / 3, 'confetti'); toast('🎁 ¡Premio canjeado! Se avisó en el chat');
    }
  }
};
