// 🗳️ Encuestas familiares: ¿a dónde vamos? ¿qué cenamos?
import { S, hooks, members, member, notify, isAdmin } from '../store.js';
import { esc, avatar, modal, toast, fmtDate, isoDate, timeAgo } from '../ui.js';

const TEMPLATES = [
  ['🍕 ¿Qué cenamos el sábado?', ['Pizza', 'Tacos', 'Sushi', 'Hamburguesas']],
  ['🏖️ ¿A dónde vamos de vacaciones?', ['Playa', 'Pueblo mágico', 'Ciudad', 'Montaña']],
  ['🎬 ¿Qué película vemos?', ['Comedia', 'Acción', 'Animada', 'Terror']],
  ['📅 ¿Qué día nos reunimos?', ['Viernes', 'Sábado', 'Domingo']]
];
const open = (p) => !p.closed && (!p.closesAt || p.closesAt >= isoDate());

export function pollForm(preset) {
  const [q0, opts0] = preset || ['', ['', '']];
  modal({
    title: '🗳️ Nueva encuesta',
    body: `<div class="chips mb">${TEMPLATES.map((t, i) => `<button type="button" class="chip chip-btn" data-tpl="${i}">${esc(t[0])}</button>`).join('')}</div>
      <div class="field"><label>Pregunta</label><input class="input" name="question" required value="${esc(q0)}" placeholder="¿Qué hacemos el domingo?"></div>
      <div class="field"><label>Opciones</label><div id="opts" class="col" style="gap:8px"></div><button type="button" class="btn sm mt-s" id="addOpt">＋ Opción</button></div>
      <div class="frow"><div class="field"><label>Cierra el (opcional)</label><input class="input" type="date" name="closesAt"></div>
      <div class="field" style="justify-content:flex-end"><label class="toggle"><input type="checkbox" name="multi"> Varias respuestas</label><label class="toggle"><input type="checkbox" name="anon"> 🙈 Votos anónimos</label></div></div>`,
    onOpen(f) {
      const box = f.querySelector('#opts');
      const add = (v = '') => { const r = document.createElement('div'); r.className = 'row'; r.innerHTML = `<input class="input grow opt" value="${esc(v)}" placeholder="Opción"><button type="button" class="icon-btn">✕</button>`; r.querySelector('button').onclick = () => r.remove(); box.appendChild(r); };
      opts0.forEach(add);
      f.querySelector('#addOpt').onclick = () => add();
      f.querySelectorAll('[data-tpl]').forEach(b => b.onclick = () => { const [q, o] = TEMPLATES[+b.dataset.tpl]; f.querySelector('[name=question]').value = q; box.innerHTML = ''; o.forEach(add); });
    },
    submit: async (d, f) => {
      const options = [...f.querySelectorAll('.opt')].map(i => i.value.trim()).filter(Boolean).map((text, i) => ({ id: 'o' + i + Math.random().toString(36).slice(2, 5), text }));
      if (!d.question.trim() || options.length < 2) { toast('Escribe la pregunta y al menos 2 opciones'); return false; }
      await S.db.add('polls', { question: d.question.trim(), options, multi: !!d.multi, anon: !!d.anon, closesAt: d.closesAt || '', by: S.me.id, votes: {}, closed: false });
      notify({ icon: '🗳️', title: `Nueva encuesta: ${d.question.trim()}`, body: `${S.me.name} quiere saber tu opinión`, link: 'encuestas' });
      toast('🗳️ ¡Encuesta publicada!');
    }
  });
}

