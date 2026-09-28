import { ensureSchema, json } from '../_lib/db.js';
import { getAdminFromRequest } from '../_lib/auth.js';
import { withProtection } from '../_lib/security.js';

// GET /api/members - lista fija de integrantes ordenada por número de lista
async function handler(context) {
  const admin = await getAdminFromRequest(context.request, context.env);
  if (!admin) {
    return json({ success: false, message: 'No autorizado. Inicia sesión nuevamente.' }, 401);
  }

  await ensureSchema(context.env.DB);
  const { results } = await context.env.DB.prepare(
    'SELECT numero_lista, nombre FROM miembros ORDER BY numero_lista'
  ).all();
  return json(results);
}

export const onRequestGet = withProtection(handler);