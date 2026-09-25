// ☰ Menú "Más" (celular)
import { S } from '../store.js';
import { esc } from '../ui.js';
import { THEMES } from '../themes.js';
import { unreadDMs } from './dm.js';
import { icon } from '../icons.js';

const GROUPS = [
  ['Principal', [['agenda', '📅', 'Agenda'], ['fotos', '📖', 'Libro familiar'], ['intercambios', '🎁', 'Regalos']]],
  ['Juntos', [['fiestas', '🎉', 'Fiestas'], ['encuestas', '🗳️', 'Encuestas'], ['ruleta', '🎡', 'Ruleta'], ['retos', '🏅', 'Retos'], ['viajes', '✈️', 'Viajes'], ['recetas', '🍲', 'Recetario'], ['capsula', '⏳', 'Cápsula del tiempo'], ['mapa', '🗺️', 'Mapa de recuerdos'], ['tesoro', '🏴‍☠️', 'Tesoro'], ['arbol', '🌳', 'Árbol genealógico'], ['ubicacion', '📍', '¿Dónde andamos?']]],
  ['Casa', [['menu', '🍽️', 'Menú semanal'], ['listas', '🛒', 'Compras'], ['tareas', '🧹', 'Tareas y puntos'], ['mascotas', '🐾', 'Mascotas'], ['dinero', '💰', 'Dinero'], ['metas', '🎯', 'Metas'], ['documentos', '🪪', 'Documentos'], ['notas', '📝', 'Notas'], ['donde', '🔎', '¿Dónde está?']]],
  ['Nido', [['familia', '👨‍👩‍👧‍👦', 'Familia'], ['resumen', '🎁', 'Resumen del año'], ['ajustes', '⚙️', 'Ajustes']]]
];
export default {
  render() {
    const t = THEMES[document.body.dataset.theme]; const u = unreadDMs();
    return `<div class="page-head"><div><h1>Más</h1><p>${esc(S.family?.name || '')} · ${t ? t.emoji + ' ' + t.name : ''}</p></div></div>
      <a class="card guide-banner" href="#/guia"><span style="font-size:26px">📖</span><div class="grow"><div class="bold">¿Qué hay en Nido?</div><div class="tiny muted">Para qué sirve cada sección, en pocas palabras</div></div><span class="guide-go">›</span></a>
      ${GROUPS.map(([g, items]) => `<div class="nav-group" style="margin:14px 4px 8px">${g}</div><div class="quick" style="grid-template-columns:repeat(3,minmax(0,1fr))">${items.map(([r, e, l]) => `<a href="#/${r}" style="padding:16px 6px;font-size:12.5px;position:relative"><span class="more-ico">${icon(r) || e}</span>${l}${r === 'chat' && u ? `<span class="dm-count" style="position:absolute;top:8px;right:10px">${u}</span>` : ''}</a>`).join('')}</div>`).join('')}`;
  }
};
