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
- **Gastos con factura**: registra la salida de dinero, toma la foto de la factura en el momento y descárgala o elimínala después.
- **OCR opcional en el navegador**: Tesseract.js lee la factura y contrasta los importes con el monto capturado; nunca bloquea el registro.
- **Balance global**: total recaudado, gastos, efectivo en caja, deuda pendiente y % de cumplimiento.
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
│       ├── status.js              # matriz completa + gastos para la UI
│       ├── report.js              # datos para exportación
│       ├── expenses.js            # gastos (GET lista | POST crear, multipart)
│       └── expenses/[id].js       # factura (GET descarga) y borrado (DELETE)
├── src/
│   ├── components/                # UI: Login, Dashboard, Planilla, Alumnos, Exportar, Modal, Toast
│   ├── services/
│   │   ├── api.js                 # cliente API con auto-fallback a LocalStorage
│   │   └── db.js                  # lógica LocalStorage (espejo del backend)
│   └── utils/
│       ├── cn.js                  # helpers de clases, formato y roles
│       ├── export.js              # generación CSV y PDF
│       ├── files.js               # compresión de imagen y rasterizado de PDF
│       └── ocr.js                 # Tesseract.js + extracción de importes
├── public/pdf-standard-fonts/     # fuentes estándar para renderizar PDF
├── schema.sql                     # esquema + datos iniciales (D1/SQLite)
├── wrangler.toml                  # configuración de Cloudflare (bindings DB y R2)
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
| `gastos`         | `id`, `concepto`, `categoria`, `monto`, `fecha`, `nota`, `registrado_por`, `r2_key`, `nombre_archivo`, `mime`, `tamano` | Salidas de dinero + su factura |

Los gastos **no** llevan `semana_id`: son globales, no pertenecen a una semana del
calendario. El archivo de la factura vive en R2, no en D1; en la fila solo se
guarda la clave `r2_key` y los metadatos.

**Cálculo por semana** (mismo en backend y LocalStorage):
`abonado = Σ montos de abonos` → `deuda = max(0, cuota - abonado)`
→ `estado = pagado | abonado | deuda`.

**Balance con gastos** (idéntico en `functions/api/balance.js` y `src/services/db.js`):

```
totalGastos   = Σ montos de gastos
saldoCaja     = totalRecaudado − totalGastos
totalDeuda    = max(0, totalEsperado − totalRecaudado + totalGastos)
porcentajeCobro = saldoCaja / totalEsperado × 100
```

Los gastos **restan** caja y **aumentan** la deuda pendiente. `porcentajeCobro`
puede quedar negativo si el grupo gastó más de lo que.recaudó; por eso la barra
de cumplimiento recorta el ancho a 0-100 pero el número se muestra real.

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
| GET    | `/api/expenses`     | Sí   | Listar gastos (sin los archivos)               |
| POST   | `/api/expenses`     | Sí   | Crear gasto · `multipart/form-data`           |
| GET    | `/api/expenses/:id` | Sí   | Descargar la factura                           |
| DELETE | `/api/expenses/:id` | Sí   | Eliminar gasto **y** su objeto en R2          |

Autenticación: cabecera `Authorization: Bearer <token>` (token firmado HMAC-SHA256).

`POST /api/expenses` acepta `concepto`, `monto`, `fecha`, `categoria`, `nota` y,
opcionalmente, `factura` (JPG, PNG, WEBP o PDF, máx. 10 MB). Devuelve **503**
con un mensaje claro si el binding de R2 no está disponible, en vez de
fallar en silencio. No se puede editar un gasto: se elimina y se vuelve a
registrar.

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

El workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), en cada
`push` a `main`:
1. Crea la base de datos D1 si no existe e inyecta su `database_id` en `wrangler.toml`.
2. Aplica `schema.sql` (tablas + datos iniciales).
3. Compila y despliega automáticamente a Cloudflare Pages.

