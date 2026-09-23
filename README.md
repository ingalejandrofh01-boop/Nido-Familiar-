# 🪺 Nido · App familiar

App web para la familia: **intercambios con sorteo secreto**, cumpleaños, agenda, **libro de fotos**, compras, tareas con puntos, dinero, chat con avisos, notas, "¿dónde está todo?" y botón SOS.
El diseño **cambia solo con la temporada** (Navidad con nieve y luces, Halloween con murciélagos y niebla, Día de Muertos con papel picado y cempasúchil, Fiestas Patrias con fuegos artificiales, etc.) y el día del cumpleaños de alguien se pone en modo fiesta 🎂.

Es HTML + CSS + JavaScript puro, sin compilación. Se sube tal cual a GitHub Pages y usa Firebase como base de datos.

---

## 1. Pruébala ya (modo demo)

Sin configurar nada, la app arranca en **modo demo** con datos de ejemplo guardados sólo en tu navegador.

> ⚠️ Usa módulos de JavaScript, así que **no funciona abriendo el archivo con doble clic** (`file://`). Ábrela con un servidor:
> - VS Code → extensión **Live Server** → clic derecho en `index.html` → *Open with Live Server*, o
> - en la carpeta: `npx serve` o `python -m http.server 8000` y entra a `http://localhost:8000`

## 2. Súbela a GitHub Pages

1. Crea un repositorio en GitHub (por ejemplo `nido-familia`).
2. Sube **todo el contenido de esta carpeta** (que `index.html` quede en la raíz).
3. En el repo: **Settings → Pages → Build and deployment → Source: Deploy from a branch → `main` / `(root)` → Save**.
4. En 1–2 minutos estará en `https://TU-USUARIO.github.io/nido-familia/`.

## 3. Conecta Firebase (para usarla con toda la familia)

1. Entra a <https://console.firebase.google.com> → **Agregar proyecto** (el plan gratuito *Spark* alcanza).
2. **Compilación → Authentication → Comenzar** y activa:
   - **Google**
   - **Correo electrónico/contraseña**
3. En Authentication → **Configuración → Dominios autorizados** agrega `TU-USUARIO.github.io`.
4. **Compilación → Firestore Database → Crear base de datos** → modo producción → región `nam5` (o la más cercana).
5. En Firestore → pestaña **Reglas**, borra lo que hay, pega el contenido de **`firestore.rules`** y **Publicar**.
6. **Configuración del proyecto (⚙️) → Tus apps → Web `</>`** → registra la app y copia el objeto `firebaseConfig`.
7. Pégalo en **`js/config.js`**, haz commit y listo. La app sale del modo demo automáticamente.

**Primer uso:** tú entras, creas la familia y te conviertes en administrador. En *Familia* verás un **código de invitación** para mandarlo por WhatsApp; cada quien entra con su cuenta, pone el código y elige su perfil. A los peques sin celular los agregas tú como integrantes.

### ¿Y las fotos?
Para no requerir el plan de pago de Firebase Storage, las fotos se **comprimen en el teléfono** y se guardan en Firestore (miniatura + versión grande de ~1600 px). El plan gratuito da 1 GB, que alcanza para varios miles de fotos. Si algún día quieren fotos en resolución original, se puede migrar a Firebase Storage.

---

## Qué incluye

