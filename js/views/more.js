// ☰ Menú "Más" (celular)
import { S } from '../store.js';
import { esc } from '../ui.js';
import { THEMES } from '../themes.js';

const ITEMS = [
  ['chat', '💬', 'Chat y avisos'], ['listas', '🛒', 'Compras'], ['tareas', '🧹', 'Tareas y puntos'], ['dinero', '💰', 'Dinero'],
  ['notas', '📝', 'Notas'], ['donde', '🔎', '¿Dónde está?'], ['familia', '👨‍👩‍👧‍👦', 'Familia'], ['ajustes', '⚙️', 'Ajustes']
];
export default {
  render() {
    const adult = ['admin', 'adulto'].includes(S.me?.role);
    const t = THEMES[document.body.dataset.theme];
    return `<div class="page-head"><div><h1>Más</h1><p>${esc(S.family?.name || '')} · ${t ? t.emoji + ' ' + t.name : ''}</p></div></div>
      <div class="quick" style="grid-template-columns:repeat(2,minmax(0,1fr))">${ITEMS.filter(i => !i[3] || adult).map(([r, e, l]) => `<a href="#/${r}" style="padding:22px 8px;font-size:14px"><span style="font-size:34px">${e}</span>${l}</a>`).join('')}</div>`;
  }
};