Configuración previa en GitHub → **Settings → Secrets and variables → Actions**:

| Secreto                 | Descripción                                   |
| ----------------------- | --------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | Token de API de Cloudflare (ver permisos abajo) |
| `CLOUDFLARE_ACCOUNT_ID` | ID de tu cuenta de Cloudflare                 |

> No es necesario crear D1 manualmente: el workflow lo hace solo.

### Opción C — Git integration de Cloudflare Pages (sin acciones)

En el panel de Cloudflare Pages, conecta el repositorio y configura:

- **Build command**: `npm run build`
- **Build output directory**: `dist`
- **D1 binding**: variable `DB` → base de datos `sistema-econ-3e2-db`
- **Variable de entorno** (secreto): `SESSION_SECRET`

> **Importante:** no configures un "Deploy command" personalizado
> (`npx wrangler pages deploy`). En la integración de Git, Pages compila y despliega
> `dist` automáticamente (las funciones de `functions/` y los bindings se toman del
> dashboard). Un deploy command extra solo requiere un token API y suele causar el
> error `Authentication error [code: 10000]`.

Si los logs muestran `Executing user deploy command: npx wrangler pages deploy`,
ese despliegue viene de la integración Git de Pages, no de GitHub Actions. En
**Workers & Pages → proyecto → Settings → Builds & deployments**, deja vacío
**Deploy command** y conserva `npm run build` como **Build command**. Después
guarda y vuelve a ejecutar el despliegue.

---

## Gastos, facturas y OCR

Los gastos son **salidas de dinero** del grupo. Restan el efectivo en caja y
aumentan la deuda pendiente. No se editan: se eliminan y se vuelven a registrar.

### Tomar la foto de la factura

En la pestaña **Gastos → Registrar gasto** hay dos botones:

- **Tomar foto**: abre la cámara del móvil directamente (`capture="environment"`).
  Es la vía para las facturas físicas, que se fotografían en el momento del gasto.
- **Adjuntar**: abre la galería o el explorador de archivos, para cuando la
  factura ya viene en PDF o en una foto que ya se tenía.

La imagen se **comprime en el navegador** antes de subirla (máx. 1600 px, JPEG
~82 %), respetando la orientación EXIF, así que una foto de celular de 4 MB baja
a unos 200 KB. El límite del servidor son 10 MB.

### OCR (opcional)

El botón **Verificar el total con OCR** corre **Tesseract.js en el navegador**.
El motor y el diccionario se descargan de un CDN la primera vez (~2 MB) y luego
quedan cacheados.

El OCR es una **segunda opinión, no una autoridad**:

1. Se rasteriza la imagen (o la primera página del PDF, vía pdf.js) y se lee el texto.
2. `extraerImportes()` detecta los importes y los puntúa: +40 si la línea dice
   *total / importe / a pagar*, −20 si dice *subtotal / IVA / descuento*, +8 si
   trae símbolo de moneda, y +20 al importe más alto **entre las líneas que
   dicen total** (no el máximo global, o el RFC del proveedor se llevaría el prize).
3. `compararConOCR()` contrasta esos candidatos con el monto que capturó el
   administrador y avisa si coinciden o en cuánto difieren.
4. Los importes detectados salen como botones: un toque los pone en el monto.

Nunca bloquea el registro: si el OCR falla, si no encuentra números o si la
factura es un PDF que no se pudo rasterizar, el gasto se guarda igual con un aviso.

El parsing contempla los dos formatos de separador (`1.250,00` y `1,250.00`) y
las confusiones típicas del OCR (`1,3O5,4O` → `1305.40`).

