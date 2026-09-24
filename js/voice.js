// 🎙️ Agregar por voz (o escribiendo/dictando): "leche, huevos y tortillas", "gasté 350 en gasolina", "recuérdame el dentista mañana a las 5"
import { S, hooks, members } from './store.js';
import { esc, toast, isoDate, today0, fmtDate, fmtTime } from './ui.js';
import { sfx } from './reveal.js';

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const DOW = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const NUMW = { un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, quince: 15, veinte: 20, treinta: 30, cuarenta: 40, cincuenta: 50, cien: 100, ciento: 100, doscientos: 200, trescientos: 300, quinientos: 500, mil: 1000 };
const CAT_WORDS = [['transporte', /gasolin|uber|didi|taxi|metro|estacionam|caseta|auto|carro/], ['super', /super|walmart|soriana|chedraui|costco|mercado|despensa|oxxo/], ['comida', /comida|restaur|tacos|pizza|cena|desayun|cafe|antojo/], ['servicios', /luz|agua|gas|internet|telefono|celular|netflix|spotify|cfe/], ['salud', /farmacia|medicin|doctor|dentista|consulta|hospital/], ['escuela', /escuela|colegiatura|utiles|libro|uniforme/], ['ocio', /cine|fiesta|juego|concierto|boletos|diversion/], ['regalos', /regalo/], ['casa', /renta|casa|mueble|limpieza|ferreteria/]];

