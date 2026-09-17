import { ensureSchema, json, getBody } from '../_lib/db.js';
import { signToken } from '../_lib/auth.js';

// POST /api/login - autentica a uno de los 3 administradores
export async function onRequestPost(context) {
  const body = await getBody(context.request);
  const { usuario, pin } = body;
  if (!usuario || !pin) {
    return json({ success: false, message: 'Usuario y PIN son obligatorios.' }, 400);
  }

  await ensureSchema(context.env.DB);

  const admin = await context.env.DB.prepare(
    'SELECT id, usuario, nombre, rol FROM administradores WHERE usuario = ? AND pin = ?'
  )
    .bind(String(usuario).trim().toLowerCase(), String(pin).trim())
    .first();

  if (!admin) {
    return json({ success: false, message: 'Credenciales inválidas. Verifica tu usuario y PIN.' }, 401);
  }

  const token = await signToken(
    { id: admin.id, usuario: admin.usuario, nombre: admin.nombre, rol: admin.rol },
    context.env.SESSION_SECRET || 'econ-3e2-session-secret'
  );

  return json({
    success: true,
    token,
    user: { id: admin.id, usuario: admin.usuario, nombre: admin.nombre, rol: admin.rol }
  });
}