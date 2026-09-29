import { ensureSchema, getBody, getConfig, json, regenerateWeeks, setConfig } from '../_lib/db.js';
import { getAdminFromRequest } from '../_lib/auth.js';

async function authorize(request, env) {
  return getAdminFromRequest(request, env);
}

export async function onRequestGet(context) {
  const user = await authorize(context.request, context.env);
  if (!user) return json({ success: false, message: 'No autorizado.' }, 401);

  await ensureSchema(context.env.DB);
  const config = await getConfig(context.env.DB);
  const { results: admins } = await context.env.DB.prepare(
    'SELECT id, usuario, nombre, rol FROM administradores ORDER BY id'
  ).all();
  return json({ success: true, config, admins });
}

export async function onRequestPost(context) {
  const user = await authorize(context.request, context.env);
  if (!user) return json({ success: false, message: 'No autorizado.' }, 401);

  await ensureSchema(context.env.DB);
  const body = await getBody(context.request);
  try {
    if (body.accion === 'config') {
      const cuota = Number(body.cuota_semanal);
      const inicio = String(body.periodo_inicio || '').trim();
      const fin = String(body.periodo_fin || '').trim();
      if (!(cuota > 0) || !inicio || !fin) throw new Error('Cuota y periodo son obligatorios.');
      const config = await setConfig(context.env.DB, { cuota_semanal: cuota, periodo_inicio: inicio, periodo_fin: fin });
      await context.env.DB.prepare('UPDATE semanas SET monto_cuota = ?').bind(cuota).run();
      return json({ success: true, config });
    }

    if (body.accion === 'semana') {
      const cuota = Number(body.cuota_semanal);
      const inicio = String(body.periodo_inicio || '').trim();
      const fin = String(body.periodo_fin || '').trim();
      if (!(cuota > 0) || !inicio || !fin) throw new Error('Cuota y periodo son obligatorios.');
      const result = await regenerateWeeks(context.env.DB, { monto_cuota: cuota, fecha_inicio: inicio, fecha_fin: fin });
      await setConfig(context.env.DB, { cuota_semanal: cuota, periodo_inicio: inicio, periodo_fin: fin });
      return json({ success: true, ...result });
    }

    if (body.accion === 'usuario') {
      const id = Number(body.id);
      const nombre = String(body.nombre || '').trim();
      const usuario = String(body.usuario || '').trim().toLowerCase();
      const pin = String(body.pin || '').trim();
      if (!id || !nombre || !usuario) throw new Error('Nombre y usuario son obligatorios.');
      const duplicate = await context.env.DB.prepare('SELECT id FROM administradores WHERE usuario = ? AND id != ?').bind(usuario, id).first();
      if (duplicate) throw new Error('Ese usuario ya existe.');
      if (pin) {
        if (pin.length < 4 || pin.length > 8) throw new Error('El PIN debe tener entre 4 y 8 caracteres.');
        await context.env.DB.prepare('UPDATE administradores SET usuario = ?, nombre = ?, pin = ? WHERE id = ?').bind(usuario, nombre, pin, id).run();
      } else {
        await context.env.DB.prepare('UPDATE administradores SET usuario = ?, nombre = ? WHERE id = ?').bind(usuario, nombre, id).run();
      }
      const { results: admins } = await context.env.DB.prepare('SELECT id, usuario, nombre, rol FROM administradores ORDER BY id').all();
      return json({ success: true, admins });
    }
    throw new Error('Acción no válida.');
  } catch (error) {
    return json({ success: false, message: error.message }, 400);
  }
}