import { ensureSchema, json, getBody } from '../_lib/db.js';
import { signToken } from '../_lib/auth.js';
import { withProtection, sanitizeString } from '../_lib/security.js';

// POST /api/login - autentica a uno de los 3 administradores
async function handler(context) {
  const body = await getBody(context.request);
  const { usuario, pin } = body;
  
  if (!usuario || !pin) {
    return json({ success: false, message: 'Usuario y PIN son obligatorios.' }, 400);
  }

  // Sanitizar entrada
  const cleanUsuario = sanitizeString(usuario, 50).toLowerCase();
  const cleanPin = sanitizeString(pin, 20);

  await ensureSchema(context.env.DB);

  const admin = await context.env.DB.prepare(
    'SELECT id, usuario, nombre, rol FROM administradores WHERE usuario = ? AND pin = ?'
  )
    .bind(cleanUsuario, cleanPin)
    .first();

  if (!admin) {
    // Delay para evitar timing attacks
    await new Promise(r => setTimeout(r, 100 + Math.random() * 200));
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

export const onRequestPost = withProtection(handler, { skipRateLimit: false });