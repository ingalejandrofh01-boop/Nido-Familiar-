// Estado global compartido entre vistas
export const S = {
  db: null, user: null, family: null, me: null, isDemo: false,
  data: { members: [], events: [], exchanges: [], albums: [], photos: [], shopping: [], chores: [], expenses: [], messages: [], notes: [], inventory: [], backgrounds: [], rewards: [], notifications: [],
    recipes: [], capsules: [], polls: [], trips: [], challenges: [], locations: [], dms: [], pets: [], parties: [], wheels: [], spins: [], menus: [], bills: [], famgoals: [], docs: [], myDocs: [], hunts: [], places: [],
    myEvents: [], myNotes: [], accounts: [], txns: [], myCats: [], budgets: [], goals: [] },
  guest: false,      // 🎟️ sesión de invitado (sólo ve lo que le compartieron)
  subs: {},          // suscripciones de la vista actual
  route: { name: 'inicio', params: [] }
};
export const hooks = { rerender() { }, go() { }, setPageTheme() { }, celebrate() { } };

export const members = () => S.data.members.filter(m => !m.treeOnly).sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || (a.createdAt || 0) - (b.createdAt || 0));
export const member = (id) => S.data.members.find(m => m.id === id) || (typeof id === 'string' && id.startsWith('g_') ? guestPeople().find(g => g.id === id) : undefined);
// 🎟️ Invitados de fuera: viven dentro de cada evento compartido (doc.guests[uid]); su id es "g_<uid>"
export const guestPerson = (uid, g = {}) => ({ id: 'g_' + uid, uid, name: g.name || 'Invitado', emoji: g.emoji || '🙂', color: g.color || '#94a3b8', guest: true, relation: 'Invitado' });
export function guestPeople(doc) {
  const docs = doc ? [doc] : [...(S.data.exchanges || []), ...(S.data.parties || [])];
  const m = new Map(); for (const d of docs) for (const [uid, g] of Object.entries(d?.guests || {})) m.set('g_' + uid, guestPerson(uid, g));
  return [...m.values()];
}
// Todas las personas de un evento: la familia + sus invitados
export const peopleOf = (doc) => [...members().filter(m => !m.guest), ...(doc ? guestPeople(doc) : [])];
export const isAdmin = () => S.me?.role === 'admin';
export const isAdult = () => ['admin', 'adulto'].includes(S.me?.role);

// Suscripción ligada a la vista actual (se limpia al cambiar de ruta)
export function useSub(key, path, opts = {}) {
  if (!S.subs[key]) {
    const entry = { data: null };
    entry.unsub = S.db.watch(path, opts, rows => { entry.data = rows; hooks.rerender(); });
    S.subs[key] = entry;
  }
  return S.subs[key].data;
}
export function clearSubs() {
  for (const k in S.subs) { try { S.subs[k].unsub(); } catch { } }
  S.subs = {};
}

// Limpiezas (timers) por render
let cleanups = [];
export const onCleanup = (fn) => cleanups.push(fn);
export const runCleanups = () => { cleanups.forEach(f => { try { f(); } catch { } }); cleanups = []; };

// ---------- Datos privados (sólo los ve su dueño) ----------
export const priv = (col) => `private/${S.user.uid}/${col}`;
export const allEvents = () => [...S.data.events, ...S.data.myEvents.map(e => ({ ...e, _private: true }))];
export const findEvent = (id) => allEvents().find(e => e.id === id);
export const allNotes = () => [...S.data.notes, ...S.data.myNotes.map(n => ({ ...n, _private: true }))];

// ---------- Notificaciones ----------
// to: 'all' | [memberIds]. Se guardan en la familia y cada quien ve las suyas.
export async function notify({ to = 'all', title, body = '', link = '', icon = '🔔', type = 'info' }) {
  if (S.guest) return; // los invitados no ven ni escriben en las notificaciones de la familia
  try {
    if (Array.isArray(to)) to = to.filter(id => !String(id).startsWith('g_'));
    const recipients = to === 'all' ? 'all' : [...new Set(to)].filter(id => id && id !== S.me?.id);
    if (Array.isArray(recipients) && !recipients.length) return;
    await S.db.add('notifications', { to: recipients, title, body, link, icon, type, from: S.me?.id || '', createdAt: Date.now() });
  } catch (e) { console.warn('notify', e); }
}
