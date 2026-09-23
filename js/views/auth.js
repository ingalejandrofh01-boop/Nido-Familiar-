// Inicio de sesión, crear/unirse a familia y elegir perfil
import { S } from '../store.js';
import { esc, toast, modal, EMOJIS_PEOPLE, COLORS } from '../ui.js';
import { APP_NAME } from '../config.js';

const $app = () => document.getElementById('app');
let enterFamily = () => { };
export const setEnterFamily = (fn) => { enterFamily = fn; };

const errMsg = (e) => {
  const c = e.code || '';
  if (c.includes('invalid-credential') || c.includes('wrong-password') || c.includes('user-not-found')) return 'Correo o contraseña incorrectos';
  if (c.includes('email-already-in-use')) return 'Ese correo ya tiene cuenta, inicia sesión';
  if (c.includes('weak-password')) return 'La contraseña debe tener al menos 6 caracteres';
  if (c.includes('popup-closed')) return 'Se cerró la ventana de Google';
  if (c.includes('permission-denied')) return 'Sin permiso (revisa las reglas de Firestore)';
  return e.message || 'Algo salió mal';
};

export function renderLogin(mode = 'login') {
  $app().innerHTML = `<div class="auth"><div class="card auth-card deco view-enter">
    <div class="auth-logo">🪺</div>
    <h1>${esc(APP_NAME)}</h1>
    <p class="muted bold">El lugar de nuestra familia: fechas, regalos, recuerdos y más.</p>
    ${S.isDemo ? `
      <button class="btn primary lg block mt" data-act="demoLogin">✨ Entrar a la demo</button>
      <p class="small muted mt">Estás en <b>modo demo</b>: los datos viven sólo en este navegador. Configura Firebase en <code>js/config.js</code> para usarla con toda tu familia.</p>
    ` : `
      <button class="btn lg block mt" data-act="google"><svg width="20" height="20" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg> Continuar con Google</button>
      <div class="divider">o con correo</div>
      <form data-submit="${mode === 'login' ? 'emailLogin' : 'emailSignup'}" style="text-align:left">
        ${mode === 'signup' ? `<div class="field"><label>Tu nombre</label><input class="input" name="name" required placeholder="Ej. Alejandro"></div>` : ''}
        <div class="field"><label>Correo</label><input class="input" name="email" type="email" required autocomplete="email"></div>
        <div class="field"><label>Contraseña</label><input class="input" name="pass" type="password" required minlength="6" autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}"></div>
        <button class="btn primary block">${mode === 'login' ? 'Entrar' : 'Crear cuenta'}</button>
      </form>
      <p class="small mt">${mode === 'login' ? '¿No tienes cuenta? <a class="link" data-act="toSignup">Crear una</a>' : '¿Ya tienes cuenta? <a class="link" data-act="toLogin">Inicia sesión</a>'}</p>
    `}
  </div></div>`;
}

export function renderFamilySetup() {
  $app().innerHTML = `<div class="auth"><div class="card auth-card deco view-enter" style="width:min(520px,100%)">
    <div class="auth-logo">🏡</div>
    <h2 style="font-size:26px;font-weight:900">¡Hola, ${esc(S.user?.name || '')}!</h2>
    <p class="muted bold">Crea el nido de tu familia o únete con el código que te compartieron.</p>
    <form data-submit="createFamily" class="mt" style="text-align:left">
      <div class="field"><label>Nombre de la familia</label><input class="input" name="name" required placeholder="Familia Fernández"></div>
      <button class="btn primary block">🪺 Crear nuestra familia</button>
    </form>
    <div class="divider">o</div>
    <form data-submit="joinFamily" style="text-align:left">
      <div class="field"><label>Código de invitación</label><input class="input" name="code" required placeholder="ABC123" style="text-transform:uppercase;letter-spacing:4px;font-weight:900;text-align:center"></div>
      <button class="btn block">🔑 Unirme con código</button>
    </form>
    <p class="small mt"><a class="link" data-act="logout">Cerrar sesión</a></p>
  </div></div>`;
}

