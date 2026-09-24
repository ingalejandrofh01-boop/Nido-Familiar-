// 🗺️ Búsqueda del tesoro: acertijos + códigos QR escondidos por la casa
import { S, hooks, members, member, notify, isAdult } from '../store.js';
import { esc, avatar, modal, toast, confirmBox } from '../ui.js';
import { sfx } from '../reveal.js';

const THEMES = { piratas: ['🏴‍☠️', 'Piratas'], pascua: ['🐰', 'Huevos de Pascua'], cumple: ['🎂', 'Cumpleaños'], navidad: ['🎄', 'Navidad'], detective: ['🕵️', 'Detectives'], dinos: ['🦖', 'Dinosaurios'], espacio: ['🚀', 'Espacio'] };
const hunt = (id) => (S.data.hunts || []).find(h => h.id === id);
const rid = () => Math.random().toString(36).slice(2, 8);
const code = () => Array.from({ length: 5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
const clueUrl = (h, c) => `${location.origin}${location.pathname}#/tesoro/${h.id}/${c.code}`;
let player = null; // integrante que está jugando en este teléfono

function loadScript(src, global) { if (window[global]) return Promise.resolve(window[global]); return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = () => res(window[global]); s.onerror = rej; document.head.appendChild(s); }); }
const loadQR = () => loadScript('js/vendor/qrcode.js', 'qrcode');
const loadJsQR = () => loadScript('js/vendor/jsQR.js', 'jsQR');
const canEdit = (h) => h.by === S.me.id || S.me.role === 'admin';
const players = (h) => (h.players?.length ? h.players : members().map(m => m.id)).map(member).filter(Boolean);
const prog = (h, mid) => (h.progress || {})[mid] || { step: 0, times: [], hints: 0 };

// ---------------- Editor ----------------
function huntForm(h = null) {
  let clues = h ? h.clues.map(c => ({ ...c })) : [{ id: rid(), code: code(), riddle: '', hint: '', spot: '' }, { id: rid(), code: code(), riddle: '', hint: '', spot: '' }, { id: rid(), code: code(), riddle: '', hint: '', spot: '' }];
  let read = () => { };
  modal({
    title: h ? '✏️ Editar búsqueda del tesoro' : '🗺️ Nueva búsqueda del tesoro', wide: true,
    body: `<div class="frow"><div class="field"><label>Nombre</label><input class="input" name="title" required value="${esc(h?.title || '')}" placeholder="El tesoro perdido del Capitán Cheto"></div><div class="field"><label>Tema</label><select class="input" name="theme">${Object.entries(THEMES).map(([k, [e, l]]) => `<option value="${k}" ${(h?.theme || 'piratas') === k ? 'selected' : ''}>${e} ${l}</option>`).join('')}</select></div></div>
      <div class="field"><label>🏆 El tesoro (premio)</label><input class="input" name="prize" value="${esc(h?.prize || '')}" placeholder="Una bolsa de chocolates escondida en el horno 🍫"></div>
      <div class="field"><label>¿Quiénes juegan?</label><div class="chips" data-pl>${members().map(m => `<label class="chip chip-btn"><input type="checkbox" value="${m.id}" ${(h?.players || members().filter(x => ['nino', 'adolescente'].includes(x.role)).map(x => x.id)).includes(m.id) ? 'checked' : ''}> ${esc(m.emoji || '')} ${esc(m.name)}</label>`).join('')}</div></div>
      <div class="hunt-help">🧭 Cómo funciona: la <b>pista 1</b> dice dónde está escondido el <b>código 1</b>. Al escanearlo se desbloquea la pista 2, y así… ¡el último código es el tesoro!</div>
      <div data-clues></div><button type="button" class="btn sm" data-add>＋ Agregar pista</button>`,
    danger: h ? { label: 'Borrar', confirm: '¿Borrar esta búsqueda del tesoro?', action: async () => { await S.db.remove('hunts', h.id); hooks.go('tesoro'); } } : undefined,
    onOpen(f) {
      const box = f.querySelector('[data-clues]');
      read = () => box.querySelectorAll('[data-i]').forEach(c => { const x = clues[+c.dataset.i]; c.querySelectorAll('[data-k]').forEach(i => x[i.dataset.k] = i.value); });
      const paint = () => {
        box.innerHTML = clues.map((c, i) => `<div class="clue-ed" data-i="${i}"><div class="row between"><b>🧩 Pista ${i + 1}${i === clues.length - 1 ? ' · lleva al tesoro 🏆' : ''}</b>${clues.length > 1 ? `<button type="button" class="link tiny" data-del="${i}">Quitar</button>` : ''}</div>
          <div class="field"><label>Acertijo (lo que leen los jugadores)</label><textarea class="input" rows="2" data-k="riddle" placeholder="${i === 0 ? 'Donde el frío guarda la leche y el queso, busca tu primer secreto 🧊' : 'Tengo teclas pero no abro puertas…'}">${esc(c.riddle)}</textarea></div>
          <div class="frow"><div class="field"><label>Pista extra (si se atoran)</label><input class="input" data-k="hint" value="${esc(c.hint)}" placeholder="Está en la cocina"></div><div class="field"><label>🤫 Dónde escondes el código ${i + 1} (sólo tú lo ves)</label><input class="input" data-k="spot" value="${esc(c.spot)}" placeholder="Pegado dentro del refri"></div></div></div>`).join('');
        box.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { read(); clues.splice(+b.dataset.del, 1); paint(); });
      };
      paint(); f.querySelector('[data-add]').onclick = () => { read(); clues.push({ id: rid(), code: code(), riddle: '', hint: '', spot: '' }); paint(); };
    },
    submit: async d => {
      read(); clues = clues.filter(c => c.riddle.trim());
      if (!d.title.trim() || !clues.length) { toast('Ponle nombre y al menos una pista'); return false; }
      const data = { title: d.title.trim(), theme: d.theme, prize: d.prize || '', clues, players: [...document.querySelectorAll('.modal [data-pl] input:checked')].map(i => i.value) };
      if (h) await S.db.update('hunts', h.id, data);
      else { const id = await S.db.add('hunts', { ...data, status: 'draft', progress: {}, by: S.me.id }); hooks.go('tesoro/' + id); }
      toast('🗺️ ¡Guardado! Ahora imprime los códigos y escóndelos');
    }
  });
}

