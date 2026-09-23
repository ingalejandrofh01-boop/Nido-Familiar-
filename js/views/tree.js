// 🌳 Árbol genealógico con los avatares de la familia
import { S, hooks, member, isAdmin, isAdult } from '../store.js';
import { esc, avatar, modal, toast, EMOJIS_PEOPLE, COLORS, parseDate } from '../ui.js';

const W = 116, H = 150, GX = 26, GY = 70;
let zoom = 1;

function layout() {
  const all = S.data.members;
  const byId = Object.fromEntries(all.map(m => [m.id, m]));
  const parentsOf = (m) => (m.parents || []).filter(id => byId[id]);
  const memo = {};
  const gen = (m, seen = new Set()) => {
    if (memo[m.id] != null) return memo[m.id];
    if (seen.has(m.id)) return 0; seen.add(m.id);
    const ps = parentsOf(m);
    let g = ps.length ? Math.max(...ps.map(p => gen(byId[p], seen))) + 1 : 0;
    const partner = byId[m.partner];
    if (!ps.length && partner && parentsOf(partner).length) g = gen(partner, seen);
    return memo[m.id] = g;
  };
  all.forEach(m => gen(m));
  // parejas en la misma generación
  all.forEach(m => { const p = byId[m.partner]; if (p) { const g = Math.max(memo[m.id], memo[p.id]); memo[m.id] = memo[p.id] = g; } });
  const rows = {}; all.forEach(m => (rows[memo[m.id]] = rows[memo[m.id]] || []).push(m));
  const gens = Object.keys(rows).map(Number).sort((a, b) => a - b);
  const pos = {};
  let maxW = 0;
  for (const g of gens) {
    let row = rows[g];
    const key = (m) => { const ps = parentsOf(m); if (ps.length && ps.every(p => pos[p])) return ps.reduce((a, p) => a + pos[p].x, 0) / ps.length; const pt = byId[m.partner]; if (pt && parentsOf(pt).length && parentsOf(pt).every(p => pos[p])) return parentsOf(pt).reduce((a, p) => a + pos[p].x, 0) / parentsOf(pt).length + .5; return 1e6 + (m.birthday ? -parseDate(m.birthday).getTime() / 1e12 : 0); };
    row.sort((a, b) => key(a) - key(b));
    // juntar parejas
    const ordered = [];
    for (const m of row) { if (ordered.includes(m)) continue; ordered.push(m); const p = byId[m.partner]; if (p && row.includes(p) && !ordered.includes(p)) ordered.push(p); }
    ordered.forEach((m, i) => { pos[m.id] = { x: i * (W + GX), y: gens.indexOf(g) * (H + GY), row: g }; });
    maxW = Math.max(maxW, ordered.length * (W + GX) - GX);
  }
  // centrar cada fila
  for (const g of gens) { const row = Object.entries(pos).filter(([, p]) => p.row === g); const w = row.length * (W + GX) - GX; row.forEach(([, p]) => p.x += (maxW - w) / 2); }
  return { pos, byId, parentsOf, width: maxW, height: gens.length * (H + GY) - GY, gens };
}

function relForm(m) {
  const others = S.data.members.filter(x => x.id !== m.id);
  const opt = (sel) => `<option value="">—</option>${others.map(o => `<option value="${o.id}" ${sel === o.id ? 'selected' : ''}>${esc(o.name)}${o.relation ? ' (' + esc(o.relation) + ')' : ''}</option>`).join('')}`;
  const [p1, p2] = m.parents || [];
  modal({
    title: `🌳 ${esc(m.name)} en el árbol`,
    body: `<div class="row mb">${avatar(m, 'lg')}<div><div class="bold">${esc(m.name)}</div><div class="small muted">${esc(m.relation || '')}${m.deceased ? ' · 🕊️ En memoria' : ''}</div></div></div>
      <div class="frow"><div class="field"><label>Mamá / Papá</label><select class="input" name="p1">${opt(p1)}</select></div><div class="field"><label>Mamá / Papá</label><select class="input" name="p2">${opt(p2)}</select></div></div>
      <div class="field"><label>Pareja</label><select class="input" name="partner">${opt(m.partner)}</select></div>
      ${m.treeOnly ? `<label class="toggle"><input type="checkbox" name="deceased" ${m.deceased ? 'checked' : ''}> 🕊️ En memoria</label>` : ''}
      <div class="divider">Agregar familiar relacionado</div>
      <div class="chips"><button type="button" class="chip chip-btn" data-add="parent">👴 Su mamá/papá</button><button type="button" class="chip chip-btn" data-add="child">👶 Un hijo/a</button><button type="button" class="chip chip-btn" data-add="partner">💞 Su pareja</button></div>`,
    onOpen(f, close) { f.querySelectorAll('[data-add]').forEach(b => b.onclick = () => { close(); addRelative(m, b.dataset.add); }); },
    submit: async d => {
      const parents = [d.p1, d.p2].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);
      const data = { parents };
      if (d.partner !== (m.partner || '')) {
        if (m.partner) await S.db.update('members', m.partner, { partner: '' });
        if (d.partner) { const np = member(d.partner); if (np?.partner && np.partner !== m.id) await S.db.update('members', np.partner, { partner: '' }); await S.db.update('members', d.partner, { partner: m.id }); }
        data.partner = d.partner || '';
      }
      if (m.treeOnly) data.deceased = !!d.deceased;
      await S.db.update('members', m.id, data); toast('🌳 Árbol actualizado');
    },
    danger: m.treeOnly && isAdult() ? { label: '🗑️ Quitar del árbol', confirm: `¿Quitar a ${esc(m.name)} del árbol?`, action: () => S.db.remove('members', m.id) } : null
  });
}

