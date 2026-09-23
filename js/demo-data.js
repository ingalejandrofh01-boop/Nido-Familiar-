// Datos de ejemplo para el MODO DEMO (se generan relativos a hoy)
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const plus = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };
const md = (d) => `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function fakePhoto(label, emoji, c1, c2) {
  try {
    const c = document.createElement('canvas'); c.width = 640; c.height = 480;
    const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 640, 480); gr.addColorStop(0, c1); gr.addColorStop(1, c2);
    g.fillStyle = gr; g.fillRect(0, 0, 640, 480);
    for (let i = 0; i < 18; i++) { g.globalAlpha = .12; g.fillStyle = '#fff'; g.beginPath(); g.arc(Math.random() * 640, Math.random() * 480, 10 + Math.random() * 60, 0, 7); g.fill(); }
    g.globalAlpha = 1; g.font = '150px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(emoji, 320, 210);
    g.font = 'bold 34px sans-serif'; g.fillStyle = 'rgba(255,255,255,.95)'; g.fillText(label, 320, 380);
    return c.toDataURL('image/jpeg', 0.7);
  } catch { return ''; }
}

export function seedDemo() {
  const y = new Date().getFullYear();
  const now = Date.now();
  const members = {
    m1: { name: 'Alejandro', relation: 'Yo', role: 'admin', uid: 'demo-user', parents: ['m2', 'm3'], birthday: `1995-03-08`, color: '#6366f1', emoji: '😎', phone: '5512345678', points: 120, info: 'Tipo de sangre O+', avatar: { species: 'zorro', fur: '#ec7a32', sec: '#fffaf2', extra: '#3b2a24', pattern: 'ninguno', eyes: 'brillantes', eyeColor: '#1f6feb', brows: 'picaras', mouth: 'picara', blush: true, blushColor: '#ff8fab', head: 'ninguno', face: 'redondos', neck: 'ninguno', acc: '#3a86ff', bg: ['#cde7ff', '#8ec5ff'], anim: 'rebote', seasonal: true } },
    m2: { name: 'Laura', relation: 'Mamá', role: 'adulto', uid: 'demo-laura', partner: 'm3', parents: ['m6', 't1'], birthday: `1968-${md(plus(5))}`, color: '#ec4899', emoji: '👩', phone: '5511112222', points: 95, info: 'Alérgica a la penicilina', avatar: { species: 'gato', fur: '#f3eee9', sec: '#ffffff', extra: '#9d4edd', pattern: 'ninguno', eyes: 'grandes', eyeColor: '#2e9d5b', brows: 'suaves', mouth: 'gatuna', blush: true, blushColor: '#ff8fab', head: 'flor', face: 'ninguno', neck: 'collar', acc: '#ff8fab', bg: ['#ffd6e0', '#ffafcc'], anim: 'corazones', seasonal: true } },
    m3: { name: 'Roberto', relation: 'Papá', role: 'adulto', uid: 'demo-roberto', partner: 'm2', birthday: `1966-11-12`, color: '#0ea5e9', emoji: '👨', phone: '5533334444', points: 80, avatar: { species: 'lobo', fur: '#8d96a3', sec: '#eef0f3', extra: '#4b5260', pattern: 'ninguno', eyes: 'redondos', eyeColor: '#3b2a20', brows: 'decididas', mouth: 'sonrisa', blush: false, blushColor: '#ff8fab', head: 'gorra', face: 'ninguno', neck: 'ninguno', acc: '#1d3557', bg: ['#d8f3dc', '#95d5b2'], anim: 'respirar', seasonal: true } },
    m4: { name: 'Ana', relation: 'Hermana', role: 'adolescente', parents: ['m2', 'm3'], birthday: `2009-12-03`, color: '#f59e0b', emoji: '👧', points: 110, avatar: { species: 'conejo', fur: '#c9a7ff', sec: '#ffffff', extra: '#ffb3c6', pattern: 'ninguno', eyes: 'brillantes', eyeColor: '#7b3fe4', brows: 'ninguna', mouth: 'lengua', blush: true, blushColor: '#ff6b6b', head: 'audifonos', face: 'ninguno', neck: 'ninguno', acc: '#ff8fab', bg: ['#e9d5ff', '#c4a1ff'], anim: 'menear', seasonal: true } },
    m5: { name: 'Luis', relation: 'Hermano', role: 'nino', parents: ['m2', 'm3'], birthday: `2015-${md(plus(19))}`, color: '#10b981', emoji: '👦', points: 60, avatar: { species: 'ajolote', fur: '#ffb3c7', sec: '#ffd9e3', extra: '#ff5d8f', pattern: 'ninguno', eyes: 'felices', eyeColor: '#3b2a20', brows: 'ninguna', mouth: 'risa', blush: true, blushColor: '#ffa94d', head: 'ninguno', face: 'ninguno', neck: 'paliacate', acc: '#e63946', bg: ['#fff3b0', '#ffd166'], anim: 'orejas', seasonal: true } },
    m6: { name: 'Abuela Rosa', relation: 'Abuela', role: 'adulto', partner: 't1', birthday: `1945-10-28`, color: '#a855f7', emoji: '👵', phone: '5555556666', info: 'Toma medicamento a las 9 AM', avatar: { species: 'buho', fur: '#a18a78', sec: '#f5e6cc', extra: '#f2a33a', pattern: 'ninguno', eyes: 'grandes', eyeColor: '#8a5a2b', brows: 'suaves', mouth: 'sonrisa', blush: true, blushColor: '#ff8fab', head: 'ninguno', face: 'monoculo', neck: 'bufanda', acc: '#8338ec', bg: ['#ffe5d9', '#ffb4a2'], anim: 'flotar', seasonal: true } }
  };
  Object.assign(members, {
    t1: { name: 'Abuelo Pedro', relation: 'Abuelo', treeOnly: true, deceased: true, partner: 'm6', birthday: '1940-06-18', emoji: '👴', color: '#64748b' },
    t2: { name: 'Abuelo Manuel', relation: 'Abuelo paterno', treeOnly: true, partner: 't3', birthday: '1938-02-02', emoji: '🧔', color: '#0ea5e9' },
    t3: { name: 'Abuela Carmen', relation: 'Abuela paterna', treeOnly: true, partner: 't2', birthday: '1941-09-09', emoji: '👵', color: '#f97316' }
  });
  members.m3.parents = ['t2', 't3'];
  const photos = {}; const albums = {
    a1: { title: `Navidad ${y - 1}`, subtitle: 'La cena, los regalos y la rosca', theme: 'navidad', cover: '', order: 1, year: y - 1 },
    a2: { title: 'Vacaciones en la playa', subtitle: 'Acapulco, verano', theme: 'verano', cover: '', order: 2, year: y },
    a3: { title: 'Cumpleaños de Luis', subtitle: '¡Ya cumplió 10!', theme: 'cumple', cover: '', order: 3, year: y }
  };
  const P = [
    ['a1', 'La cena de Nochebuena', '🦃', '#7f1d1d', '#14532d'], ['a1', 'Abriendo regalos', '🎁', '#991b1b', '#1e3a8a'], ['a1', 'El árbol de este año', '🎄', '#064e3b', '#1e293b'], ['a1', 'Foto con los abuelos', '👵', '#7c2d12', '#312e81'],
    ['a2', 'Primer día de playa', '🏖️', '#0284c7', '#fbbf24'], ['a2', 'Atardecer increíble', '🌅', '#f97316', '#7c3aed'], ['a2', 'Castillo de arena', '🏰', '#f59e0b', '#0ea5e9'],
    ['a3', 'El pastel', '🎂', '#db2777', '#7c3aed'], ['a3', 'Soplando las velas', '🕯️', '#f59e0b', '#be185d'], ['a3', 'La piñata', '🪅', '#16a34a', '#db2777']
  ];
  P.forEach(([a, cap, e, c1, c2], i) => {
    const thumb = fakePhoto(cap, e, c1, c2);
    photos['p' + i] = { albumId: a, caption: cap, thumb, date: iso(plus(-300 + i * 20)), by: 'm1', createdAt: now - (P.length - i) * 1000 };
    if (!albums[a].cover) albums[a].cover = thumb;
  });

  return {
    user: { uid: 'demo-user', name: 'Alejandro', email: 'demo@nido.app' },
    family: { id: 'demo', name: 'Familia Fernández', code: 'NIDO26', theme: 'auto', effects: 1, budget: 20000, memberUids: ['demo-user'], roles: { 'demo-user': 'admin' }, allowedEmails: ['demo@nido.app', 'laura@ejemplo.com', 'roberto@ejemplo.com'], createdBy: 'demo-user' },
    cols: {
      members,
      events: {
        e1: { title: 'Cena familiar', date: iso(plus(0)), time: '20:00', type: 'familiar', participants: ['m1', 'm2', 'm3', 'm4', 'm5'], location: 'Casa' },
        e2: { title: 'Dentista de Luis', date: iso(plus(1)), time: '16:30', type: 'cita', participants: ['m2', 'm5'] },
        e3: { title: 'Junta escolar', date: iso(plus(3)), time: '08:00', type: 'escuela', participants: ['m3', 'm4'] },
        e4: { title: 'Viaje a Valle de Bravo', date: iso(plus(10)), endDate: iso(plus(12)), type: 'viaje', participants: ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'] },
        e5: { title: 'Aniversario de Mamá y Papá', date: `1994-12-15`, type: 'aniversario', repeat: 'yearly', participants: ['m2', 'm3'] },
        e6: { title: 'Pagar predial', date: iso(plus(6)), type: 'recordatorio', participants: ['m3'] },
        e7: { title: 'Medicina de la abuela', date: iso(plus(0)), time: '09:00', type: 'recordatorio', participants: ['m6'], repeat: 'daily' }
      },
      exchanges: {
        x1: { title: `Intercambio Navideño ${y}`, type: 'navidad', date: `${y}-12-24`, time: '21:00', budget: 500, location: 'Casa de la abuela', participants: ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'], exclusions: [['m2', 'm3']], status: 'open', createdBy: 'demo-user', rules: 'Regalo sorpresa + una carta escrita a mano 💌' },
        x2: { title: 'Amigo secreto de Halloween', type: 'halloween', date: `${y}-10-31`, time: '19:00', budget: 200, location: 'Sala', participants: ['m1', 'm4', 'm5', 'm2'], exclusions: [], status: 'drawn', createdBy: 'demo-user', rules: 'Dulces + algo que dé miedo 👻' }
      },
      'exchanges/x2/assignments': {
        m1: { giverId: 'm1', giverUid: 'demo-user', receiverId: 'm5' }, m4: { giverId: 'm4', receiverId: 'm2' },
        m5: { giverId: 'm5', receiverId: 'm1' }, m2: { giverId: 'm2', receiverId: 'm4' }
      },
      'exchanges/x1/wishes': {
        w1: { memberId: 'm4', text: 'Audífonos inalámbricos', link: '' }, w2: { memberId: 'm4', text: 'Libro de Harry Potter', link: '' },
        w3: { memberId: 'm5', text: 'LEGO de Star Wars', link: '' }, w4: { memberId: 'm2', text: 'Una planta bonita 🌿', link: '' },
        w5: { memberId: 'm6', text: 'Pantuflas calientitas', link: '' }
      },
      'exchanges/x2/anon': { m5: { toId: 'm1', msgs: [{ by: 'giver', text: '¿Te gustan más los dulces o los chocolates? 🍫', at: now - 5400000 }] } },
      'exchanges/x2/wishes': { w1: { memberId: 'm5', text: 'Disfraz de dinosaurio', link: '' }, w2: { memberId: 'm1', text: 'Chocolates amargos', link: '' } },
      albums, photos,
      shopping: {
        s1: { text: 'Leche', list: 'Súper', done: false, by: 'm2' }, s2: { text: 'Huevos', list: 'Súper', done: false, by: 'm2' }, s3: { text: 'Pan', list: 'Súper', done: false, by: 'm4' },
        s4: { text: 'Papel de baño', list: 'Súper', done: true, by: 'm3' }, s5: { text: 'Detergente', list: 'Casa', done: false, by: 'm2' }, s6: { text: 'Paracetamol', list: 'Farmacia', done: false, by: 'm6' }
      },
      chores: {
        c1: { title: 'Sacar la basura', assignee: 'm1', due: iso(plus(0)), done: true, points: 10 },
        c2: { title: 'Lavar los platos', assignee: 'm4', due: iso(plus(0)), done: false, points: 10 },
        c3: { title: 'Limpiar la sala', assignee: 'm3', due: iso(plus(4)), done: false, points: 20 },
        c4: { title: 'Tender la cama', assignee: 'm5', due: iso(plus(0)), done: false, points: 5, repeat: 'daily' },
        c5: { title: 'Regar las plantas', assignee: 'm2', due: iso(plus(0)), done: true, points: 5 },
        c6: { title: 'Pasear al perro', assignee: 'm5', due: iso(plus(0)), done: true, points: 10 }
      },
      expenses: {
        g1: { title: 'Renta', amount: 8500, category: 'casa', paidBy: 'm3', date: iso(plus(-15)), split: [] },
        g2: { title: 'Súper semanal', amount: 2300, category: 'super', paidBy: 'm2', date: iso(plus(-6)), split: [] },
        g3: { title: 'Gasolina', amount: 1100, category: 'transporte', paidBy: 'm1', date: iso(plus(-4)), split: [] },
        g4: { title: 'Pizza del viernes', amount: 650, category: 'comida', paidBy: 'm1', date: iso(plus(-2)), split: ['m1', 'm2', 'm3', 'm4'] },
        g5: { title: 'Luz (CFE)', amount: 780, category: 'servicios', paidBy: 'm3', date: iso(plus(-9)), split: [] },
        g6: { title: 'Internet', amount: 599, category: 'servicios', paidBy: 'm3', date: iso(plus(-10)), split: [] }
      },
      messages: {
        t1: { text: 'El sábado tenemos reunión a las 5 PM 🎉', author: 'm2', pinned: true, createdAt: now - 86400000 },
        t2: { text: '¿Alguien puede pasar por pan de regreso?', author: 'm2', createdAt: now - 7200000 },
        t3: { text: 'Yo paso 🙋‍♂️', author: 'm1', createdAt: now - 7000000 },
        t4: { text: '📍 Llegué a casa', author: 'm4', kind: 'checkin', createdAt: now - 3600000 }
      },
      notes: {
        n1: { title: 'Wi-Fi de la casa', category: 'Casa', body: 'Red: Familia_Fernandez\nContraseña: nido2026!', secret: true },
        n2: { title: 'Plomero', category: 'Casa', body: 'Don Pepe — 55 1234 0000' },
        n3: { title: 'Auto familiar', category: 'Auto', body: 'Placas: ABC-123-D\nSeguro: póliza 998877 (vence marzo)\nPróximo servicio: 45,000 km' },
        n4: { title: 'Viaje Valle de Bravo', category: 'Viaje', body: 'Cabaña reservada, check-in 3 PM\nConfirmación: VB-7788' }
      },
      inventory: {
        i1: { item: 'Llave de repuesto', place: 'Cajón de la entrada', area: 'Casa', emoji: '🔑' },
        i2: { item: 'Escrituras', place: 'Archivero del estudio, 2º cajón', area: 'Documentos', emoji: '📄' },
        i3: { item: 'Herramientas', place: 'Cochera, repisa izquierda', area: 'Casa', emoji: '🧰' },
        i4: { item: 'Focos', place: 'Gabinete de arriba de la cocina', area: 'Casa', emoji: '💡' },
        i5: { item: 'Adornos navideños', place: 'Bodega, cajas rojas', area: 'Temporada', emoji: '🎄' },
        i6: { item: 'Pasaportes', place: 'Caja fuerte del clóset', area: 'Documentos', emoji: '🛂' }
      },
      recipes: {
        r1: { title: 'Mole de la abuela Rosa', emoji: '🍗', category: 'comida', author: 'Abuela Rosa', time: '3 horas', servings: '10 personas', by: 'm6', favs: ['m1', 'm2', 'm4'], cooked: [{ by: 'm2', date: iso(plus(-40)) }],
          ingredients: ['1 pollo en piezas', '4 chiles mulatos', '3 chiles anchos', '2 chiles pasilla', '1 tablilla de chocolate de mesa', '1/2 bolillo dorado', '2 cdas de ajonjolí', 'Canela, clavo y pimienta', 'Sal al gusto'],
          steps: ['Cuece el pollo con cebolla, ajo y sal. Guarda el caldo.', 'Desvena y tuesta los chiles sin quemarlos; remójalos en agua caliente.', 'Fríe el pan, el ajonjolí y las especias.', 'Licúa todo con los chiles y un poco de caldo.', 'Fríe la salsa en una cazuela y agrega el chocolate.', 'Deja hervir a fuego bajo 40 minutos moviendo seguido.', 'Agrega el pollo y sirve con arroz y ajonjolí encima.'], notes: 'El secreto es tostar los chiles apenas unos segundos y mover el mole con cuchara de madera ❤️' },
        r2: { title: 'Pozole rojo', emoji: '🥣', category: 'fiesta', author: 'Laura', time: '2 horas', servings: '8 personas', by: 'm2', favs: ['m3', 'm5'], cooked: [],
          ingredients: ['1 kg de maíz pozolero', '1 kg de carne de cerdo', '5 chiles guajillo', '3 dientes de ajo', 'Lechuga, rábano y orégano', 'Tostadas y limones'], steps: ['Cuece la carne con ajo y sal.', 'Agrega el maíz y deja hervir hasta que floree.', 'Licúa los chiles con ajo y cuélalos al caldo.', 'Sirve con lechuga, rábano, orégano y limón.'], notes: 'Para el 15 de septiembre nunca falla 🇲🇽' },
        r3: { title: 'Flan napolitano', emoji: '🍮', category: 'postre', author: 'Tía Mari', time: '1 hora', servings: '8 rebanadas', by: 'm1', favs: ['m4'], cooked: [],
          ingredients: ['1 lata de leche condensada', '1 lata de leche evaporada', '5 huevos', '1 barra de queso crema', '1 cdita de vainilla', '1 taza de azúcar para el caramelo'], steps: ['Derrite el azúcar hasta hacer caramelo y cubre el molde.', 'Licúa todos los ingredientes.', 'Vierte en el molde y hornea a baño maría 50 min a 180°C.', 'Enfría y refrigera mínimo 4 horas antes de desmoldar.'] }
      },
      capsules: {
        k1: { title: 'Para Luis cuando cumpla 18', message: 'Luis:\nHoy tienes 10 años y no paras de hablar de dinosaurios. Cuando leas esto ya serás todo un adulto. Queremos que sepas lo orgullosos que estamos de ti.\nTe amamos,\nMamá y Papá', to: ['m5', 'm2', 'm3'], openAt: '2033-' + iso(plus(19)).slice(5), by: 'm2', opened: {}, createdAt: now - 86400000 * 20 },
        k2: { title: 'Carta de la familia para el 2030', message: '¿Seguiremos haciendo el intercambio navideño? ¿Ya habrá coches voladores? 😂', to: 'all', openAt: '2030-01-01', by: 'm1', opened: {}, createdAt: now - 86400000 * 60 },
        k3: { title: 'Recuerdo del año pasado', message: 'Hace un año escribimos esto en la cena de Navidad. ¡Qué rápido pasa el tiempo! Gracias por otro año juntos. 🎄', to: 'all', openAt: iso(plus(-1)), by: 'm3', opened: {}, createdAt: now - 86400000 * 366 }
      },
      polls: {
        q1: { question: '🍕 ¿Qué cenamos el sábado?', options: [{ id: 'a', text: 'Pizza' }, { id: 'b', text: 'Tacos' }, { id: 'c', text: 'Sushi' }, { id: 'd', text: 'Hamburguesas' }], votes: { m2: 'b', m3: 'b', m4: 'c', m5: 'a' }, multi: false, anon: false, closesAt: iso(plus(3)), by: 'm2', closed: false, createdAt: now - 7200000 },
        q2: { question: '🏖️ ¿A dónde vamos en vacaciones de invierno?', options: [{ id: 'a', text: 'Playa' }, { id: 'b', text: 'Pueblo mágico' }, { id: 'c', text: 'Montaña' }], votes: { m1: 'a', m2: 'a', m3: 'b', m4: 'a' }, multi: false, anon: false, closesAt: '', by: 'm1', closed: false, createdAt: now - 86400000 * 3 }
      },
      trips: {
        v1: { title: 'Valle de Bravo', emoji: '⛵', destination: 'Valle de Bravo, Edo. Méx.', start: iso(plus(10)), end: iso(plus(12)), budget: 12000, members: ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'], eventId: 'e4', createdBy: 'demo-user', notes: 'Cabaña reservada · check-in 3 PM · confirmación VB-7788',
          itinerary: [{ id: 'i1', day: iso(plus(10)), time: '09:00', text: 'Salida de casa', place: '' }, { id: 'i2', day: iso(plus(10)), time: '13:00', text: 'Comida en el malecón', place: 'Malecón Valle de Bravo' }, { id: 'i3', day: iso(plus(11)), time: '10:00', text: 'Paseo en lancha', place: 'Embarcadero Valle de Bravo' }, { id: 'i4', day: iso(plus(11)), time: '17:00', text: 'Cascada Velo de Novia', place: 'Cascada Velo de Novia' }],
          packing: [{ id: 'p1', text: 'Identificaciones', who: 'm3', done: true }, { id: 'p2', text: 'Chamarras', who: '', done: false }, { id: 'p3', text: 'Bloqueador', who: 'm2', done: true }, { id: 'p4', text: 'Juegos de mesa', who: 'm4', done: false }, { id: 'p5', text: 'Botiquín', who: 'm2', done: false }],
          costs: [{ id: 'g1', text: 'Cabaña 2 noches', amount: 5400, paidBy: 'm3', split: [] }, { id: 'g2', text: 'Gasolina y casetas', amount: 1200, paidBy: 'm1', split: [] }] }
      },
      challenges: {
        ch1: { title: 'Leer 20 minutos', emoji: '📚', kind: 'check', goal: 21, unit: 'días', start: iso(plus(-9)), end: iso(plus(12)), points: 50, participants: ['m1', 'm4', 'm5', 'm2'], awarded: {}, by: 'm2',
          progress: Object.fromEntries(['m1', 'm4', 'm5', 'm2'].map((m, k) => [m, Object.fromEntries(Array.from({ length: 9 - k * 2 }, (_, i) => [iso(plus(-i - 1)), 1]))])) },
        ch2: { title: 'Caminar juntos', emoji: '🚶', kind: 'count', goal: 50, unit: 'km', start: iso(plus(-12)), end: iso(plus(18)), points: 80, participants: ['m1', 'm2', 'm3'], awarded: {}, by: 'm3',
          progress: { m1: { [iso(plus(-3))]: 6.5, [iso(plus(-2))]: 4 }, m2: { [iso(plus(-4))]: 8, [iso(plus(-1))]: 5.2 }, m3: { [iso(plus(-5))]: 3 } } }
      },
      locations: {
        m2: { lat: 19.4326, lng: -99.1332, acc: 20, at: now - 600000, sharing: true, until: 0 },
        m4: { lat: 19.3910, lng: -99.1700, acc: 35, at: now - 1500000, sharing: true, until: now + 3600000 },
        m3: { lat: 19.42, lng: -99.16, acc: 30, at: now - 86400000, sharing: false }
      },
      dms: { 'm1_m2': { members: ['m1', 'm2'], uids: ['demo-user', 'demo-laura'], last: { text: '¿Ya compraste el regalo sorpresa? 🤫', at: now - 1800000, by: 'm2' }, readAt: { m1: now - 7200000 } } },
      'dms/m1_m2/msgs': { d1: { text: 'Hola hijo, ¿cómo te fue hoy?', by: 'm2', at: now - 7300000 }, d2: { text: 'Bien ma, mucho trabajo 😅', by: 'm1', at: now - 7200000 }, d3: { text: '¿Ya compraste el regalo sorpresa? 🤫', by: 'm2', at: now - 1800000 } },
      backgrounds: {},
      'private/demo-user/accounts': {
        a1: { name: 'Cartera', type: 'efectivo', initial: 1200, grad: 2 },
        a2: { name: 'BBVA Nómina', type: 'debito', initial: 8400, grad: 1 },
        a3: { name: 'Tarjeta Nu', type: 'credito', initial: -2300, grad: 4 },
        a4: { name: 'Ahorro', type: 'ahorro', initial: 15000, grad: 0 }
      },
      'private/demo-user/txns': (() => {
        const t = {}; let i = 0; const add = (o) => t['t' + (i++)] = { createdAt: now - i * 1000, ...o };
        for (let m = 0; m < 6; m++) {
          const d = (day) => iso(new Date(new Date().getFullYear(), new Date().getMonth() - m, Math.min(day, m === 0 ? new Date().getDate() : 28)));
          add({ kind: 'ingreso', amount: 14500, note: 'Quincena', category: 'Sueldo', accountId: 'a2', date: d(1) });
          add({ kind: 'ingreso', amount: 14500, note: 'Quincena', category: 'Sueldo', accountId: 'a2', date: d(15) });
          add({ kind: 'gasto', amount: 1800 + m * 90, note: 'Walmart', category: 'Súper', accountId: 'a2', date: d(3) });
          add({ kind: 'gasto', amount: 950 - m * 40, note: 'Gasolina Pemex', category: 'Transporte', accountId: 'a3', date: d(5) });
          add({ kind: 'gasto', amount: 299, note: 'Netflix', category: 'Suscripciones', accountId: 'a3', date: d(7) });
          add({ kind: 'gasto', amount: 640 + m * 55, note: 'Tacos con amigos', category: 'Comida', accountId: 'a1', date: d(9) });
          add({ kind: 'gasto', amount: 420, note: 'Uber', category: 'Transporte', accountId: 'a3', date: d(11) });
          add({ kind: 'gasto', amount: 1100 - m * 60, note: 'Veterinario Max', category: 'Mascota', accountId: 'a2', date: d(12) });
          add({ kind: 'transfer', amount: 2000, note: 'Ahorro quincenal', accountId: 'a2', toAccountId: 'a4', date: d(16) });
          add({ kind: 'gasto', amount: 9000, note: 'Renta', category: 'Casa', accountId: 'a2', date: d(2) });
          add({ kind: 'gasto', amount: 6200, note: 'Aportación a la casa', category: 'Casa', accountId: 'a2', date: d(4) });
          add({ kind: 'transfer', amount: 1700, note: 'Pago tarjeta Nu', accountId: 'a2', toAccountId: 'a3', date: d(20) });
          add({ kind: 'transfer', amount: 1500, note: 'Retiro cajero', accountId: 'a2', toAccountId: 'a1', date: d(6) });
          add({ kind: 'gasto', amount: 780, note: 'Cine y cena', category: 'Diversión', accountId: 'a1', date: d(18) });
        }
        return t;
      })(),
      'private/demo-user/categories': { c1: { name: 'Mascota', kind: 'gasto', emoji: '🐾' } },
      'private/demo-user/budgets': { b1: { category: 'Comida', amount: 1500 }, b2: { category: 'Transporte', amount: 1200 }, b3: { category: 'Súper', amount: 2500 } },
      'private/demo-user/goals': { g1: { name: 'Viaje a Cancún', emoji: '🏝️', target: 25000, saved: 11200, deadline: `${new Date().getFullYear() + 1}-04-01` }, g2: { name: 'Fondo de emergencia', emoji: '🛟', target: 30000, saved: 15000 } },
      'private/demo-user/notes': { pn1: { title: 'Mi NIP del banco', category: 'Otros', body: 'No lo compartas 🙈 1234', secret: true } },
      'private/demo-user/events': { pe1: { title: 'Comprar regalo sorpresa para mamá', date: iso(plus(3)), type: 'recordatorio', participants: ['m1'] } },
      notifications: {
        nt1: { to: 'all', title: 'Nuevo evento: Viaje a Valle de Bravo', body: 'Toda la familia · en 10 días', icon: '✈️', link: 'agenda', from: 'm2', createdAt: now - 3600000 },
        nt2: { to: ['m1'], title: 'Te asignaron: Sacar la basura', body: '+10 puntos', icon: '🧹', link: 'tareas', from: 'm3', createdAt: now - 7200000 },
        nt3: { to: 'all', title: 'Laura subió 3 fotos', body: 'Navidad pasada', icon: '📸', link: 'fotos', from: 'm2', createdAt: now - 86400000 }
      },
      rewards: {
        r1: { title: 'Elegir la película del viernes', cost: 50, emoji: '🎬' },
        r2: { title: '30 min extra de videojuegos', cost: 80, emoji: '🎮' },
        r3: { title: 'Postre especial', cost: 40, emoji: '🍨' }
      }
    }
  };
}
