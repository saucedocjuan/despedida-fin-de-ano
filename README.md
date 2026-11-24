# ¡Despedida de Fin de Año!

Una **tarjeta** interactiva (no un sitio con secciones), con tono informal y evento **de día**: cuenta regresiva, datos mínimos, confirmación de asistencia y lista de quién confirmó. El panel del organizador queda aparte en `admin.html`.

**Stack:** HTML + CSS + JavaScript (sin build), Supabase (Auth + PostgreSQL), alojamiento estático en Vercel o Netlify.

---

## Qué incluye (versión simplificada)

- Tarjeta con la foto que enviaste, título **¡Despedida de Fin de Año!**, mensaje breve y cuenta regresiva en vivo.
- Una línea con fecha, hora, dirección y enlace a **Maps**.
- Formulario compacto: nombre, apellido, teléfono (opcional) y **ASISTIRÉ / NO PODRÉ ASISTIR**.
- Confirmación guardada en PostgreSQL, mensaje de confirmación y enlace privado para modificar/cancelar.
- Bloque **¡Ya confirmaron!** con nombres y total de confirmados. Se actualiza solo cada 10 segundos y al volver a la pestaña.
- Panel separado en `admin.html`: login, altas/ediciones/bajas, filtros, estadísticas y exportación CSV para Excel.

> Se quitaron música, sobre sorpresa, agenda, compartir/calendario y animaciones excesivas, según tu pedido.

---

## Estructura

```
invitacion-fin-de-ano/
├── index.html                 Invitación pública
├── admin.html                 Panel del organizador
├── assets/
│   ├── config.js              Datos del evento y claves (EDITAR)
│   ├── supabase.js            Inicialización del cliente
│   ├── logica.js              Validaciones y cálculos
│   ├── app.js                 Lógica pública
│   ├── admin.js               Lógica del panel
│   ├── styles.css             Diseño responsive
│   └── foto.jpg               Foto de portada (la queenviaste)
├── sql/
│   └── schema.sql             Tablas, RLS, RPC y triggers
├── tests/                     Pruebas y mocks (NO publicar)
└── README.md
```

---

## Instalación

### 1. Crear el proyecto en Supabase

1. Entrá a [supabase.com](https://supabase.com) y creá un proyecto nuevo.
2. En **SQL Editor → New query**, pegá todo `sql/schema.sql` y ejecutalo.
3. El script crea:
   - `public.invitados` (id, nombre, apellido, telefono, acompanantes, estado, token, fechas).
   - `public.admins` (solo usuarios autorizados).
   - Funciones RPC seguras para confirmar, consultar, editar y cancelar.
   - Row Level Security: el público **no puede leer ni escribir la tabla directamente**.

### 2. Configurar `assets/config.js`

Reemplazá:

```js
SUPABASE_URL: "https://TU-PROYECTO.supabase.co",
SUPABASE_ANON_KEY: "TU_ANON_KEY",
```

por los valores de **Supabase → Settings → API**. La clave `anon` es pública: la seguridad está en las políticas RLS, no en ocultarla.

Después completá los datos reales del evento:

```js
fechaISO, finISO, fechaTexto, horaInicio, lugar, mapa, anfitrion, bienvenida
```

Por defecto quedó **jueves 31 de diciembre de 2026, 13:00 a 18:00** (de día). Cambiá `fechaISO`, `finISO`, `fechaTexto` y `horaInicio` si hace falta.

La foto ya está en `assets/foto.jpg` y configurada en `FOTO_FONDO`. Si querés cambiarla, reemplazá el archivo manteniendo el nombre o actualizá la ruta.

### 3. Crear el usuario organizador

1. En Supabase: **Authentication → Users → Add user**. Usá un correo real y una contraseña fuerte.
2. En **SQL Editor**, ejecutá (reemplazá el correo por el tuyo):

```sql
insert into public.admins (user_id, email)
select id, email from auth.users where email = 'TU_EMAIL_REAL';
```

3. Entrá a `admin.html` con ese correo y contraseña.

### 4. Probar en local

```bash
python -m http.server 4173
```

Abrí `http://127.0.0.1:4173/index.html` y `http://127.0.0.1:4173/admin.html`.

---

## Publicación

### Vercel

1. Subí la carpeta a un repositorio de GitHub.
2. En Vercel: **Add New → Project** y elegí el repo.
3. **Build Command:** vacío. **Output Directory:** `.` (raíz del proyecto).
4. Deploy. El enlace resultante es el que compartís por WhatsApp.

### Netlify

1. **Add new site → Import an existing project**.
2. Build command: vacío. Publish directory: `.`.
3. Deploy.

No hay variables de entorno necesarias: `config.js` ya contiene la URL y la clave anon. **No subas la carpeta `tests/` a producción**: contiene mocks con datos de prueba.

---

## Seguridad y reglas

- **Sin duplicados:** índice único sobre nombre + apellido + teléfono normalizados (sin tildes, minúsculas y solo dígitos). Si alguien vuelve a cargar los mismos datos, recibe un aviso y se le sugiere usar su enlace privado.
- **Edición/cancelación segura:** cada confirmación genera un `token` UUID imposible de adivinar. Solo quien tiene `?editar=TOKEN` puede modificar ese registro. El enlace se muestra al confirmar y el organizador puede copiarlo desde el panel.
- **Privacidad:** la lista pública solo muestra nombre y apellido. Teléfono y token nunca se exponen. Quienes responden "NO PODRÉ ASISTIR" o cancelan no aparecen en la lista pública.
- **Panel privado:** Supabase Auth (correo + contraseña) + política RLS que verifica pertenencia a `public.admins`.
- **Persistencia:** los datos viven en PostgreSQL; no se pierden al recargar la página.

---

## Foto

La imagen que enviaste se guardó como `assets/foto.jpg` (1280×720, optimizada a ~135 KB). La portada aplica una capa oscura encima para que el texto se lea bien. Si querés cambiar el tono, editá `.hero.con-foto::before` en `assets/styles.css`.

---

## Verificación

```bash
node tests/etapa1.mjs
node tests/generar-mock.mjs
node tests/generar-mock-admin.mjs
node tests/final.mjs
```

Los archivos `tests/mock*.html` simulan Supabase para probar la interfaz sin credenciales. Son solo desarrollo.

Checklist manual:

1. La cuenta regresiva baja de segundo en segundo.
2. El botón de Maps abre la dirección correcta.
3. Confirmar como ASISTIRÉ agrega el nombre y actualiza los totales.
4. Repetir el mismo formulario muestra el aviso de duplicado.
5. El enlace privado permite editar y cancelar.
6. "NO PODRÉ ASISTIR" no aparece en la lista pública.
7. El panel requiere login, lista todos los estados y exporta CSV.
8. En celular, todo se ve en una columna y se puede usar con el pulgar.
