import { ensureSchema, json, getBody } from '../_lib/db.js';
import { getUserFromRequest } from '../_lib/auth.js';

// POST /api/payments - registra un abono de un miembro en una semana (requiere auth admin)
export async function onRequestPost(context) {
  const user = await getUserFromRequest(context.request, context.env);
  if (!user || user.tipo !== 'admin') {
    return json({ success: false, message: 'No autorizado. Inicia sesión nuevamente.' }, 401);
  }

  const body = await getBody(context.request);
  const { miembro_id, semana_id, monto, nota } = body;

  if (!miembro_id || !semana_id || !monto) {
    return json({ success: false, message: 'miembro_id, semana_id y monto son obligatorios.' }, 400);
  }

  const montoNum = Number(monto);
  if (isNaN(montoNum) || montoNum <= 0) {
    return json({ success: false, message: 'El monto debe ser mayor a cero.' }, 400);
  }

  await ensureSchema(context.env.DB);

  const result = await context.env.DB.prepare(
    `INSERT INTO abonos (miembro_id, semana_id, monto, registrado_por, nota)
     VALUES (?, ?, ?, ?, ?)`
  )
    .bind(Number(miembro_id), Number(semana_id), montoNum, user.nombre, nota || '')
    .run();

  // Retornar el total abonado acumulado del miembro en la semana
  const total = await context.env.DB.prepare(
    'SELECT COALESCE(SUM(monto), 0) as total FROM abonos WHERE miembro_id = ? AND semana_id = ?'
  )
    .bind(Number(miembro_id), Number(semana_id))
    .first();

  const cuota = await context.env.DB.prepare(
    'SELECT monto_cuota FROM semanas WHERE id = ?'
  )
    .bind(Number(semana_id))
    .first();

  return json({
    success: true,
    id: result.meta.last_row_id,
    abonado: total.total,
    cuota: cuota ? cuota.monto_cuota : 0
  });
}

// GET /api/payments - historial completo de abonos (requiere auth admin)
export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env);
  if (!user || user.tipo !== 'admin') {
    return json({ success: false, message: 'No autorizado. Inicia sesión nuevamente.' }, 401);
  }

  await ensureSchema(context.env.DB);
  const { results } = await context.env.DB.prepare(
    `SELECT a.id, a.miembro_id, a.semana_id, a.monto, a.fecha_registro, a.registrado_por, a.nota
     FROM abonos a ORDER BY a.semana_id, a.miembro_id`
  ).all();
  return json(results);
}

// DELETE /api/payments - elimina los abonos de un miembro en una semana
export async function onRequestDelete(context) {
  const user = await getUserFromRequest(context.request, context.env);
  if (!user || user.tipo !== 'admin') {
    return json({ success: false, message: 'No autorizado. Inicia sesión nuevamente.' }, 401);
  }

  const body = await getBody(context.request);
  const miembroId = Number(body.miembro_id);
  const semanaId = Number(body.semana_id);

  if (!miembroId || !semanaId) {
    return json({ success: false, message: 'miembro_id y semana_id son obligatorios.' }, 400);
  }

  await ensureSchema(context.env.DB);
  const result = await context.env.DB.prepare(
    'DELETE FROM abonos WHERE miembro_id = ? AND semana_id = ?'
  )
    .bind(miembroId, semanaId)
    .run();

  return json({ success: true, eliminados: result.meta.changes || 0 });
}