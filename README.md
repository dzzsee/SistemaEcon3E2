# SistemaEcon3E2

Sistema de gestión económica basada en cuotas semanales para un grupo reducido (3ro E2).

## Qué hace

- **Cuota semanal** con un monto por defecto definido por el administrador (cada usuario puede tener uno propio).
- **Gestión de usuarios** (alta, edición, activo/inactivo, teléfono).
- **Registro de pagos** por usuario y por semana (la primera semana impaga se sugiere automáticamente).
- Cálculo automático del **atraso** en semanas: **Al día** · **1 semana** · **2+ semanas**.
- **Notificación visual** en el panel (sección "Requieren atención") cuando un usuario se atrasa una o dos semanas.
- Panel de resumen: miembros activos, al día, atrasados por semanas y deuda total.

## Tecnología

Next.js 14 (App Router) + React 18 + SQLite (better-sqlite3) + Tailwind CSS + autenticación de administrador único (JWT en cookie `httpOnly`).

## Requisitos

- Node.js 18.18+
- `better-sqlite3` (compila un binario nativo; requiere toolchain de C++ en algunos sistemas)

## Configuración inicial

```bash
npm install

# Inicializa la base de datos y crea el administrador por defecto
npm run db:init
```

Por defecto crea el usuario **admin** con contraseña **admin123**.
Podés cambiarlos con variables de entorno:

```bash
ADMIN_USERNAME=tuUsuario ADMIN_PASSWORD=tuClave npm run db:init
```

## Desarrollo

```bash
npm run dev       # servidor de desarrollo en http://localhost:3000
npm run build     # build de producción
npm run start     # arrancar en producción
npm run lint      # eslint
```

## Cómo funciona el atraso

Hay una **fecha de inicio global** de las cuotas (configurable en Ajustes, por defecto el lunes de la semana actual). A partir de esa fecha se cuenta una semana de cuota por cada semana transcurrida hasta hoy. El atraso de cada usuario es la cantidad de semanas vencidas sin pago:

- 0 semanas → **Al día**
- 1 semana → **1 semana** (se notifica)
- 2 o más → **2+ semanas** (se notifica)

El "día de inicio de semana" (lunes por defecto) y el símbolo de moneda también son configurables.

## Estructura

```
app/            páginas y API routes (login, dashboard, users, payments, settings)
app/api/        endpoints REST
components/     UI (Dashboard, Usuarios, Pagos, Ajustes, modales, filas)
lib/            lógica (arrears.js: cálculo de atraso puro, db.js, auth.js)
scripts/        init-db.mjs (esquema + admin seed)
data/           base de datos SQLite (gitignored)
```

## Variables de entorno

| Variable           | Descripción                          | Default                              |
| ------------------ | ------------------------------------ | ------------------------------------ |
| `ADMIN_USERNAME`   | Usuario administrador                | `admin`                              |
| `ADMIN_PASSWORD`   | Contraseña del administrador         | `admin123`                           |
| `AUTH_SECRET`      | Clave para firmar la sesión (JWT)    | valor de desarrollo                  |
| `SQLITE_DATA_DIR`  | Directorio donde se guarda SQLite           | `data/` local; `/tmp/sistema-econ-data` en Vercel |

En Vercel, `/tmp` es escribible pero temporal. Para conservar usuarios, pagos y ajustes entre despliegues o reinicios se necesita migrar la base de datos a un servicio persistente.