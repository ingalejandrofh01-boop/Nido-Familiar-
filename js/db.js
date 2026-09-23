// ============================================================
//  Capa de datos: Firebase (Auth + Firestore) o MODO DEMO local.
//  El resto de la app sólo habla con este archivo.
// ============================================================
import { firebaseConfig } from './config.js';
import { seedDemo } from './demo-data.js';

const FB_VER = '10.12.2';
const FB = `https://www.gstatic.com/firebasejs/${FB_VER}`;

export const isDemo = !firebaseConfig.apiKey;

const uid6 = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
export const newId = uid6;

// ---------------- Almacenamiento seguro (demo) ----------------
const LS_KEY = 'nido-demo-v7';
let mem = null;
function load() {
  if (mem) return mem;
  try { mem = JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch { mem = null; }
  if (!mem) { mem = seedDemo(); persist(); }
  return mem;
}
function persist() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(mem)); }
  catch (e) { console.warn('No se pudo guardar localmente (quizá fotos muy pesadas)', e); }
}

function applyQuery(rows, opts = {}) {
  let out = rows;
  if (opts.where) {
    const [f, op, v] = opts.where;
    out = out.filter(r => op === '==' ? r[f] === v : op === '!=' ? (f in r && r[f] !== v) : op === 'in' ? v.includes(r[f]) : op === 'array-contains' ? (r[f] || []).includes(v) : true);
  }
  if (opts.orderBy) {
    const [f, dir = 'asc'] = opts.orderBy;
    out = [...out].sort((a, b) => (a[f] > b[f] ? 1 : a[f] < b[f] ? -1 : 0) * (dir === 'desc' ? -1 : 1));
  }
  if (opts.limit) out = out.slice(0, opts.limit);
  return out;
}

// ---------------- Implementación DEMO ----------------
function demoBackend() {
  const watchers = new Set();
  const famWatchers = new Set();
  const authCbs = new Set();
  let user = null;
  try { if (sessionStorage.getItem('nido-demo-auth')) user = load().user; } catch { }

  const col = (path) => { const d = load(); d.cols[path] = d.cols[path] || {}; return d.cols[path]; };
  const emit = (path) => {
    for (const w of watchers) if (w.path === path) w.fire();
  };
  const emitFam = () => famWatchers.forEach(cb => cb({ ...load().family }));

  return {
    get user() { return user; },
    onAuth(cb) { authCbs.add(cb); setTimeout(() => cb(user), 0); return () => authCbs.delete(cb); },
    async signInDemo() {
      user = load().user;
      try { sessionStorage.setItem('nido-demo-auth', '1'); } catch { }
      authCbs.forEach(cb => cb(user));
    },
    async signInGoogle() { return this.signInDemo(); },
    async signInEmail() { return this.signInDemo(); },
    async signUpEmail() { return this.signInDemo(); },
    async signOut() {
      user = null;
      try { sessionStorage.removeItem('nido-demo-auth'); } catch { }
      authCbs.forEach(cb => cb(null));
    },
    async getMyFamilyId() { return 'demo'; },
    async createFamily() { return 'demo'; },
    async lookupInvite(code) { return code.toUpperCase() === load().family.code ? { familyId: 'demo', familyName: load().family.name } : null; },
    async joinFamily() { },
    setFamily() { },
    watchFamily(cb) { famWatchers.add(cb); setTimeout(() => cb({ ...load().family }), 0); return () => famWatchers.delete(cb); },
    async updateFamily(data) { Object.assign(load().family, data); persist(); emitFam(); },
    watch(path, opts, cb) {
      const w = { path, fire: () => cb(applyQuery(Object.entries(col(path)).map(([id, v]) => ({ id, ...v })), opts)) };
      watchers.add(w); setTimeout(w.fire, 0);
      return () => watchers.delete(w);
    },
    async list(path) { return Object.entries(col(path)).map(([id, v]) => ({ id, ...v })); },
    async get(path, id) { const v = col(path)[id]; return v ? { id, ...v } : null; },
    async add(path, data) { const id = uid6(); col(path)[id] = { ...data, createdAt: data.createdAt || Date.now() }; persist(); emit(path); return id; },
    async set(path, id, data) { col(path)[id] = { ...data }; persist(); emit(path); },
    async update(path, id, data) {
      const doc = { ...(col(path)[id] || {}) };
      for (const [k, v] of Object.entries(data)) {
        if (!k.includes('.')) { doc[k] = v; continue; }
        const parts = k.split('.'); let o = doc;
        parts.slice(0, -1).forEach(p => { o[p] = { ...(o[p] || {}) }; o = o[p]; }); o[parts.at(-1)] = v;
      }
      col(path)[id] = doc; persist(); emit(path);
    },
    async remove(path, id) { delete col(path)[id]; persist(); emit(path); },
    async resetDemo() { try { localStorage.removeItem(LS_KEY); } catch { } mem = null; location.reload(); }
  };
}

