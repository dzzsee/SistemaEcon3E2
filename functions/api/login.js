import { ensureSchema, json, getBody } from '../_lib/db.js';
import { signToken } from '../_lib/auth.js';

// POST /api/login - autentica administradores (usuario+pin) o estudiantes (cedula+pin)
export async function onRequestPost(context) {
  const body = await getBody(context.request);
  const { usuario, pin, cedula } = body;

  await ensureSchema(context.env.DB);

  // 1. Intentar login como administrador (usuario + pin) - case insensitive usuario
  if (usuario && pin) {
    const admin = await context.env.DB.prepare(
      'SELECT id, usuario, nombre, rol FROM administradores WHERE LOWER(usuario) = LOWER(?) AND pin = ?'
    )
      .bind(String(usuario).trim(), String(pin).trim())
      .first();

    if (admin) {
      const token = await signToken(
        { id: admin.id, usuario: admin.usuario, nombre: admin.nombre, rol: admin.rol, tipo: 'admin' },
        context.env.SESSION_SECRET || 'econ-3e2-session-secret'
      );

      return json({
        success: true,
        token,
        user: { id: admin.id, usuario: admin.usuario, nombre: admin.nombre, rol: admin.rol, tipo: 'admin' }
      });
    }
  }

  // 2. Intentar login como estudiante (cedula + pin)
  if (cedula && pin) {
    const miembro = await context.env.DB.prepare(
      'SELECT numero_lista, nombre, cedula FROM miembros WHERE cedula = ? AND pin = ? AND activo = 1'
    )
      .bind(String(cedula).trim(), String(pin).trim())
      .first();

    if (miembro) {
      const token = await signToken(
        { id: miembro.numero_lista, nombre: miembro.nombre, cedula: miembro.cedula, rol: 'estudiante', tipo: 'estudiante' },
        context.env.SESSION_SECRET || 'econ-3e2-session-secret'
      );

      return json({
        success: true,
        token,
        user: { id: miembro.numero_lista, nombre: miembro.nombre, cedula: miembro.cedula, rol: 'estudiante', tipo: 'estudiante' }
      });
    }
  }

  return json({ success: false, message: 'Credenciales inválidas. Verifica tus datos.' }, 401);
}