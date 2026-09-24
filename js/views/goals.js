// 🎯 Metas a corto, mediano y largo plazo: carro, casa, viaje, fondo de emergencia…
import { S, hooks, members, member, notify, priv } from '../store.js';
import { esc, avatar, modal, toast, fmtDate, isoDate, parseDate, today0, confirmBox, compressImage, pickFiles } from '../ui.js';
import { cash, r2, payday, nextPayday } from '../debts.js';
import { coin } from '../motion.js';

export const GOAL_TYPES = {
  auto: ['🚗', 'Carro'], casa: ['🏡', 'Casa / depa'], enganche: ['🔑', 'Enganche'], viaje: ['✈️', 'Viaje'], emergencia: ['🛟', 'Fondo de emergencia'],
  estudios: ['🎓', 'Estudios'], boda: ['💍', 'Boda'], bebe: ['🍼', 'Bebé'], negocio: ['💼', 'Negocio'], tecnologia: ['💻', 'Tecnología'],
  remodelacion: ['🛠️', 'Remodelación'], mascota: ['🐾', 'Mascota'], retiro: ['🌴', 'Retiro'], deuda: ['🧾', 'Pagar una deuda'], otro: ['🎯', 'Otra meta']
};
const HORIZONS = { corto: ['⚡', 'Corto plazo', 'menos de 1 año'], mediano: ['🌱', 'Mediano plazo', '1 a 3 años'], largo: ['🏔️', 'Largo plazo', 'más de 3 años'], sin: ['✨', 'Sin fecha', 'cuando se pueda'] };
let scope = 'familia';
const rid = () => Math.random().toString(36).slice(2, 9);
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// Personales (privadas) y familiares con el mismo formato
const path = (g) => g._private ? priv('goals') : 'famgoals';
export const allGoals = () => [...(S.data.famgoals || []).map(g => ({ ...g, _private: false })), ...(S.data.goals || []).map(g => ({ ...g, _private: true }))];
const findGoal = (id) => allGoals().find(g => g.id === id);

export function goalStats(g) {
  const contribs = g.contribs || [];
  const saved = r2((Number(g.initial ?? (contribs.length ? 0 : g.saved)) || 0) + contribs.reduce((a, c) => a + Number(c.amount || 0), 0));
  const target = Number(g.target) || 0, remaining = r2(Math.max(0, target - saved)), pct = target ? Math.min(1, saved / target) : 0;
  const t0 = today0(), dl = g.deadline ? parseDate(g.deadline) : null;
  const days = dl ? Math.round((dl - t0) / 864e5) : null;
  const horizon = !dl ? 'sin' : days <= 365 ? 'corto' : days <= 365 * 3 ? 'mediano' : 'largo';
  let quincenas = 0, months = 0;
  if (dl && days > 0) { let d = payday(t0); if (d < t0) d = nextPayday(d); while (d <= dl && quincenas < 1000) { quincenas++; d = nextPayday(d); } months = Math.max(1, Math.round(days / 30.44)); }
  const perQ = quincenas ? r2(remaining / quincenas) : remaining, perM = months ? r2(remaining / months) : remaining;
  const ppl = g._private ? 1 : Math.max(1, (g.people || []).length || 1);
  // Ritmo real de los últimos 90 días → fecha estimada
  const since = new Date(t0); since.setDate(since.getDate() - 90);
  const recent = contribs.filter(c => parseDate(c.date) >= since).reduce((a, c) => a + Number(c.amount || 0), 0);
  const rate = recent / 90; // por día
  let eta = null; if (remaining > 0 && rate > 0) { eta = new Date(t0); eta.setDate(eta.getDate() + Math.ceil(remaining / rate)); }
  // ¿Van a tiempo? comparamos contra una línea recta desde que se creó
  let onTrack = null;
  if (dl && g.createdAt && remaining > 0) { const start = new Date(g.createdAt); const tot = (dl - start) / 864e5; const el = (t0 - start) / 864e5; if (tot > 0) onTrack = pct + 0.02 >= Math.min(1, el / tot); }
  return { saved, target, remaining, pct, days, horizon, quincenas, months, perQ, perM, ppl, eta, onTrack, done: target > 0 && saved >= target };
}

