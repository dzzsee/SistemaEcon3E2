import { ensureSchema, json, getConfig } from '../_lib/db.js';
import { getAdminFromRequest } from '../_lib/auth.js';

// GET /api/balance - resumen del balance global (requiere auth)
export async function onRequestGet(context) {
  const admin = await getAdminFromRequest(context.request, context.env);
  if (!admin) {
    return json({ success: false, message: 'No autorizado. Inicia sesión nuevamente.' }, 401);
  }

  await ensureSchema(context.env.DB);
  const config = await getConfig(context.env.DB);

  const members = await context.env.DB.prepare('SELECT numero_lista FROM miembros').all();
  const semanas = await context.env.DB.prepare('SELECT id, fecha_inicio, fecha_fin, monto_cuota FROM semanas').all();
  const recaudadoRow = await context.env.DB.prepare(
    'SELECT COALESCE(SUM(monto), 0) as total FROM abonos'
  ).first();

  // Solo las semanas ya cursadas (terminadas hasta hoy)
  const today = new Date().toISOString().slice(0, 10);
  const semanasCursadas = semanas.results.filter((s) => s.fecha_inicio <= today);
  const numeroSemanas = semanasCursadas.length;

  const totalRecaudado = Number(recaudadoRow.total);
  const totalEsperado = semanasCursadas.reduce(
    (acc, s) => acc + s.monto_cuota * members.results.length,
    0
  );
  const totalDeuda = Math.max(0, totalEsperado - totalRecaudado);
  const porcentajeCobro = totalEsperado > 0 ? (totalRecaudado / totalEsperado) * 100 : 0;

  return json({
    totalRecaudado,
    totalEsperado,
    totalDeuda,
    porcentajeCobro: Number(porcentajeCobro.toFixed(1)),
    totalAlumnos: members.results.length,
    totalSemanas: semanas.results.length,
    semanasCursadas: numeroSemanas,
    cuotaSemanal: Number(config.cuota_semanal)
  });
}