// ---------------- Implementación FIREBASE ----------------
async function firebaseBackend() {
  const [{ initializeApp }, A, F] = await Promise.all([
    import(`${FB}/firebase-app.js`),
    import(`${FB}/firebase-auth.js`),
    import(`${FB}/firebase-firestore.js`)
  ]);
  const app = initializeApp(firebaseConfig);
  const auth = A.getAuth(app);
  const fs = F.initializeFirestore(app, { localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }) });
  let fid = null;
  let user = null;
  const mapUser = u => u ? { uid: u.uid, name: u.displayName || (u.email || '').split('@')[0], email: (u.email || '').toLowerCase(), photo: u.photoURL, verified: u.emailVerified } : null;
  const famPath = (p) => `families/${fid}/${p}`;
  const toQuery = (path, opts = {}) => {
    const c = F.collection(fs, famPath(path));
    const parts = [];
    if (opts.where) parts.push(F.where(...opts.where));
    if (opts.orderBy) parts.push(F.orderBy(...opts.orderBy));
    if (opts.limit) parts.push(F.limit(opts.limit));
    return parts.length ? F.query(c, ...parts) : c;
  };
  const clean = (o) => JSON.parse(JSON.stringify(o)); // quita undefined

  return {
    get user() { return user; },
    onAuth(cb) { return A.onAuthStateChanged(auth, u => { user = mapUser(u); cb(user); }); },
    async signInGoogle() { await A.signInWithPopup(auth, new A.GoogleAuthProvider()); },
    async signInEmail(email, pass) { await A.signInWithEmailAndPassword(auth, email, pass); },
    async signUpEmail(email, pass, name) {
      const cred = await A.createUserWithEmailAndPassword(auth, email, pass);
      if (name) await A.updateProfile(cred.user, { displayName: name });
      try { await A.sendEmailVerification(cred.user); } catch (e) { console.warn(e); }
      user = mapUser(cred.user); if (name) user.name = name;
    },
    async signOut() { fid = null; await A.signOut(auth); },
    async resendVerification() { if (auth.currentUser) await A.sendEmailVerification(auth.currentUser); },
    async reloadUser() { if (auth.currentUser) { await auth.currentUser.reload(); await auth.currentUser.getIdToken(true); user = mapUser(auth.currentUser); } return user; },
    async getMyFamilyId() {
      const s = await F.getDoc(F.doc(fs, 'users', user.uid));
      fid = s.exists() ? s.data().familyId || null : null;
      return fid;
    },
    setFamily(id) { fid = id; },
    async createFamily(name) {
      const ref = F.doc(F.collection(fs, 'families'));
      const code = Math.random().toString(36).slice(2, 8).toUpperCase();
      await F.setDoc(ref, { name, code, createdBy: user.uid, memberUids: [user.uid], roles: { [user.uid]: 'admin' }, allowedEmails: user.email ? [user.email] : [], theme: 'auto', createdAt: Date.now() });
      await F.setDoc(F.doc(fs, 'invites', code), { familyId: ref.id, familyName: name });
      await F.setDoc(F.doc(fs, 'users', user.uid), { familyId: ref.id });
      fid = ref.id;
      return fid;
    },
    async lookupInvite(code) {
      const s = await F.getDoc(F.doc(fs, 'invites', code.trim().toUpperCase()));
      return s.exists() ? s.data() : null;
    },
    async joinFamily(familyId) {
      await F.updateDoc(F.doc(fs, 'families', familyId), { memberUids: F.arrayUnion(user.uid), [`roles.${user.uid}`]: 'adulto' });
      await F.setDoc(F.doc(fs, 'users', user.uid), { familyId });
      fid = familyId;
    },
    watchFamily(cb) { return F.onSnapshot(F.doc(fs, 'families', fid), s => cb(s.exists() ? { id: s.id, ...s.data() } : { denied: true }), err => { console.error(err); cb({ denied: true }); }); },
    async updateFamily(data) { await F.updateDoc(F.doc(fs, 'families', fid), clean(data)); },
    watch(path, opts, cb) {
      return F.onSnapshot(toQuery(path, opts), snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
        err => { console.error('watch', path, err); cb([]); });
    },
    async list(path) { const s = await F.getDocs(F.collection(fs, famPath(path))); return s.docs.map(d => ({ id: d.id, ...d.data() })); },
    async get(path, id) { const s = await F.getDoc(F.doc(fs, famPath(path), id)); return s.exists() ? { id: s.id, ...s.data() } : null; },
    async add(path, data) { const r = await F.addDoc(F.collection(fs, famPath(path)), clean({ ...data, createdAt: data.createdAt || Date.now() })); return r.id; },
    async set(path, id, data) { await F.setDoc(F.doc(fs, famPath(path), id), clean(data)); },
    async update(path, id, data) { await F.updateDoc(F.doc(fs, famPath(path), id), clean(data)); },
    async remove(path, id) { await F.deleteDoc(F.doc(fs, famPath(path), id)); }
  };
}

export async function createBackend() {
  if (isDemo) return demoBackend();
  return firebaseBackend();
}