// ---------------- Impresión de códigos ----------------
async function printCodes(h) {
  const Q = await loadQR();
  const svg = (txt) => { const q = Q(0, 'M'); q.addData(txt); q.make(); return q.createSvgTag({ cellSize: 6, margin: 2, scalable: true }); };
  const [e] = THEMES[h.theme] || THEMES.piratas;
  const sheet = document.createElement('div'); sheet.className = 'print-sheet';
  sheet.innerHTML = h.clues.map((c, i) => `<div class="pc"><div class="pc-top">${e} ${esc(h.title)}</div><div class="pc-num">${i === h.clues.length - 1 ? '🏆 EL TESORO' : `Código ${i + 1}`}</div><div class="pc-qr">${svg(clueUrl(h, c))}</div><div class="pc-code">${c.code}</div><div class="pc-foot">Escanéalo en Nido → Búsqueda del tesoro</div><div class="pc-spot">✂️ Esconder: ${esc(c.spot || '—')}</div></div>`).join('');
  document.body.appendChild(sheet); document.documentElement.classList.add('printing');
  const done = () => { sheet.remove(); document.documentElement.classList.remove('printing'); removeEventListener('afterprint', done); };
  addEventListener('afterprint', done); setTimeout(() => { window.print(); setTimeout(() => { if (sheet.isConnected && !matchMedia('print').matches) done(); }, 1500); }, 300);
}

