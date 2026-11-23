import { ensureSchema, json, getBody } from '../_lib/db.js';
import { getAdminFromRequest } from '../_lib/auth.js';
import { withProtection, sanitizeString, validateAmount, validateDate } from '../_lib/security.js';

// GET /api/weeks - lista de semanas de calendario
async function getHandler(context) {
  const admin = await getAdminFromRequest(context.request, context.env);
  if (!admin) {
    return json({ success: false, message: 'No autorizado. Inicia sesión nuevamente.' }, 401);
  }

  await ensureSchema(context.env.DB);
  const { results } = await context.env.DB.prepare(
    'SELECT id, numero_semana, fecha_inicio, fecha_fin, monto_cuota, descripcion FROM semanas ORDER BY fecha_inicio'
  ).all();
  return json(results);
}

// POST /api/weeks - crea una nueva semana (requiere auth)
async function postHandler(context) {
  const admin = await getAdminFromRequest(context.request, context.env);
  if (!admin) {
    return json({ success: false, message: 'No autorizado. Inicia sesión nuevamente.' }, 401);
  }

  const body = await getBody(context.request);
  const { fecha_inicio, fecha_fin, monto_cuota, descripcion } = body;

  if (!fecha_inicio || !fecha_fin || !monto_cuota) {
    return json({ success: false, message: 'fecha_inicio, fecha_fin y monto_cuota son obligatorios.' }, 400);
  }

  // Validación de entrada
  if (!validateDate(fecha_inicio) || !validateDate(fecha_fin)) {
    return json({ success: false, message: 'Formato de fecha inválido. Use AAAA-MM-DD.' }, 400);
  }
  if (!validateAmount(monto_cuota)) {
    return json({ success: false, message: 'Monto de cuota inválido.' }, 400);
  }

  await ensureSchema(context.env.DB);
  const maxRow = await context.env.DB.prepare(
    'SELECT COALESCE(MAX(numero_semana), 0) as max_num FROM semanas'
  ).first();
  const numero = Number(maxRow.max_num) + 1;

  const result = await context.env.DB.prepare(
    'INSERT INTO semanas (numero_semana, fecha_inicio, fecha_fin, monto_cuota, descripcion) VALUES (?, ?, ?, ?, ?)'
  )
    .bind(numero, fecha_inicio, fecha_fin, Number(monto_cuota), sanitizeString(descripcion || `Semana ${numero}`, 200))
    .run();

  return json({ success: true, id: result.meta.last_row_id, numero_semana: numero });
}

export const onRequestGet = withProtection(getHandler);
export const onRequestPost = withProtection(postHandler);