export function parseAmount(t) {
  const n = norm(t);
  const m = n.match(/\$?\s?(\d{1,3}(?:[.,]\d{3})+|\d+)(?:[.,](\d{1,2}))?\s*(mil|k)?/);
  if (m) { let v = Number(m[1].replace(/[.,](?=\d{3}\b)/g, '')) + (m[2] ? Number('0.' + m[2]) : 0); if (m[3]) v *= 1000; return v; }
  // números con palabras sencillos: "quinientos", "mil quinientos", "doscientos cincuenta"
  let total = 0, cur = 0, found = false;
  for (const w of n.split(/\s+/)) { if (NUMW[w] == null) { if (w === 'y' && found) continue; if (found) break; continue; } found = true; if (w === 'mil') { cur = (cur || 1) * 1000; total += cur; cur = 0; } else cur += NUMW[w]; }
  return found ? total + cur : 0;
}
export function parseWhen(t) {
  const n = norm(t), now = today0(); let date = null, time = '';
  const nd = n.replace(/de la manana/g, '');
  if (/pasado manana/.test(nd)) { date = new Date(now); date.setDate(date.getDate() + 2); }
  else if (/\bmanana\b/.test(nd)) { date = new Date(now); date.setDate(date.getDate() + 1); }
  else if (/\bhoy\b/.test(nd)) date = new Date(now);
  const dw = n.match(/\b(el |este |proximo )?(domingo|lunes|martes|miercoles|jueves|viernes|sabado)\b/);
  if (!date && dw) { const target = DOW.indexOf(dw[2]); date = new Date(now); let diff = (target - date.getDay() + 7) % 7; if (diff === 0) diff = 7; date.setDate(date.getDate() + diff); }
  const dm = n.match(/\b(?:el )?(\d{1,2}) de (enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/);
  if (dm) { date = new Date(now.getFullYear(), MESES.indexOf(dm[2]), +dm[1]); if (date < now) date.setFullYear(date.getFullYear() + 1); }
  else if (!date) { const d1 = n.match(/\bel (\d{1,2})\b(?! de la)/); if (d1 && +d1[1] <= 31) { date = new Date(now.getFullYear(), now.getMonth(), +d1[1]); if (date < now) date.setMonth(date.getMonth() + 1); } }
  const tm = n.match(/\ba las? (\d{1,2})(?::(\d{2}))?(?: y (media|cuarto))?(?: (?:de la |del )?(manana|tarde|noche|mediodia))?/) || n.match(/\b(\d{1,2}):(\d{2})\b/);
  if (tm) { let h = +tm[1], mi = tm[2] ? +tm[2] : tm[3] === 'media' ? 30 : tm[3] === 'cuarto' ? 15 : 0; const part = tm[4]; if ((part === 'tarde' || part === 'noche') && h < 12) h += 12; else if (!part && h >= 1 && h <= 7) h += 12; time = `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`; }
  return { date: date ? isoDate(date) : '', time };
}
const clean = (s) => s.replace(/\s+/g, ' ').trim().replace(/^[,.\s]+|[,.\s]+$/g, '');
const cap = (s) => s ? s[0].toUpperCase() + s.slice(1) : s;

export function parseCommand(raw) {
  const text = clean(raw), n = norm(text);
  if (!text) return null;
  const amount = parseAmount(text);
  // 💰 Ingreso
  if (/\b(me pagaron|cobre|me depositaron|ingreso|recibi|gane)\b/.test(n) && amount) {
    const what = text.replace(/.*?\b(me pagaron|cobré|cobre|me depositaron|ingreso de|ingreso|recibí|recibi|gané|gane)\b/i, '').replace(/\$?\s?[\d.,]+\s*(mil|pesos)?/i, '').replace(/^\s*(de|por|del)\s+/i, '');
    return { kind: 'ingreso', amount, title: cap(clean(what)) || 'Ingreso' };
  }
  // 💸 Gasto
  if ((/\b(gaste|gasto|pague|compre|me cobraron|costo|salio en)\b/.test(n) || /\bpesos\b/.test(n)) && amount) {
    let what = text.replace(/^.*?(gast[eé]|gasto de|gasto|pagu[eé]|compr[eé]|me cobraron|cost[oó]|sali[oó] en)(?=\s|$)/i, '');
    what = what.replace(/\$?\s?\d[\d.,]*\s*(mil)?\s*(pesos)?/i, '').split(/\s+/).filter(w => NUMW[norm(w)] == null && norm(w) !== 'pesos').join(' ');
    what = what.replace(/^\s*(en|de|por|del|la|el)\s+/i, '').replace(/^\s*(en|de|por|del)\s+/i, '').replace(/\s+(en|de)\s*$/i, '');
    const title = cap(clean(what)) || 'Gasto'; const nt = norm(title);
    const category = (CAT_WORDS.find(([, re]) => re.test(nt)) || ['otros'])[0];
    const split = /(entre todos|dividir|dividirlo|a medias|entre (\w+ y \w+))/.test(n);
    return { kind: 'gasto', amount, title: title.replace(/\s*(entre todos|a medias|y dividirlo|dividirlo)\s*/i, ' ').trim(), category, split };
  }
  // 📅 Evento / recordatorio
  if (/\b(recuerdame|recordatorio|recordar|cita|evento|junta|reunion|agenda|agendar|agendame)\b/.test(n) || (/\b(manana|hoy|pasado manana|lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b/.test(n) && /\ba las?\b/.test(n))) {
    const w = parseWhen(text);
    let title = text.replace(/\b(recuérdame|recuerdame|recordatorio de|recordatorio|recordar|agéndame|agendame|agenda|agendar|pon)(?=\s|$)/gi, '')
      .replace(/\ba las? \d{1,2}(:\d{2})?( y (media|cuarto))?( (de la |del )?(mañana|manana|tarde|noche|mediodía|mediodia))?/gi, '')
      .replace(/(pasado mañana|pasado manana|mañana|manana|hoy)(?=\s|$)/gi, '').replace(/\b(el |este |próximo |proximo )?(domingo|lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado)\b/gi, '')
      .replace(/\ba las? \d{1,2}(:\d{2})?( y (media|cuarto))?( (de la |del )?(mañana|manana|tarde|noche|mediodía|mediodia))?/gi, '').replace(/\b(el )?\d{1,2} de \w+/gi, '').replace(/\bel \d{1,2}\b/gi, '').replace(/^\s*(que|de|el|la)\s+/i, '');
    const type = /dentista|doctor|medic|consulta|cita/.test(n) ? 'cita' : /junta|reunion/.test(n) ? 'reunion' : /escuela/.test(n) ? 'escuela' : /pagar|recibo|vence/.test(n) ? 'recordatorio' : 'recordatorio';
    title = title.replace(/\s+(de la|de|del|el|la|a las?)\s*$/i, '');
    return { kind: 'evento', title: cap(clean(title)) || 'Recordatorio', date: w.date || isoDate(), time: w.time, type };
  }
  // 📝 Nota
  if (/^(nota|anota|apunta|guarda)\b/.test(n)) { const body = text.replace(/^(nota|anota que|anota|apunta que|apunta|guarda que|guarda)\s*:?\s*/i, ''); return { kind: 'nota', title: cap(body.split(/[.,:]/)[0].slice(0, 40)), body: cap(body) }; }
  // 🛒 Compras (por defecto)
  const listText = text.replace(/^(agrega|agregar|añade|anade|pon|compra|comprar|hay que comprar|falta|faltan|necesitamos|necesito|a la lista|en la lista)\s*(a la lista|al super|al súper|en la lista)?\s*(de|del)?\s*:?\s*/i, '').replace(/\s*(a la lista( del súper| del super)?|al súper|al super)\s*$/i, '');
  const items = listText.split(/\s*(?:,|;|\by\b|\be\b(?=\s)|\bademás\b|\btambién\b)\s*/i).map(s => clean(s)).filter(s => s && s.length > 1).map(cap);
  return { kind: 'compras', items };
}

// ---------------- Interfaz ----------------
const REC = () => window.SpeechRecognition || window.webkitSpeechRecognition;
export const voiceSupported = () => !!REC();

export function openVoice(startListening = true) {
  if (document.querySelector('.voice-ov')) return;
  const ov = document.createElement('div'); ov.className = 'voice-ov';
  ov.innerHTML = `<div class="voice-card">
    <button class="icon-btn sm voice-x" data-x aria-label="Cerrar">✕</button>
    <div class="voice-title">¿Qué agregamos?</div>
    <button class="voice-mic" data-mic aria-label="Hablar"><span>🎙️</span></button>
    <div class="voice-status tiny bold muted" data-st>${voiceSupported() ? 'Toca el micrófono y habla' : 'Escribe o usa el 🎤 del teclado para dictar'}</div>
    <textarea class="input voice-text" rows="2" placeholder="Ej.: leche, huevos y tortillas · gasté 350 en gasolina · recuérdame el dentista mañana a las 5"></textarea>
    <div class="voice-res" data-res></div>
    <div class="voice-ex tiny muted">Prueba: “agrega jamón y pan”, “pagué 1200 de luz entre todos”, “me pagaron 5000 de la quincena”, “junta de la escuela el viernes a las 8”, “nota: el plomero se llama Juan”</div></div>`;
  document.body.appendChild(ov); document.documentElement.classList.add('modal-open');
  const ta = ov.querySelector('textarea'), st = ov.querySelector('[data-st]'), res = ov.querySelector('[data-res]'), mic = ov.querySelector('[data-mic]');
  let rec = null, listening = false;
  const close = () => { try { rec && rec.abort(); } catch { } ov.classList.add('out'); document.documentElement.classList.remove('modal-open'); setTimeout(() => ov.remove(), 220); removeEventListener('keydown', key); };
  const key = (e) => { if (e.key === 'Escape') close(); };
  addEventListener('keydown', key);
  const act = (fn) => { close(); setTimeout(fn, 150); };
  const show = () => {
    const c = parseCommand(ta.value); if (!c) { res.innerHTML = ''; return; }
    let h = '', btns = [];
    if (c.kind === 'compras') { h = c.items.length ? `<div class="vr-h">🛒 Agregar a la lista del súper</div><div class="chips">${c.items.map(i => `<span class="chip">${esc(i)}</span>`).join('')}</div>` : ''; if (c.items.length) btns = [['primary', `🛒 Agregar ${c.items.length === 1 ? '' : c.items.length + ' cosas'}`, 'shop']]; }
    if (c.kind === 'gasto') { h = `<div class="vr-h">💸 Gasto de <b>$${c.amount.toLocaleString('es-MX')}</b></div><div class="small bold">${esc(c.title)}</div>`; btns = [...(['admin', 'adulto'].includes(S.me.role) ? [['primary', '💸 Gasto familiar', 'exp']] : []), ['', '💰 Mi gasto (privado)', 'mine'], [c.split ? 'primary' : '', '🤝 Dividirlo', 'bill']]; }
    if (c.kind === 'ingreso') { h = `<div class="vr-h">💰 Ingreso de <b>$${c.amount.toLocaleString('es-MX')}</b></div><div class="small bold">${esc(c.title)}</div>`; btns = [['primary', '💰 Guardar en mis finanzas', 'inc']]; }
    if (c.kind === 'evento') { h = `<div class="vr-h">📅 ${esc(c.title)}</div><div class="small bold">${fmtDate(c.date, { weekday: true })}${c.time ? ' · ' + fmtTime(c.time) : ''}</div>`; btns = [['primary', '📅 Agendar', 'ev']]; }
    if (c.kind === 'nota') { h = `<div class="vr-h">📝 Nota</div><div class="small bold">${esc(c.body)}</div>`; btns = [['primary', '📝 Guardar nota', 'note']]; }
    res.innerHTML = h ? `<div class="vr-card">${h}<div class="row wrap mt-s" style="gap:8px">${btns.map(([cls, l, a]) => `<button class="btn sm ${cls}" data-do="${a}">${l}</button>`).join('')}</div></div>` : '';
    res.querySelectorAll('[data-do]').forEach(b => b.onclick = async () => {
      const a = b.dataset.do;
      if (a === 'shop') { for (const t of c.items) await S.db.add('shopping', { text: t, list: 'Súper', done: false, by: S.me.id }); try { sfx.check(); } catch { } toast(`🛒 ${c.items.length} cosa${c.items.length > 1 ? 's' : ''} en la lista`); ta.value = ''; show(); return; }
      if (a === 'exp') return act(async () => (await import('./views/money.js')).expenseForm({ title: c.title, amount: c.amount, category: c.category, date: isoDate() }));
      if (a === 'bill') return act(async () => (await import('./views/bills.js')).billForm({ title: c.title, total: c.amount, category: c.category === 'transporte' ? 'auto' : c.category === 'servicios' ? 'luz' : c.category === 'super' ? 'super' : 'otro' }));
      if (a === 'mine' || a === 'inc') return act(async () => (await import('./views/myfinance.js')).txForm(a === 'inc' ? 'ingreso' : 'gasto', { kind: a === 'inc' ? 'ingreso' : 'gasto', amount: c.amount, note: c.title, date: isoDate() }));
      if (a === 'ev') return act(async () => (await import('./views/agenda.js')).openEventForm({ title: c.title, date: c.date, time: c.time, type: c.type, repeat: 'none', participants: [S.me.id] }));
      if (a === 'note') return act(async () => (await import('./views/notes.js')).noteForm({ title: c.title, body: c.body }));
    });
  };
  ta.addEventListener('input', show);
  const listen = () => {
    const R = REC(); if (!R) { ta.focus(); st.textContent = '👉 Toca el 🎤 de tu teclado para dictar'; return; }
    if (listening) { try { rec.stop(); } catch { } return; }
    rec = new R(); rec.lang = 'es-MX'; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
    let base = ta.value ? ta.value + ' ' : '';
    rec.onstart = () => { listening = true; mic.classList.add('on'); st.textContent = '🔴 Escuchando…'; try { navigator.vibrate && navigator.vibrate(15); } catch { } };
    rec.onresult = (e) => { let txt = ''; for (let i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript; ta.value = base + txt; show(); };
    rec.onerror = (e) => { st.textContent = e.error === 'not-allowed' ? '🎙️ Permite el micrófono para usar la voz' : e.error === 'no-speech' ? 'No te escuché, intenta de nuevo' : 'Usa el 🎤 del teclado para dictar'; };
    rec.onend = () => { listening = false; mic.classList.remove('on'); if (st.textContent.startsWith('🔴')) st.textContent = ta.value ? '✅ Revisa y confirma' : 'Toca el micrófono y habla'; };
    try { rec.start(); } catch { st.textContent = 'Usa el 🎤 del teclado para dictar'; }
  };
  ov.addEventListener('click', e => { if (e.target === ov || e.target.closest('[data-x]')) close(); });
  mic.onclick = listen;
  if (startListening && voiceSupported()) setTimeout(listen, 250); else setTimeout(() => ta.focus(), 200);
}
