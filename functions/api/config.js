import { ensureSchema, json, getBody, getConfig, setConfig, regenerateWeeks } from '../_lib/db.js';
import { getUserFromRequest } from '../_lib/auth.js';

// GET /api/config - configuración y usuarios (requiere auth admin)
export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env);
  if (!user || user.tipo !== 'admin') {
    return json({ success: false, message: 'No autorizado. Inicia sesión nuevamente.' }, 401);
  }

  await ensureSchema(context.env.DB);
  const config = await getConfig(context.env.DB);
  const { results } = await context.env.DB.prepare(
    'SELECT id, usuario, nombre, rol FROM administradores ORDER BY id'
  ).all();

  return json({
    success: true,
    config,
    admins: results
  });
}

// POST /api/config - guarda configuración o edita usuarios (requiere auth admin)
export async function onRequestPost(context) {
  const user = await getUserFromRequest(context.request, context.env);
  if (!user || user.tipo !== 'admin') {
    return json({ success: false, message: 'No autorizado. Inicia sesión nuevamente.' }, 401);
  }

  await ensureSchema(context.env.DB);
  const body = await getBody(context.request);
  const { accion } = body;

  if (accion === 'config') {
    return handleSaveConfig(context, body);
  }

  if (accion === 'semana') {
    return handleRegenerateWeek(context, body);
  }

  if (accion === 'usuario') {
    return handleSaveAdmin(context, body);
  }

  return json({ success: false, message: 'Acción no válida.' }, 400);
}

async function handleSaveConfig(context, body) {
  const cuota = Number(body.cuota_semanal);
  const inicio = String(body.periodo_inicio || '').trim();
  const fin = String(body.periodo_fin || '').trim();

  if (!cuota || cuota <= 0) {
    return json({ success: false, message: 'La cuota semanal debe ser mayor a cero.' }, 400);
  }
  if (!inicio || !fin) {
    return json({ success: false, message: 'El periodo (inicio y fin) es obligatorio.' }, 400);
  }

  const config = await setConfig(context.env.DB, {
    cuota_semanal: cuota,
    periodo_inicio: inicio,
    periodo_fin: fin
  });

  return json({ success: true, config });
}

async function handleRegenerateWeek(context, body) {
  const cuota = Number(body.cuota_semanal);
  const inicio = String(body.periodo_inicio || '').trim();
  const fin = String(body.periodo_fin || '').trim();

  if (!cuota || cuota <= 0) {
    return json({ success: false, message: 'La cuota semanal debe ser mayor a cero.' }, 400);
  }
  if (!inicio || !fin) {
    return json({ success: false, message: 'El periodo (inicio y fin) es obligatorio.' }, 400);
  }

  const resultado = await regenerateWeeks(context.env.DB, {
    monto_cuota: cuota,
    fecha_inicio: inicio,
    fecha_fin: fin
  });

  return json({ success: true, ...resultado });
}

async function handleSaveAdmin(context, body) {
  const id = Number(body.id);
  const usuario = String(body.usuario || '').trim().toLowerCase();
  const nombre = String(body.nombre || '').trim();
  const pin = String(body.pin || '').trim();

  if (!id || !usuario || !nombre) {
    return json({ success: false, message: 'Nombre, usuario y rol son obligatorios.' }, 400);
  }

  // Validar unicidad de usuario
  const dup = await context.env.DB.prepare(
    'SELECT id FROM administradores WHERE usuario = ? AND id != ?'
  )
    .bind(usuario, id)
    .first();
  if (dup) {
    return json({ success: false, message: 'Ese usuario ya existe. Elige otro.' }, 400);
  }

  if (pin.length >= 4 && pin.length <= 8) {
    await context.env.DB.prepare(
      'UPDATE administradores SET usuario = ?, nombre = ?, pin = ? WHERE id = ?'
    )
      .bind(usuario, nombre, pin, id)
      .run();
  } else {
    await context.env.DB.prepare('UPDATE administradores SET usuario = ?, nombre = ? WHERE id = ?')
      .bind(usuario, nombre, id)
      .run();
  }

  const { results } = await context.env.DB.prepare(
    'SELECT id, usuario, nombre, rol FROM administradores ORDER BY id'
  ).all();

  return json({ success: true, admins: results });
}