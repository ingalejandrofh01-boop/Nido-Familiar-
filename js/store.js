// Estado global compartido entre vistas
export const S = {
  db: null, user: null, family: null, me: null, isDemo: false,
  data: { members: [], events: [], exchanges: [], albums: [], photos: [], shopping: [], chores: [], expenses: [], messages: [], notes: [], inventory: [], backgrounds: [], rewards: [] },
  subs: {},          // suscripciones de la vista actual
  route: { name: 'inicio', params: [] }
};
export const hooks = { rerender() { }, go() { }, setPageTheme() { }, celebrate() { } };

export const members = () => [...S.data.members].sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || (a.createdAt || 0) - (b.createdAt || 0));
export const member = (id) => S.data.members.find(m => m.id === id);
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
