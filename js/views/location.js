// 📍 Ubicación familiar (opcional): cada quien decide si comparte y por cuánto tiempo
import { S, hooks, member, members, onCleanup } from '../store.js';
import { esc, avatar, toast, timeAgo, confirmBox } from '../ui.js';

let watchId = null, last = null, map = null, mapEl = null, markers = {};
const mine = () => S.data.locations.find(l => l.id === S.me?.id);
const sharingNow = (l) => l && l.sharing && (!l.until || l.until > Date.now());
const dist = (a, b) => { const R = 6371e3, t = Math.PI / 180, dLat = (b.lat - a.lat) * t, dLng = (b.lng - a.lng) * t; const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.sin(dLng / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };

// Se llama al iniciar y cada vez que cambia mi estado: prende/apaga el GPS
export function syncLocationSharing() {
  const me = mine();
  if (sharingNow(me)) {
    if (watchId == null && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(p => {
        const pt = { lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy) };
        if (last && dist(last, pt) < 40 && Date.now() - last.at < 60000) return;
        last = { ...pt, at: Date.now() };
        S.db.set('locations', S.me.id, { ...mine(), ...pt, at: Date.now(), sharing: true }).catch(() => { });
      }, () => { }, { enableHighAccuracy: true, maximumAge: 30000, timeout: 20000 });
    }
  } else if (watchId != null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
  if (me && me.sharing && me.until && me.until <= Date.now()) S.db.update('locations', me.id, { sharing: false }).catch(() => { });
}

function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  return new Promise((res, rej) => {
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'; document.head.appendChild(css);
    const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'; s.onload = () => res(window.L); s.onerror = rej; document.head.appendChild(s);
  });
}

export default {
  render() {
    const me = mine(), on = sharingNow(me);
    const shared = S.data.locations.filter(sharingNow).filter(l => member(l.id) && l.lat);
    const off = members().filter(m => m.uid && !shared.some(l => l.id === m.id));
    return `<div class="page-head"><div><h1>¿Dónde andamos?</h1><p>Sólo se ve la ubicación de quien decide compartirla 📍</p></div></div>
      <section class="card deco mb"><div class="row wrap" style="gap:14px">${avatar(S.me, 'lg')}<div class="grow"><div class="bold" style="font-size:17px">${on ? '🟢 Estás compartiendo tu ubicación' : '⚪ No estás compartiendo'}</div>
        <div class="small muted bold">${on ? (me.until ? `Hasta las ${new Date(me.until).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}` : 'Hasta que lo apagues') + ' · se actualiza mientras tengas la app abierta' : 'Tu familia no puede ver dónde estás.'}</div></div>
        <div class="row wrap">${on ? '<button class="btn danger" data-act="stop">Dejar de compartir</button>' : '<button class="btn primary" data-act="share" data-h="1">📍 1 hora</button><button class="btn" data-act="share" data-h="8">8 horas</button><button class="btn" data-act="share" data-h="0">Siempre</button>'}</div></div></section>
      <section class="card deco loc-map-card"><div id="locmap" class="loc-map">${shared.length ? '<div class="empty small">Cargando mapa…</div>' : '<div class="empty"><div class="big">🗺️</div>Nadie está compartiendo su ubicación ahorita</div>'}</div></section>
      <div class="grid g2 mt">
        <section class="card deco"><div class="card-title"><h3>📍 Compartiendo</h3></div><div class="list">${shared.map(l => { const m = member(l.id); return `<a class="item clickable" target="_blank" rel="noopener" href="https://maps.google.com/?q=${l.lat},${l.lng}" style="text-decoration:none">${avatar(m, 'sm')}<div class="grow"><div class="bold">${esc(m.name)}</div><div class="tiny muted">Actualizado ${timeAgo(l.at)} · precisión ±${l.acc || '?'} m</div></div><span class="chip">🗺️ Abrir</span></a>`; }).join('') || '<div class="empty small">Nadie por ahora</div>'}</div></section>
        <section class="card deco"><div class="card-title"><h3>🙈 No compartiendo</h3></div><div class="list">${off.map(m => { const l = S.data.locations.find(x => x.id === m.id); return `<div class="item">${avatar(m, 'sm')}<div class="grow"><div class="bold">${esc(m.name)}</div><div class="tiny muted">${l?.at ? 'Última vez ' + timeAgo(l.at) : 'Nunca ha compartido'}</div></div></div>`; }).join('') || '<div class="empty small">¡Todos están compartiendo!</div>'}</div></section>
      </div>
      <p class="tiny faint center mt">🔒 La ubicación sólo la ve tu familia y cada quien la puede apagar cuando quiera. En celular, se actualiza mientras la app esté abierta.</p>`;
  },
  after(root) {
    const shared = S.data.locations.filter(sharingNow).filter(l => member(l.id) && l.lat);
    const box = root.querySelector('#locmap'); if (!box || !shared.length) return;
    loadLeaflet().then(L => {
      if (!box.isConnected) return;
      box.innerHTML = ''; map = L.map(box, { zoomControl: true, attributionControl: true });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
      const pts = shared.map(l => { const m = member(l.id); const icon = L.divIcon({ className: 'loc-pin', html: `<div class="loc-pin-in">${avatar(m, 'sm')}</div><div class="loc-pin-name">${esc(m.name)}</div>`, iconSize: [44, 60], iconAnchor: [22, 52] }); L.marker([l.lat, l.lng], { icon }).addTo(map); return [l.lat, l.lng]; });
      if (pts.length === 1) map.setView(pts[0], 15); else map.fitBounds(pts, { padding: [40, 40] });
      onCleanup(() => { try { map.remove(); } catch { } });
    }).catch(() => { box.innerHTML = '<div class="empty small">No se pudo cargar el mapa (revisa tu conexión). Usa los botones “Abrir” de abajo.</div>'; });
  },
  actions: {
    async share(el) {
      if (!navigator.geolocation) return toast('Tu dispositivo no permite ubicación');
      const h = Number(el.dataset.h);
      navigator.geolocation.getCurrentPosition(async p => {
        await S.db.set('locations', S.me.id, { lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy), at: Date.now(), sharing: true, until: h ? Date.now() + h * 3600000 : 0 });
        toast('📍 Compartiendo tu ubicación con la familia');
        syncLocationSharing();
      }, () => toast('⚠️ Permite el acceso a tu ubicación en el navegador'), { enableHighAccuracy: true, timeout: 15000 });
    },
    async stop() { if (await confirmBox('¿Dejar de compartir tu ubicación?', 'Dejar de compartir')) { await S.db.update('locations', S.me.id, { sharing: false }); syncLocationSharing(); toast('🙈 Ya no compartes tu ubicación'); } }
  }
};
