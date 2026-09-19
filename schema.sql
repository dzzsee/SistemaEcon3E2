-- Esquema SQLite para Cloudflare D1 / Local SQLite
-- Sistema de Control de Cuotas Semanales 3E2

CREATE TABLE IF NOT EXISTS administradores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario TEXT UNIQUE NOT NULL,
    pin TEXT NOT NULL,
    nombre TEXT NOT NULL,
    rol TEXT NOT NULL CHECK(rol IN ('tutor', 'presidente', 'tesorero'))
);

CREATE TABLE IF NOT EXISTS configuracion (
    clave TEXT PRIMARY KEY,
    valor TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS miembros (
    numero_lista INTEGER PRIMARY KEY,
    nombre TEXT NOT NULL,
    cedula TEXT UNIQUE,
    pin TEXT NOT NULL DEFAULT '0000',
    activo INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS semanas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero_semana INTEGER NOT NULL,
    fecha_inicio TEXT NOT NULL, -- ISO date YYYY-MM-DD (Lunes)
    fecha_fin TEXT NOT NULL,    -- ISO date YYYY-MM-DD (Domingo)
    monto_cuota REAL NOT NULL DEFAULT 2.50,
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
CREATE INDEX IF NOT EXISTS idx_miembros_cedula ON miembros(cedula);

-- Semilla de Configuración (cuota semanal $2.50, periodo lectivo oct → mayo)
INSERT OR IGNORE INTO configuracion (clave, valor) VALUES
('cuota_semanal', '2.50');

-- Semilla de Administradores (Tutor, Presidente, Tesorero)
INSERT OR IGNORE INTO administradores (id, usuario, pin, nombre, rol) VALUES
(1, 'tutor3E2', 'TuToRTeRcE2', 'Profesor Tutor', 'tutor'),
(2, 'presidente3E2', 'PrEsIdEnTeTeRcE2', 'Presidente de Grupo', 'presidente'),
(3, 'tesorero3E2', 'TeSoReRoTeRcE2', 'Tesorero de Grupo', 'tesorero');

-- Semilla de Miembros de 3E2 (Lista real BACH Informática 2º E2, 2025/2026)
-- Excluidos: #9 CARCHIPULLA MOROCHO CRISTOPHER ALEXIS y #25 PAVON PEÑA ANIBAL SEBASTIAN
INSERT OR IGNORE INTO miembros (numero_lista, nombre, cedula, pin) VALUES
(1, 'Abad Gómez Carlos René', '1712345678', '1234'),
(2, 'Abad Paucar David Israel', '1712345679', '1234'),
(3, 'Abril Idrovo Pablo Andrés', '1712345680', '1234'),
(4, 'Álava Cabrera Mateo Alexander', NULL, '0000'),
(5, 'Armijos Loja María Fernanda', NULL, '0000'),
(6, 'Barros Valladares Jordán Martín', NULL, '0000'),
(7, 'Bravo Vázquez David Andrés', NULL, '0000'),
(8, 'Bustamante Guzmán Kevin Andrés', NULL, '0000'),
(10, 'Castillo Muñoz Ana Paula', NULL, '0000'),
(11, 'Cedillo Guaicha Diego Sebastián', NULL, '0000'),
(12, 'Contreras Peralta Samantha Belén', NULL, '0000'),
(13, 'Durán Ordóñez Angélica Cristina', NULL, '0000'),
(14, 'Espinosa Salazar Anthony Alexander', NULL, '0000'),
(15, 'Gallegos Tenecota Amy Samantha', NULL, '0000'),
(16, 'Guamán Matute Jonnathan Javier', NULL, '0000'),
(17, 'Inga Yunga Michael Eduardo', NULL, '0000'),
(18, 'Lojano Chapa Evelyn Dayanna', NULL, '0000'),
(19, 'Lucero Lazo Mateo Ismael', NULL, '0000'),
(20, 'Matute Esparza Andrés Ismael', NULL, '0000'),
(21, 'Maza Quito Marco Gabriel', NULL, '0000'),
(22, 'Mejía Zhañay Bruno Damián', NULL, '0000'),
(23, 'Neira Maldonado Juan José', NULL, '0000'),
(24, 'Ortiz Terán William Ariel', NULL, '0000'),
(26, 'Peña Morocho Marco Daniel', NULL, '0000'),
(27, 'Pérez Cobos Mailén Sofía', NULL, '0000'),
(28, 'Pesantez Sosa Daniela Alejandra', NULL, '0000'),
(29, 'Pintado Pillco Christopher Rubén', NULL, '0000'),
(30, 'Quijije Ulloa Santiago', NULL, '0000'),
(31, 'Sarmiento Cabrera Axel Josué', NULL, '0000'),
(32, 'Sibri Simbaña Marco Andrés', NULL, '0000'),
(33, 'Sinche Guamán Cameron Scarleth', NULL, '0000'),
(34, 'Tipantaxi Cazorla Christian Andrés', NULL, '0000');