function addRelative(base, kind) {
  modal({
    title: kind === 'parent' ? `Mamá o papá de ${esc(base.name)}` : kind === 'child' ? `Hijo/a de ${esc(base.name)}` : `Pareja de ${esc(base.name)}`,
    body: `<p class="small muted bold">Se agrega sólo al árbol (no aparece en sorteos, tareas ni listas). Ideal para abuelos, bisabuelos o familiares que ya no están.</p>
      <div class="frow"><div class="field"><label>Nombre</label><input class="input" name="name" required></div><div class="field"><label>Parentesco</label><input class="input" name="relation" placeholder="Bisabuelo, tía…"></div></div>
      <div class="frow"><div class="field"><label>Fecha de nacimiento (opcional)</label><input class="input" type="date" name="birthday"></div><div class="field"><label>Emoji</label><select class="input" name="emoji">${EMOJIS_PEOPLE.map(e => `<option>${e}</option>`).join('')}</select></div></div>
      <label class="toggle"><input type="checkbox" name="deceased"> 🕊️ En memoria</label>`,
    submit: async d => {
      if (!d.name.trim()) return false;
      const data = { name: d.name.trim(), relation: d.relation, birthday: d.birthday, emoji: d.emoji, color: COLORS[S.data.members.length % COLORS.length], treeOnly: true, deceased: !!d.deceased, parents: [] };
      if (kind === 'child') { data.parents = [base.id, base.partner].filter(Boolean); }
      if (kind === 'partner') data.partner = base.id;
      const id = await S.db.add('members', data);
      if (kind === 'parent') await S.db.update('members', base.id, { parents: [...(base.parents || []), id].slice(-2) });
      if (kind === 'partner') { if (base.partner) await S.db.update('members', base.partner, { partner: '' }); await S.db.update('members', base.id, { partner: id }); }
      toast('🌳 Agregado al árbol');
    }
  });
}

export default {
  render() {
    const { pos, byId, parentsOf, width, height } = layout();
    let lines = '';
    const done = new Set();
    for (const m of S.data.members) {
      const p = pos[m.id]; if (!p) continue;
      const pt = byId[m.partner];
      if (pt && pos[pt.id] && !done.has([m.id, pt.id].sort().join())) {
        done.add([m.id, pt.id].sort().join());
        const a = pos[m.id], b = pos[pt.id], y = a.y + 48, x1 = Math.min(a.x, b.x) + W - 4, x2 = Math.max(a.x, b.x) + 4;
        lines += `<path d="M${x1} ${y} H${x2}" class="tl couple"/><text x="${(x1 + x2) / 2}" y="${y + 5}" text-anchor="middle" font-size="13">❤️</text>`;
      }
      const ps = parentsOf(m).map(id => pos[id]).filter(Boolean);
      if (ps.length) {
        const px = ps.reduce((s, q) => s + q.x + W / 2, 0) / ps.length, py = ps[0].y + (ps.length === 2 ? 48 : 104);
        const cx = p.x + W / 2, cy = p.y, midY = cy - GY / 2;
        lines += `<path d="M${px} ${py} V${midY} H${cx} V${cy}" class="tl"/>`;
      }
    }
    const nodes = S.data.members.map(m => { const p = pos[m.id]; const b = m.birthday ? parseDate(m.birthday).getFullYear() : ''; return `<button class="tnode ${m.deceased ? 'dec' : ''} ${m.id === S.me.id ? 'me' : ''}" style="left:${p.x}px;top:${p.y}px;width:${W}px" data-act="rel" data-id="${m.id}">
      ${avatar(m, 'lg')}<div class="bold small ellipsis" style="width:100%">${esc(m.name)}</div><div class="tiny muted ellipsis" style="width:100%">${m.deceased ? '🕊️ ' : ''}${esc(m.relation || '')}${b ? ' · ' + b : ''}</div></button>`; }).join('');
    const hasRel = S.data.members.some(m => (m.parents || []).length || m.partner);
    return `<div class="page-head"><div><h1>Árbol genealógico</h1><p>Nuestras raíces, generación tras generación 🌳</p></div>
      <div class="row"><button class="icon-btn" data-act="zout">−</button><button class="icon-btn" data-act="zin">＋</button></div></div>
      ${!hasRel ? `<div class="card deco mb small bold">👆 Toca a cualquier persona para decir quiénes son sus papás y su pareja, o agregar abuelos y bisabuelos (también a quienes ya no están 🕊️).</div>` : ''}
      <section class="card deco tree-wrap"><div class="tree" style="width:${width * zoom}px;height:${(height + 10) * zoom}px"><div style="transform:scale(${zoom});transform-origin:0 0;width:${width}px;height:${height}px;position:relative">
        <svg class="tlines" width="${width}" height="${height}">${lines}</svg>${nodes}</div></div></section>`;
  },
  after(root) {
    const w = root.querySelector('.tree-wrap'); if (!w) return;
    if (zoom === 1 && w.scrollWidth > w.clientWidth + 20 && !w.dataset.fit) { const z = Math.max(.55, (w.clientWidth - 30) / (w.scrollWidth - 30)); if (z < .98) { zoom = +z.toFixed(2); w.dataset.fit = 1; hooks.rerender(); } }
  },
  actions: {
    rel(el) { relForm(member(el.dataset.id) || S.data.members.find(m => m.id === el.dataset.id)); },
    zin() { zoom = Math.min(1.4, zoom + .15); hooks.rerender(); },
    zout() { zoom = Math.max(.4, zoom - .15); hooks.rerender(); }
  }
};
