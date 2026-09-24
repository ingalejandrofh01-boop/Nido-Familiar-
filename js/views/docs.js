// 🪪 Documentos y vencimientos: INE, pasaporte, licencia, pólizas, garantías, verificación…
import { S, hooks, members, member, priv } from '../store.js';
import { esc, avatar, modal, toast, fmtDate, isoDate, parseDate, today0, confirmBox, compressImage, pickFiles } from '../ui.js';

export const DOC_TYPES = {
  ine: ['🪪', 'INE', 10], pasaporte: ['🛂', 'Pasaporte', 6], licencia: ['🚗', 'Licencia de manejo', 3], visa: ['🇺🇸', 'Visa', 10],
  seguro_auto: ['🛡️', 'Seguro del auto', 1], gmm: ['🏥', 'Gastos médicos', 1], seguro_vida: ['💙', 'Seguro de vida', 1], seguro_casa: ['🏠', 'Seguro de casa', 1],
  verificacion: ['🌿', 'Verificación', .5], tenencia: ['🧾', 'Tenencia / refrendo', 1], tarjeta_circ: ['📄', 'Tarjeta de circulación', 3],
  garantia: ['🧰', 'Garantía', 1], contrato: ['📑', 'Contrato', 1], membresia: ['💳', 'Membresía / suscripción', 1],
  acta: ['📜', 'Acta de nacimiento', 0], curp: ['🆔', 'CURP / RFC', 0], cartilla: ['💉', 'Cartilla de vacunación', 0], otro: ['📁', 'Otro', 0]
};
let who = 'all', scope = 'familia';
const path = (d) => d._private ? priv('docs') : 'docs';
export const allDocs = () => [...(S.data.docs || []).map(d => ({ ...d, _private: false })), ...(S.data.myDocs || []).map(d => ({ ...d, _private: true }))];
const find = (id) => allDocs().find(d => d.id === id);
export function docStatus(d) {
  if (!d.expires) return { k: 'none', days: null, label: 'Sin vencimiento', e: '📁' };
  const days = Math.round((parseDate(d.expires) - today0()) / 864e5), warn = Number(d.remind ?? 30);
  if (days < 0) return { k: 'late', days, label: `Venció hace ${-days} día${days === -1 ? '' : 's'}`, e: '⚠️' };
  if (days === 0) return { k: 'late', days, label: 'Vence hoy', e: '⚠️' };
  if (days <= Math.max(warn, 60)) return { k: 'soon', days, label: days <= warn ? `Vence en ${days} día${days === 1 ? '' : 's'}` : `Vence en ${Math.round(days / 30.4)} meses`, e: days <= warn ? '🔔' : '🔜' };
  return { k: 'ok', days, label: `Vigente hasta ${fmtDate(d.expires)}`, e: '✅' };
}
const mask = (n) => n ? (String(n).length > 4 ? '•••• ' + String(n).slice(-4) : '••••') : '';