// ---------------- Escáner con cámara ----------------
export async function scanQR(onCode) {
  const ov = document.createElement('div'); ov.className = 'qr-ov';
  ov.innerHTML = `<video playsinline muted></video><div class="qr-frame"><i></i></div><div class="qr-msg">Apunta al código 📷</div><div class="qr-bar"><button class="btn" data-type>⌨️ Escribir código</button><button class="btn primary" data-x>Cerrar</button></div>`;
  document.body.appendChild(ov); document.documentElement.classList.add('modal-open');
  let stream = null, raf = 0, stop = false;
  const close = () => { stop = true; cancelAnimationFrame(raf); try { stream && stream.getTracks().forEach(t => t.stop()); } catch { } ov.remove(); document.documentElement.classList.remove('modal-open'); };
  ov.querySelector('[data-x]').onclick = close;
  ov.querySelector('[data-type]').onclick = () => { close(); typeCode(onCode); };
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } }, audio: false });
    const v = ov.querySelector('video'); v.srcObject = stream; await v.play();
    const detector = 'BarcodeDetector' in window ? new window.BarcodeDetector({ formats: ['qr_code'] }) : null;
    const J = detector ? null : await loadJsQR();
    const c = document.createElement('canvas'), x = c.getContext('2d', { willReadFrequently: true }); let last = 0;
    const tick = async (t) => {
      if (stop) return; raf = requestAnimationFrame(tick); if (t - last < 180 || !v.videoWidth) return; last = t;
      let txt = null;
      if (detector) { try { const r = await detector.detect(v); txt = r[0]?.rawValue || null; } catch { } }
      else { const w = Math.min(640, v.videoWidth), hh = Math.round(v.videoHeight * w / v.videoWidth); c.width = w; c.height = hh; x.drawImage(v, 0, 0, w, hh); const r = J(x.getImageData(0, 0, w, hh).data, w, hh, { inversionAttempts: 'dontInvert' }); txt = r?.data || null; }
      if (txt && !stop) { try { navigator.vibrate && navigator.vibrate(60); } catch { } close(); onCode(txt); }
    };
    raf = requestAnimationFrame(tick);
  } catch (e) { console.warn(e); ov.querySelector('.qr-msg').textContent = '📷 No pudimos abrir la cámara. Escribe el código que viene abajo del QR.'; }
}
function typeCode(onCode) {
  modal({ title: '⌨️ Escribe el código', body: `<div class="field"><input class="input" name="c" maxlength="8" autocomplete="off" autocapitalize="characters" style="font-size:28px;text-align:center;letter-spacing:6px;font-weight:900" placeholder="ABC12"></div>`, submitLabel: 'Revisar', submit: async d => { if (!d.c.trim()) return false; onCode(d.c.trim().toUpperCase()); } });
}

// Revisa un código escaneado para el jugador actual
async function tryCode(h, raw) {
  const txt = String(raw).trim(); const c = txt.includes('/') ? txt.split('/').pop().split('?')[0].toUpperCase() : txt.toUpperCase();
  if (txt.includes('#/tesoro/') && !txt.includes(h.id)) { toast('🤔 Ese código es de otra búsqueda'); return; }
  const mid = player || S.me.id; const p = prog(h, mid); const idx = h.clues.findIndex(x => x.code === c);
  if (idx < 0) { try { sfx.soft(); } catch { } toast('❌ Ese código no es de esta búsqueda'); return; }
  if (idx < p.step) { toast('😉 Esa ya la encontraste, ¡sigue con la siguiente!'); return; }
  if (idx > p.step) { toast('🙊 ¡Uy! Esa pista es para más adelante. Resuelve primero la actual'); return; }
  const step = p.step + 1, times = [...(p.times || []), Date.now()], done = step >= h.clues.length ? Date.now() : 0;
  await S.db.update('hunts', h.id, { [`progress.${mid}`]: { ...p, step, times, done, start: p.start || h.startedAt || times[0] } });
  if (done) { celebrateWin(h, mid); notify({ icon: '🏆', title: `¡${member(mid)?.name || 'Alguien'} encontró el tesoro!`, body: h.title, link: 'tesoro/' + h.id }); }
  else { try { sfx.chime(); } catch { } for (let i = 0; i < 3; i++) setTimeout(() => hooks.celebrate(innerWidth * (.3 + Math.random() * .4), innerHeight * .35, 'spark'), i * 140); toast(`🎉 ¡Encontraste el código ${step}! Nueva pista desbloqueada`); }
}
function celebrateWin(h, mid) {
  try { sfx.chime(); navigator.vibrate && navigator.vibrate([80, 60, 200]); } catch { }
  const ov = document.createElement('div'); ov.className = 'win-ov';
  ov.innerHTML = `<div class="win-card"><div class="chest"><span class="lid">🧰</span></div><h2>¡Encontraste el tesoro!</h2>${h.prize ? `<p class="bold">🏆 ${esc(h.prize)}</p>` : ''}<p class="small">${esc(member(mid)?.name || '')}</p><button class="btn primary lg mt" data-x>¡Sí! 🎉</button></div>`;
  document.body.appendChild(ov); ov.querySelector('[data-x]').onclick = () => ov.remove();
  for (let i = 0; i < 10; i++) setTimeout(() => hooks.celebrate(innerWidth * Math.random(), innerHeight * (.2 + Math.random() * .4), i % 2 ? 'confetti' : 'spark'), i * 150);
}
const dur = (ms) => { const s = Math.round(ms / 1000), m = Math.floor(s / 60); return m ? `${m} min ${s % 60} s` : `${s} s`; };

