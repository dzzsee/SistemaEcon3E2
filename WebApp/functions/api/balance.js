import { ensureSchema, json } from '../_lib/db.js';
import { getAdminFromRequest } from '../_lib/auth.js';
import { withProtection } from '../_lib/security.js';

// GET /api/balance - resumen del balance global (requiere auth)
async function handler(context) {
  const admin = await getAdminFromRequest(context.request, context.env);
  if (!admin) {
    return json({ success: false, message: 'No autorizado. Inicia sesión nuevamente.' }, 401);
  }

  await ensureSchema(context.env.DB);

  const members = await context.env.DB.prepare('SELECT numero_lista FROM miembros').all();
  const semanas = await context.env.DB.prepare('SELECT id, monto_cuota, fecha_inicio, fecha_fin FROM semanas').all();
  const recaudadoRow = await context.env.DB.prepare(
    'SELECT COALESCE(SUM(monto), 0) as total FROM abonos'
  ).first();
  const gastosRow = await context.env.DB.prepare(
    'SELECT COALESCE(SUM(monto), 0) as total FROM gastos'
  ).first();

  const totalRecaudado = Number(recaudadoRow.total);
  const totalGastos = Number(gastosRow.total);
  const totalEsperado = semanas.results.reduce(
    (acc, s) => acc + s.monto_cuota * members.results.length,
    0
  );
  const hoy = new Date().toISOString().slice(0, 10);
  const semanasCursadas = semanas.results.filter((s) => s.fecha_inicio <= hoy);
  const totalEsperadoCursado = semanasCursadas
    .reduce((acc, s) => acc + s.monto_cuota * members.results.length, 0);

  // Los gastos salen de la caja del grupo, asi que aumentan lo que falta por
  // cobrar y reducen el porcentaje de cumplimiento. El saldo nunca se negocia
  // con max(0, ...) a proposito: puede ser negativo si se gastó más de lo cobrado.
  const saldoCaja = totalRecaudado - totalGastos;
  const totalDeuda = Math.max(0, totalEsperadoCursado - totalRecaudado + totalGastos);
  const porcentajeCobro = totalEsperadoCursado > 0 ? (saldoCaja / totalEsperadoCursado) * 100 : 0;

  return json({
    totalRecaudado,
    totalGastos,
    saldoCaja,
    totalEsperado: totalEsperadoCursado,
    totalEsperadoPeriodo: totalEsperado,
    totalDeuda,
    porcentajeCobro: Number(porcentajeCobro.toFixed(1)),
    totalAlumnos: members.results.length,
    totalSemanas: semanas.results.length,
    semanasCursadas: semanasCursadas.length
  });
}

export const onRequestGet = withProtection(handler);