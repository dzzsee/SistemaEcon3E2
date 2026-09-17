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

CREATE INDEX IF NOT EXISTS idx_abonos_miembro ON abonos(miembro_id);
CREATE INDEX IF NOT EXISTS idx_abonos_semana ON abonos(semana_id);

-- Semilla de Administradores (Tutor, Presidente, Tesorero)
INSERT OR IGNORE INTO administradores (id, usuario, pin, nombre, rol) VALUES
(1, 'tutor', '1234', 'Profesor Tutor', 'tutor'),
(2, 'presidente', '2345', 'Presidente de Grupo', 'presidente'),
(3, 'tesorero', '3456', 'Tesorero de Grupo', 'tesorero');

-- Semilla de Miembros de 3E2 (Lista fija ordenada por número de lista)
INSERT OR IGNORE INTO miembros (numero_lista, nombre) VALUES
(1, 'Álvarez Mendoza Diego'),
(2, 'Benítez Castro Sofía'),
(3, 'Cabrera Romero Alejandro'),
(4, 'Delgado Morales Valentina'),
(5, 'Espinoza Ramos Mateo'),
(6, 'Flores Herrera Camila'),
(7, 'García López Daniel'),
(8, 'Hernández Castillo Valeria'),
(9, 'Ibarra Silva Sebastián'),
(10, 'Jiménez Ortiz Natalia'),
(11, 'Lara Méndez Emiliano'),
(12, 'Martínez Cruz Isabella'),
(13, 'Navarro Reyes Leonardo'),
(14, 'Orozco Torres Ximena'),
(15, 'Pérez Gómez Gabriel'),
(16, 'Quintana Domínguez Romina'),
(17, 'Ramírez Vega Santiago'),
(18, 'Sánchez Fuentes Victoria'),
(19, 'Torres Medina Samuel'),
(20, 'Vázquez Ruiz Mariana');
