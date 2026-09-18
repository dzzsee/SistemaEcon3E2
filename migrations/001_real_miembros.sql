-- Migración: reemplaza los 20 miembros de prueba por la lista real
-- BACH Informática 2º E2 (2025/2026). Excluidos #9 y #25.

PRAGMA foreign_keys = OFF;

-- Elimina abonos huérfanos y miembros previos para reiniciar la lista.
DELETE FROM abonos;
DELETE FROM miembros;

PRAGMA foreign_keys = ON;

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