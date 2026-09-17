import { ensureSchema, json } from '../_lib/db.js';
import { getAdminFromRequest } from '../_lib/auth.js';

// GET /api/report - datos completos para exportación (CSV/Excel/PDF)
export async function onRequestGet(context) {
  const admin = await getAdminFromRequest(context.request, context.env);
  if (!admin) {
    return json({ success: false, message: 'No autorizado. Inicia sesión nuevamente.' }, 401);
  }

  await ensureSchema(context.env.DB);

  const members = await context.env.DB.prepare(
    'SELECT numero_lista, nombre FROM miembros ORDER BY numero_lista'
  ).all();
  const weeks = await context.env.DB.prepare(
    'SELECT id, numero_semana, fecha_inicio, fecha_fin, monto_cuota, descripcion FROM semanas ORDER BY fecha_inicio'
  ).all();
  const abonos = await context.env.DB.prepare(
    'SELECT miembro_id, semana_id, monto FROM abonos'
  ).all();

  // Tabla miembro x semana con abonado/deuda/estado
  const matrix = members.results.map((m) => {
    const row = {
      numero_lista: m.numero_lista,
      nombre: m.nombre,
      total_abonado: 0,
      semanas: {}
    };
    for (const w of weeks.results) {
      const abonosMember = abonos.results.filter((a) => a.miembro_id === m.numero_lista && a.semana_id === w.id);
      const abonado = abonosMember.reduce((acc, a) => acc + Number(a.monto), 0);
      const deuda = Math.max(0, Number(w.monto_cuota) - abonado);
      const estado = abonado >= w.monto_cuota ? 'pagado' : abonado > 0 ? 'abonado' : 'deuda';
      row.total_abonado += abonado;
      row.semanas[w.id] = { abonado, deuda, estado, cuota: w.monto_cuota };
    }
    return row;
  });

  return json({
    generated_at: new Date().toISOString(),
    weeks: weeks.results,
    matrix
  });
}