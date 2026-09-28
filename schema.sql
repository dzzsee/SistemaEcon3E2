-- Esquema SQLite para Cloudflare D1 / Local SQLite
-- Sistema de Control de Cuotas Semanales 3E2

CREATE TABLE IF NOT EXISTS administradores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario TEXT UNIQUE NOT NULL,
    pin TEXT NOT NULL,
    nombre TEXT NOT NULL,
    rol TEXT NOT NULL CHECK(rol IN ('tutor', 'presidente', 'tesorero'))
);

CREATE TABLE IF NOT EXISTS miembros (
    numero_lista INTEGER PRIMARY KEY,
    nombre TEXT NOT NULL,
    activo INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS semanas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero_semana INTEGER NOT NULL,
    fecha_inicio TEXT NOT NULL, -- ISO date YYYY-MM-DD (Lunes)
    fecha_fin TEXT NOT NULL,    -- ISO date YYYY-MM-DD (Domingo)
    monto_cuota REAL NOT NULL DEFAULT 20.00,
    descripcion TEXT
);

CREATE TABLE IF NOT EXISTS abonos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    miembro_id INTEGER NOT NULL,
    semana_id INTEGER NOT NULL,
    monto REAL NOT NULL,
    fecha_registro TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    registrado_por TEXT NOT NULL, -- Tutor, Presidente o Tesorero
    nota TEXT,
    FOREIGN KEY (miembro_id) REFERENCES miembros(numero_lista),
    FOREIGN KEY (semana_id) REFERENCES semanas(id)
);

CREATE TABLE IF NOT EXISTS gastos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    concepto TEXT NOT NULL,
    categoria TEXT,
    monto REAL NOT NULL,
    fecha TEXT NOT NULL,          -- ISO date YYYY-MM-DD
    nota TEXT,
    registrado_por TEXT NOT NULL, -- Tutor, Presidente o Tesorero
    r2_key TEXT,                  -- clave del objeto en el bucket R2 (NULL si no hay archivo)
    nombre_archivo TEXT,
    mime TEXT,
    tamano INTEGER,
    fecha_registro TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_abonos_miembro ON abonos(miembro_id);
CREATE INDEX IF NOT EXISTS idx_abonos_semana ON abonos(semana_id);
CREATE INDEX IF NOT EXISTS idx_gastos_fecha ON gastos(fecha);

CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY,
    timestamp INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_timestamp ON rate_limits(timestamp);

-- ============================================================
-- Semillas
--
-- OJO: el seed solo corre si la tabla esta VACIA. Un
-- `INSERT OR IGNORE` a secas noSirve: ignora duplicados de clave
-- primaria, no tablas con datos. Como `deploy.yml` aplica este
-- archivo en cada push, un seed sin este filtro metia a un
-- integrante ficticio en la lista real del grupo cada despliegue.
-- Es el mismo criterio que usa ensureSchema() en functions/_lib/db.js.
-- ============================================================

-- Semilla de Administradores (Tutor, Presidente, Tesorero)
WITH seed(id, usuario, pin, nombre, rol) AS (
    SELECT 1, 'tutor',     '1234', 'Profesor Tutor',   'tutor'
    UNION ALL SELECT 2, 'presidente', '2345', 'Presidente de Grupo', 'presidente'
    UNION ALL SELECT 3, 'tesorero',   '3456', 'Tesorero de Grupo',   'tesorero'
)
INSERT OR IGNORE INTO administradores (id, usuario, pin, nombre, rol)
SELECT id, usuario, pin, nombre, rol FROM seed
WHERE NOT EXISTS (SELECT 1 FROM administradores);

-- Semilla de Miembros de 3E2 (Lista fija ordenada por número de lista).
-- Solo para una base nueva: en producción la lista real manda.
-- Dividido en bloques de 5 para evitar el limite de SQLite: "too many terms in compound SELECT".
WITH seed1(numero_lista, nombre) AS (
    SELECT 1, 'Álvarez Mendoza Diego'
    UNION ALL SELECT 2, 'Benítez Castro Sofía'
    UNION ALL SELECT 3, 'Cabrera Romero Alejandro'
    UNION ALL SELECT 4, 'Delgado Morales Valentina'
    UNION ALL SELECT 5, 'Espinoza Ramos Mateo'
)
INSERT OR IGNORE INTO miembros (numero_lista, nombre)
SELECT numero_lista, nombre FROM seed1
WHERE NOT EXISTS (SELECT 1 FROM miembros);

WITH seed2(numero_lista, nombre) AS (
    SELECT 6, 'Flores Herrera Camila'
    UNION ALL SELECT 7, 'García López Daniel'
    UNION ALL SELECT 8, 'Hernández Castillo Valeria'
    UNION ALL SELECT 9, 'Ibarra Silva Sebastián'
    UNION ALL SELECT 10, 'Jiménez Ortiz Natalia'
)
INSERT OR IGNORE INTO miembros (numero_lista, nombre)
SELECT numero_lista, nombre FROM seed2
WHERE NOT EXISTS (SELECT 1 FROM miembros);

WITH seed3(numero_lista, nombre) AS (
    SELECT 11, 'Lara Méndez Emiliano'
    UNION ALL SELECT 12, 'Martínez Cruz Isabella'
    UNION ALL SELECT 13, 'Navarro Reyes Leonardo'
    UNION ALL SELECT 14, 'Orozco Torres Ximena'
    UNION ALL SELECT 15, 'Pérez Gómez Gabriel'
)
INSERT OR IGNORE INTO miembros (numero_lista, nombre)
SELECT numero_lista, nombre FROM seed3
WHERE NOT EXISTS (SELECT 1 FROM miembros);

WITH seed4(numero_lista, nombre) AS (
    SELECT 16, 'Quintana Domínguez Romina'
    UNION ALL SELECT 17, 'Ramírez Vega Santiago'
    UNION ALL SELECT 18, 'Sánchez Fuentes Victoria'
    UNION ALL SELECT 19, 'Torres Medina Samuel'
    UNION ALL SELECT 20, 'Vázquez Ruiz Mariana'
)
INSERT OR IGNORE INTO miembros (numero_lista, nombre)
SELECT numero_lista, nombre FROM seed4
WHERE NOT EXISTS (SELECT 1 FROM miembros);