> **Trampa de build**: `tesseract.js` es CommonJS y su entry hace
> `module.exports = { ..., ...Tesseract }`. Ese spread impide que Rollup deduzca
> los exports con nombre y el `import()` dinámico llega con una capa extra de
> namespace (`mod.default.default`), con `createWorker` indefinido. Por eso
> `src/utils/ocr.js` importa **`tesseract.js/dist/tesseract.esm.min.js`**, que
> trae un `default` limpio y ya viene compilado para navegador. Si el OCR falla
> con "createWorker is not a function", se rompió esto.

### Modo local (sin R2)

En `npm run dev` el health-check da 404, la app cae a LocalStorage y **el archivo
no se guarda**: solo los datos del gasto. El modal lo avisa antes de subir.

---

## Permisos del token de API (CLOUDFLARE_API_TOKEN)

El error **`Authentication error [code: 10000]`** al desplegar ocurre casi siempre
porque el token API no tiene el permiso **`Account › Cloudflare Pages › Edit`**.

Crea el token en https://dash.cloudflare.com/profile/api-tokens con los permisos:

| Recurso  | Permiso                            | Para qué sirve                         |
| -------- | ---------------------------------- | -------------------------------------- |
| Cuenta   | `Cloudflare Pages › Edit`          | Crear y desplegar el proyecto Pages    |
| Cuenta   | `Cloudflare D1 › Edit`             | Crear/aplicar esquema a la base D1     |
| Cuenta   | `Cloudflare R2 › Edit`             | Crear el bucket de facturas            |
| Usuario  | `User Details › Read`              | Resolver identidad al desplegar        |
| Cuenta   | (opcional) `Workers Scripts › Edit`| Despliegue de las funciones            |

Sugerencia: usa la plantilla *"Edit Cloudflare Workers"* o crea un **token personalizado**
y añade "Cloudflare Pages › Edit" (permiso que falta en la mayoría de fallos).

Verifica los permisos efectivos con:
```bash
npx wrangler whoami
```

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
| `npx wrangler r2 bucket create sistema-econ-3e2-facturas` | Crea el bucket de facturas (R2, una vez) |
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

**"Authentication error [code: 10000]" al desplegar (wrangler pages deploy)**
- El token API (`CLOUDFLARE_API_TOKEN`) **no tiene el permiso `Account › Cloudflare
  Pages › Edit`**. La compilación funciona, pero el deploy se rechaza.
  Ver [Permisos del token de API](#permisos-del-token-de-api-cloudflare_api_token).
- Si usas la integración de Git de Pages: **quita** el "Deploy command" personalizado;
  Pages despliega solo, sin necesidad de token.

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

**"Please enable R2 through the Cloudflare Dashboard [code: 10042]"**
- R2 no está habilitado en la cuenta. Pide método de pago, actívalo en el
  Dashboard y crea el bucket. Hasta entonces, registrar un gasto **con** factura
  devuelve 503 y el archivo no se guarda; sin archivo sí funciona.

**"createWorker is not a function" al pulsar OCR**
- El bundle de tesseract se rompió. Debe importarse desde
  `tesseract.js/dist/tesseract.esm.min.js`, no desde `'tesseract.js'`.
  Ver la nota de build en [Gastos, facturas y OCR](#gastos-facturas-y-ocr).

**El OCR tarda mucho o no encuentra el total**
- La primera vez descarga el motor y el diccionario español de un CDN. Además
  el OCRlee mucho mejor fotos nítidas y sin sombras que tickets arrugados:
  úsalo como confirmación, nunca como única fuente.

**La factura no se guarda en modo local**
- Es lo esperado: con `npm run dev` no hay backend ni R2, solo LocalStorage.
  El modal lo avisa. Para probar la subida real, usa `npm run dev:cf`.

**PDF/CSV no descargan**
- La exportación es 100 % del lado del cliente; revisa que el navegador permita
  descargas (no esté bloqueado por el popup/política del dispositivo).

**Conexión perdida tras desplegar**
- Si cambiaste credenciales o lista, confirma haber actualizado los 3 archivos
  sincronizados (funciones, LocalStorage y `schema.sql`).