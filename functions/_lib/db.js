// Utilidades compartidas de base de datos para Cloudflare Pages Functions (D1)
// y para el seed/demo en LocalStorage (src/services/db.js)

export const ADMINS_SEED = [
  { usuario: 'tutor', pin: '1234', nombre: 'Prof. Tutor', rol: 'tutor' },
  { usuario: 'presidente', pin: '2345', nombre: 'Presidente 3E2', rol: 'presidente' },
  { usuario: 'tesorero', pin: '3456', nombre: 'Tesorero 3E2', rol: 'tesorero' }
];

export const MEMBERS_SEED = [
  { numero_lista: 1, nombre: 'Abad Gómez Carlos René' },
  { numero_lista: 2, nombre: 'Abad Paucar David Israel' },
  { numero_lista: 3, nombre: 'Abril Idrovo Pablo Andrés' },
  { numero_lista: 4, nombre: 'Álava Cabrera Mateo Alexander' },
  { numero_lista: 5, nombre: 'Armijos Loja María Fernanda' },
  { numero_lista: 6, nombre: 'Barros Valladares Jordán Martín' },
  { numero_lista: 7, nombre: 'Bravo Vázquez David Andrés' },
  { numero_lista: 8, nombre: 'Bustamante Guzmán Kevin Andrés' },
  { numero_lista: 10, nombre: 'Castillo Muñoz Ana Paula' },
  { numero_lista: 11, nombre: 'Cedillo Guaicha Diego Sebastián' },
  { numero_lista: 12, nombre: 'Contreras Peralta Samantha Belén' },
  { numero_lista: 13, nombre: 'Durán Ordóñez Angélica Cristina' },
  { numero_lista: 14, nombre: 'Espinosa Salazar Anthony Alexander' },
  { numero_lista: 15, nombre: 'Gallegos Tenecota Amy Samantha' },
  { numero_lista: 16, nombre: 'Guamán Matute Jonnathan Javier' },
  { numero_lista: 17, nombre: 'Inga Yunga Michael Eduardo' },
  { numero_lista: 18, nombre: 'Lojano Chapa Evelyn Dayanna' },
  { numero_lista: 19, nombre: 'Lucero Lazo Mateo Ismael' },
  { numero_lista: 20, nombre: 'Matute Esparza Andrés Ismael' },
  { numero_lista: 21, nombre: 'Maza Quito Marco Gabriel' },
  { numero_lista: 22, nombre: 'Mejía Zhañay Bruno Damián' },
  { numero_lista: 23, nombre: 'Neira Maldonado Juan José' },
  { numero_lista: 24, nombre: 'Ortiz Terán William Ariel' },
  { numero_lista: 26, nombre: 'Peña Morocho Marco Daniel' },
  { numero_lista: 27, nombre: 'Pérez Cobos Mailén Sofía' },
  { numero_lista: 28, nombre: 'Pesantez Sosa Daniela Alejandra' },
  { numero_lista: 29, nombre: 'Pintado Pillco Christopher Rubén' },
  { numero_lista: 30, nombre: 'Quijije Ulloa Santiago' },
  { numero_lista: 31, nombre: 'Sarmiento Cabrera Axel Josué' },
  { numero_lista: 32, nombre: 'Sibri Simbaña Marco Andrés' },
  { numero_lista: 33, nombre: 'Sinche Guamán Cameron Scarleth' },
  { numero_lista: 34, nombre: 'Tipantaxi Cazorla Christian Andrés' }
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

// Año lectivo actual: empieza en octubre y termina a mediados de mayo
export function defaultPeriodo() {
  const today = new Date();
  const year = today.getFullYear();
  const oct1 = new Date(year, 9, 1);
  const startYear = today >= oct1 ? year : year - 1;
  return {
    fecha_inicio: `${startYear}-10-01`,
    fecha_fin: `${startYear + 1}-05-15`
  };
}

// Semanas del calendario lectivo: del primer lunes de octubre hasta mediados de mayo
export function generateDefaultWeeks({ monto_cuota = 2.5, fecha_inicio, fecha_fin } = {}) {
  const periodo = defaultPeriodo();
  const startStr = fecha_inicio || periodo.fecha_inicio;
  const endStr = fecha_fin || periodo.fecha_fin;

  // Primer lunes en o después de la fecha de inicio
  const monday = new Date(`${startStr}T12:00:00`);
  const dow = monday.getDay();
  monday.setDate(monday.getDate() + (((8 - dow) % 7) || 0));
  monday.setHours(12, 0, 0, 0);

  const end = new Date(`${endStr}T12:00:00`);
  const weeks = [];
  let numero = 1;

  while (monday <= end && numero <= 60) {
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    weeks.push({
      numero_semana: numero,
      fecha_inicio: formatDateISO(monday),
      fecha_fin: formatDateISO(sunday),
      monto_cuota: Number(monto_cuota),
      descripcion: `Semana ${numero}`
    });
    monday.setDate(monday.getDate() + 7);
    numero++;
  }

  return weeks;
}

export const CONFIG_SEED = {
  cuota_semanal: '2.50',
  periodo_inicio: defaultPeriodo().fecha_inicio,
  periodo_fin: defaultPeriodo().fecha_fin
};

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS administradores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario TEXT UNIQUE NOT NULL,
    pin TEXT NOT NULL,
    nombre TEXT NOT NULL,
    rol TEXT NOT NULL CHECK(rol IN ('tutor','presidente','tesorero'))
  )`,
  `CREATE TABLE IF NOT EXISTS configuracion (
    clave TEXT PRIMARY KEY,
    valor TEXT NOT NULL
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
    for (const w of generateDefaultWeeks({ monto_cuota: 2.5 })) {
      await db
        .prepare(
          'INSERT INTO semanas (numero_semana, fecha_inicio, fecha_fin, monto_cuota, descripcion) VALUES (?, ?, ?, ?, ?)'
        )
        .bind(w.numero_semana, w.fecha_inicio, w.fecha_fin, w.monto_cuota, w.descripcion)
        .run();
    }
  }

  // Seed de configuración (solo valores faltantes)
  for (const [clave, valor] of Object.entries(CONFIG_SEED)) {
    const row = await db.prepare('SELECT 1 as one FROM configuracion WHERE clave = ?').bind(clave).first();
    if (!row) {
      await db.prepare('INSERT INTO configuracion (clave, valor) VALUES (?, ?)').bind(clave, valor).run();
    }
  }
}

