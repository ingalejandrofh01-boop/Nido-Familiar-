// 🎡 Ruleta familiar: "¿quién lava los trastes?", "¿qué cenamos?"… giro sincronizado y queda anotado
import { S, hooks, members, member, notify, onCleanup } from '../store.js';
import { esc, avatar, modal, toast, timeAgo, memberPicker } from '../ui.js';
import { sfx, soundOn, toggleSound } from '../reveal.js';

const COLORS = ['#ff595e', '#ff924c', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#ff70a6', '#2ec4b6', '#f15bb5', '#4361ee', '#fb8500', '#06d6a0'];
export const PRESETS = [
  { title: '¿Quién lava los trastes?', emoji: '🍽️', mode: 'members', noRepeat: true },
  { title: '¿Qué cenamos?', emoji: '🌮', mode: 'options', options: ['Tacos', 'Pizza', 'Pozole', 'Hamburguesas', 'Tortas', 'Sushi', 'Quesadillas', 'Chilaquiles'] },
  { title: '¿Quién escoge la película?', emoji: '🎬', mode: 'members', noRepeat: true },
  { title: '¿Quién saca la basura?', emoji: '🗑️', mode: 'members', noRepeat: true },
  { title: 'Castigo divertido', emoji: '🤪', mode: 'options', options: ['Cantar una canción', 'Bailar 30 segundos', 'Imitar a alguien', 'Contar un chiste', 'Hablar como robot', '10 sentadillas'] },
  { title: '¿A dónde vamos el domingo?', emoji: '🚗', mode: 'options', options: ['Parque', 'Cine', 'Casa de la abuela', 'Plaza', 'Día de pijamas', 'Pueblo mágico'] }
];
let current = null; const seen = new Set(); let rot = {}; const cache = new Map();

export const wheelItems = (w) => w.mode === 'members'
  ? (w.members?.length ? w.members : members().map(m => m.id)).map(id => member(id)).filter(Boolean).map(m => ({ label: m.name.split(' ')[0], id: m.id, emoji: m.emoji || '' }))
  : (w.options || []).filter(Boolean).map(o => ({ label: o }));

function wheelSVG(items) {
  const n = items.length, R = 150, C = 160;
  if (!n) return '';
  const seg = (i) => {
    const a0 = (i / n) * 2 * Math.PI - Math.PI / 2, a1 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2;
    const x0 = C + R * Math.cos(a0), y0 = C + R * Math.sin(a0), x1 = C + R * Math.cos(a1), y1 = C + R * Math.sin(a1);
    const mid = (i + .5) / n * 360; const lab = items[i].label.length > 13 ? items[i].label.slice(0, 12) + '…' : items[i].label;
    return `<path d="M${C} ${C} L${x0.toFixed(2)} ${y0.toFixed(2)} A${R} ${R} 0 ${n === 1 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z" fill="${COLORS[i % COLORS.length]}" stroke="rgba(255,255,255,.85)" stroke-width="2"/>
      <text transform="rotate(${mid - 90} ${C} ${C})" x="${C + R - 14}" y="${C + 5}" text-anchor="end" font-size="${n > 8 ? 13 : 15}" font-weight="900" fill="#fff" style="paint-order:stroke;stroke:rgba(0,0,0,.25);stroke-width:3px">${esc(lab)}</text>`;
  };
  return `<svg viewBox="0 0 320 320" class="wheel-svg" aria-hidden="true"><circle cx="160" cy="160" r="158" fill="#fff" opacity=".9"/>${n === 1 ? `<circle cx="160" cy="160" r="150" fill="${COLORS[0]}"/><text x="160" y="80" text-anchor="middle" font-size="16" font-weight="900" fill="#fff">${esc(items[0].label)}</text>` : items.map((_, i) => seg(i)).join('')}
    ${Array.from({ length: n }, (_, i) => { const a = (i / n) * 2 * Math.PI - Math.PI / 2; return `<circle cx="${(160 + 154 * Math.cos(a)).toFixed(1)}" cy="${(160 + 154 * Math.sin(a)).toFixed(1)}" r="3.2" fill="#ffe7a0"/>`; }).join('')}</svg>`;
}

// El escenario se conserva entre redibujos para que el giro no se corte
function stage(w, items) {
  const sig = w.id + '|' + items.map(i => i.label).join(',');
  let c = cache.get(w.id);
  if (!c || c.sig !== sig) {
    const el = document.createElement('div'); el.className = 'wheel-stage';
    el.innerHTML = `<div class="wheel-pointer">▼</div><div class="wheel-rot" style="transform:rotate(${rot[w.id] || 0}deg)">${wheelSVG(items)}</div><button class="wheel-btn" data-act="spin" data-id="${w.id}">¡GIRAR!</button><div class="wheel-result"></div>`;
    c = { sig, el, spinning: false }; cache.set(w.id, c);
  }
  return c;
}

function animate(w, spin) {
  const items = spin.items || wheelItems(w); const c = cache.get(w.id); if (!c) return;
  const r = c.el.querySelector('.wheel-rot'), res = c.el.querySelector('.wheel-result');
  const n = items.length, seg = 360 / n, from = rot[w.id] || 0;
  // el centro del segmento ganador debe quedar arriba (bajo el puntero)
  const target = from + 360 * 6 + ((360 - (spin.index + .5) * seg) - (from % 360) + 360) % 360 + (spin.jitter || 0) * seg * .7;
  rot[w.id] = target; c.spinning = true; res.classList.remove('show');
  const dur = 5200, t0 = performance.now() + Math.max(0, (spin.at || 0) - Date.now());
  r.style.transition = 'none'; r.style.transform = `rotate(${from}deg)`;
  let lastSeg = Math.floor(from / seg);
  const ease = (t) => 1 - Math.pow(1 - t, 4);
  const tick = (now) => {
    const t = Math.min(1, Math.max(0, (now - t0) / dur)); const a = from + (target - from) * ease(t);
    r.style.transform = `rotate(${a}deg)`;
    const s = Math.floor(a / seg); if (s !== lastSeg) { lastSeg = s; if (soundOn()) sfx.pop(); try { navigator.vibrate && navigator.vibrate(4); } catch { } }
    if (t < 1) requestAnimationFrame(tick);
    else {
      c.spinning = false; sfx.chime(); try { navigator.vibrate && navigator.vibrate([60, 40, 120]); } catch { }
      const it = items[spin.index] || {}; const m = it.id ? member(it.id) : null;
      res.innerHTML = `<div class="wr-in">${m ? avatar(m, 'lg') : ''}<div class="wr-lab">${esc(it.label || '')}</div><div class="tiny bold">${esc(w.emoji || '🎡')} ${esc(w.title)}</div></div>`;
      res.classList.add('show');
      const b = c.el.getBoundingClientRect(); for (let i = 0; i < 3; i++) setTimeout(() => hooks.celebrate(b.left + b.width * (.3 + Math.random() * .4), b.top + b.height * .4, 'confetti'), i * 150);
    }
  };
  requestAnimationFrame(tick);
}

function wheelForm(w = null, preset = null) {
  const base = w || preset || { title: '', emoji: '🎡', mode: 'options', options: [] };
  modal({
    title: w ? '✏️ Editar ruleta' : '🎡 Nueva ruleta', wide: true,
    body: `<div class="frow"><div class="field"><label>Pregunta</label><input class="input" name="title" required value="${esc(base.title)}" placeholder="¿Quién pone la mesa?"></div><div class="field" style="max-width:90px"><label>Emoji</label><input class="input" name="emoji" value="${esc(base.emoji || '🎡')}" maxlength="4"></div></div>
      <div class="field"><label>¿Qué gira?</label><div class="seg wrap"><label style="padding:6px 10px"><input type="radio" name="mode" value="members" ${base.mode === 'members' ? 'checked' : ''}> 👨‍👩‍👧 Integrantes</label><label style="padding:6px 10px"><input type="radio" name="mode" value="options" ${base.mode !== 'members' ? 'checked' : ''}> 📝 Opciones</label></div></div>
      <div class="field" data-m="members"><label>¿Quiénes entran?</label>${memberPicker('members', members(), base.members?.length ? base.members : members().map(m => m.id))}</div>
      <div class="field" data-m="options"><label>Opciones (una por renglón)</label><textarea class="input" name="options" rows="6" placeholder="Tacos\nPizza\nPozole">${esc((base.options || []).join('\n'))}</textarea></div>
      <label class="chip chip-btn"><input type="checkbox" name="noRepeat" ${base.noRepeat ? 'checked' : ''}> 🔁 Que no le toque dos veces seguidas al mismo</label>`,
    danger: w ? { label: 'Borrar', confirm: '¿Borrar esta ruleta?', action: async () => { await S.db.remove('wheels', w.id); current = null; } } : undefined,
    onOpen(f) { const sync = () => { const m = f.querySelector('[name=mode]:checked').value; f.querySelectorAll('[data-m]').forEach(x => x.style.display = x.dataset.m === m ? '' : 'none'); }; f.querySelectorAll('[name=mode]').forEach(i => i.onchange = sync); sync(); },
    submit: async d => {
      const options = (d.options || '').split('\n').map(s => s.trim()).filter(Boolean);
      if (!d.title.trim()) return false;
      if (d.mode === 'options' && options.length < 2) { toast('Pon al menos 2 opciones'); return false; }
      const data = { title: d.title.trim(), emoji: d.emoji || '🎡', mode: d.mode, members: d.members || [], options, noRepeat: !!d.noRepeat };
      if (w) await S.db.update('wheels', w.id, data); else { current = await S.db.add('wheels', { ...data, by: S.me.id }); }
      toast('🎡 ¡Lista para girar!');
    }
  });
}

export default {
  render() {
    const ws = S.data.wheels || [];
    if (!current || !ws.some(w => w.id === current)) current = ws[0]?.id || null;
    const w = ws.find(x => x.id === current);
    const spins = (S.data.spins || []).filter(s => s.wheelId === current).sort((a, b) => b.at - a.at);
    const counts = {}; spins.forEach(s => counts[s.label] = (counts[s.label] || 0) + 1);
    return `<div class="page-head"><div><h1>Ruleta familiar</h1><p>Que la suerte decida… y que quede anotado ✍️</p></div><div class="row" style="gap:8px"><button class="icon-btn" data-act="sound" title="Sonido">${soundOn() ? '🔊' : '🔇'}</button><button class="btn primary" data-act="newWheel">＋ Ruleta</button></div></div>
      <div class="chips mb">${ws.map(x => `<button class="chip chip-btn ${x.id === current ? 'sel' : ''}" data-act="pick" data-id="${x.id}">${esc(x.emoji)} ${esc(x.title)}</button>`).join('')}</div>
      ${!ws.length ? `<div class="card empty"><div class="big">🎡</div><p class="bold">Elige una para empezar:</p><div class="chips" style="justify-content:center">${PRESETS.map((p, i) => `<button class="chip chip-btn" data-act="preset" data-i="${i}">${p.emoji} ${esc(p.title)}</button>`).join('')}</div></div>` : ''}
      ${w ? `<div class="grid wheel-grid">
        <section class="card deco center"><div class="card-title"><h3>${esc(w.emoji)} ${esc(w.title)}</h3><button class="link tiny" data-act="editWheel" data-id="${w.id}">✏️ Editar</button></div>
          <div id="wheel-slot"></div>
          <p class="tiny muted bold mt-s">${w.noRepeat ? '🔁 No repite al último · ' : ''}Todos los que estén viendo esta pantalla verán el giro en vivo</p></section>
        <section class="card deco"><div class="card-title"><h3>✍️ Quedó anotado</h3></div>
          ${spins.length ? `<div class="list">${spins.slice(0, 10).map(s => { const by = member(s.by), it = s.memberId ? member(s.memberId) : null; return `<div class="item">${it ? avatar(it, 'sm') : `<span class="emoji">${esc(w.emoji)}</span>`}<div class="grow"><div class="bold small">${esc(s.label)}</div><div class="tiny muted">Giró ${esc(by?.name || '?')} · ${timeAgo(s.at)}</div></div></div>`; }).join('')}</div>
            <div class="divider">Conteo</div><div class="chips">${Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([l, n]) => `<span class="chip">${esc(l)} · ${n}</span>`).join('')}</div>`
            : '<div class="empty small">Aún no se ha girado. ¡Tú empiezas!</div>'}
          ${ws.length < PRESETS.length ? `<div class="divider">Más ruletas</div><div class="chips">${PRESETS.filter(p => !ws.some(x => x.title === p.title)).map(p => `<button class="chip chip-btn" data-act="preset" data-i="${PRESETS.indexOf(p)}">${p.emoji} ${esc(p.title)}</button>`).join('')}</div>` : ''}
        </section></div>` : ''}`;
  },
  after(root) {
    const w = (S.data.wheels || []).find(x => x.id === current); const slot = root.querySelector('#wheel-slot'); if (!w || !slot) return;
    const items = wheelItems(w); const c = stage(w, items); slot.replaceChildren(c.el);
    // ¿Alguien acaba de girar? (lo ven todos al mismo tiempo)
    const last = (S.data.spins || []).filter(s => s.wheelId === w.id).sort((a, b) => b.at - a.at)[0];
    if (last && !seen.has(last.id)) { seen.add(last.id); if (Date.now() - last.at < 4000 && !c.spinning) animate(w, last); }
    (S.data.spins || []).forEach(s => seen.add(s.id));
  },
  actions: {
    pick(el) { current = el.dataset.id; hooks.rerender(); },
    newWheel() { wheelForm(); },
    editWheel(el) { wheelForm((S.data.wheels || []).find(x => x.id === el.dataset.id)); },
    async preset(el) { const p = PRESETS[+el.dataset.i]; current = await S.db.add('wheels', { ...p, members: [], options: p.options || [], by: S.me.id }); toast(`${p.emoji} Ruleta lista`); },
    sound(el) { const on = toggleSound(); el.textContent = on ? '🔊' : '🔇'; },
    async spin(el) {
      const w = (S.data.wheels || []).find(x => x.id === el.dataset.id); const items = wheelItems(w); const c = cache.get(w.id);
      if (!items.length || c?.spinning) return;
      const last = (S.data.spins || []).filter(s => s.wheelId === w.id).sort((a, b) => b.at - a.at)[0];
      let pool = items.map((_, i) => i); if (w.noRepeat && last && items.length > 2) pool = pool.filter(i => items[i].label !== last.label);
      const index = pool[Math.floor(Math.random() * pool.length)];
      const spin = { wheelId: w.id, index, label: items[index].label, memberId: items[index].id || '', items, jitter: Math.random() - .5, by: S.me.id, at: Date.now() + 300 };
      const id = await S.db.add('spins', spin); seen.add(id);
      animate(w, spin);
      if (items[index].id && items[index].id !== S.me.id) setTimeout(() => notify({ to: [items[index].id], icon: w.emoji, title: `🎡 ${w.title}`, body: `¡Te tocó a ti, ${items[index].label}! 😅`, link: 'ruleta' }), 5600);
    }
  }
};