| Módulo | Qué hace |
|---|---|
| 🏠 Inicio | Saludo, cuenta regresiva a la próxima fiesta, eventos de hoy, avisos fijados, próximo intercambio, cumpleaños, recuerdo del día, ranking |
| 🎁 Intercambios | **Sala del sorteo en vivo** (se ve quién está listo, cuenta regresiva y animación sincronizada para todos), estilo por temporada (cambia todo el diseño de la página), presupuesto, reglas, parejas que no pueden tocarse, **sorteo secreto**, regalo animado que se abre para revelar, listas de deseos, revelación para quien no tiene cuenta, "revelar a todos" el día del evento |
| 📅 Agenda | Calendario mensual, citas, escuela, viajes de varios días, repeticiones (diario, semanal, mensual, anual), cumpleaños y aniversarios automáticos |
| 📖 Libro familiar | Capítulos con portada, fotos tipo polaroid, visor, **libro con páginas que se voltean en 3D**, usar una foto como fondo del tema |
| 🛒 Compras | Listas compartidas en tiempo real (Súper, Farmacia, Casa, personalizadas) |
| 🧹 Tareas | Responsable, puntos, tareas que se repiten, ranking y **premios canjeables** |
| 💰 Dinero | **Mis finanzas (privadas para cada quien):** cuentas, ingresos, gastos, transferencias, categorías que se crean solas y se adivinan por la descripción, presupuestos con alertas, metas de ahorro, gráficas y resumen del mes. **Familiar (adultos):** gastos compartidos, presupuesto y cuentas entre familiares |
| 🔔 Notificaciones | Campanita con la actividad de la familia en tiempo real, banners dentro de la app, avisos en el teléfono (con permiso), recordatorios del día (cumpleaños, eventos, tareas) |
| 🔒 Privado | Notas y eventos "sólo yo lo veo" y finanzas personales: Firebase sólo deja leerlos a su dueño |
| 💬 Chat | Mensajes, **avisos fijados**, "llegué a casa", compartir ubicación |
| 📝 Notas / 🔎 ¿Dónde está? | Wi-Fi, contactos, seguros (con notas ocultas), e inventario de dónde se guardan las cosas |
| 🐾 Avatares | Creador de avatar animado con volumen y sombreado 3D: 29 animalitos (gato, perro, zorro, conejo, oso, panda, koala, león, tigre, pingüino, búho, rana, cerdito, ratón, unicornio, lobo, mapache, ardilla, elefante, jirafa, chango, vaca, borrego, pollito, dragón, ajolote, jaguar, perezoso, llama), pestañas, colores de pelaje/detalles/marcas (o cualquier color), patrones, 8 tipos de ojos y su color, cejas, 7 expresiones, chapitas, 14 sombreros, 7 lentes/maquillajes, 7 accesorios de cuello, fondos y 7 animaciones. En cada temporada se ponen solos su accesorio (gorro navideño, sombrero de bruja, flores de Muertos…) y el día de su cumpleaños ¡llevan corona! |
| 🎄 Formas de revelar | Cada quien elige cómo descubre a su amigo secreto: abrir un regalo, romper una esfera navideña, pegarle a una piñata, rascar un boleto dorado o abrir una carta con sello; con sonido y vibración |
| 🛍️ Deseos inteligentes | Pega un link de Amazon, Mercado Libre, Liverpool… y se trae la foto y el nombre; precio, prioridad (❤️ a ❤️❤️❤️) y detalles como talla o color. **Apartar en secreto**: todos ven qué ya está apartado, menos el festejado |
| 🐾 Mascotas | Perfil con avatar animado (o foto), cuidados del día por turnos, vacunas y desparasitación con avisos, veterinario con llamada/WhatsApp, comida que avisa antes de acabarse, historial de peso y cumpleaños en la agenda |
| ☁️ Sincronización | Indicador de "Todo guardado", "Guardando…" o "Sin conexión · N cambios esperando"; sin internet todo sigue funcionando y se sube solo al volver la señal |
| 🎉 Fiestas y posadas | Confirmación (voy / tal vez / no) con cuántos van, "¿quién trae qué?" con lista típica según la fiesta (posada, carne asada, cena de Navidad…), ubicación con Maps y Waze, invitación por WhatsApp, cuenta regresiva; aparece en la agenda y en Inicio |
| 🎡 Ruleta familiar | "¿Quién lava los trastes?", "¿Qué cenamos?"… con integrantes u opciones; el giro se ve en vivo en todos los teléfonos, no repite al último si quieres y queda anotado con conteo |
| 🍽️ Menú semanal | Comida, cena (y desayuno) de cada día con quién cocina; sugiere platillos del recetario y arma la lista del súper con los ingredientes |
| 💾 Respaldo | En Ajustes: descarga un .zip con las fotos por capítulo, las recetas en texto y todos los datos; el administrador puede restaurarlo |
| 💌 Amigo secreto | Mensajes anónimos: el que regala pregunta pistas sin revelar quién es |
| 🍲 Recetario | Recetas con foto y autor, modo cocina paso a paso (pantalla encendida), favoritas, ingredientes directo a la lista de compras |
| ⏳ Cápsula del tiempo | Cartas y fotos que sólo se abren en su fecha, con animación y aviso ese día |
| 🌳 Árbol genealógico | Papás y parejas, abuelos y bisabuelos (también en memoria 🕊️), dibujado por generaciones |
| 🗳️ Encuestas | Votación en tiempo real, varias respuestas o anónimas, fecha de cierre |
| ✈️ Viajes | Itinerario por día, maleta compartida, gastos divididos, notas; se agrega a la agenda |
| 🏅 Retos | Hábitos diarios o metas acumuladas, ranking y puntos al cumplir |
| 📍 Ubicación | Opcional: cada quien comparte 1 h, 8 h o siempre; mapa con avatares |
| 🔒 Mensajes privados | Chats uno a uno que sólo ven los dos participantes |
| 👨‍👩‍👧‍👦 Familia | Perfiles con foto, cumpleaños, contacto de emergencia, info médica, **roles** (Administrador, Adulto, Adolescente, Niño) |
| 🚨 SOS | Llamar al 911, alerta a la familia con ubicación, mandar por WhatsApp, llamar directo |
| ⚙️ Ajustes | Tema automático o fijo (para todos o sólo tu teléfono), intensidad de efectos, fondo con foto propia |

**Temporadas automáticas (México):** Año Nuevo (31 dic–6 ene), Invierno, Amor y Amistad (1–16 feb), Primavera, Día de las Madres (1–12 may), Verano, Fiestas Patrias (1–16 sep), Otoño, Halloween (15–30 oct), Día de Muertos (31 oct–3 nov), Navidad (1–30 dic) y Cumpleaños (el día de cada quien). Las fechas están en `js/themes.js` (`SEASONS`).

**Se instala como app:** en el celular, abre la página en Chrome/Safari → *Agregar a pantalla de inicio*.

## Estructura

```
index.html          → página principal
css/styles.css      → todo el diseño
js/config.js        → ⚙️ TU configuración de Firebase
js/app.js           → arranque, sesión, rutas y temas
js/db.js            → Firebase / modo demo
js/themes.js        → temporadas, escenas y adornos
js/fx.js            → partículas (nieve, hojas, murciélagos, fuegos artificiales…)
js/avatar.js        → dibujo de los avatares de animalitos (SVG)
js/views/*.js       → cada sección de la app
firestore.rules     → reglas de seguridad
manifest.json, sw.js, icons/ → para instalarla como app
```
