// 🏅 Retos familiares: hábitos diarios o metas acumuladas, con ranking y puntos
import { S, hooks, members, member, notify } from '../store.js';
import { esc, avatar, modal, toast, fmtShort, isoDate, parseDate, today0, daysBetween, memberPicker } from '../ui.js';

const TEMPLATES = [
  { title: 'Leer 20 minutos', emoji: '📚', kind: 'check', goal: 21, unit: 'días' },
  { title: 'Caminar', emoji: '🚶', kind: 'count', goal: 50, unit: 'km' },
  { title: 'Tomar 8 vasos de agua', emoji: '💧', kind: 'check', goal: 30, unit: 'días' },
  { title: 'Cero pantallas en la cena', emoji: '📵', kind: 'check', goal: 14, unit: 'días' },
  { title: 'Ahorrar para el viaje', emoji: '🐷', kind: 'count', goal: 2000, unit: 'pesos' },
  { title: 'Hacer ejercicio', emoji: '🏋️', kind: 'count', goal: 600, unit: 'minutos' }
];
const total = (c, mid) => Object.values((c.progress || {})[mid] || {}).reduce((a, v) => a + Number(v || 0), 0);
const active = (c) => c.end >= isoDate() && c.start <= isoDate();

function challengeForm(tpl = {}) {
  const t0 = today0(), end = new Date(t0); end.setDate(end.getDate() + 30);
  modal({
    title: '🏅 Nuevo reto familiar',
    body: `<div class="chips mb">${TEMPLATES.map((t, i) => `<button type="button" class="chip chip-btn" data-tpl="${i}">${t.emoji} ${esc(t.title)}</button>`).join('')}</div>
      <div class="frow"><div class="field"><label>Reto</label><input class="input" name="title" required value="${esc(tpl.title || '')}"></div><div class="field"><label>Emoji</label><input class="input" name="emoji" value="${esc(tpl.emoji || '🏅')}" maxlength="4"></div></div>
      <div class="field"><label>Tipo</label><div class="seg"><label style="padding:6px 10px"><input type="radio" name="kind" value="check" ${tpl.kind !== 'count' ? 'checked' : ''}> ✅ Palomear cada día</label><label style="padding:6px 10px"><input type="radio" name="kind" value="count" ${tpl.kind === 'count' ? 'checked' : ''}> ➕ Sumar cantidades</label></div></div>
      <div class="frow"><div class="field"><label>Meta por persona</label><input class="input" type="number" name="goal" required value="${tpl.goal || 21}"></div><div class="field"><label>Unidad</label><input class="input" name="unit" value="${esc(tpl.unit || 'días')}"></div></div>
      <div class="frow"><div class="field"><label>Empieza</label><input class="input" type="date" name="start" value="${isoDate(t0)}"></div><div class="field"><label>Termina</label><input class="input" type="date" name="end" value="${isoDate(end)}"></div></div>
      <div class="field"><label>Premio en puntos al cumplir 🏆</label><input class="input" type="number" name="points" value="50"></div>
      <div class="field"><label>Participantes</label>${memberPicker('participants', members(), members().map(m => m.id))}</div>`,
    onOpen(f) { f.querySelectorAll('[data-tpl]').forEach(b => b.onclick = () => { const t = TEMPLATES[+b.dataset.tpl]; f.querySelector('[name=title]').value = t.title; f.querySelector('[name=emoji]').value = t.emoji; f.querySelector('[name=goal]').value = t.goal; f.querySelector('[name=unit]').value = t.unit; f.querySelector(`[name=kind][value=${t.kind}]`).checked = true; }); },
    submit: async d => {
      if (!d.title.trim() || !Number(d.goal)) return false;
      const data = { title: d.title.trim(), emoji: d.emoji || '🏅', kind: d.kind || 'check', goal: Number(d.goal), unit: d.unit || '', start: d.start, end: d.end, points: Number(d.points) || 0, participants: d.participants || [], progress: {}, awarded: {}, by: S.me.id };
      await S.db.add('challenges', data);
      notify({ to: data.participants, icon: data.emoji, title: `Nuevo reto: ${data.title}`, body: `Meta: ${data.goal} ${data.unit} · premio ${data.points} pts`, link: 'retos' });
      toast('🏅 ¡Reto creado!');
    }
  });
}

async function checkAward(c, mid) {
  const fresh = S.data.challenges.find(x => x.id === c.id) || c;
  if ((fresh.awarded || {})[mid] || total(fresh, mid) < fresh.goal) return;
  const m = member(mid);
  await S.db.update('challenges', c.id, { ['awarded.' + mid]: Date.now() });
  if (m && fresh.points) await S.db.update('members', mid, { points: (m.points || 0) + fresh.points });
  hooks.celebrate(innerWidth / 2, innerHeight / 3, 'confetti');
  toast(`🏆 ¡${m?.name || ''} cumplió el reto! +${fresh.points} pts`);
  notify({ icon: '🏆', title: `${m?.name || 'Alguien'} cumplió el reto “${fresh.title}”`, body: `+${fresh.points} puntos`, link: 'retos' });
}