export function ring(pct, emoji, size = 120, photo = '') {
  const R = 52, C = 2 * Math.PI * R, off = C * (1 - Math.min(1, pct));
  return `<div class="goal-ring" style="--s:${size}px">${photo ? `<i class="gr-photo" style="background-image:url('${photo}')"></i>` : ''}
    <svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="${R}" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="10"/>
    <circle cx="60" cy="60" r="${R}" fill="none" style="stroke:${pct >= 1 ? '#1baf7a' : 'var(--accent)'}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 60 60)" class="gr-arc"/></svg>
    <div class="gr-in">${photo ? '' : `<span class="gr-e">${esc(emoji || '🎯')}</span>`}<b>${Math.floor(pct * 100)}%</b></div></div>`;
}

function goalForm(g = null, forcePrivate = null, preset = null) {
  const v = g || preset || {};
  const isPriv = forcePrivate ?? (g ? g._private : scope === 'mias');
  let photo = g?.photo || '';
  modal({
    title: g ? '✏️ Editar meta' : `🎯 Nueva meta ${isPriv ? 'personal' : 'familiar'}`, wide: true,
    body: `<div class="field"><label>¿Para qué están ahorrando?</label><div class="chips">${Object.entries(GOAL_TYPES).map(([k, [e, l]]) => `<label class="chip chip-btn"><input type="radio" name="type" value="${k}" ${(v.type || 'auto') === k ? 'checked' : ''}> ${e} ${l}</label>`).join('')}</div></div>
      <div class="frow"><div class="field"><label>Nombre de la meta</label><input class="input" name="name" required value="${esc(v.name || '')}" placeholder="Nuestro primer carro, la casa propia…"></div><div class="field"><label>Emoji</label><input class="input" name="emoji" maxlength="4" value="${esc(v.emoji || '')}" placeholder="🚗"></div></div>
      <div class="frow"><div class="field"><label>¿Cuánto necesitan?</label><input class="input" name="target" type="number" inputmode="decimal" required value="${g?.target || ''}" placeholder="$"></div><div class="field"><label>¿Cuánto llevan ya?</label><input class="input" name="initial" type="number" inputmode="decimal" value="${g ? (g.initial ?? ((g.contribs || []).length ? 0 : g.saved || 0)) : ''}" placeholder="$0"></div></div>
      <div class="field"><label>¿Para cuándo?</label><input class="input" type="date" name="deadline" value="${esc(g?.deadline || '')}"><div class="chips mt-s">${[[6, '6 meses'], [12, '1 año'], [24, '2 años'], [36, '3 años'], [60, '5 años'], [120, '10 años']].map(([m, l]) => `<button type="button" class="chip chip-btn" data-plus="${m}">${l}</button>`).join('')}</div></div>
      ${isPriv ? '' : `<div class="field"><label>¿Quiénes aportan?</label><div class="chips" data-people>${members().map(m => `<label class="chip chip-btn"><input type="checkbox" value="${m.id}" ${(g?.people || members().filter(x => ['admin', 'adulto'].includes(x.role)).map(x => x.id)).includes(m.id) ? 'checked' : ''}> ${esc(m.emoji || '')} ${esc(m.name)}</label>`).join('')}</div></div>`}
      <div class="row" style="gap:12px;align-items:center"><div class="goal-ph" data-ph style="${photo ? `background-image:url('${photo}')` : ''}">${photo ? '' : '🖼️'}</div><div class="col"><button type="button" class="btn sm" data-photo>📷 Foto de la meta</button><span class="tiny muted">El carro, la casa o el lugar que sueñan</span></div></div>
      <div class="goal-sim mt" data-sim></div>`,
    danger: g ? { label: 'Borrar', confirm: '¿Borrar esta meta y sus aportaciones?', action: async () => { await S.db.remove(path(g), g.id); hooks.go('metas'); } } : undefined,
    onOpen(f) {
      const sim = () => {
        const tmp = { target: f.querySelector('[name=target]').value, initial: f.querySelector('[name=initial]').value, deadline: f.querySelector('[name=deadline]').value, contribs: [], people: isPriv ? [] : [...f.querySelectorAll('[data-people] input:checked')].map(i => i.value), _private: isPriv };
        const s = goalStats(tmp);
        f.querySelector('[data-sim]').innerHTML = s.target && s.quincenas ? `🧮 Para llegar ${s.days < 60 ? 'en ' + s.days + ' días' : 'el ' + fmtDate(tmp.deadline)} ${isPriv ? 'necesitas' : 'necesitan'} apartar <b>${cash(s.perQ)}</b> por quincena (${cash(s.perM)} al mes)${!isPriv && s.ppl > 1 ? ` · <b>${cash(s.perQ / s.ppl)}</b> por persona cada quincena` : ''}. <span class="chip">${HORIZONS[s.horizon][0]} ${HORIZONS[s.horizon][1]}</span>` : s.target ? '💡 Ponle fecha y te decimos cuánto apartar cada quincena.' : '';
      };
      f.querySelectorAll('input').forEach(i => { i.addEventListener('input', sim); i.addEventListener('change', sim); });
      f.querySelectorAll('[data-plus]').forEach(b => b.onclick = () => { const d = today0(); d.setMonth(d.getMonth() + +b.dataset.plus); f.querySelector('[name=deadline]').value = isoDate(d); sim(); });
      f.querySelectorAll('[name=type]').forEach(i => i.onchange = () => { const e = f.querySelector('[name=emoji]'); if (!e.value || Object.values(GOAL_TYPES).some(([x]) => x === e.value)) e.value = GOAL_TYPES[i.value][0]; });
      f.querySelector('[data-photo]').onclick = async () => { const [file] = await pickFiles(); if (!file) return; photo = await compressImage(file, 900, .75, 150000); const ph = f.querySelector('[data-ph]'); ph.style.backgroundImage = `url('${photo}')`; ph.textContent = ''; };
      sim();
    },
    submit: async d => {
      const target = r2(d.target); if (!d.name.trim() || !target) { toast('Ponle nombre y cuánto necesitan'); return false; }
      const [e] = GOAL_TYPES[d.type] || GOAL_TYPES.otro;
      const data = { name: d.name.trim(), type: d.type || 'otro', emoji: d.emoji || e, target, initial: r2(d.initial), deadline: d.deadline || '', photo };
      if (!isPriv) data.people = [...document.querySelectorAll('.modal [data-people] input:checked')].map(i => i.value);
      const p = isPriv ? priv('goals') : 'famgoals';
      if (g) { const s = goalStats({ ...g, ...data }); await S.db.update(p, g.id, { ...data, saved: s.saved }); toast('✅ Meta actualizada'); return; }
      const id = await S.db.add(p, { ...data, contribs: [], saved: data.initial, by: S.me.id, createdAt: Date.now() });
      if (!isPriv) notify({ icon: data.emoji, title: `Nueva meta familiar: ${data.name}`, body: `Juntos por ${cash(target)}${data.deadline ? ' para ' + fmtDate(data.deadline) : ''} 💪`, link: 'meta/' + id });
      toast('🎯 ¡Meta creada! A darle'); hooks.go('meta/' + id);
    }
  });
}

