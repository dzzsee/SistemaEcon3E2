import { ensureSchema, json } from '../_lib/db.js';

// GET /api/members - lista fija de integrantes ordenada por número de lista
export async function onRequestGet(context) {
  await ensureSchema(context.env.DB);
  const { results } = await context.env.DB.prepare(
    'SELECT numero_lista, nombre FROM miembros ORDER BY numero_lista'
  ).all();
  return json(results);
}