// ---------------- Vistas ----------------
export const huntsList = {
  render() {
    const hs = [...(S.data.hunts || [])].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return `<div class="page-head"><div><h1>Búsqueda del tesoro</h1><p>Acertijos y códigos escondidos por la casa 🗺️</p></div>${isAdult() ? '<button class="btn primary" data-act="newHunt">＋ Crear búsqueda</button>' : ''}</div>
      ${hs.length ? `<div class="grid g2">${hs.map(h => { const [e, l] = THEMES[h.theme] || THEMES.piratas; const ps = players(h); const win = ps.filter(m => prog(h, m.id).done).length; return `<a class="card deco hunt-card" href="#/tesoro/${h.id}"><span class="hunt-e">${e}</span><div class="grow" style="min-width:0"><div class="bold" style="font-size:18px">${esc(h.title)}</div><div class="small muted bold">${h.clues.length} pistas · ${l}</div><div class="chips mt-s"><span class="chip ${h.status === 'live' ? 'accent' : ''}">${h.status === 'live' ? '🟢 En juego' : h.status === 'done' ? '🏁 Terminada' : '📝 Preparando'}</span>${win ? `<span class="chip">🏆 ${win} ganador${win > 1 ? 'es' : ''}</span>` : ''}</div></div></a>`; }).join('')}</div>`
        : `<div class="card empty"><div class="big">🏴‍☠️</div><p class="bold">Escribe acertijos, imprime los códigos QR y escóndelos por la casa. Los niños los escanean con la app para ir desbloqueando la siguiente pista… ¡hasta el tesoro!</p>${isAdult() ? '<button class="btn primary" data-act="newHunt">Crear la primera</button>' : ''}</div>`}`;
  },
  actions: { newHunt() { huntForm(); } }
};

