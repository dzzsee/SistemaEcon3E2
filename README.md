# Sistema de Control de Cuotas Semanales · 3E2

Aplicación web para el control de las cuotas semanales del grupo **3E2**:
**HTML · CSS · JavaScript puro** (sin frameworks, sin build) con la base de datos
en **Cloudflare D1** a través de **Cloudflare Pages Functions**.

Diseño elegante con *glassmorphism*, animaciones suaves, totalmente **responsivo**
y optimizado para **móviles**.

> El frontend es un sitio 100 % estático (se despliega tal cual, no se compila nada).
> Única dependencia: **Cloudflare D1** (SQLite serverless). No hay modo LocalStorage.

---

## Características

- **Lista fija de integrantes**: 20 alumnos ordenados por número de lista.
- **Semanas por calendario**: cada semana va de lunes a domingo.
- **Monto de cuota configurable** por semana (valor por defecto: 20).
- **Estados de pago según lo abonado**:
  - `Pagado` → abonado ≥ cuota
  - `Abonado` → abonado > 0 y < cuota
  - `Deuda` → sin abonos
- **Múltiples abonos por semana**: los abonos parciales se acumulan (ej. 12 + 8 = 20).
- **Balance global**: total recaudado, deuda pendiente, % de cumplimiento y saldo esperado.
- **Panel de alumnos** con historial completo y barra de cumplimiento individual.
- **Exportación**: Excel/CSV y reporte PDF listo para compartir (**jsPDF desde CDN**).
- **Acceso restringido** a 3 administradores: Tutor, Presidente y Tesorero.
- **Se pueden agregar semanas nuevas** desde la pestaña "Exportar".

---

## Stack

| Capa        | Tecnología                                     |
| ----------- | ---------------------------------------------- |
| Frontend    | HTML5 + CSS3 + JavaScript (ES Modules, puro, **sin build**) |
| Backend/API | Cloudflare Pages Functions (`/functions`)      |
| Base de datos | Cloudflare D1 (SQLite serverless)            |
| PDF         | jsPDF + jsPDF-AutoTable (CDN)                  |
| Despliegue  | Cloudflare Pages (wrangler CLI, GitHub Actions o integración Git) |

No hay `npm run build`, no hay Vite, no hay React, no hay Tailwind compilado:
el HTML, CSS y JS que ves en el repo es exactamente lo que se publica.

---

## Estructura del proyecto

```
├── index.html                  # Shell único: login + app. Carga CSS, JS (ESM) y CDN (jsPDF)
├── favicon.svg
├── css/
│   └── styles.css              # Sistema de diseño completo (glassmorphism oscuro)
├── js/
│   ├── utils.js                # helpers: money, fechas, estados, roles, iconos SVG
│   ├── api.js                  # cliente fetch a /api/* + sesión (token)
│   ├── export.js               # generación CSV y PDF (jsPDF desde CDN)
│   ├── app.js                  # controlador: sesión, pestañas, datos, toast
│   └── views/
│       ├── login.js            # login + accesos rápidos
│       ├── dashboard.js        # resumen del estado financiero
│       ├── planilla.js         # matriz miembro × semana
│       ├── abono-modal.js      # modal para registrar abonos
│       ├── alumnos.js          # panel de integrantes expandible
│       └── exportar.js         # exportaciones + agregar semanas
├── functions/                  # API backend (Cloudflare Pages Functions)
│   ├── _lib/
│   │   ├── db.js               # esquema + seeds + utilidades (D1)
│   │   └── auth.js             # tokens firmados HMAC-SHA256
│   └── api/
│       ├── health.js           # health-check (conectividad + D1)
│       ├── login.js            # autenticación de administradores
│       ├── members.js          # lista de integrantes
│       ├── weeks.js            # semanas (GET list | POST crear)
│       ├── payments.js         # abonos (GET historial | POST crear)
│       ├── balance.js          # resumen financiero
│       ├── status.js           # matriz completa para la UI
│       └── report.js           # datos para exportación
├── schema.sql                  # esquema + datos iniciales (D1/SQLite)
├── wrangler.toml               # config Cloudflare (binding D1, output ".")
├── scripts/setup-cloudflare.sh # bootstrap automático de Cloudflare
├── .github/workflows/deploy.yml# CI/CD automático (sin build)
└── .assetsignore               # excluye archivos de config del estático
```

> El directorio raíz es a la vez el *output directory* de Pages: `pages_build_output_dir = "."`.
> `.assetsignore` evita que se suban como estáticos `wrangler.toml`, `README.md`, etc.
> Las funciones de `functions/` se compilan aparte (nunca se sirven como estático).

---

## Primeros pasos (desarrollo local)

Requisitos: **Node.js 18+** (solo para wrangler) y una cuenta de Cloudflare.

