// 📖 Guía de Nido: qué es y para qué sirve cada sección (y el botoncito ⓘ junto a cada título)
import { S } from '../store.js';
import { esc, modal } from '../ui.js';
import { icon } from '../icons.js';

// [ruta, emoji, nombre, para qué sirve, cosas que puedes hacer]
export const GUIDE = [
  ['Lo de todos los días', [
    ['inicio', '🏠', 'Inicio', 'Tu resumen del día: cambia según la hora (mañana, tarde o noche).', ['Ver qué pasa hoy: eventos, cumpleaños, tareas y mensajes', 'Tocar cualquier cosa de “Así estuvo hoy” para ir directo', 'Acomodar los bloques a tu gusto (✏️ Personalizar)']],
    ['cuentas', '🤝', 'Cuentas claras', 'Gastos compartidos: quién pagó, cuánto le toca a cada quien y qué falta por pagar.', ['Dividir una cuenta entre varios (igual, por porcentaje o montos)', 'Ver cuánto debes esta quincena y la que sigue', 'Abonar y confirmar que ya recibiste el dinero']],
    ['chat', '💬', 'Chat', 'Mensajes de la familia y conversaciones privadas de uno a uno.', ['Ver quién ya leyó tu mensaje (✓✓ y “Visto por”)', 'Reaccionar ❤️😂 y responder citando un mensaje', 'Avisar “Llegué a casa” o compartir tu ubicación']],
    ['agenda', '📅', 'Agenda', 'El calendario de la familia con todo junto: eventos, cumpleaños, pagos y vencimientos.', ['Agregar citas y eventos (o privados 🔒 sólo para ti)', 'Ver cumpleaños, fiestas y pagos en el mismo calendario', 'Eventos que se repiten cada semana, mes o año']]
  ]],
  ['Para celebrar y convivir', [
    ['intercambios', '🎁', 'Intercambios', 'Amigo secreto con sorteo en vivo, listas de deseos y revelación con animación.', ['Hacer el sorteo sin que nadie haga trampa 🤫', 'Pedir regalos con links y apartar sin que el festejado lo vea', 'Invitar amigos o a tu novia sólo a ese intercambio 🎟️']],
    ['fiestas', '🎉', 'Fiestas y posadas', 'Organiza cualquier fiesta: quién va, quién trae qué y dónde es.', ['Confirmar asistencia y cuántos van', 'Repartir la lista de “¿quién trae qué?”', 'Crear la imagen de invitación con QR y mandar recordatorios']],
    ['encuestas', '🗳️', 'Encuestas', 'Para decidir entre todos sin pelear.', ['¿A dónde vamos de vacaciones? ¿Qué cenamos el domingo?', 'Ver resultados en tiempo real']],
    ['ruleta', '🎡', 'Ruleta', 'Que la suerte decida: una ruleta que todos ven girar al mismo tiempo.', ['¿Quién lava los trastes? ¿Qué película vemos?', 'Evita que le toque dos veces seguidas al mismo']],
    ['retos', '🏅', 'Retos', 'Retos familiares con puntos para motivarse juntos.', ['Caminar, leer, no usar el celular en la mesa…', 'Ver quién va ganando']],
    ['viajes', '✈️', 'Viajes', 'Todo el viaje en un lugar: fechas, reservaciones, maleta y presupuesto.', ['Lista de equipaje de cada quien', 'Guardar confirmaciones y el itinerario']],
    ['recetas', '🍲', 'Recetario', 'Las recetas de la familia para que no se pierdan (las de la abuela 👵).', ['Ingredientes y pasos con modo cocina', 'Mandar los ingredientes a la lista de compras']],
    ['capsula', '⏳', 'Cápsula del tiempo', 'Mensajes y fotos que se abren en una fecha futura.', ['Escribirle a tu “yo” de dentro de 5 años', 'Una carta para abrir en la boda o en los XV']],
    ['mapa', '🗺️', 'Mapa de recuerdos', 'Un mapa con los lugares que han vivido juntos.', ['Las fotos con ubicación aparecen solas', 'Marcar el restaurante favorito o el viaje de 2019']],
    ['tesoro', '🏴‍☠️', 'Búsqueda del tesoro', 'Juego con acertijos y códigos QR escondidos por la casa.', ['Imprimir las pistas con QR', 'Los niños escanean y van avanzando']],
    ['arbol', '🌳', 'Árbol genealógico', 'Abuelos, papás, tíos y primos en un árbol que se arma solo.', ['Agregar familiares aunque no usen la app', 'Recordar a los que ya no están']],
    ['ubicacion', '📍', '¿Dónde andamos?', 'Ver en el mapa dónde está cada quien (sólo si lo decide compartir).', ['Saber si ya van en camino', 'Compartir o dejar de compartir cuando quieras']]
  ]],
  ['La casa', [
    ['menu', '🍽️', 'Menú semanal', 'Planea qué se come cada día de la semana.', ['Sugerencias con el recetario', 'Pasar todo lo que falta a la lista del súper']],
    ['listas', '🛒', 'Compras', 'La lista del súper compartida: lo que uno agrega, todos lo ven.', ['Agregar escribiendo o por voz 🎤', 'Deslizar para marcar lo que ya compraste']],
    ['tareas', '🧹', 'Tareas y puntos', 'Quién hace qué en la casa, con puntos y premios.', ['Tareas que se repiten', 'Canjear puntos por recompensas']],
    ['mascotas', '🐾', 'Mascotas', 'El perfil de cada mascota (hola, Cheto 🐱): vacunas, comida y cuidados.', ['Foto real o avatar', 'Recordatorios de vacunas y veterinario']],
    ['dinero', '💰', 'Dinero', 'Gastos de la familia (sólo adultos) y tus finanzas personales privadas 🔒.', ['Cuentas, movimientos y presupuestos', 'Escanear un ticket para registrar el gasto']],
    ['metas', '🎯', 'Metas', 'Ahorrar para algo grande: el carro, la casa, un viaje.', ['Metas familiares o personales', 'Ver cuánto falta y a qué ritmo vas']],
    ['documentos', '🪪', 'Documentos', 'Pasaportes, INE, licencias, seguros… y cuándo vencen.', ['Aviso antes de que venzan', 'Documentos privados 🔒 sólo para ti']],
    ['notas', '📝', 'Notas', 'Datos útiles de la casa: Wi-Fi, plomero, placas del carro.', ['Notas ocultas para contraseñas', 'Notas privadas 🔒']],
    ['donde', '🔎', '¿Dónde está?', 'Para no volver a perder nada: dónde se guardó cada cosa.', ['“Las escrituras están en el cajón del estudio”']]
  ]],
  ['Nido', [
    ['familia', '👨‍👩‍👧‍👦', 'Familia', 'Los perfiles de todos: cumpleaños, datos de emergencia y avatar.', ['Personalizar tu avatar', 'Invitar a alguien más de la familia']],
    ['resumen', '✨', 'Resumen del año', 'Tu año en historias: lo que más hicieron, el mes más caro, la mejor compra…', ['Verlo como historias de Instagram', 'Compartirlo']],
    ['ajustes', '⚙️', 'Ajustes', 'Tema, notificaciones, respaldo y quién puede entrar.', ['Hacer un respaldo con todas las fotos', 'Cambiar el tema o subir un fondo propio']]
  ]]
];
export const TOOLS = [
  ['＋', 'Agregar rápido', 'El botón del centro: agrega un gasto, evento, compra o nota desde cualquier lugar. También puedes dictar 🎤 o escanear un ticket 🧾.'],
  ['🔍', 'Buscar', 'Encuentra cualquier cosa: una receta, un documento, un mensaje, una persona.'],
  ['🔔', 'Notificaciones', 'Avisos de la familia y recordatorios del día.'],
  ['🎟️', 'Invitados de fuera', 'En intercambios y fiestas puedes invitar a amigos, novia o tíos: sólo ven ese evento, nada más de la familia.'],
  ['🆘', 'Botón SOS', 'En una emergencia avisa a toda la familia con tu ubicación.'],
  ['👆', 'Gestos', 'Desliza filas para completar o borrar, jala hacia abajo para actualizar y mantén presionado un mensaje para reaccionar.']
];
const byRoute = Object.fromEntries(GUIDE.flatMap(([, items]) => items.map(i => [i[0], i])));
const ALIAS = { cuenta: 'cuentas', intercambio: 'intercambios', fiesta: 'fiestas', album: 'fotos', libro: 'fotos', receta: 'recetas', viaje: 'viajes', mascota: 'mascotas', meta: 'metas', dm: 'chat', perfil: 'familia' };
export const guideFor = (route) => byRoute[ALIAS[route] || route];