function docForm(d = null, preset = {}) {
  const v = d || preset; let front = v.front || '', back = v.back || '';
  const isPriv = d ? d._private : scope === 'mios';
  modal({
    title: d ? '✏️ Editar documento' : `🪪 Nuevo documento ${isPriv ? 'privado' : 'familiar'}`, wide: true,
    body: `<div class="field"><label>¿Qué documento es?</label><div class="chips">${Object.entries(DOC_TYPES).map(([k, [e, l]]) => `<label class="chip chip-btn"><input type="radio" name="type" value="${k}" ${(v.type || 'ine') === k ? 'checked' : ''}> ${e} ${l}</label>`).join('')}</div></div>
      <div class="frow"><div class="field"><label>Nombre (opcional)</label><input class="input" name="title" value="${esc(v.title || '')}" placeholder="Póliza Qualitas, garantía del refri…"></div><div class="field"><label>¿De quién es?</label><select class="input" name="owner"><option value="">🏠 De la casa / familia</option>${members().map(m => `<option value="${m.id}" ${(v.owner ?? S.me.id) === m.id ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}</select></div></div>
      <div class="frow"><div class="field"><label>Número / folio / póliza</label><input class="input" name="number" value="${esc(v.number || '')}" autocomplete="off"></div><div class="field"><label>Compañía / emisor</label><input class="input" name="issuer" value="${esc(v.issuer || '')}" placeholder="INE, SRE, Qualitas, Liverpool…"></div></div>
      <div class="frow"><div class="field"><label>Fecha de emisión</label><input class="input" type="date" name="issued" value="${esc(v.issued || '')}"></div><div class="field"><label>Vence</label><input class="input" type="date" name="expires" value="${esc(v.expires || '')}"></div></div>
      <div class="chips mb" data-quick><span class="tiny bold muted">Vence en:</span>${[[6, '6 meses'], [12, '1 año'], [36, '3 años'], [72, '6 años'], [120, '10 años']].map(([m, l]) => `<button type="button" class="chip chip-btn" data-m="${m}">${l}</button>`).join('')}</div>
      <div class="frow"><div class="field"><label>Avisarme antes</label><select class="input" name="remind">${[[7, '1 semana'], [15, '15 días'], [30, '1 mes'], [60, '2 meses'], [90, '3 meses']].map(([n, l]) => `<option value="${n}" ${Number(v.remind ?? 30) === n ? 'selected' : ''}>${l}</option>`).join('')}</select></div><div class="field"><label>Costo de renovar (opcional)</label><input class="input" type="number" inputmode="decimal" name="cost" value="${v.cost || ''}" placeholder="$"></div></div>
      <div class="row wrap" style="gap:12px"><div class="doc-ph" data-side="front" style="${front ? `background-image:url('${front}')` : ''}">${front ? '' : '📷<span>Frente</span>'}</div><div class="doc-ph" data-side="back" style="${back ? `background-image:url('${back}')` : ''}">${back ? '' : '📷<span>Reverso</span>'}</div></div>
      <div class="field mt"><label>Notas</label><input class="input" name="notes" value="${esc(v.notes || '')}" placeholder="Dónde está el original, teléfono del agente…"></div>
      <p class="tiny muted">${isPriv ? '🔒 Sólo tú puedes ver este documento.' : '👨‍👩‍👧 Lo ve toda la familia. Para algo sólo tuyo, créalo en “Míos”.'}</p>`,
    danger: d ? { label: 'Borrar', confirm: '¿Borrar este documento?', action: () => S.db.remove(path(d), d.id) } : undefined,
    onOpen(f) {
      f.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { const base = parseDate(f.querySelector('[name=issued]').value) || today0(); base.setMonth(base.getMonth() + +b.dataset.m); f.querySelector('[name=expires]').value = isoDate(base); });
      f.querySelectorAll('[name=type]').forEach(i => i.onchange = () => { const yrs = DOC_TYPES[i.value][2]; const ex = f.querySelector('[name=expires]'); if (yrs && !ex.value) { const b = parseDate(f.querySelector('[name=issued]').value) || today0(); b.setMonth(b.getMonth() + Math.round(yrs * 12)); ex.value = isoDate(b); } });
      f.querySelectorAll('[data-side]').forEach(ph => ph.onclick = async () => { const [file] = await pickFiles(); if (!file) return; const img = await compressImage(file, 1100, .72, 170000); if (ph.dataset.side === 'front') front = img; else back = img; ph.style.backgroundImage = `url('${img}')`; ph.innerHTML = ''; });
    },
    submit: async x => {
      const data = { type: x.type || 'otro', title: (x.title || '').trim(), owner: x.owner || '', number: (x.number || '').trim(), issuer: x.issuer || '', issued: x.issued || '', expires: x.expires || '', remind: Number(x.remind) || 30, cost: Number(x.cost) || 0, notes: x.notes || '', front, back };
      if (d) { await S.db.update(path(d), d.id, data); toast('✅ Guardado'); }
      else { await S.db.add(isPriv ? priv('docs') : 'docs', { ...data, by: S.me.id, history: [] }); toast('🪪 Documento guardado'); }
    }
  });
}

function renewForm(d) {
  const yrs = DOC_TYPES[d.type]?.[2] || 1; const base = parseDate(d.expires) > today0() ? parseDate(d.expires) : today0(); base.setMonth(base.getMonth() + Math.round(yrs * 12));
  modal({
    title: `🔄 Renovar ${esc(d.title || DOC_TYPES[d.type]?.[1] || '')}`,
    body: `<div class="frow"><div class="field"><label>Nueva fecha de vencimiento</label><input class="input" type="date" name="expires" value="${isoDate(base)}" required></div><div class="field"><label>¿Cuánto costó?</label><input class="input" type="number" inputmode="decimal" name="cost" value="${d.cost || ''}"></div></div>
      <div class="field"><label>Nuevo número (si cambió)</label><input class="input" name="number" value="${esc(d.number || '')}"></div>`,
    submitLabel: '🔄 Renovar',
    submit: async x => {
      const history = [...(d.history || []), { expires: d.expires, number: d.number, cost: d.cost || 0, renewedAt: isoDate() }];
      await S.db.update(path(d), d.id, { expires: x.expires, number: x.number || d.number, cost: Number(x.cost) || 0, issued: isoDate(), history });
      hooks.celebrate(innerWidth / 2, innerHeight / 3, 'confetti'); toast('✅ ¡Renovado! Te avisaremos antes del próximo vencimiento');
    }
  });
}

function viewDoc(d) {
  const [e, l] = DOC_TYPES[d.type] || DOC_TYPES.otro, st = docStatus(d), o = member(d.owner);
  const m = modal({
    title: `${e} ${esc(d.title || l)}`,
    body: `<div class="doc-view ${st.k}"><div class="row" style="gap:10px">${o ? avatar(o, 'sm') : '<span style="font-size:22px">🏠</span>'}<div class="grow"><div class="bold">${esc(o?.name || 'De la casa')}</div><div class="tiny muted">${esc(l)}${d.issuer ? ' · ' + esc(d.issuer) : ''}</div></div><span class="chip ${st.k === 'late' ? 'danger' : st.k === 'soon' ? 'accent' : ''}">${st.e} ${st.label}</span></div>
      ${d.number ? `<div class="doc-num mt"><span class="tiny bold muted">Número</span><b data-num>${esc(mask(d.number))}</b><button type="button" class="btn sm" data-reveal>👁️ Ver</button><button type="button" class="btn sm" data-copy>📋 Copiar</button></div>` : ''}
      <div class="frow mt">${d.issued ? `<div><span class="tiny bold muted">Emitido</span><div class="bold">${fmtDate(d.issued)}</div></div>` : ''}${d.expires ? `<div><span class="tiny bold muted">Vence</span><div class="bold">${fmtDate(d.expires)}</div></div>` : ''}</div>
      ${d.front || d.back ? `<div class="doc-imgs mt">${[d.front, d.back].filter(Boolean).map(src => `<img src="${src}" alt="" data-zoom>`).join('')}</div>` : ''}
      ${d.notes ? `<p class="small bold mt">📝 ${esc(d.notes)}</p>` : ''}
      ${(d.history || []).length ? `<div class="tiny muted mt">Renovaciones: ${d.history.map(h => `${fmtDate(h.renewedAt)}${h.cost ? ' ($' + h.cost + ')' : ''}`).join(' · ')}</div>` : ''}</div>`,
    foot: `<div class="modal-foot"><button type="button" class="btn ghost" data-edit>✏️ Editar</button>${d.expires ? '<button type="button" class="btn" data-renew>🔄 Renovar</button>' : ''}<button type="button" class="btn primary" data-close>Listo</button></div>`
  });
  const f = m.el;
  f.querySelector('[data-reveal]')?.addEventListener('click', e => { const n = f.querySelector('[data-num]'); const shown = n.textContent === d.number; n.textContent = shown ? mask(d.number) : d.number; e.target.textContent = shown ? '👁️ Ver' : '🙈 Ocultar'; });
  f.querySelector('[data-copy]')?.addEventListener('click', async () => { try { await navigator.clipboard.writeText(d.number); toast('📋 Copiado'); } catch { toast(d.number); } });
  f.querySelector('[data-edit]').onclick = () => { m.close(); docForm(d); };
  f.querySelector('[data-renew]')?.addEventListener('click', () => { m.close(); renewForm(d); });
  f.querySelectorAll('[data-zoom]').forEach(i => i.onclick = () => { const lb = document.createElement('div'); lb.className = 'lightbox'; lb.innerHTML = `<button class="icon-btn lb-close" data-x>✕</button><img src="${i.src}" alt="">`; lb.onclick = ev => { if (ev.target === lb || ev.target.closest('[data-x]')) lb.remove(); }; document.body.appendChild(lb); });
}

export const docsView = {
  render() {
    const list = allDocs().filter(d => (scope === 'familia' ? !d._private : d._private) && (who === 'all' || (who === 'casa' ? !d.owner : d.owner === who)));
    const groups = [['late', '⚠️ Vencidos o vencen hoy'], ['soon', '🔔 Por vencer'], ['ok', '✅ Vigentes'], ['none', '📁 Sin vencimiento']].map(([k, t]) => [t, list.filter(d => docStatus(d).k === k).sort((a, b) => (a.expires || '9').localeCompare(b.expires || '9'))]).filter(([, l]) => l.length);
    const nLate = allDocs().filter(d => docStatus(d).k === 'late').length, nSoon = allDocs().filter(d => docStatus(d).k === 'soon').length;
    const card = (d) => { const [e, l] = DOC_TYPES[d.type] || DOC_TYPES.otro, st = docStatus(d), o = member(d.owner);
      return `<button class="doc-card ${st.k}" data-act="open" data-id="${d.id}"><span class="doc-e" ${d.front ? `style="background-image:url('${d.front}')"` : ''}>${d.front ? '' : e}</span>
        <span class="grow" style="min-width:0"><b class="ellipsis">${esc(d.title || l)}</b><span class="tiny muted ellipsis">${o ? esc(o.name.split(' ')[0]) : '🏠 Casa'}${d.number ? ' · ' + esc(mask(d.number)) : ''}${d._private ? ' · 🔒' : ''}</span><span class="tiny bold doc-st">${st.e} ${st.label}</span></span>${o ? avatar(o, 'sm') : ''}</button>`; };
    return `<div class="page-head"><div><h1>Documentos</h1><p>Todo a la mano y sin que nada se venza 🪪</p></div><button class="btn primary" data-act="newDoc">＋ Documento</button></div>
      ${nLate || nSoon ? `<section class="card deco doc-alert ${nLate ? 'late' : ''}"><span style="font-size:30px">${nLate ? '⚠️' : '🔔'}</span><div class="grow"><b>${nLate ? `${nLate} documento${nLate > 1 ? 's' : ''} vencido${nLate > 1 ? 's' : ''}` : ''}${nLate && nSoon ? ' · ' : ''}${nSoon ? `${nSoon} por vencer` : ''}</b><div class="tiny muted bold">Te avisamos antes para que no te agarren las prisas</div></div></section>` : ''}
      <div class="row wrap mt" style="gap:8px;justify-content:space-between"><div class="seg"><button class="${scope === 'familia' ? 'on' : ''}" data-act="scope" data-s="familia">👨‍👩‍👧 Familia</button><button class="${scope === 'mios' ? 'on' : ''}" data-act="scope" data-s="mios">🔒 Míos</button></div>
        <select class="input" style="max-width:200px" data-change="who"><option value="all">Todos</option><option value="casa" ${who === 'casa' ? 'selected' : ''}>🏠 De la casa</option>${members().map(m => `<option value="${m.id}" ${who === m.id ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}</select></div>
      ${groups.map(([t, l]) => `<div class="nav-group" style="margin:18px 4px 8px">${t}</div><div class="grid g2">${l.map(card).join('')}</div>`).join('') || `<div class="card empty mt"><div class="big">🪪</div><p class="bold">Guarda INE, pasaportes, licencias, pólizas, garantías, verificación… con foto y fecha. Te avisamos antes de que venzan.</p><div class="chips" style="justify-content:center">${['ine', 'pasaporte', 'licencia', 'seguro_auto', 'verificacion', 'garantia'].map(k => `<button class="chip chip-btn" data-act="newDoc" data-t="${k}">${DOC_TYPES[k][0]} ${DOC_TYPES[k][1]}</button>`).join('')}</div></div>`}`;
  },
  actions: {
    newDoc(el) { docForm(null, el?.dataset?.t ? { type: el.dataset.t } : {}); },
    open(el) { const d = find(el.dataset.id); if (d) viewDoc(d); },
    scope(el) { scope = el.dataset.s; hooks.rerender(); },
    who(el) { who = el.value; hooks.rerender(); }
  }
};