export function claimProfile() {
  const unclaimed = S.data.members.filter(m => !m.uid);
  $app().innerHTML = `<div class="auth"><div class="card auth-card deco view-enter" style="width:min(560px,100%)">
    <div class="auth-logo">👋</div>
    <h2 style="font-size:26px;font-weight:900">¿Quién eres en ${esc(S.family?.name || 'la familia')}?</h2>
    ${unclaimed.length ? `<p class="muted bold">Si ya te agregaron, elige tu perfil:</p>
      <div class="list mt" style="text-align:left">${unclaimed.map(m => `<div class="item clickable" data-act="claim" data-id="${m.id}"><span class="avatar" style="--c:${m.color}">${esc(m.emoji || m.name[0])}</span><div class="grow bold">${esc(m.name)}<div class="small muted">${esc(m.relation || '')}</div></div>›</div>`).join('')}</div>
      <div class="divider">o crea tu perfil</div>` : `<p class="muted bold">Crea tu perfil para empezar.</p>`}
    <form data-submit="newProfile" style="text-align:left">
      <div class="frow"><div class="field"><label>Nombre</label><input class="input" name="name" required value="${esc(S.user?.name || '')}"></div>
      <div class="field"><label>Parentesco</label><input class="input" name="relation" placeholder="Mamá, hijo, tía…"></div></div>
      <div class="field"><label>Cumpleaños</label><input class="input" type="date" name="birthday"></div>
      <button class="btn primary block">Listo, entrar</button>
    </form>
  </div></div>`;
}

export function demoInfo() {
  modal({
    title: '🧪 Estás en modo demo', body: `<p>Todo lo que ves funciona, pero se guarda <b>sólo en este navegador</b>.</p>
    <p>Para usarla con toda tu familia en tiempo real, crea un proyecto gratis en Firebase y pega la configuración en <code>js/config.js</code>. El archivo <b>README.md</b> tiene los pasos.</p>`,
    foot: `<div class="modal-foot"><button type="button" class="btn" data-act="resetDemo">↺ Reiniciar datos demo</button><button type="button" class="btn primary" data-close>Entendido</button></div>`
  });
}

export const actions = {
  async demoLogin() { await S.db.signInDemo(); },
  async google() { try { await S.db.signInGoogle(); } catch (e) { toast('⚠️ ' + errMsg(e)); } },
  toSignup() { renderLogin('signup'); },
  toLogin() { renderLogin('login'); },
  async emailLogin(f) { const d = Object.fromEntries(new FormData(f)); try { await S.db.signInEmail(d.email, d.pass); } catch (e) { toast('⚠️ ' + errMsg(e)); } },
  async emailSignup(f) { const d = Object.fromEntries(new FormData(f)); try { await S.db.signUpEmail(d.email, d.pass, d.name); toast('📧 Te enviamos un correo para confirmar tu cuenta'); } catch (e) { toast('⚠️ ' + errMsg(e)); } },
  async logout() { await S.db.signOut(); },
  async resetDemo() { await S.db.resetDemo(); },
  async createFamily(f) {
    const name = new FormData(f).get('name').trim(); if (!name) return;
    try {
      await S.db.createFamily(name);
      await S.db.add('members', { name: S.user.name || 'Yo', uid: S.user.uid, email: S.user.email || '', role: 'admin', relation: '', emoji: '😎', color: COLORS[0], points: 0, photo: S.user.photo || '' });
      toast('🎉 ¡Familia creada!');
      await enterFamily();
    } catch (e) { toast('⚠️ ' + errMsg(e)); }
  },
  async joinFamily(f) {
    const code = new FormData(f).get('code').trim().toUpperCase();
    try {
      const inv = await S.db.lookupInvite(code);
      if (!inv) { toast('⚠️ Código no encontrado'); return; }
      if (!S.isDemo && S.user && S.user.verified === false) { await S.db.reloadUser(); }
      if (!S.isDemo && S.db.user && S.db.user.verified === false) {
        toast('📧 Primero confirma tu correo: te enviamos un enlace. Luego vuelve a intentar.');
        try { await S.db.resendVerification(); } catch { }
        return;
      }
      await S.db.joinFamily(inv.familyId);
      toast(`🎉 Te uniste a ${inv.familyName}`);
      await enterFamily();
    } catch (e) {
      if ((e.code || '').includes('permission-denied')) toast(`🔒 Tu correo (${S.user?.email || ''}) no está autorizado en esa familia. Pídele al administrador que lo agregue.`);
      else toast('⚠️ ' + errMsg(e));
    }
  },
  async claim(el) {
    await S.db.update('members', el.dataset.id, { uid: S.user.uid, email: S.user.email || '', photo: S.data.members.find(m => m.id === el.dataset.id)?.photo || S.user.photo || '' });
  },
  async newProfile(f) {
    const d = Object.fromEntries(new FormData(f));
    const n = S.data.members.length;
    await S.db.add('members', { name: d.name, relation: d.relation, birthday: d.birthday, uid: S.user.uid, email: S.user.email || '', role: 'adulto', emoji: EMOJIS_PEOPLE[n % EMOJIS_PEOPLE.length], color: COLORS[n % COLORS.length], points: 0, photo: S.user.photo || '' });
  }
};