let q = '';
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export default {
  render() {
    const match = (i) => !q || norm([i[2], i[3], ...i[4]].join(' ')).includes(norm(q));
    const groups = GUIDE.map(([g, items]) => [g, items.filter(match)]).filter(([, it]) => it.length);
    return `<div class="page-head"><div><h1>¿Qué hay en Nido?</h1><p>Para qué sirve cada sección, en pocas palabras</p></div></div>
      <input class="input mb guide-search" id="guide-q" placeholder="🔍 Busca: regalos, súper, vacunas, pagos…" value="${esc(q)}" autocomplete="off">
      ${groups.map(([g, items]) => `<div class="nav-group" style="margin:18px 4px 10px">${g}</div>
        <div class="guide-grid">${items.map(([r, e, n, d, can]) => `<a class="card guide-card" href="#/${r}">
          <div class="row" style="gap:12px;align-items:flex-start"><span class="guide-ico">${icon(r) || e}</span>
            <div class="grow" style="min-width:0"><div class="bold" style="font-size:16.5px">${esc(n)}</div><div class="small muted" style="font-weight:600">${esc(d)}</div></div><span class="guide-go">›</span></div>
          <ul class="guide-list">${can.map(c => `<li>${esc(c)}</li>`).join('')}</ul></a>`).join('')}</div>`).join('') || '<div class="card empty">No encontramos nada con eso 🤔</div>'}
      ${q ? '' : `<div class="nav-group" style="margin:22px 4px 10px">Herramientas que están en todos lados</div>
        <div class="guide-grid">${TOOLS.map(([e, n, d]) => `<div class="card guide-card static"><div class="row" style="gap:12px;align-items:flex-start"><span class="guide-ico">${e}</span><div class="grow"><div class="bold">${esc(n)}</div><div class="small muted" style="font-weight:600">${esc(d)}</div></div></div></div>`).join('')}</div>
        <p class="center tiny faint mt">💡 En cada sección, el botoncito <b>ⓘ</b> junto al título te recuerda para qué sirve.</p>`}`;
  },
  after(root) {
    const i = root.querySelector('#guide-q'); if (!i) return;
    i.addEventListener('input', () => { q = i.value; const pos = i.selectionStart; hooksRerender(); });
  }
};
let hooksRerender = () => { };
export const setRerender = (fn) => { hooksRerender = fn; };

// ⓘ junto al título de cada sección
export function injectInfo(view, route) {
  if (route === 'guia' || S.guest) return;
  const g = guideFor(route); if (!g) return;
  const h1 = view.querySelector('.page-head h1'); if (!h1 || h1.querySelector('.info-btn')) return;
  const b = document.createElement('button'); b.type = 'button'; b.className = 'info-btn'; b.dataset.act = 'sectionInfo'; b.dataset.r = g[0]; b.setAttribute('aria-label', '¿Para qué sirve?'); b.textContent = 'i';
  h1.appendChild(b);
}
export function sectionInfo(r) {
  const g = byRoute[r]; if (!g) return;
  const [, e, n, d, can] = g;
  modal({
    title: `${e} ${esc(n)}`, body: `<p class="bold" style="font-size:16px;margin-top:0">${esc(d)}</p><div class="nav-group mt">Aquí puedes</div><ul class="guide-list big">${can.map(c => `<li>${esc(c)}</li>`).join('')}</ul>`,
    foot: `<div class="modal-foot"><a class="btn ghost" href="#/guia" data-close>📖 Ver todo lo que hay</a><button type="button" class="btn primary" data-close>Entendido</button></div>`
  });
}