```bash
# 1. Instalar wrangler (única dependencia de desarrollo)
npm install

# 2. Levantar el entorno local con Pages Functions + D1 simulado
npm run dev:cf
# → http://localhost:8788
```

La primera vez crea las tablas locales aplicando el esquema:

```bash
# 3. Aplicar schema.sql a la D1 local
npm run db:migrate:local
```

> Los datos locales viven en `.wrangler/` (no se versionan). El arranque también
> auto-siembra tablas/seed vía `functions/_lib/db.js` (idempotente), por lo que
> este paso es opcional si ya arrancó el servidor.

### Credenciales de acceso (por defecto)

| Rol         | Usuario      | PIN  |
| ----------- | ------------ | ---- |
| Tutor(a)    | `tutor`      | 1234 |
| Presidente  | `presidente` | 2345 |
| Tesorero    | `tesorero`   | 3456 |

> El PIN es el mecanismo de acceso. **Cambia estos valores en producción**
> (ver [Cómo cambiar las credenciales y datos](#cómo-cambiar-las-credenciales-y-datos)).

### Secreto de sesión en desarrollo

Crea un archivo `.dev.vars` en la raíz (no se versiona):

```
SESSION_SECRET=valor-largo-y-aleatorio
```

---

## Modelo de datos

| Tabla            | Campos                                                                                      | Propósito                          |
| ---------------- | ------------------------------------------------------------------------------------------- | ---------------------------------- |
| `administradores`| `id`, `usuario`, `pin`, `nombre`, `rol` (`tutor\|presidente\|tesorero`)                    | Los 3 accesos del sistema          |
| `miembros`       | `numero_lista` (PK), `nombre`, `activo`                                                     | Lista fija de integrantes          |
| `semanas`        | `id`, `numero_semana`, `fecha_inicio`, `fecha_fin`, `monto_cuota`, `descripcion`            | Semana de lunes a domingo + cuota  |
| `abonos`         | `id`, `miembro_id`, `semana_id`, `monto`, `fecha_registro`, `registrado_por`, `nota`        | Cada pago/abono (se acumulan)      |

**Cálculo por semana** (backend):
`abonado = Σ montos de abonos` → `deuda = max(0, cuota - abonado)`
→ `estado = pagado | abonado | deuda`.

---

## Endpoints de la API

| Método | Ruta                | Auth | Descripción                                  |
| ------ | ------------------- | ---- | -------------------------------------------- |
| GET    | `/api/health`       | No   | Disponibilidad + `{ ok: true, mode: "d1" }`  |
| POST   | `/api/login`        | No   | Iniciar sesión → `{ token, user }`            |
| GET    | `/api/members`      | No   | Lista de integrantes                          |
| GET    | `/api/weeks`        | No   | Semanas de calendario                         |
| POST   | `/api/weeks`        | Sí   | Crear semana nueva                            |
| POST   | `/api/payments`     | Sí   | Registrar abono                               |
| GET    | `/api/payments`     | Sí   | Historial de abonos                           |
| GET    | `/api/balance`      | Sí   | Resumen financiero                            |
| GET    | `/api/status`       | Sí   | Members + weeks + abonos agrupados (UI)       |
| GET    | `/api/report`       | Sí   | Matriz completa miembro × semana (export)     |

Autenticación: cabecera `Authorization: Bearer <token>` (token firmado HMAC-SHA256
con la variable `SESSION_SECRET`).

---

## Despliegue en Cloudflare (todo lo que necesitas)

La aplicación está lista para desplegarse **completamente desde el repositorio**.
Elige una de las 4 opciones.

### Requisitos previos

- Cuenta en [dash.cloudflare.com](https://dash.cloudflare.com)
- Node.js 18+ instalado
- Autenticación de wrangler: `npx wrangler login` (una vez)

---

### Opción A — Script automático (recomendado)

> En Windows ejecuta este script desde **Git Bash** o **WSL**.

```bash
npx wrangler login
bash scripts/setup-cloudflare.sh
```

El script hace todo automáticamente:
1. Verifica la autenticación de wrangler.
2. Crea la base de datos D1 `sistema-econ-3e2-db` si no existe.
3. Inyecta el `database_id` real en `wrangler.toml`.
4. Aplica `schema.sql` a la D1 remota.
5. Instala wrangler y despliega el sitio (sin build) como `sistema-econ-3e2`.

Después, define el secreto de sesión (una sola vez):

```bash
npx wrangler pages secret put SESSION_SECRET --project-name sistema-econ-3e2
```

> ⚠️ Usa un valor largo y aleatorio, por ejemplo generado con `openssl rand -base64 32`.

---

### Opción B — Manual con wrangler CLI (paso a paso)

```bash
# 1. Inicia sesión (una vez)
npx wrangler login

# 2. Crea la base de datos D1 y copia el database_id que devuelve
npx wrangler d1 create sistema-econ-3e2-db

# 3. Pega el database_id en wrangler.toml:
#    [[d1_databases]]
#    binding = "DB"
#    database_name = "sistema-econ-3e2-db"
#    database_id = "<TU-DATABASE-ID>"

# 4. Aplica el esquema a la D1 remota
npm run db:migrate:remote

# 5. Instala dependencias y despliega el estático
npm install
npx wrangler pages deploy . --project-name sistema-econ-3e2

# 6. Configura el secreto de sesión (una vez)
npx wrangler pages secret put SESSION_SECRET --project-name sistema-econ-3e2
```

Tu app quedará disponible en: `https://sistema-econ-3e2.pages.dev`

---

### Opción C — GitHub Actions (CI/CD automático)

El workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), en cada
`push` a `main` (o con *workflow_dispatch*):
1. Crea la base D1 si no existe e inyecta su `database_id` en `wrangler.toml`.
2. Aplica `schema.sql`.
3. Despliega el estático a Cloudflare Pages (sin build).

Configuración previa en GitHub → **Settings → Secrets and variables → Actions**:

| Secreto                 | Descripción                                   |
| ----------------------- | --------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | Token de API de Cloudflare (ver permisos abajo) |
| `CLOUDFLARE_ACCOUNT_ID` | ID de tu cuenta de Cloudflare                 |

> ⚠️ GitHub Actions no puede crear secretos de Pages automáticamente. La primera vez:
> ```bash
> npx wrangler pages secret put SESSION_SECRET --project-name sistema-econ-3e2
> ```

---

### Opción D — Integración Git de Cloudflare Pages (sin acciones)

En el panel de Cloudflare Pages conecta este repositorio y configura:

- **Build command**: *(vacío — no se compila nada)*
- **Build output directory**: **`/`** (la raíz del repo)
- **D1 binding**: variable `DB` → base de datos `sistema-econ-3e2-db`
- **Variable de entorno** (secreto): `SESSION_SECRET`

Pasos exactos en el dashboard:
1. *Workers & Pages → Create → Pages → Connect to Git*.
2. Selecciona el repo y rama `main`.
3. En *Build settings* deja el **Build command vacío** y pon `/` como **Build output directory**.
4. En *Settings → Bindings → D1* agrega `DB`.
5. En *Settings → Environment variables → Secrets* agrega `SESSION_SECRET`.
6. Guarda y despliega.

> Si en los logs aparece `Executing user deploy command: npx wrangler pages deploy`,
> quiere decir que hay un *Deploy command* configurado: déjalo **vacío**. La
> integración de Git compila/despliega solo. Un *deploy command* extra suele
> causar el error `Authentication error [code: 10000]` (ver solución de problemas).

---

## Permisos del token de API (CLOUDFLARE_API_TOKEN)

El error **`Authentication error [code: 10000]`** ocurre casi siempre porque el
token API no tiene el permiso **`Account › Cloudflare Pages › Edit`**.

Crea el token en https://dash.cloudflare.com/profile/api-tokens con los permisos:

| Recurso  | Permiso                            | Para qué sirve                         |
| -------- | ---------------------------------- | -------------------------------------- |
| Cuenta   | `Cloudflare Pages › Edit`          | Crear y desplegar el proyecto Pages    |
| Cuenta   | `Cloudflare D1 › Edit`             | Crear/aplicar esquema a la base D1     |
| Usuario  | `User Details › Read`              | Resolver identidad al desplegar        |
| Cuenta   | (opcional) `Workers Scripts › Edit`| Despliegue de las funciones            |

Sugerencia: usa la plantilla *"Edit Cloudflare Workers"* o crea un **token
personalizado** y añade "Cloudflare Pages › Edit".

Verifica los permisos con:
```bash
npx wrangler whoami
```

---

## Comandos útiles

| Comando                           | Qué hace                                     |
| --------------------------------- | -------------------------------------------- |
| `npm install`                     | Instala wrangler (única dep. de desarrollo)  |
| `npm run dev:cf`                  | Levanta Pages Functions + D1 local (8788)    |
| `npm run db:migrate:local`        | Aplica `schema.sql` a la D1 local            |
| `npm run db:migrate:remote`       | Aplica `schema.sql` a la D1 remota           |
| `npm run deploy`                  | Despliega el estático con wrangler           |
| `bash scripts/setup-cloudflare.sh`| Deploy completo automático (Git Bash/WSL)    |
| `npx wrangler pages secret put SESSION_SECRET --project-name sistema-econ-3e2` | Configura el secreto de sesión |

---

## Cómo cambiar las credenciales y datos

### Lista de integrantes

| Archivo                | Constante / sección                                |
| ---------------------- | -------------------------------------------------- |
| `schema.sql`           | bloque `INSERT OR IGNORE INTO miembros`            |
| `functions/_lib/db.js` | `MEMBERS_SEED` (auto-seed si la tabla está vacía)  |

Formato: `{ numero_lista, nombre }`. Se muestran en orden ascendente.

### Credenciales de administradores (usuario / PIN)

| Archivo                | Constante / sección                                |
| ---------------------- | -------------------------------------------------- |
| `schema.sql`           | bloque `INSERT OR IGNORE INTO administradores`     |
| `functions/_lib/db.js` | `ADMINS_SEED`                                      |

Roles válidos: `tutor`, `presidente`, `tesorero`.

> En producción **cambia el PIN**: edita la fila en D1.
> ```bash
> npx wrangler d1 execute sistema-econ-3e2-db --remote --command \
>   "UPDATE administradores SET pin = 'NUEVO' WHERE usuario = 'tutor';"
> ```
> (Repite con `presidente` y `tesorero`.)

### Monto de cuota por defecto y semanas iniciales

En `functions/_lib/db.js`, función `generateDefaultWeeks(count = 10, startOffset = -2)`
con `monto_cuota: 20.0` dentro. Aplica si la tabla `semanas` está vacía.

Las semanas nuevas se crean desde **Exportar → Agregar semana** (con su monto).
La semilla de días lunes/domingo se calcula sola al insertar.

### Moneda y formato

En `js/utils.js`, función `money()`:

```js
new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', ... })
```

Cambia `es-MX`/`MXN` por tu localidad/divisa si lo necesitas.

### Colores y tema

Edita las variables CSS en `css/styles.css` (`:root`): `--emerald-*`, `--teal-*`,
`--bg`, etc. El resto del diseño es CSS puro (`.glass-panel`, `.glass-card`,
keyframes `fadeUp`, `slideUp`, `float`).

---

## Seguridad

- La sesión se firma con **HMAC-SHA256** (Web Crypto) usando `SESSION_SECRET`
  (desarrollo: `.dev.vars`; producción: Pages secret).
- Los endpoints de datos/escritura (`balance`, `status`, `report`, `payments`,
  `weeks` POST) exigen token válido → **la app no funciona sin iniciar sesión**.
- Solo los 3 roles (`tutor`, `presidente`, `tesorero`) pueden autenticarse.
- El PIN se compara contra el valor en D1 (semilla de demo; **cámbialo en producción**).
- El backend nunca loguea secretos ni tokens.
- El frontend escapa el HTML de cualquier dato renderizado (`esc()` en `js/utils.js`).

---

## Solución de problemas

**"Authentication error [code: 10000]" al desplegar**
- El token API (`CLOUDFLARE_API_TOKEN`) **no tiene el permiso `Account › Cloudflare
  Pages › Edit`**. Ver [Permisos del token](#permisos-del-token-de-api-cloudflare_api_token).
- Si usas la integración de Git de Pages: **quita** el *Deploy command* personalizado;
  Pages despliega solo, sin necesidad de token.

**"La app se queda cargando / no entra a D1"**
- Verifica que las funciones existan en `functions/` y estén publicadas.
- Revisa el binding D1 (`wrangler.toml` o dashboard) y que la variable sea `DB`.
- Prueba `curl https://TU-PROYECTO.pages.dev/api/health` → debe responder
  `{"ok":true,"mode":"d1",...}`.

**"No puedo iniciar sesión"**
- Usa las credenciales correctas (`tutor/1234`, `presidente/2345`, `tesorero/3456`).
- En producción, confirma que `schema.sql` se aplicó a la D1 remota
  (`npm run db:migrate:remote`).

**"La semana no se muestra"**
- El seed genera 10 semanas alrededor de la fecha actual. Si necesitas más,
  créalas en **Exportar → Agregar semana**.

**"Error D1_EXEC_ERROR"**
- D1 no admite múltiples sentencias en `db.exec`; el código usa sentencias
  individuales. No reintroduzcas `db.exec` multi-sentencia.

**"PDF/CSV no descargan"**
- La exportación es 100 % del lado del cliente; jsPDF se carga desde CDN, así que
  la app necesita internet. Revisa que el navegador permita descargas.

**"Los estáticos suben archivos de configuración"**
- `wrangler.toml`, README, etc. se excluyen vía `.assetsignore`. Si ves alguno
  publicarse, verifica que `.assetsignore` esté en la raíz del repo.

---

## Créditos

Frontend reconstruido en HTML/CSS/JS puro. Backend en Cloudflare Pages Functions
con base de datos Cloudflare D1. PDF con jsPDF (CDN).