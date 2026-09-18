-- Migración 002: cuota $2.50 y calendario lectivo oct → mayo
-- Reconstruye el calendario de semanas del año lectivo 2025/2026
-- (primer lunes de octubre 2025 hasta la semana de mediados de mayo 2026).

PRAGMA foreign_keys = OFF;

-- Elimina semanas y abonos previos para reconstruir el calendario
DELETE FROM abonos;
DELETE FROM semanas;

PRAGMA foreign_keys = ON;

-- Asegura la configuración base
INSERT OR IGNORE INTO configuracion (clave, valor) VALUES
('cuota_semanal', '2.50'),
('periodo_inicio', '2025-10-01'),
('periodo_fin', '2026-05-15');

INSERT INTO configuracion (clave, valor)
VALUES ('cuota_semanal', '2.50'), ('periodo_inicio', '2025-10-01'), ('periodo_fin', '2026-05-15')
ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor;

-- Genera las 32 semanas lectivas (2025-10-06 → 2026-05-17)
WITH RECURSIVE mondays(d, n) AS (
  SELECT date('2025-10-06'), 1
  UNION ALL
  SELECT date(d, '+7 days'), n + 1 FROM mondays WHERE n < 32
)
INSERT INTO semanas (numero_semana, fecha_inicio, fecha_fin, monto_cuota, descripcion)
SELECT n, d, date(d, '+6 days'), 2.5, 'Semana ' || n FROM mondays;