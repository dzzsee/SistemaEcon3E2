# AGENTS.md

Sistema de control de cuotas semanales del grupo 3E2. React 19 + Vite + Tailwind v4
en `src/`, y Cloudflare Pages Functions + D1 (SQLite) en `functions/`.

`README.md` es la referencia detallada (montaje, endpoints, despliegue, credenciales).
Este archivo solo recoge lo que **no es evidente** leyendo el código.

## Comandos

```bash
npm run dev               # Vite en :5173 -> SIEMPRE modo LocalStorage (ver abajo)
npm run build             # única verificación automática disponible
npm run dev:cf            # = npm run build && wrangler pages dev dist
npm run db:migrate:local  # aplica schema.sql a la D1 local (.wrangler/)
npm run db:migrate:remote # aplica schema.sql a la D1 remota
```

## Verificación

**No hay linter, ni tests, ni typecheck, ni ESLint/Prettier/tsconfig en el repo.**
La única verificación automatizada es `npm run build`. Todo lo demás es prueba manual
en el navegador: login → registrar un abono → comprobar que el estado de la celda
pase a "Pagado"/"Abonado" → exportar CSV y PDF.

## Arquitectura de dos modos (lo más importante)

El cliente elige backend solo, en el primer request, con un health-check a
`/api/health` (`src/services/api.js:12`). Si falla → LocalStorage, sin configuración.

- `npm run dev` (Vite) **no tiene proxy a `/api`**: `/api/health` da 404 y siempre cae
  a LocalStorage. Es el modo demo esperado, no un bug.
- Solo `wrangler pages dev` / el deploy de Pages ejecutan `functions/`. Vite las ignora.
- `npm run dev:cf` sirve el **bundle ya compilado** (`dist`), no HMR. Para iterar
  frontend usa `npm run dev`.
- Los datos de la D1 local viven en `.wrangler/` (gitignored). Para empezar de cero:
  borrar `.wrangler/state` y volver a levantar.

### Regla de oro: la lógica existe en DOS capas

`functions/_lib/db.js` + `functions/api/*` (D1) y `src/services/db.js` +
`src/services/api.js` (LocalStorage) son **implementaciones paralelas**. Cualquier
cambio de reglas de negocio (cálculo de `estado`, `deuda`, `porcentajeCobro`) hay que
aplicarlo en ambas, o el comportamiento difiere según el modo.

El cálculo de estado está repetido además en la UI, en 5 sitios:
`functions/api/report.js:35`, `src/services/api.js:203`, `src/utils/export.js:29`,
`src/components/Planilla.jsx:28`, `src/components/AlumnosPanel.jsx:18`.
La fórmula es siempre: `abonado >= cuota → pagado`, `> 0 → abonado`, si no `deuda`.

## Datos semilla: 3 archivos que deben coincidir

| Dato            | LocalStorage          | D1 (runtime)          | D1 (migración)   |
| --------------- | --------------------- | --------------------- | ---------------- |
| Administradores | `INITIAL_ADMINS`      | `ADMINS_SEED`         | bloque `administradores` |
| Integrantes     | `INITIAL_MEMBERS`     | `MEMBERS_SEED`        | bloque `miembros`|
| Semanas/cuota   | `generateDefaultWeeks()` | `generateDefaultWeeks()` | (no hay) |

Al tocar cualquiera de ellos, actualiza **los tres**.

> **Drift ya existente:** los *nombres* de los administradores difieren hoy entre
> `schema.sql` (`Profesor Tutor`, `Presidente de Grupo`, `Tesorero de Grupo`) y los
> seeds JS (`Prof. Tutor`, `Presidente 3E2`, `Tesorero 3E2`). No son un error de
> lectura: `ensureSchema` solo siembra si `COUNT(*) === 0` y `schema.sql` usa
> `INSERT OR IGNORE` con ids fijos, así que gana el que se aplique primero. Si
> unificas los nombres, recuerda limpiar/recrear la base afectada.

## Trampas de D1 / SQLite

- **D1 no acepta múltiples sentencias en un `exec`.** `ensureSchema()` itera un array
  de sentencias individuales (`db.js:104`). No reintroduzcas un `db.exec` con varios
  `CREATE TABLE`.
- `ensureSchema()` (DDL + seed) se ejecuta en **cada request**; es idempotente, pero
  significa que un cambio en `SCHEMA_STATEMENTS` no migra bases ya sembradas: hace
  falta borrar las tablas a mano.
- **`schema.sql` no siembra semanas.** La primera request las genera con
  `generateDefaultWeeks()` = 10 semanas ancladas a la fecha del *primer* request
  (`startOffset = -2` → empieza hace 2 semanas). Por eso `numero_semana` y las fechas
  dependen de cuándo se tocó la base por última vez, no de hoy. Para mover el
  calendario hay que borrar la tabla `semanas`.
- Semanas nuevas: la UI las crea desde **Exportar → Agregar semana** (`POST /api/weeks`,
  `numero_semana = MAX+1`). No hay endpoint de borrado de semanas ni de abonos.

## Entorno y autenticación

- `.dev.vars` está **gitignored** → un clon nuevo no tiene `SESSION_SECRET`. Si falta,
  `auth.js:51` y `login.js:26` caen **en silencio** al literal hardcodeado
  `'econ-3e2-session-secret'`. Nada falla ni avisa: crea `.dev.vars` con un
  `SESSION_SECRET` aleatorio antes de probar auth en serio.
