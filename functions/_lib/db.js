// Utilidades compartidas de base de datos para Cloudflare Pages Functions (D1)
// y para el seed/demo en LocalStorage (src/services/db.js)

export const ADMINS_SEED = [
  { usuario: 'tutor', pin: '1234', nombre: 'Prof. Tutor', rol: 'tutor' },
  { usuario: 'presidente', pin: '2345', nombre: 'Presidente 3E2', rol: 'presidente' },
  { usuario: 'tesorero', pin: '3456', nombre: 'Tesorero 3E2', rol: 'tesorero' }
];

export const MEMBERS_SEED = [
  { numero_lista: 1, nombre: 'Álvarez Mendoza Diego' },
  { numero_lista: 2, nombre: 'Benítez Castro Sofía' },
  { numero_lista: 3, nombre: 'Cabrera Romero Alejandro' },
  { numero_lista: 4, nombre: 'Delgado Morales Valentina' },
  { numero_lista: 5, nombre: 'Espinoza Ramos Mateo' },
  { numero_lista: 6, nombre: 'Flores Herrera Camila' },
  { numero_lista: 7, nombre: 'García López Daniel' },
  { numero_lista: 8, nombre: 'Hernández Castillo Valeria' },
  { numero_lista: 9, nombre: 'Ibarra Silva Sebastián' },
  { numero_lista: 10, nombre: 'Jiménez Ortiz Natalia' },
  { numero_lista: 11, nombre: 'Lara Méndez Emiliano' },
  { numero_lista: 12, nombre: 'Martínez Cruz Isabella' },
  { numero_lista: 13, nombre: 'Navarro Reyes Leonardo' },
  { numero_lista: 14, nombre: 'Orozco Torres Ximena' },
  { numero_lista: 15, nombre: 'Pérez Gómez Gabriel' },
  { numero_lista: 16, nombre: 'Quintana Domínguez Romina' },
  { numero_lista: 17, nombre: 'Ramírez Vega Santiago' },
  { numero_lista: 18, nombre: 'Sánchez Fuentes Victoria' },
  { numero_lista: 19, nombre: 'Torres Medina Samuel' },
  { numero_lista: 20, nombre: 'Vázquez Ruiz Mariana' }
];

export function getMonday(d = new Date()) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function formatDateISO(date) {
  return date.toISOString().split('T')[0];
}

export function generateDefaultWeeks(count = 10, startOffset = -2) {
  const weeks = [];
  const currentMonday = getMonday(new Date());

  for (let i = startOffset; i < count + startOffset; i++) {
    const monday = new Date(currentMonday);
    monday.setDate(monday.getDate() + i * 7);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    const numero = i - startOffset + 1;
    weeks.push({
      numero_semana: numero,
      fecha_inicio: formatDateISO(monday),
      fecha_fin: formatDateISO(sunday),
      monto_cuota: 20.0,
      descripcion: `Semana ${numero}`
    });
  }
  return weeks;
}

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS administradores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario TEXT UNIQUE NOT NULL,
    pin TEXT NOT NULL,
    nombre TEXT NOT NULL,
    rol TEXT NOT NULL CHECK(rol IN ('tutor','presidente','tesorero'))
  )`,
  `CREATE TABLE IF NOT EXISTS miembros (
    numero_lista INTEGER PRIMARY KEY,
    nombre TEXT NOT NULL,
    activo INTEGER DEFAULT 1
  )`,
  `CREATE TABLE IF NOT EXISTS semanas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero_semana INTEGER NOT NULL,
    fecha_inicio TEXT NOT NULL,
    fecha_fin TEXT NOT NULL,
    monto_cuota REAL NOT NULL DEFAULT 20.00,
    descripcion TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS abonos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    miembro_id INTEGER NOT NULL,
    semana_id INTEGER NOT NULL,
    monto REAL NOT NULL,
    fecha_registro TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    registrado_por TEXT NOT NULL,
    nota TEXT,
    FOREIGN KEY (miembro_id) REFERENCES miembros(numero_lista),
    FOREIGN KEY (semana_id) REFERENCES semanas(id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_abonos_miembro ON abonos(miembro_id)`,
  `CREATE INDEX IF NOT EXISTS idx_abonos_semana ON abonos(semana_id)`
];

// Inicializa la base de datos (idempotente): crea tablas y siembra datos
export async function ensureSchema(db) {
  for (const statement of SCHEMA_STATEMENTS) {
    await db.prepare(statement).run();
  }

  // Seed de administradores
  const adminCount = await db.prepare('SELECT COUNT(*) as count FROM administradores').first();
  if (adminCount.count === 0) {
    for (const a of ADMINS_SEED) {
      await db
        .prepare('INSERT INTO administradores (usuario, pin, nombre, rol) VALUES (?, ?, ?, ?)')
        .bind(a.usuario, a.pin, a.nombre, a.rol)
        .run();
    }
  }

  // Seed de miembros
  const memberCount = await db.prepare('SELECT COUNT(*) as count FROM miembros').first();
  if (memberCount.count === 0) {
    for (const m of MEMBERS_SEED) {
      await db
        .prepare('INSERT INTO miembros (numero_lista, nombre) VALUES (?, ?)')
        .bind(m.numero_lista, m.nombre)
        .run();
    }
  }

  // Seed de semanas si no existen
  const weekCount = await db.prepare('SELECT COUNT(*) as count FROM semanas').first();
  if (weekCount.count === 0) {
    for (const w of generateDefaultWeeks()) {
      await db
        .prepare(
          'INSERT INTO semanas (numero_semana, fecha_inicio, fecha_fin, monto_cuota, descripcion) VALUES (?, ?, ?, ?, ?)'
        )
        .bind(w.numero_semana, w.fecha_inicio, w.fecha_fin, w.monto_cuota, w.descripcion)
        .run();
    }
  }
}

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...extraHeaders
    }
  });
}

export function getBody(request) {
  return request.json().catch(() => ({}));
}