function contribForm(g, withdraw = false) {
  const s = goalStats(g);
  modal({
    title: withdraw ? `↩️ Sacar dinero de ${esc(g.name)}` : `💰 Aportar a ${esc(g.name)}`,
    body: `${withdraw ? '<p class="small bold">Por si surge una emergencia. Queda registrado para que todos lo sepan.</p>' : `<p class="small bold">Faltan <b>${cash(s.remaining)}</b>${s.perQ && s.quincenas ? ` · lo sugerido por quincena es ${cash(g._private ? s.perQ : s.perQ / s.ppl)}${g._private ? '' : ' por persona'}` : ''}.</p>`}
      ${!g._private ? `<div class="field"><label>¿Quién ${withdraw ? 'saca' : 'aporta'}?</label><select class="input" name="by">${members().map(m => `<option value="${m.id}" ${m.id === S.me.id ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}</select></div>` : ''}
      <div class="frow"><div class="field"><label>¿Cuánto?</label><input class="input" name="amount" type="number" inputmode="decimal" step="0.01" required value="${!withdraw && s.perQ && s.quincenas ? r2(g._private ? s.perQ : s.perQ / s.ppl) : ''}"></div><div class="field"><label>Fecha</label><input class="input" type="date" name="date" value="${isoDate()}"></div></div>
      <div class="field"><label>Nota (opcional)</label><input class="input" name="note" placeholder="${withdraw ? '¿Para qué se usó?' : 'Aguinaldo, tandas, lo del bono…'}"></div>`,
    submitLabel: withdraw ? '↩️ Registrar retiro' : '💰 Aportar',
    submit: async d => {
      let amount = r2(d.amount); if (!amount) return false; if (withdraw) amount = -Math.abs(amount);
      const fresh = findGoal(g.id) || g; const before = goalStats(fresh);
      const c = { id: rid(), by: d.by || S.me.id, amount, date: d.date || isoDate(), note: d.note || '', at: Date.now() };
      const contribs = [...(fresh.contribs || []), c];
      const after = goalStats({ ...fresh, contribs });
      const upd = { contribs, saved: after.saved }; if (after.done && !fresh.achievedAt) upd.achievedAt = Date.now();
      await S.db.update(path(fresh), fresh.id, upd);
      if (!withdraw) coin();
      // Hitos: 25 / 50 / 75 / 100 %
      const hit = [1, .75, .5, .25].find(m => before.pct < m && after.pct >= m);
      if (hit) {
        for (let i = 0; i < (hit === 1 ? 8 : 4); i++) setTimeout(() => hooks.celebrate(innerWidth * (.2 + Math.random() * .6), innerHeight * (.2 + Math.random() * .3), 'confetti'), i * 180);
        toast(hit === 1 ? `🏆 ¡LO LOGRARON! ${fresh.name} está completa` : `🎉 ¡Ya van al ${hit * 100}% de ${fresh.name}!`);
        if (!fresh._private) notify({ icon: hit === 1 ? '🏆' : '🎉', title: hit === 1 ? `¡Meta cumplida: ${fresh.name}!` : `${fresh.name}: ¡ya van al ${hit * 100}%!`, body: `${cash(after.saved)} de ${cash(after.target)}`, link: 'meta/' + fresh.id });
      } else toast(withdraw ? `↩️ Retiro de ${cash(-amount)} registrado` : `💰 +${cash(amount)} · van ${Math.floor(after.pct * 100)}%`);
    }
  });
}

const card = (g) => {
  const s = goalStats(g);
  return `<a class="card deco goal-card ${s.done ? 'done' : ''}" href="#/meta/${g.id}">
    ${ring(s.pct, g.emoji, 92, g.photo)}
    <div class="grow" style="min-width:0"><div class="bold ellipsis" style="font-size:17px">${esc(g.name)}</div>
      <div class="small bold"><span data-count="${s.saved}" data-fmt="cash">${cash(s.saved)}</span> <span class="muted">de ${cash(s.target)}</span></div>
      <div class="tiny muted mt-s">${s.done ? '🏆 ¡Cumplida!' : g.deadline ? `📅 ${fmtDate(g.deadline)} · ${s.days > 0 ? `${s.days > 60 ? Math.round(s.days / 30.44) + ' meses' : s.days + ' días'}` : 'fecha vencida'}` : 'Sin fecha'}</div>
      ${!s.done && s.quincenas ? `<div class="chip mt-s">💡 ${cash(g._private ? s.perQ : s.perQ / s.ppl)} por quincena${g._private || s.ppl === 1 ? '' : ' c/u'}</div>` : ''}
      ${s.onTrack === false ? '<div class="tiny bad bold mt-s">⚠️ Van atrasados</div>' : s.onTrack ? '<div class="tiny bold mt-s" style="color:#4ade80">✅ Van a tiempo</div>' : ''}</div></a>`;
};

export const goalsView = {
  render() {
    const list = allGoals().filter(g => scope === 'familia' ? !g._private : g._private);
    const act = list.filter(g => !goalStats(g).done), done = list.filter(g => goalStats(g).done);
    const tot = list.reduce((a, g) => a + goalStats(g).saved, 0), target = list.reduce((a, g) => a + (Number(g.target) || 0), 0);
    const groups = Object.keys(HORIZONS).map(k => [k, act.filter(g => goalStats(g).horizon === k)]).filter(([, l]) => l.length);
    return `<div class="page-head"><div><h1>Metas</h1><p>Lo que soñamos, poquito a poquito 🎯</p></div><button class="btn primary" data-act="newGoal">＋ Nueva meta</button></div>
      <div class="seg mb"><button class="${scope === 'familia' ? 'on' : ''}" data-act="scope" data-s="familia">👨‍👩‍👧 De la familia</button><button class="${scope === 'mias' ? 'on' : ''}" data-act="scope" data-s="mias">🔒 Mías (privadas)</button></div>
      ${list.length ? `<section class="card deco goals-sum"><div><span class="tiny bold muted">Ahorrado en ${list.length} meta${list.length > 1 ? 's' : ''}</span><b data-count="${tot}" data-fmt="cash">${cash(tot)}</b></div><div><span class="tiny bold muted">De un total de</span><b>${cash(target)}</b></div><div><span class="tiny bold muted">Cumplidas</span><b>🏆 ${done.length}</b></div></section>` : ''}
      ${groups.map(([k, l]) => `<div class="nav-group" style="margin:20px 4px 10px">${HORIZONS[k][0]} ${HORIZONS[k][1]} <span style="text-transform:none;letter-spacing:0">· ${HORIZONS[k][2]}</span></div><div class="grid g2">${l.map(card).join('')}</div>`).join('')}
      ${done.length ? `<div class="nav-group" style="margin:20px 4px 10px">🏆 Cumplidas</div><div class="grid g2">${done.map(card).join('')}</div>` : ''}
      ${!list.length ? `<div class="card empty"><div class="big">${scope === 'familia' ? '🏡' : '🎯'}</div><p class="bold">${scope === 'familia' ? 'El carro, la casa, el viaje soñado… pónganle número y fecha, y la app les dice cuánto apartar cada quincena.' : 'Tus metas personales: sólo tú las ves.'}</p><div class="chips" style="justify-content:center">${['auto', 'casa', 'viaje', 'emergencia'].map(k => `<button class="chip chip-btn" data-act="newGoal" data-t="${k}">${GOAL_TYPES[k][0]} ${GOAL_TYPES[k][1]}</button>`).join('')}</div></div>` : ''}`;
  },
  actions: {
    scope(el) { scope = el.dataset.s; hooks.rerender(); },
    newGoal(el) { const t = el?.dataset?.t; goalForm(null, null, t ? { type: t, emoji: GOAL_TYPES[t][0] } : null); }
  }
};

export const goalDetail = {
  render([id]) {
    const g = findGoal(id); if (!g) return `<div class="card empty"><div class="big">🔍</div>No encontramos esta meta. <a class="link" href="#/metas">Volver</a></div>`;
    const s = goalStats(g), cs = [...(g.contribs || [])].sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.at - a.at);
    const byWho = {}; (g.contribs || []).forEach(c => byWho[c.by] = r2((byWho[c.by] || 0) + Number(c.amount || 0)));
    const [he, hl] = HORIZONS[s.horizon];
    return `<a class="link" href="#/metas">‹ Metas</a>
      <section class="card deco mt goal-hero ${s.done ? 'done' : ''}">
        ${g.photo ? `<div class="gh-photo" style="background-image:url('${g.photo}')"></div>` : ''}
        <div class="row wrap" style="gap:20px;position:relative">${ring(s.pct, g.emoji, 150)}
          <div class="grow" style="min-width:220px"><div class="row between wrap" style="gap:8px"><span class="chip accent">${he} ${hl}${g._private ? ' · 🔒 Personal' : ''}</span><button class="btn sm" data-act="edit" data-id="${g.id}">✏️ Editar</button></div>
            <div class="xhero-title mt-s" style="font-size:clamp(28px,5vw,42px)">${esc(g.name)}</div>
            <div class="goal-big"><b data-count="${s.saved}" data-fmt="cash">${cash(s.saved)}</b> <span class="muted">de ${cash(s.target)}</span></div>
            <div class="small bold muted">${s.done ? `🏆 ¡Meta cumplida${g.achievedAt ? ' el ' + fmtDate(isoDate(new Date(g.achievedAt))) : ''}!` : `Faltan ${cash(s.remaining)}${g.deadline ? ` · ${fmtDate(g.deadline)}` : ''}`}</div></div></div>
        <div class="milestones mt">${[.25, .5, .75, 1].map(m => `<div class="ms ${s.pct >= m ? 'on' : ''}"><span>${m === 1 ? '🏆' : s.pct >= m ? '⭐' : '☆'}</span><b>${m * 100}%</b><span class="tiny">${cash(s.target * m)}</span></div>`).join('')}</div>
        ${!s.done ? `<div class="row wrap mt" style="gap:8px"><button class="btn primary" data-act="contrib" data-id="${g.id}">💰 Aportar</button><button class="btn ghost" data-act="withdraw" data-id="${g.id}">↩️ Sacar</button></div>` : ''}
      </section>
      ${!s.done ? `<div class="grid g2 mt">
        <section class="card deco"><div class="card-title"><h3>🧮 ¿Cuánto apartar?</h3></div>
          ${s.quincenas ? `<div class="plan-box"><div><span class="tiny bold muted">Por quincena</span><b>${cash(s.perQ)}</b>${!g._private && s.ppl > 1 ? `<span class="tiny">${cash(s.perQ / s.ppl)} c/u entre ${s.ppl}</span>` : ''}</div><div><span class="tiny bold muted">Al mes</span><b>${cash(s.perM)}</b>${!g._private && s.ppl > 1 ? `<span class="tiny">${cash(s.perM / s.ppl)} c/u</span>` : ''}</div><div><span class="tiny bold muted">Quincenas que faltan</span><b>${s.quincenas}</b></div></div>`
            : g.deadline ? '<p class="bold bad">La fecha ya pasó. Edita la meta para ponerle una nueva.</p>' : '<p class="small bold muted">Ponle una fecha para calcular cuánto apartar cada quincena.</p>'}
          ${s.eta ? `<p class="small bold mt">📈 A su ritmo de los últimos 3 meses la alcanzan en <b>${MES[s.eta.getMonth()]} ${s.eta.getFullYear()}</b>${g.deadline ? (s.eta <= parseDate(g.deadline) ? ' · ¡antes de lo planeado! 🚀' : ' · un poco después de lo planeado') : ''}.</p>` : (g.contribs || []).length ? '' : '<p class="tiny muted mt">Cuando empiecen a aportar, calculamos para cuándo la alcanzan.</p>'}
          ${s.onTrack === false ? '<p class="small bold bad mt-s">⚠️ Van un poco atrasados respecto al plan. ¡Un empujoncito!</p>' : s.onTrack ? '<p class="small bold mt-s" style="color:#4ade80">✅ Van a tiempo</p>' : ''}
        </section>
        ${!g._private ? `<section class="card deco"><div class="card-title"><h3>👨‍👩‍👧 Quién ha aportado</h3></div>
          <div class="list">${Object.entries(byWho).sort((a, b) => b[1] - a[1]).map(([mid, v], i) => `<div class="item">${avatar(member(mid), 'sm')}<b class="grow small">${['🥇', '🥈', '🥉'][i] || ''} ${esc(member(mid)?.name || '?')}</b><b>${cash(v)}</b></div>`).join('') || '<div class="empty small">Aún nadie aporta. ¡Sé el primero!</div>'}</div></section>` : ''}
      </div>` : ''}
      <section class="card deco mt"><div class="card-title"><h3>🧾 Movimientos</h3></div>
        <div class="list">${cs.map(c => `<div class="item">${g._private ? `<span class="emoji">${c.amount < 0 ? '↩️' : '💰'}</span>` : avatar(member(c.by), 'sm')}<div class="grow" style="min-width:0"><div class="bold small">${c.amount < 0 ? 'Retiro' : 'Aportación'}${g._private ? '' : ' de ' + esc(member(c.by)?.name || '?')}</div><div class="tiny muted">${fmtDate(c.date)}${c.note ? ' · ' + esc(c.note) : ''}</div></div><b class="${c.amount < 0 ? 'bad' : ''}">${c.amount < 0 ? '-' : '+'}${cash(Math.abs(c.amount))}</b>${c.by === S.me.id || g._private ? `<button class="link tiny faint" data-act="delC" data-id="${g.id}" data-c="${c.id}" aria-label="Borrar">✕</button>` : ''}</div>`).join('') || '<div class="empty small">Sin movimientos todavía</div>'}
          ${Number(g.initial) ? `<div class="item"><span class="emoji">🏁</span><div class="grow"><div class="bold small">Lo que ya tenían al empezar</div></div><b>${cash(g.initial)}</b></div>` : ''}</div></section>`;
  },
  actions: {
    edit(el) { goalForm(findGoal(el.dataset.id)); },
    contrib(el) { contribForm(findGoal(el.dataset.id)); },
    withdraw(el) { contribForm(findGoal(el.dataset.id), true); },
    async delC(el) {
      if (!(await confirmBox('¿Borrar este movimiento?', 'Borrar'))) return;
      const g = findGoal(el.dataset.id); const contribs = (g.contribs || []).filter(c => c.id !== el.dataset.c);
      await S.db.update(path(g), g.id, { contribs, saved: goalStats({ ...g, contribs }).saved });
    }
  }
};
export { goalForm, contribForm };
