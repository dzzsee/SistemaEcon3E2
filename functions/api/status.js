import { ensureSchema, json } from '../_lib/db.js';
import { getAdminFromRequest } from '../_lib/auth.js';

// GET /api/status - estado completo (miembros + semanas + abonos) para renderizar la planilla
export async function onRequestGet(context) {
  const admin = await getAdminFromRequest(context.request, context.env);
  if (!admin) {
    return json({ success: false, message: 'No autorizado. Inicia sesión nuevamente.' }, 401);
  }

  await ensureSchema(context.env.DB);

  const members = await context.env.DB.prepare(
    'SELECT m.numero_lista, m.nombre FROM miembros m ORDER BY m.numero_lista'
  ).all();
  const weeks = await context.env.DB.prepare(
    'SELECT id, numero_semana, fecha_inicio, fecha_fin, monto_cuota, descripcion FROM semanas ORDER BY fecha_inicio'
  ).all();
  const abonos = await context.env.DB.prepare(
    'SELECT id, miembro_id, semana_id, monto, fecha_registro, registrado_por FROM abonos ORDER BY semana_id, miembro_id'
  ).all();

  const grouped = {};
  for (const a of abonos.results) {
    const key = `${a.miembro_id}-${a.semana_id}`;
    if (!grouped[key]) {
      grouped[key] = { total: 0, abonos: [] };
    }
    grouped[key].total += Number(a.monto);
    grouped[key].abonos.push(a);
  }

  return json({
    members: members.results,
    weeks: weeks.results,
    grouped
  });
}