export const huntDetail = {
  render([id, scanned]) {
    const h = hunt(id); if (!h) return `<div class="card empty"><div class="big">🔍</div>No encontramos esta búsqueda. <a class="link" href="#/tesoro">Volver</a></div>`;
    const [e, l] = THEMES[h.theme] || THEMES.piratas; const ps = players(h), ed = canEdit(h);
    if (!player || !ps.some(m => m.id === player)) player = ps.some(m => m.id === S.me.id) ? S.me.id : (ps.find(m => !m.uid) || ps[0])?.id;
    const p = prog(h, player), cur = h.clues[p.step], N = h.clues.length;
    const board = ps.map(m => ({ m, p: prog(h, m.id) })).sort((a, b) => (a.p.done ? 0 : 1) - (b.p.done ? 0 : 1) || (a.p.done && b.p.done ? (a.p.done - a.p.start) - (b.p.done - b.p.start) : b.p.step - a.p.step));
    const playing = h.status === 'live';
    return `<a class="link" href="#/tesoro">‹ Búsquedas</a>
      <section class="card xhero deco mt hunt-hero theme-${h.theme}"><div class="row between wrap"><span class="chip accent">${e} ${l} · ${N} pistas</span>${ed ? `<div class="row" style="gap:6px"><button class="btn sm" data-act="edit" data-id="${h.id}">✏️</button><button class="btn sm" data-act="print" data-id="${h.id}">🖨️ Imprimir códigos</button></div>` : ''}</div>
        <div class="xhero-title mt">${esc(h.title)}</div>${h.prize && (p.done || ed) ? `<p class="bold">🏆 ${esc(h.prize)}</p>` : '<p class="bold muted">🏆 Un tesoro espera al final…</p>'}
        ${ed ? `<div class="row wrap mt" style="gap:8px">${!playing ? `<button class="btn primary" data-act="start" data-id="${h.id}">▶️ ¡Empezar!</button>` : `<button class="btn" data-act="finish" data-id="${h.id}">🏁 Terminar</button>`}<button class="btn ghost" data-act="reset" data-id="${h.id}">↺ Reiniciar</button></div>` : ''}</section>
      ${ps.length > 1 ? `<div class="row wrap mt" style="gap:6px"><span class="tiny bold muted">¿Quién juega en este teléfono?</span>${ps.map(m => `<button class="chip chip-btn ${m.id === player ? 'sel' : ''}" data-act="who" data-m="${m.id}">${esc(m.emoji || '')} ${esc(m.name.split(' ')[0])}</button>`).join('')}</div>` : ''}
      <div class="trail mt">${h.clues.map((c, i) => `<span class="${i < p.step ? 'ok' : i === p.step && !p.done ? 'now' : ''}">${i < p.step ? '✓' : i === N - 1 ? '🏆' : i + 1}</span>`).join('<i></i>')}</div>
      ${!playing && !p.done ? `<section class="card deco mt center"><div class="big">⏳</div><p class="bold">${ed ? 'Imprime los códigos, escóndelos y toca “¡Empezar!”' : 'Todavía no empieza. ¡Prepárate!'}</p></section>`
        : p.done ? `<section class="card deco mt center"><div style="font-size:64px">🏆</div><h2>¡${esc(member(player)?.name.split(' ')[0] || '')} encontró el tesoro!</h2><p class="bold">en ${dur(p.done - (p.start || p.times[0]))}${p.hints ? ` · ${p.hints} pista${p.hints > 1 ? 's' : ''} extra` : ''}</p>${h.prize ? `<p class="bold mt">🎁 ${esc(h.prize)}</p>` : ''}</section>`
        : `<section class="scroll-card mt"><div class="tiny bold">🧩 PISTA ${p.step + 1} DE ${N}</div><div class="riddle">${esc(cur.riddle)}</div>${(p.hintsFor || []).includes(p.step) ? `<div class="hint-box">💡 ${esc(cur.hint || 'Sin pista extra')}</div>` : cur.hint ? `<button class="link" data-act="hint" data-id="${h.id}">💡 ¿Te atoraste? Ver pista extra</button>` : ''}</section>
          <div class="row mt" style="gap:10px;justify-content:center;flex-wrap:wrap"><button class="btn primary lg" data-act="scan" data-id="${h.id}">📷 Escanear código</button><button class="btn lg" data-act="type" data-id="${h.id}">⌨️ Escribir código</button></div>`}
      <section class="card deco mt"><div class="card-title"><h3>🏁 Marcador</h3></div><div class="list">${board.map(({ m, p: q }, i) => `<div class="item">${avatar(m, 'sm')}<b class="grow small">${q.done ? ['🥇', '🥈', '🥉'][i] || '🏆' : ''} ${esc(m.name)}</b><div class="hunt-bar"><i style="width:${q.step / N * 100}%"></i></div><span class="tiny bold">${q.done ? dur(q.done - (q.start || q.times[0])) : `${q.step}/${N}`}</span></div>`).join('')}</div></section>
      ${ed ? `<details class="card mt"><summary class="bold">🤫 Dónde está escondido cada código (sólo tú)</summary><div class="list mt">${h.clues.map((c, i) => `<div class="item"><span class="emoji">${i === N - 1 ? '🏆' : i + 1}</span><div class="grow"><div class="small bold">${esc(c.spot || '—')}</div><div class="tiny muted">${esc(c.riddle)}</div></div><span class="chip">${c.code}</span></div>`).join('')}</div></details>` : ''}`;
  },
  after(root, [id, scanned]) {
    // Llegaron escaneando un QR con la cámara del teléfono (#/tesoro/ID/CODIGO)
    const h = hunt(id); if (h && scanned && !this._done?.[scanned]) { this._done = { ...(this._done || {}), [scanned]: 1 }; if (h.status === 'live') tryCode(h, scanned); history.replaceState(null, '', '#/tesoro/' + id); }
  },
  actions: {
    edit(el) { huntForm(hunt(el.dataset.id)); },
    print(el) { printCodes(hunt(el.dataset.id)); },
    async start(el) { const h = hunt(el.dataset.id); await S.db.update('hunts', h.id, { status: 'live', startedAt: Date.now() }); notify({ to: players(h).map(m => m.id), icon: '🗺️', title: `¡Empezó la búsqueda del tesoro!`, body: h.title, link: 'tesoro/' + h.id }); hooks.celebrate(innerWidth / 2, innerHeight / 3, 'confetti'); },
    async finish(el) { await S.db.update('hunts', el.dataset.id, { status: 'done' }); },
    async reset(el) { if (!(await confirmBox('¿Reiniciar el progreso de todos?', 'Reiniciar'))) return; await S.db.update('hunts', el.dataset.id, { progress: {}, status: 'draft' }); },
    who(el) { player = el.dataset.m; hooks.rerender(); },
    scan(el) { const h = hunt(el.dataset.id); scanQR(t => tryCode(hunt(h.id), t)); },
    type(el) { const h = hunt(el.dataset.id); typeCode(t => tryCode(hunt(h.id), t)); },
    async hint(el) { const h = hunt(el.dataset.id), mid = player || S.me.id, p = prog(h, mid); await S.db.update('hunts', h.id, { [`progress.${mid}`]: { ...p, hints: (p.hints || 0) + 1, hintsFor: [...(p.hintsFor || []), p.step] } }); }
  }
};