export function pollCard(p, compact = false) {
  const votes = p.votes || {}; const voters = Object.keys(votes).filter(k => votes[k] != null && [].concat(votes[k]).length);
  const mine = [].concat(votes[S.me.id] || []);
  const count = (oid) => voters.filter(v => [].concat(votes[v]).includes(oid)).length;
  const total = Math.max(1, voters.length);
  const max = Math.max(0, ...p.options.map(o => count(o.id)));
  const isOpen = open(p); const showRes = mine.length || !isOpen;
  const pending = members().filter(m => m.uid && !votes[m.id]).length;
  return `<article class="card deco poll ${compact ? 'pad-sm' : ''}">
    <div class="row between"><div class="tiny muted bold">${member(p.by) ? avatar(member(p.by), 'sm') : ''} ${esc(member(p.by)?.name || '')} · ${timeAgo(p.createdAt || Date.now())}</div>
      <span class="chip ${isOpen ? 'accent' : ''}">${isOpen ? (p.closesAt ? 'Cierra ' + fmtDate(p.closesAt) : '🟢 Abierta') : '🔒 Cerrada'}</span></div>
    <h3 style="font-size:19px;font-weight:900;margin:10px 0 12px">${esc(p.question)}</h3>
    <div class="col" style="gap:8px">${p.options.map(o => { const c = count(o.id), pct = Math.round(c / total * 100), sel = mine.includes(o.id);
      const who = p.anon ? '' : voters.filter(v => [].concat(votes[v]).includes(o.id)).map(v => member(v)).filter(Boolean).slice(0, 5).map(m => avatar(m, 'sm')).join('');
      return `<button class="poll-opt ${sel ? 'sel' : ''} ${showRes && c === max && c > 0 ? 'win' : ''}" ${isOpen ? `data-act="vote" data-p="${p.id}" data-o="${o.id}"` : 'disabled'}>
        ${showRes ? `<span class="poll-bar" style="width:${pct}%"></span>` : ''}<span class="poll-t">${sel ? '✅ ' : ''}${esc(o.text)}</span>
        ${showRes ? `<span class="avatars">${who}</span><b class="poll-pct">${pct}%</b>` : ''}</button>`; }).join('')}</div>
    <div class="row between mt-s tiny muted"><span>${voters.length} voto${voters.length === 1 ? '' : 's'}${isOpen && pending ? ` · faltan ${pending}` : ''}${p.multi ? ' · varias respuestas' : ''}${p.anon ? ' · 🙈 anónima' : ''}</span>
      ${(p.by === S.me.id || isAdmin()) && !compact ? `<span>${isOpen ? `<button class="link tiny" data-act="closePoll" data-p="${p.id}">Cerrar</button> · ` : ''}<button class="link tiny" data-act="delPoll" data-p="${p.id}">Borrar</button></span>` : ''}</div>
  </article>`;
}

export const pollActions = {
  async vote(el) {
    const p = S.data.polls.find(x => x.id === el.dataset.p); const o = el.dataset.o;
    let cur = [].concat((p.votes || {})[S.me.id] || []);
    if (p.multi) cur = cur.includes(o) ? cur.filter(x => x !== o) : [...cur, o]; else cur = cur[0] === o ? [] : [o];
    await S.db.update('polls', p.id, { ['votes.' + S.me.id]: p.multi ? cur : (cur[0] || null) });
    try { navigator.vibrate && navigator.vibrate(25); } catch { }
  },
  async closePoll(el) { await S.db.update('polls', el.dataset.p, { closed: true }); },
  async delPoll(el) { await S.db.remove('polls', el.dataset.p); }
};

export default {
  render() {
    const list = [...S.data.polls].sort((a, b) => open(b) - open(a) || (b.createdAt || 0) - (a.createdAt || 0));
    return `<div class="page-head"><div><h1>Encuestas</h1><p>Decidimos en familia, en tiempo real 🗳️</p></div><button class="btn primary" data-act="newPoll">＋ Nueva encuesta</button></div>
      ${list.length ? `<div class="grid g2">${list.map(p => pollCard(p)).join('')}</div>` : `<div class="card empty"><div class="big">🗳️</div><p class="bold">¿Qué cenamos? ¿A dónde vamos? ¡Pregúntale a la familia!</p><button class="btn primary" data-act="newPoll">Crear encuesta</button></div>`}`;
  },
  actions: { ...pollActions, newPoll() { pollForm(); } }
};