export default {
  render() {
    const list = [...S.data.challenges].sort((a, b) => active(b) - active(a) || b.start.localeCompare(a.start));
    const today = isoDate();
    const card = (c) => {
      const ps = (c.participants || []).map(member).filter(Boolean).sort((a, b) => total(c, b.id) - total(c, a.id));
      const inIt = (c.participants || []).includes(S.me.id), myToday = ((c.progress || {})[S.me.id] || {})[today];
      const left = daysBetween(today0(), parseDate(c.end)), isOn = active(c);
      const teamTotal = ps.reduce((a, m) => a + total(c, m.id), 0);
      return `<article class="card deco"><div class="row between"><div class="row"><span style="font-size:34px">${esc(c.emoji)}</span><div><div class="bold" style="font-size:17px">${esc(c.title)}</div>
        <div class="tiny muted">Meta: ${c.goal} ${esc(c.unit)} c/u · ${fmtShort(c.start)} → ${fmtShort(c.end)}</div></div></div>
        <span class="chip ${isOn ? 'accent' : ''}">${isOn ? `⏳ ${left} días` : c.end < today ? '🏁 Terminado' : '🔜 Próximo'}</span></div>
        <div class="col mt" style="gap:10px">${ps.map((m, i) => { const v = total(c, m.id), p = Math.min(1, v / c.goal), done = (c.awarded || {})[m.id];
          return `<div class="row">${avatar(m, 'sm')}<div class="grow"><div class="row between small bold"><span>${['🥇', '🥈', '🥉'][i] || ''} ${esc(m.name)}</span><span>${done ? '🏆 ' : ''}${Math.round(v * 10) / 10}/${c.goal}</span></div><div class="progress" style="height:8px;margin-top:4px"><i style="width:${p * 100}%;${done ? 'background:linear-gradient(90deg,#f5b700,#ffdd55)' : ''}"></i></div></div></div>`; }).join('')}</div>
        <div class="tiny muted mt-s">👨‍👩‍👧‍👦 En equipo llevan ${Math.round(teamTotal)} ${esc(c.unit)} · premio ${c.points} pts</div>
        ${inIt && isOn ? (c.kind === 'check'
          ? `<button class="btn ${myToday ? '' : 'primary'} block mt" data-act="checkin" data-id="${c.id}">${myToday ? '✅ ¡Hoy cumpliste!' : '✔️ Hoy lo hice'}</button>`
          : `<form class="row mt" data-submit="addCount" data-id="${c.id}"><input class="input grow" type="number" inputmode="decimal" step="any" id="cnt-${c.id}" placeholder="¿Cuánto hoy? (${esc(c.unit)})"><button class="btn primary">＋ Sumar</button></form>`) : ''}
        ${c.by === S.me.id ? `<div class="right mt-s"><button class="link tiny" data-act="delCh" data-id="${c.id}">Borrar reto</button></div>` : ''}
      </article>`;
    };
    return `<div class="page-head"><div><h1>Retos familiares</h1><p>Hábitos que se hacen juntos, y con premio 🏆</p></div><button class="btn primary" data-act="new">＋ Nuevo reto</button></div>
      ${list.length ? `<div class="grid g2">${list.map(card).join('')}</div>` : `<div class="card empty"><div class="big">🏅</div><p class="bold">Lean, caminen o ahorren juntos. ¡El que cumpla gana puntos!</p><button class="btn primary" data-act="new">Crear un reto</button></div>`}`;
  },
  actions: {
    new() { challengeForm(); },
    async checkin(el) {
      const c = S.data.challenges.find(x => x.id === el.dataset.id); const t = isoDate();
      const cur = ((c.progress || {})[S.me.id] || {})[t];
      await S.db.update('challenges', c.id, { [`progress.${S.me.id}.${t}`]: cur ? 0 : 1 });
      try { navigator.vibrate && navigator.vibrate(30); } catch { }
      if (!cur) { const r = el.getBoundingClientRect(); hooks.celebrate(r.left + r.width / 2, r.top, 'confetti'); setTimeout(() => checkAward(c, S.me.id), 600); }
    },
    async addCount(f) {
      const c = S.data.challenges.find(x => x.id === f.dataset.id); const i = f.querySelector('input'); const v = Number(i.value); if (!v) return; i.value = '';
      const t = isoDate(); const cur = Number(((c.progress || {})[S.me.id] || {})[t] || 0);
      await S.db.update('challenges', c.id, { [`progress.${S.me.id}.${t}`]: cur + v });
      toast(`💪 +${v} ${c.unit}`); setTimeout(() => checkAward(c, S.me.id), 600);
    },
    async delCh(el) { await S.db.remove('challenges', el.dataset.id); }
  }
};
