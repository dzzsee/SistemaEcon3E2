# Sistema de Control de Cuotas Semanales · 3E2

Aplicación web para el control de las cuotas semanales del grupo **3E2**. Diseño
elegante con *glassmorphism*, animaciones suaves, totalmente **responsivo** y
optimizado para **móviles**.

La app funciona en **dos modos automáticos**:

| Modo                | Cuándo se usa                                   | Almacenamiento           |
| ------------------- | ----------------------------------------------- | ------------------------ |
| **LocalStorage**    | `npm run dev` sin backend (modo demo)           | Navegador                |
| **Cloudflare D1**   | Cuando las funciones de Pages responden         | SQLite serverless (edge) |

El cliente detecta solo cuál modo usar (health-check en `/api/health`) y si D1 no
está disponible cambia a LocalStorage sin configuración adicional.

---

## Características

- **Lista fija de integrantes**: 20 alumnos ordenados por número de lista.
- **Semanas por calendario**: cada semana va de lunes a domingo (se calcula sola).
- **Monto de cuota configurable** por semana (valor por defecto: 20).
- **Estados de pago según lo abonado**:
  - `Pagado` → abonado ≥ cuota
  - `Abonado` → abonado > 0 y < cuota
  - `Deuda` → sin abonos
- **Múltiples abonos por semana**: los abonos parciales se acumulan (ej. 12 + 8 = 20).
- **Balance global**: total recaudado, deuda pendiente, % de cumplimiento y saldo esperado.
- **Panel de alumnos** con historial completo y barra de cumplimiento individual.
- **Exportación**: Excel/CSV y reporte PDF listo para compartir.
- **Acceso restringido** a 3 administradores: Tutor, Presidente y Tesorero.
- **Se pueden agregar semanas nuevas** desde la pestaña "Exportar".

---

## Stack

- **Frontend**: React 19 + Vite + Tailwind CSS v4 + Lucide icons
- **Backend/API**: Cloudflare Pages Functions
- **Base de datos**: Cloudflare D1 (SQLite), con LocalStorage como respaldo local
- **PDF**: jsPDF + jsPDF-AutoTable
- **Despliegue**: Cloudflare Pages (git integration, GitHub Actions o script)

---

## Primeros pasos (desarrollo local)

```bash
# 1. Instalar dependencias
npm install

# 2. Levantar el servidor de desarrollo (modo demo con LocalStorage)
npm run dev
# → http://localhost:5173
```

### Credenciales de acceso (por defecto)

| Rol         | Usuario      | PIN  |
| ----------- | ------------ | ---- |
| Tutor(a)    | `tutor`      | 1234 |
| Presidente  | `presidente` | 2345 |
| Tesorero    | `tesorero`   | 3456 |

