import { renderAvatar } from './avatar.js';
// ============================================================
//  Utilidades de interfaz compartidas
// ============================================================
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const pad = n => String(n).padStart(2, '0');
export const isoDate = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseDate = (s) => { if (!s) return null; const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const today0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
export const daysBetween = (a, b) => Math.round((b - a) / 864e5);

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
export const MONTHS = MESES;
export function fmtDate(s, opts = {}) {
  const d = typeof s === 'string' ? parseDate(s) : s; if (!d) return '';
  const base = `${d.getDate()} de ${MESES[d.getMonth()]}`;
  if (opts.weekday) return `${DIAS[d.getDay()]} ${base}`;
  if (opts.year) return `${base} de ${d.getFullYear()}`;
  return base;
}
export function fmtShort(s) { const d = typeof s === 'string' ? parseDate(s) : s; return d ? `${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)}` : ''; }
export function fmtTime(t) {
  if (!t) return ''; const [h, m] = t.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`;
}
export function relDay(s) {
  const n = daysBetween(today0(), parseDate(s));
  if (n === 0) return 'Hoy'; if (n === 1) return 'Mañana'; if (n === -1) return 'Ayer';
  if (n > 1 && n < 7) return DIAS[parseDate(s).getDay()].replace(/^./, c => c.toUpperCase());
  return fmtShort(s);
}
export function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'ahora'; if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  const d = new Date(ts); return `${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)}`;
}
export const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 });

// Próximo cumpleaños de un integrante
export function nextBirthday(m) {
  if (!m.birthday) return null;
  const b = parseDate(m.birthday); const t = today0();
  let d = new Date(t.getFullYear(), b.getMonth(), b.getDate());
  if (d < t) d = new Date(t.getFullYear() + 1, b.getMonth(), b.getDate());
  return { date: d, days: daysBetween(t, d), age: d.getFullYear() - b.getFullYear() };
}

export function avatar(m, cls = '') {
  if (!m) return `<span class="avatar ${cls}" style="--c:#64748b">?</span>`;
  if (m.avatar && m.avatarMode !== 'photo') {
    const live = /\b(lg|xl|xxl|live)\b/.test(cls);
    const b = m.birthday ? parseDate(m.birthday) : null, t = new Date();
    const crown = b && b.getMonth() === t.getMonth() && b.getDate() === t.getDate();
    return `<span class="avatar ava ${cls} ${live ? 'live' : ''}" title="${esc(m.name)}">${renderAvatar(m.avatar, { season: document.body.dataset.theme, crown })}</span>`;
  }
  const inner = m.photo ? `<img src="${esc(m.photo)}" alt="">` : esc(m.emoji || (m.name || '?')[0]);
  return `<span class="avatar ${cls}" style="--c:${esc(m.color || '#6366f1')}" title="${esc(m.name)}">${inner}</span>`;
}

// ---------------- Toast ----------------
let toastT;
export function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg; el.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2600);
}

// ---------------- Modal ----------------
export function modal({ title, body, submit, submitLabel = 'Guardar', wide = false, danger, onOpen, foot, onClose }) {
  const root = document.getElementById('modal-root');
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `<form class="modal ${wide ? 'wide' : ''}" novalidate>
      <div class="modal-head"><h2>${title}</h2><button type="button" class="icon-btn" data-close aria-label="Cerrar">✕</button></div>
      <div class="modal-body">${body}</div>
      ${foot !== undefined ? foot : `<div class="modal-foot">
        ${danger ? `<button type="button" class="btn danger" data-danger style="margin-right:auto">${danger.label}</button>` : ''}
        <button type="button" class="btn ghost" data-close>Cancelar</button>
        ${submit ? `<button type="submit" class="btn primary">${submitLabel}</button>` : ''}
      </div>`}
    </form>`;
  const close = () => { if (!bg.isConnected) return; bg.remove(); if (!root.children.length) document.documentElement.classList.remove('modal-open'); onClose && onClose(); };
  bg.addEventListener('click', e => { if (e.target === bg || e.target.closest('[data-close]')) close(); });
  const form = bg.querySelector('form');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!submit) return;
    const data = Object.fromEntries(new FormData(form).entries());
    // checkboxes múltiples
    form.querySelectorAll('[data-multi]').forEach(g => { data[g.dataset.multi] = [...g.querySelectorAll('input:checked')].map(i => i.value); });
    const btn = form.querySelector('[type=submit]'); btn.disabled = true;
    try { const r = await submit(data, form); if (r !== false) close(); }
    catch (err) { console.error(err); toast('⚠️ ' + (err.message || 'Algo salió mal')); }
    finally { btn.disabled = false; }
  });
  if (danger) bg.querySelector('[data-danger]').addEventListener('click', async () => { if (await confirmBox(danger.confirm || '¿Seguro?')) { await danger.action(); close(); } });
  const esc_ = e => { if (!bg.isConnected) return removeEventListener('keydown', esc_); if (e.key === 'Escape' && bg === root.lastElementChild) close(); };
  addEventListener('keydown', esc_);
  root.appendChild(bg); document.documentElement.classList.add('modal-open');
  // al enfocar un campo en el celular, que quede visible dentro de la ventana
  form.addEventListener('focusin', e => { if (innerWidth <= 860 && e.target.matches('input, textarea, select')) setTimeout(() => e.target.scrollIntoView({ block: 'center', behavior: 'smooth' }), 280); });
  onOpen && onOpen(form, close);
  setTimeout(() => { const f = form.querySelector('input:not([type=hidden]):not([type=checkbox]):not([type=file]), textarea'); f && innerWidth > 640 && f.focus(); }, 50);
  return { el: form, close };
}

export function confirmBox(msg, okLabel = 'Sí, continuar') {
  return new Promise(res => {
    const m = modal({
      title: 'Confirmar', body: `<p style="font-weight:700">${msg}</p>`, foot: `<div class="modal-foot"><button type="button" class="btn ghost" data-no>Cancelar</button><button type="button" class="btn danger" data-yes>${okLabel}</button></div>`
    });
    m.el.querySelector('[data-yes]').onclick = () => { m.close(); res(true); };
    m.el.querySelector('[data-no]').onclick = () => { m.close(); res(false); };
  });
}

// Selector de integrantes (checkboxes con avatar)
export function memberPicker(name, members, selected = [], single = false) {
  return `<div class="chips" ${single ? '' : `data-multi="${name}"`}>${members.map(m => `
    <label class="chip chip-btn"><input type="${single ? 'radio' : 'checkbox'}" name="${single ? name : '_' + name}" value="${m.id}" ${selected.includes(m.id) ? 'checked' : ''} style="accent-color:var(--accent)"> ${esc(m.emoji || '')} ${esc(m.name)}</label>`).join('')}</div>`;
}

// ---------------- Imágenes ----------------
export function compressImage(file, max = 1600, quality = 0.82, maxBytes = 850000) {
  return new Promise((res, rej) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let q = quality, size = max, out;
      const draw = () => {
        const k = Math.min(1, size / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        return c.toDataURL('image/jpeg', q);
      };
      out = draw();
      while (out.length * 0.75 > maxBytes && (q > 0.45 || size > 600)) { if (q > 0.45) q -= 0.08; else size *= 0.8; out = draw(); }
      URL.revokeObjectURL(url); res(out);
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('No se pudo leer la imagen')); };
    img.src = url;
  });
}

export function pickFiles({ multiple = false, accept = 'image/*' } = {}) {
  return new Promise(res => {
    const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.multiple = multiple;
    i.onchange = () => res([...i.files]); i.click();
  });
}

export const EMOJIS_PEOPLE = ['😎', '👩', '👨', '👧', '👦', '👵', '👴', '👶', '🧑', '👱‍♀️', '🧔', '👸', '🤴', '🦸', '🐶', '🐱'];
export const COLORS = ['#6366f1', '#ec4899', '#0ea5e9', '#f59e0b', '#10b981', '#a855f7', '#ef4444', '#14b8a6', '#f97316', '#84cc16'];
export const ROLES = { admin: 'Administrador', adulto: 'Adulto', adolescente: 'Adolescente', nino: 'Niño' };