- El token HMAC **no tiene expiración** (`signToken` no mete `exp`). El toast
  "Tu sesión expiró" solo aparece ante un 401 real, es decir, si cambió
  `SESSION_SECRET`. No esperes caducidad.
- Los PIN se guardan y comparan **en texto plano** (`schema.sql`, `login.js:15`,
  `db.js:189`). El README afirma que se comparan contra un hash: es inexacto, no
  asumas hashing al tocar la auth.
- Credenciales de demo: `tutor/1234`, `presidente/2345`, `tesorero/3456`.
- El `token` de la sesión se guarda en `localStorage['3e2_session']` junto al perfil;
  `api.getSession()` lo lee de ahí, no de cookies.
- **No hay gating por rol**: los 3 roles (`tutor`, `presidente`, `tesorero`) tienen
  exactamente los mismos permisos de escritura. `rol` solo cambia el color del badge
  (`utils/cn.js` ROLES) y el pie del PDF. No añadas chequeos de rol "por simetría"
  esperando que el resto del código los tenga.

## Despliegue

- **Un `push` a `main` despliega a producción** (`.github/workflows/deploy.yml` es el
  único workflow y su único trigger relevante). Antes de commitear a `main`, considera
  que hay una release detrás.
- El workflow **reescribe `database_id` en `wrangler.toml`** en cada corrida, y
  ahora **verifica/crea el bucket de R2** (`sistema-econ-3e2-facturas`) antes de
  compilar. Si R2 no está habilitado, el workflow falla con un mensaje explícito
  en vez de desplegar una app donde subir facturas da 503.
- Secrets de GitHub requeridos: `CLOUDFLARE_API_TOKEN` (necesita
  `Account › Cloudflare Pages › Edit`, la causa del `Authentication error [code: 10000]`)
  y `CLOUDFLARE_ACCOUNT_ID`.
- Al usar la integración Git de Pages, deja **Deploy command vacío** (build: `npm run build`,
  output: `dist`); un deploy command extra reproduce el error de autenticación.
- Tras el primer deploy hay que definir el secreto de sesión:
  `npx wrangler pages secret put SESSION_SECRET --project-name sistema-econ-3e2`.

## Gastos: OCR y el binario de tesseract

- `src/utils/ocr.js` importa **`tesseract.js/dist/tesseract.esm.min.js`**, no
  `'tesseract.js'`. El entry de tesseract es CommonJS con
  `module.exports = { ..., ...Tesseract }`; ese spread impide que Rollup deduzca
  los exports con nombre y el `import()` dinámico llega con una capa extra de
  namespace, dejando `createWorker` en `undefined`. No lo "simplifiques" sin
  volver a comprobar `dist/assets/` (debe existir un chunk con
  `export{... as default}` y las URLs de jsdelivr).
- El OCR es **una segunda opinión**: extrae importes candidatos y los contrasta
  con el monto capturado. Nunca bloquea el registro. Los subtotales e IVA se
  penalizan a propósito y el máximo global NO se usa como total (el RFC del
  proveedor o un teléfono de 6 dígitos se lo llevarían).
- Las fotos se comprimen en el navegador antes de subir (`comprimirImagen`), y los
  PDF se rasterizan con pdf.js para poder aplicarles OCR (`rasterizarPdf`).
  `public/pdf-standard-fonts/` es una copia de `node_modules/pdfjs-dist/standard_fonts`
  (820 KB): sin ella, los recibos de punto de venta que no embeben Helvetica/Times
  rasterizan con glifos vacíos.
- `addGasto`/`deleteGasto` **no degradan a LocalStorage cuando el servidor
  responde con error**: un 503 de R2 se propaga, porque guardar en local perdería
  la factura en silencio. Solo la red caída justifies el fallback (`HttpError`).

## Convenciones de código

- **Tailwind v4**: no existe `tailwind.config.js`. El plugin `@tailwindcss/vite` va en
  `vite.config.js` y el CSS arranca con `@import "tailwindcss"`. Los tokens del tema
  oscuro y las utilidades `glass-panel` / `glass-card` / `glass-card-hover` /
  `no-scrollbar` viven en `src/index.css`; las animaciones se invocan como
  `animate-[fadeUp_0.35s_ease-out_both]`.
- Sin sistema de estilos ni router: son clases Tailwind inline, y las "pestañas" son
  un `useState` en `src/App.jsx` (`TABS`). Añadir una vista = un componente en
  `src/components/` + una entrada en `TABS` + un `tab ===` en `App.jsx`.
- `cn()` de `src/utils/cn.js` es `twMerge(clsx(...))`: úsalo siempre para clases
  condicionales, nunca concatenes strings de clases a mano.
- Componentes: función con `export default`, props explícitas, JSX en español para
  toda la UI.
- **Formato regional**: moneda `Intl.NumberFormat('es-MX', { currency: 'MXN' })` en
  `utils/cn.js` y `services/api.js` (hay dos `money()` distintos: el de `cn.js` es el
  que usan los componentes); fechas en `es-ES`; el PDF hace `.replace('MX$', '$')`.
  Cambiar moneda/idioma implica tocar ambos `money()`.
- Exportación CSV/PDF es 100 % cliente (`src/utils/export.js`), con BOM `\uFEFF` para
  acentos en Excel. No hay librería de Excel: el botón "Excel / CSV" descarga CSV.
- Rutas: los imports llevan siempre la extensión (`.js`, `.jsx`).
