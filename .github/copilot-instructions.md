# Copilot instructions for SistemaEcon3E2

## Project overview

This is a Spanish-language weekly dues tracker for class 3E2. It is a framework-free Cloudflare Pages application:

- `index.html`, `css/`, and `js/` are the static frontend and are deployed as-is.
- `functions/api/` contains Cloudflare Pages Functions mapped directly to `/api/*`.
- `functions/_lib/` contains shared D1 schema/seed/configuration helpers and HMAC token authentication.
- `schema.sql` is the baseline D1/SQLite schema and seed data; `migrations/` contains targeted data/schema updates.
- `wrangler.toml` binds the `DB` D1 database and sets the Pages output directory to the repository root.

There is no bundler, framework, generated frontend directory, or `npm run build`. Do not introduce assumptions about React, Vite, Tailwind, or LocalStorage-backed application data.

## Commands

Prerequisites: Node.js 18+ and a Cloudflare account. Install dependencies with:

```bash
npm install
```

Run the local Pages Functions server with the local D1 emulator:

```bash
npm run dev:cf
```

The app is served at `http://localhost:8788`. Apply the baseline schema to local D1 when needed:

```bash
npm run db:migrate:local
```

Other repository scripts:

```bash
npm run db:migrate:remote
npm run db:members:local
npm run db:members:remote
npm run db:periodo:local
npm run db:periodo:remote
npm run deploy
bash scripts/setup-cloudflare.sh   # Git Bash or WSL
```

The repository currently has no test runner, test files, lint script, or type-check script. There is therefore no single-test command; validate changes with the local Pages server and targeted API/UI smoke checks. The GitHub Actions workflow installs dependencies, validates Cloudflare access, applies `schema.sql` remotely, and deploys Pages on pushes to `main`.

For local development, put `SESSION_SECRET=<long-random-value>` in an untracked root `.dev.vars`. Do not commit credentials, `.dev.vars`, `.wrangler/`, or other environment files.

## Architecture and request flow

The browser loads `js/app.js` as an ES module. `app.js` owns the session-aware client router, admin/student shells, shared state, inactivity logout, refresh flow, toasts, and modal mounting. Individual views under `js/views/` render into the shell and call the small API wrapper in `js/api.js`. The frontend uses `fetch('/api/...')`; it stores only the signed session object in `localStorage` under `3e2_session`.

Pages Functions use file-based routing. Each endpoint exports `onRequestGet`, `onRequestPost`, or `onRequestDelete`, calls `ensureSchema(context.env.DB)` before D1 work, and returns JSON through the shared `json()` helper. Admin and student tokens are signed and verified with HMAC-SHA256 in `functions/_lib/auth.js`; protected handlers read the `Authorization: Bearer <token>` header. Admins can view and mutate all data. Students can authenticate with cédula + PIN and are restricted by `user.id` to their own member record and payments.

The main data flow is:

1. `/api/login` authenticates an administrator or student and returns a signed token.
2. The client loads `/api/status` and `/api/balance` together.
3. `status` returns members, calendar weeks, and payments grouped by `memberId-weekId`; frontend helpers in `js/utils.js` build the member × week matrix and derive payment states.
4. `/api/payments`, `/api/weeks`, and `/api/config` handle admin mutations. `/api/report` supplies the export view; `js/export.js` creates CSV/PDF output, with jsPDF loaded from a CDN by `index.html`.

D1 tables are `administradores`, `configuracion`, `miembros`, `semanas`, and `abonos`. Weekly debt and compliance calculations only count weeks whose `fecha_fin` is on or before today. Payment rows are additive: multiple partial payments for the same member/week are summed.

## Repository-specific conventions

- Keep the frontend as browser-native ES modules. Add imports with relative `.js` paths and do not add a build step unless the deployment model is deliberately changed.
- Follow the Pages Functions naming convention (`functions/api/<route>.js` plus `onRequest*` exports). Use parameterized D1 queries with `.prepare(...).bind(...)`; preserve JSON error responses and HTTP status codes.
- Authenticate protected endpoints before performing work. Use `getUserFromRequest()` for either role, `getAdminFromRequest()` for admin-only endpoints, and `getEstudianteFromRequest()` where role-specific enforcement is useful.
- Call `ensureSchema()` in endpoint handlers. It is intentionally idempotent and supports fresh local D1 databases.
- Keep `schema.sql`, `functions/_lib/db.js` seed constants, and the relevant migration scripts consistent when changing administrators, members, schema columns, or default calendar/configuration data. `schema.sql` is used by deployment; `db.js` is used for runtime auto-seeding.
- Dates are stored and compared as ISO `YYYY-MM-DD` strings. Weeks are generated Monday through Sunday, with a maximum of 60 generated weeks. Preserve this format in API payloads and database writes.
- Amounts are numeric D1 values. Use the existing `money()`, `computeEstado()`, `estadoInfo()`, and `buildMatrix()` helpers rather than duplicating payment-state or currency logic.
- Views commonly render template strings into `innerHTML`. Escape every database/user-provided value with `esc()` before interpolation; use the existing `el()` helper when constructing DOM nodes directly. Keep event binding in the view after its markup is rendered.
- Preserve the existing route names and role values: `tipo` is `admin` or `estudiante`; admin roles are `tutor`, `presidente`, and `tesorero`. Update both route guards and API authorization if adding a role or route.
- The UI is intentionally Spanish and uses the existing glassmorphism CSS variables/classes in `css/styles.css`. Reuse the current view/controller patterns instead of introducing a component framework.
- The root directory is the Pages build output. Files excluded by `.assetsignore` are deployment/configuration files, while `functions/` is compiled separately by Cloudflare; do not move the static output without updating `wrangler.toml`.
- Regenerating the configured period updates/removes weeks and may delete payments attached to removed weeks. Treat that operation as destructive and preserve the confirmation behavior in the configuration view.
