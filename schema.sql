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
INSERT OR IGNORE INTO miembros (numero_lista, nombre) VALUES
(1, 'Abad Gómez Carlos René'),
(2, 'Abad Paucar David Israel'),
(3, 'Abril Idrovo Pablo Andrés'),
(4, 'Álava Cabrera Mateo Alexander'),
(5, 'Armijos Loja María Fernanda'),
(6, 'Barros Valladares Jordán Martín'),
(7, 'Bravo Vázquez David Andrés'),
(8, 'Bustamante Guzmán Kevin Andrés'),
(10, 'Castillo Muñoz Ana Paula'),
(11, 'Cedillo Guaicha Diego Sebastián'),
(12, 'Contreras Peralta Samantha Belén'),
(13, 'Durán Ordóñez Angélica Cristina'),
(14, 'Espinosa Salazar Anthony Alexander'),
(15, 'Gallegos Tenecota Amy Samantha'),
(16, 'Guamán Matute Jonnathan Javier'),
(17, 'Inga Yunga Michael Eduardo'),
(18, 'Lojano Chapa Evelyn Dayanna'),
(19, 'Lucero Lazo Mateo Ismael'),
(20, 'Matute Esparza Andrés Ismael'),
(21, 'Maza Quito Marco Gabriel'),
(22, 'Mejía Zhañay Bruno Damián'),
(23, 'Neira Maldonado Juan José'),
(24, 'Ortiz Terán William Ariel'),
(26, 'Peña Morocho Marco Daniel'),
(27, 'Pérez Cobos Mailén Sofía'),
(28, 'Pesantez Sosa Daniela Alejandra'),
(29, 'Pintado Pillco Christopher Rubén'),
(30, 'Quijije Ulloa Santiago'),
(31, 'Sarmiento Cabrera Axel Josué'),
(32, 'Sibri Simbaña Marco Andrés'),
(33, 'Sinche Guamán Cameron Scarleth'),
(34, 'Tipantaxi Cazorla Christian Andrés');