> El PIN es el mecanismo de acceso. **Cambia estos valores en producción**
> (ver [Cómo cambiar las credenciales](#cómo-cambiar-las-credenciales-y-datos)).

### Desarrollo con Cloudflare real (D1 local)

```bash
npm run dev:cf              # compila y levanta Pages Functions + D1 simulado local
# luego, la primera vez:
npm run db:migrate:local     # aplica schema.sql a la D1 local
```

- En este modo las tablas se crean solas al arrancar (auto-seed en `functions/_lib/db.js`).
- Los datos vividos quedan en `.wrangler/` (no se versionan).

---

## Estructura del proyecto

```
├── functions/                     # API backend (Cloudflare Pages Functions)
│   ├── _lib/
│   │   ├── db.js                  # esquema + seeds + utilidades (D1)
│   │   └── auth.js                # tokens firmados HMAC-SHA256
│   └── api/
│       ├── health.js              # health-check auto (detección de modo)
│       ├── login.js               # autenticación de administradores
│       ├── members.js             # lista de integrantes
│       ├── weeks.js               # semanas (GET list | POST crear)
│       ├── payments.js            # abonos (GET historial | POST crear)
│       ├── balance.js             # resumen financiero
│       ├── status.js              # matriz completa para la UI
│       └── report.js              # datos para exportación
├── src/
│   ├── components/                # UI: Login, Dashboard, Planilla, Alumnos, Exportar, Modal, Toast
│   ├── services/
│   │   ├── api.js                 # cliente API con auto-fallback a LocalStorage
│   │   └── db.js                  # lógica LocalStorage (espejo del backend)
│   └── utils/
│       ├── cn.js                  # helpers de clases, formato y roles
│       └── export.js              # generación CSV y PDF
├── schema.sql                     # esquema + datos iniciales (D1/SQLite)
├── wrangler.toml                  # configuración de Cloudflare (binding DB)
├── .dev.vars                      # SESSION_SECRET para desarrollo local
├── .github/workflows/deploy.yml   # CI/CD automático
└── scripts/setup-cloudflare.sh    # bootstrap automático de Cloudflare
```

---

## Modelo de datos

| Tabla            | Campos                                                                                      | Propósito                          |
| ---------------- | ------------------------------------------------------------------------------------------- | ---------------------------------- |
| `administradores`| `id`, `usuario`, `pin`, `nombre`, `rol` (`tutor\|presidente\|tesorero`)                    | Los 3 accesos del sistema          |
| `miembros`       | `numero_lista` (PK), `nombre`, `activo`                                                     | Lista fija de integrantes          |
| `semanas`        | `id`, `numero_semana`, `fecha_inicio`, `fecha_fin`, `monto_cuota`, `descripcion`            | Semana de lunes a domingo + cuota  |
| `abonos`         | `id`, `miembro_id`, `semana_id`, `monto`, `fecha_registro`, `registrado_por`, `nota`        | Cada pago/abono (se acumulan)      |

**Cálculo por semana** (mismo en backend y LocalStorage):
`abonado = Σ montos de abonos` → `deuda = max(0, cuota - abonado)`
→ `estado = pagado | abonado | deuda`.

---

## Endpoints de la API

| Método | Ruta                | Auth | Descripción                                  |
| ------ | ------------------- | ---- | -------------------------------------------- |
| GET    | `/api/health`       | No   | Disponibilidad + modo (`d1` / local)          |
| POST   | `/api/login`        | No   | Iniciar sesión → `{ token, user }`            |
| GET    | `/api/members`      | No   | Lista de integrantes                          |
| GET    | `/api/weeks`        | No   | Semanas de calendario                         |
| POST   | `/api/weeks`        | Sí   | Crear semana nueva                            |
| POST   | `/api/payments`     | Sí   | Registrar abono                               |
| GET    | `/api/payments`     | Sí   | Historial de abonos                           |
| GET    | `/api/balance`      | Sí   | Resumen financiero                            |
| GET    | `/api/status`       | Sí   | Members + weeks + abonos agrupados (UI)       |
| GET    | `/api/report`       | Sí   | Matriz completa miembro × semana (export)     |

Autenticación: cabecera `Authorization: Bearer <token>` (token firmado HMAC-SHA256).

---

## Despliegue en Cloudflare

La app está lista para desplegarse **completamente desde el repositorio**.

### Opción A — Script automático (recomendado)

```bash
npx wrangler login
bash scripts/setup-cloudflare.sh
```

El script hace todo de forma automática:
1. Verifica la autenticación de Wrangler.
2. Crea la base de datos D1 (`sistema-econ-3e2-db`) si no existe.
3. Inyecta el `database_id` real en `wrangler.toml`.
4. Aplica `schema.sql` (tablas + datos iniciales) a la D1 remota.
5. Compila el proyecto y lo despliega como `sistema-econ-3e2` en Cloudflare Pages.

Después, define el secreto de sesión (una sola vez):

```bash
npx wrangler pages secret put SESSION_SECRET --project-name sistema-econ-3e2
```

> ⚠️ Usa un valor largo y aleatorio, por ejemplo generado con `openssl rand -base64 32`.

### Opción B — GitHub Actions (CI/CD automático)

El workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) compila,
aplica el esquema a D1 y despliega en cada `push` a `main`.

Configuración previa en GitHub → **Settings → Secrets and variables → Actions**:

| Secreto                 | Descripción                                   |
| ----------------------- | --------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | Token de API de Cloudflare (permisos Pages + D1) |
| `CLOUDFLARE_ACCOUNT_ID` | ID de tu cuenta de Cloudflare                 |

Antes del primer deploy automático:
```bash
npx wrangler d1 create sistema-econ-3e2-db
# copia el "database_id" que devuelve y pégalo en wrangler.toml
```

### Opción C — Git integration de Cloudflare Pages (sin acciones)

En el panel de Cloudflare Pages, conecta el repositorio y configura:

- **Build command**: `npm run build`
- **Build output directory**: `dist`
- **D1 binding**: variable `DB` → base de datos `sistema-econ-3e2-db`
- **Variable de entorno** (secreto): `SESSION_SECRET`

---

## Cómo cambiar las credenciales y datos

> Si editas datos iniciales, cambia **los 3 archivos** donde están sincronizados
> (frontend LocalStorage, functions D1 y `schema.sql`), a menos que solo despliegues
> en la nube (entonces basta con editar el backend + `schema.sql` y re-aplicar).

### Lista de integrantes

| Archivo                        | Constante / sección                    |
| ------------------------------ | -------------------------------------- |
| `src/services/db.js`           | `INITIAL_MEMBERS`                      |
| `functions/_lib/db.js`         | `MEMBERS_SEED`                         |
| `schema.sql`                   | bloque `INSERT OR IGNORE INTO miembros`|

Formato: `{ numero_lista, nombre }`. Renumerar no es obligatorio, pero se muestran
en orden ascendente.

### Credenciales de administradores (usuario / PIN)

| Archivo                        | Constante / sección                         |
| ------------------------------ | ------------------------------------------- |
| `src/services/db.js`           | `INITIAL_ADMINS`                            |
| `functions/_lib/db.js`         | `ADMINS_SEED`                               |
| `schema.sql`                   | bloque `INSERT OR IGNORE INTO administradores` |

Los roles válidos son exactamente: `tutor`, `presidente`, `tesorero`.

### Monto de cuota semanal por defecto (y número de semanas)

En `src/services/db.js` y `functions/_lib/db.js`, función `generateDefaultWeeks()`:

```js
generateDefaultWeeks(count = 10, startOffset = -2) // monto_cuota: 20.0 dentro
```

- `count`: cuántas semanas iniciales se generan (10 por defecto).
- `startOffset`: cuántas semanas pasadas incluye (`-2` = empieza hace 2 semanas).
- `monto_cuota`: valor que se aplica por defecto a cada semana generada.

Las semanas nuevas se crean desde la pestaña **Exportar → Agregar semana**, donde
también se puede poner el monto deseado.

### Moneda y formato

En `src/utils/cn.js` y `src/services/api.js`, función `money()`:

```js
new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', ... })
```

Cambia `es-MX`/`MXN` por tu localidad/divisa si lo necesitas.

### Colores y tema

El tema usa **Tailwind CSS v4**. Busca las clases `emerald`, `teal`, `violet` en
`src/` para cambiar la paleta. La mayor parte del estilo oscuro está en
`src/index.css` (variables, `glass-panel`, `glass-card`, keyframes).

---

## Comandos útiles

| Comando                           | Qué hace                                     |
| --------------------------------- | -------------------------------------------- |
| `npm install`                     | Instala dependencias                         |
| `npm run dev`                     | Dev server (modo LocalStorage)               |
| `npm run build`                   | Compila producción a `dist/`                 |
| `npm run dev:cf`                  | Levanta Pages Functions + D1 local           |
| `npm run db:migrate:local`        | Aplica `schema.sql` a la D1 local            |
| `npm run db:migrate:remote`       | Aplica `schema.sql` a la D1 remota           |
| `bash scripts/setup-cloudflare.sh`| Deploy completo automático                   |
| `npx wrangler pages secret put SESSION_SECRET --project-name sistema-econ-3e2` | Configura secreto de sesión |

---

## Seguridad

- La sesión se firma con **HMAC-SHA256** usando la variable `SESSION_SECRET`
  (desarrollo: `.dev.vars`; producción: Pages secret).
- Los endpoints de datos/escritura (`balance`, `status`, `report`, `payments`,
  `weeks` POST) exigen token válido → **la app no funciona sin iniciar sesión**.
- Solo los 3 roles (`tutor`, `presidente`, `tesorero`) pueden autenticarse.
- No se exponen contraseñas: el PIN se compara contra el hash almacenado
  (en el template local se guardan los PINES de demo; **cámbialos en producción**).
- El backend nunca loguea secretos ni tokens.

---

## Solución de problemas

**"La app usa LocalStorage aunque desplegué en Cloudflare"**
- Revisa que las funciones existan en `functions/` y estén publicadas.
- Verifica el binding D1 (`wrangler.toml` o dashboard) y que la variable sea `DB`.
- Prueba manualmente `curl https://TU-PROYECTO.pages.dev/api/health` → debe
  responder `{"ok":true,"mode":"d1",...}`.

**"No puedo iniciar sesión"**
- Usa las credenciales correctas (`tutor/1234`, `presidente/2345`, `tesorero/3456`).
- En producción, confirma que `schema.sql` se aplicó a la D1 remota
  (`npm run db:migrate:remote`).

**"La semana no se muestra"**
- Se generan 10 semanas por defecto alrededor de la fecha actual. Si necesitas más,
  créalas en **Exportar → Agregar semana**.

**"Error D1_EXEC_ERROR"**
- D1 no admite múltiples sentencias en `db.exec`; el código usa sentencias
  individuales. No reintroduzcas `db.exec` multi-sentencia.

**PDF/CSV no descargan**
- La exportación es 100 % del lado del cliente; revisa que el navegador permita
  descargas (no esté bloqueado por el popup/política del dispositivo).

**Conexión perdida tras desplegar**
- Si cambiaste credenciales o lista, confirma haber actualizado los 3 archivos
  sincronizados (funciones, LocalStorage y `schema.sql`).