export async function getConfig(db) {
  const { results } = await db.prepare('SELECT clave, valor FROM configuracion').all();
  const map = {};
  for (const r of results) map[r.clave] = r.valor;
  return { ...CONFIG_SEED, ...map };
}

export async function setConfig(db, values) {
  for (const [clave, valor] of Object.entries(values)) {
    if (clave in CONFIG_SEED) {
      await db
        .prepare(
          'INSERT INTO configuracion (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor'
        )
        .bind(clave, String(valor))
        .run();
    }
  }
  return getConfig(db);
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

// Reconstruye las semanas del calendario lectivo según la configuración guardada.
// Conserva los abonos existentes siempre que la semana siga dentro del periodo.
export async function regenerateWeeks(db, { monto_cuota, fecha_inicio, fecha_fin } = {}) {
  const config = await getConfig(db);
  const cuota = monto_cuota ?? Number(config.cuota_semanal || 2.5);
  const inicio = fecha_inicio || config.periodo_inicio;
  const fin = fecha_fin || config.periodo_fin;

  await setConfig(db, { cuota_semanal: cuota, periodo_inicio: inicio, periodo_fin: fin });

  const weeks = generateDefaultWeeks({ monto_cuota: cuota, fecha_inicio: inicio, fecha_fin: fin });

  // Elimina semanas fuera del nuevo periodo junto con sus abonos
  const removed = await contextLikeDelete(db, weeks, inicio, fin);

  // Inserta semanas nuevas (las que no existen aún por fecha de inicio)
  for (const w of weeks) {
    const exists = await db
      .prepare('SELECT 1 as one FROM semanas WHERE fecha_inicio = ?')
      .bind(w.fecha_inicio)
      .first();
    if (!exists) {
      const maxRow = await db
        .prepare('SELECT COALESCE(MAX(numero_semana), 0) as max_num FROM semanas')
        .first();
      await db
        .prepare(
          'INSERT INTO semanas (numero_semana, fecha_inicio, fecha_fin, monto_cuota, descripcion) VALUES (?, ?, ?, ?, ?)'
        )
        .bind(Number(maxRow.max_num) + 1, w.fecha_inicio, w.fecha_fin, w.monto_cuota, w.descripcion)
        .run();
    }
  }

  return { weeks: weeks.length, removed };
}

async function contextLikeDelete(db, weeks, inicio, fin) {
  const minInicio = weeks.length ? weeks[0].fecha_inicio : inicio;
  const maxFin = weeks.length ? weeks[weeks.length - 1].fecha_fin : fin;
  const { results } = await db
    .prepare('SELECT id FROM semanas WHERE fecha_inicio < ? OR fecha_fin > ?')
    .bind(minInicio, maxFin)
    .all();
  const ids = results.map((r) => r.id);
  for (const id of ids) {
    await db.prepare('DELETE FROM abonos WHERE semana_id = ?').bind(id).run();
    await db.prepare('DELETE FROM semanas WHERE id = ?').bind(id).run();
  }
  return ids.length;
}