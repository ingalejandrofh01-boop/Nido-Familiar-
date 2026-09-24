// ⚙️ Ajustes: temas, efectos, fondos personalizados, familia y cuenta
import { S, hooks, isAdmin, isAdult } from '../store.js';
import { esc, modal, toast, compressImage, pickFiles, confirmBox } from '../ui.js';
import { THEMES, renderScene, seasonFor } from '../themes.js';
import { setIntensity } from '../fx.js';
import { askPermission } from '../notifications.js';
import { openOnboarding } from '../onboarding.js';
import { soundOn, toggleSound } from '../reveal.js';
import { createBackup, readBackupFile, restoreBackup, backupSummary } from '../backup.js';

const lsGet = k => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { } };
let preview = null;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone;
async function applyTheme(id) {
  if (lsGet('nido-theme-local')) lsSet('nido-theme-local', id);
  else if (isAdult()) await S.db.updateFamily({ theme: id });
  else lsSet('nido-theme-local', id);
  toast(`🎨 Tema: ${id === 'auto' ? 'Automático' : THEMES[id].name}`); hooks.rerender();
}

export default {
  theme() { return preview; },
  render() {
    const local = lsGet('nido-theme-local');
    const famTheme = S.family?.theme || 'auto';
    const current = local || famTheme;
    const eff = S.family?.effects ?? 1;
    const localEff = lsGet('nido-effects-local');
    const season = seasonFor();
    const opt = (id, label, emoji, sceneId) => `<button class="theme-opt ${current === id ? 'on' : ''}" data-act="pickTheme" data-id="${id}">
      <div class="prev">${renderScene(sceneId, 'tp' + id)}</div><div class="lbl">${emoji} ${label}</div></button>`;
    return `
      <div class="page-head"><div><h1>Ajustes</h1><p>Haz que el nido se sienta como en casa</p></div></div>
      <section class="card deco"><div class="card-title"><h3>🎨 Tema y temporada</h3></div>
        <p class="small muted bold">En <b>Automático</b> el diseño cambia solo: Navidad en diciembre, Halloween en octubre, Día de Muertos, Fiestas Patrias… y el día del cumpleaños de alguien, ¡fiesta! 🎂 Toca un tema para verlo.</p>
        <div class="theme-grid mt">${opt('auto', `Automático (hoy: ${THEMES[season].name})`, '🔄', season)}${Object.entries(THEMES).map(([id, t]) => opt(id, t.name, t.emoji, id)).join('')}</div>
        <div class="row wrap mt"><span class="small bold muted">Aplicar a:</span>
          <div class="seg"><button class="${local ? '' : 'on'}" data-act="scope" data-s="family" ${isAdult() ? '' : 'disabled'}>👨‍👩‍👧‍👦 Toda la familia</button><button class="${local ? 'on' : ''}" data-act="scope" data-s="local">📱 Sólo este dispositivo</button></div></div>
        ${preview ? `<div class="row mt"><span class="chip accent">👀 Vista previa: ${THEMES[preview].name}</span><button class="btn sm primary" data-act="applyPreview">Usar este tema</button><button class="btn sm" data-act="endPreview">Salir</button></div>` : ''}
      </section>

      <div class="grid g2 mt">
        <section class="card deco"><div class="card-title"><h3>✨ Efectos animados</h3></div>
          <p class="small muted bold">Nieve, pétalos, murciélagos, fuegos artificiales… Tip: toca el fondo en temas de fiesta 🎆</p>
          <div class="seg mt">${[[0, '🚫 Apagados'], [0.5, '🌙 Suaves'], [1, '🌟 Completos'], [1.6, '🤯 Épicos']].map(([v, l]) => `<button class="${Number(localEff ?? eff) === v ? 'on' : ''}" data-act="effects" data-v="${v}">${l}</button>`).join('')}</div>
          <p class="tiny muted mt-s">Se guarda en este dispositivo (útil si un teléfono es más lento).</p></section>

        <section class="card deco"><div class="card-title"><h3>🖼️ Fondo con foto de la familia</h3></div>
          <p class="small muted bold">Pon una foto de ustedes como fondo del tema <b>${THEMES[document.body.dataset.theme]?.name || ''}</b> (se ve para todos con ese tema).</p>
          <div class="row wrap mt"><button class="btn primary" data-act="bgUpload">📷 Elegir foto</button>${S.data.backgrounds.some(b => b.id === document.body.dataset.theme) ? '<button class="btn" data-act="bgRemove">Quitar foto</button>' : ''}</div>
          <p class="tiny muted mt-s">También puedes hacerlo desde cualquier foto del libro familiar → “Usar de fondo”.</p></section>
      </div>

      ${standalone() ? '' : `<section class="card deco mt install-card"><span class="big-ico">📲</span><div class="grow"><div class="bold" style="font-size:17px">Instala Nido en tu teléfono</div>
        <div class="small muted bold">${isIOS() ? 'En iPhone: toca <b>Compartir</b> <span style="font-size:16px">⎋</span> en Safari → <b>Agregar a pantalla de inicio</b>. Así se abre como app y recibe notificaciones.' : S.installPrompt ? 'Se abre a pantalla completa, más rápida y con notificaciones.' : 'En Android: menú ⋮ de Chrome → <b>Instalar app</b> / <b>Agregar a pantalla principal</b>.'}</div></div>
        ${S.installPrompt ? '<button class="btn primary" data-act="install">Instalar</button>' : ''}</section>`}
      <section class="card deco mt install-card"><span class="big-ico">🔔</span><div class="grow"><div class="bold" style="font-size:17px">Notificaciones</div><div class="small muted bold">${'Notification' in window ? (Notification.permission === 'granted' ? '✅ Activadas en este dispositivo' : Notification.permission === 'denied' ? 'Bloqueadas: actívalas en los ajustes del navegador para este sitio' : 'Recibe avisos de sorteos, eventos, tareas y cumpleaños') : 'Instala la app para poder activarlas'}</div></div>
        ${'Notification' in window && Notification.permission === 'default' ? '<button class="btn primary" data-act="perm">Activar</button>' : ''}</section>
      <div class="grid g2 mt">
        <section class="card deco"><div class="card-title"><h3>🏡 Familia</h3></div>
          <div class="item"><span class="emoji">🪺</span><div class="grow"><div class="bold">${esc(S.family?.name || '')}</div><div class="tiny muted">Código de invitación: <b>${esc(S.family?.code || '')}</b></div></div>${isAdmin() ? '<button class="btn sm" data-act="rename">Renombrar</button>' : ''}</div>
          <a class="btn block mt" href="#/familia">👨‍👩‍👧‍👦 Integrantes y permisos</a></section>
        <section class="card deco"><div class="card-title"><h3>👤 Tu cuenta</h3></div>
          <div class="item"><span class="emoji">📧</span><div class="grow"><div class="bold">${esc(S.me?.name || '')}</div><div class="tiny muted">${esc(S.user?.email || '')}</div></div></div>
          <div class="row wrap mt"><a class="btn primary" href="#/avatar/${S.me?.id}">🐾 Mi avatar</a><a class="btn" href="#/perfil/${S.me?.id}">Mi perfil</a>${S.isDemo ? '<button class="btn" data-act="resetDemo">↺ Reiniciar demo</button>' : ''}<button class="btn danger" data-act="logout">Cerrar sesión</button></div></section>
      </div>
      <section class="card deco mt"><div class="card-title"><h3>🔊 Sonidos y vibración</h3></div>
        <p class="small muted bold">Pequeños sonidos al palomear, abonar o girar la ruleta, y vibración suave en el celular.</p>
        <div class="row wrap mt" style="gap:8px"><label class="chip chip-btn"><input type="checkbox" data-change="toggleSnd" ${soundOn() ? 'checked' : ''}> 🔊 Sonidos</label><label class="chip chip-btn"><input type="checkbox" data-change="toggleHap" ${lsGet('nido-haptics') !== '0' ? 'checked' : ''}> 📳 Vibración</label><button class="btn sm ghost" data-act="welcome">👋 Ver la bienvenida otra vez</button></div></section>
      <section class="card deco mt"><div class="card-title"><h3>💾 Respaldo de la familia</h3></div>
        <p class="small muted bold">Descarga un <b>.zip</b> con todo: fotos del libro (por capítulo), recetas en texto y los datos de la app para restaurarlos si algún día hace falta. Guárdalo en tu compu, Drive o iCloud.</p>
        <div class="row wrap mt" style="gap:8px"><label class="chip chip-btn"><input type="checkbox" id="bk-full" checked> 📸 Fotos en alta calidad</label><label class="chip chip-btn"><input type="checkbox" id="bk-priv" checked> 🔒 Incluir mis datos privados</label></div>
        <div class="row wrap mt" style="gap:8px"><button class="btn primary" data-act="backup">⬇️ Descargar respaldo</button>${isAdmin() ? '<button class="btn" data-act="restore">♻️ Restaurar un respaldo</button>' : ''}<span class="small bold muted" id="bk-status"></span></div>
        <p class="tiny muted mt-s">${lsGet('nido-last-backup') ? `Último respaldo desde este dispositivo: ${new Date(+lsGet('nido-last-backup')).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}` : 'Aún no has descargado un respaldo desde este dispositivo.'}</p></section>
      <p class="center tiny faint mt">Nido · hecho con ❤️ para la familia ${S.isDemo ? '· modo demo' : '· conectado a Firebase'}</p>`;
  },
  actions: {
    toggleSnd(el) { if (el.checked !== soundOn()) toggleSound(); toast(el.checked ? '🔊 Sonidos activados' : '🔇 Sin sonidos'); },
    toggleHap(el) { lsSet('nido-haptics', el.checked ? '1' : '0'); try { el.checked && navigator.vibrate && navigator.vibrate(30); } catch { } },
    welcome() { openOnboarding(); },
    async backup(el) {
      const st = document.getElementById('bk-status'); el.disabled = true;
      try {
        const r = await createBackup({ fullPhotos: document.getElementById('bk-full')?.checked, includePrivate: document.getElementById('bk-priv')?.checked, onProgress: t => { if (st) st.textContent = t; } });
        try { localStorage.setItem('nido-last-backup', String(Date.now())); } catch { }
        if (st) st.textContent = `✅ Listo · ${(r.size / 1048576).toFixed(1)} MB · ${r.photos} fotos`; toast('💾 Respaldo descargado');
      } catch (e) { console.error(e); toast('⚠️ No se pudo crear el respaldo: ' + e.message); if (st) st.textContent = ''; }
      el.disabled = false;
    },
    async restore() {
      const [file] = await pickFiles({ accept: '.zip,.json,application/zip,application/json' }); if (!file) return;
      let data; try { data = await readBackupFile(file); } catch (e) { toast('⚠️ ' + e.message); return; }
      modal({
        title: '♻️ Restaurar respaldo', body: `<p class="bold">Respaldo de <b>${esc(data.family?.name || '')}</b> del ${new Date(data.createdAt).toLocaleString('es-MX')}${data.by ? ' (lo hizo ' + esc(data.by) + ')' : ''}.</p>
          <p class="small muted">${backupSummary(data)}</p><p class="small bold">Se vuelven a crear todos los registros del respaldo. Lo que agregaron después se conserva; lo que se editó vuelve a como estaba en el respaldo.</p>`,
        submitLabel: '♻️ Restaurar',
        submit: async () => { toast('♻️ Restaurando…'); const n = await restoreBackup(data, { onProgress: t => toast(t) }); toast(`✅ Listo: ${n} registros restaurados`); }
      });
    },
    pickTheme(el) {
      const id = el.dataset.id;
      if (id === 'auto') { preview = null; applyTheme('auto'); return; }
      preview = id; hooks.rerender();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    applyPreview() { const id = preview; preview = null; applyTheme(id); },
    endPreview() { preview = null; hooks.rerender(); },
    async scope(el) {
      const cur = lsGet('nido-theme-local') || S.family?.theme || 'auto';
      if (el.dataset.s === 'local') lsSet('nido-theme-local', cur);
      else { lsSet('nido-theme-local', null); }
      hooks.rerender();
    },
    async install() { const p = S.installPrompt; if (!p) return; p.prompt(); await p.userChoice; S.installPrompt = null; hooks.rerender(); },
    async perm() { await askPermission(); hooks.rerender(); },
    effects(el) { const v = Number(el.dataset.v); lsSet('nido-effects-local', String(v)); setIntensity(v); hooks.rerender(); },
    async bgUpload() {
      const [f] = await pickFiles(); if (!f) return;
      const id = document.body.dataset.theme; toast('⏳ Procesando foto…');
      const data = await compressImage(f, 1600, 0.78, S.isDemo ? 400000 : 850000);
      await S.db.set('backgrounds', id, { data, updatedAt: Date.now() }); toast('🖼️ ¡Fondo listo!');
    },
    async bgRemove() { await S.db.remove('backgrounds', document.body.dataset.theme); toast('Fondo quitado'); },
    rename() { modal({ title: 'Nombre de la familia', body: `<div class="field"><input class="input" name="n" value="${esc(S.family?.name || '')}"></div>`, submit: async d => { if (!d.n.trim()) return false; await S.db.updateFamily({ name: d.n.trim() }); } }); },
    async logout() { if (await confirmBox('¿Cerrar sesión?')) await S.db.signOut(); },
    async resetDemo() { if (await confirmBox('Se borrarán tus cambios y volverán los datos de ejemplo.')) await S.db.resetDemo(); }
  }
};
