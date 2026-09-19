-- Migración: Autenticación de estudiantes (cédula + PIN)
-- Añadir columnas a la tabla miembros
ALTER TABLE miembros ADD COLUMN cedula TEXT UNIQUE;
ALTER TABLE miembros ADD COLUMN pin TEXT NOT NULL DEFAULT '0000';

-- Índice para login rápido por cédula
CREATE INDEX IF NOT EXISTS idx_miembros_cedula ON miembros(cedula);

-- Actualizar 3 miembros de prueba con cédula y PIN
-- Miembro #1: Abad Gómez Carlos René
UPDATE miembros SET cedula = '1712345678', pin = '1234' WHERE numero_lista = 1;

-- Miembro #2: Abad Paucar David Israel
UPDATE miembros SET cedula = '1712345679', pin = '1234' WHERE numero_lista = 2;

-- Miembro #3: Abril Idrovo Pablo Andrés
UPDATE miembros SET cedula = '1712345680', pin = '1234' WHERE numero_lista = 3;