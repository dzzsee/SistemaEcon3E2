import { ensureSchema, json } from '../_lib/db.js';

// GET /api/health - verifica disponibilidad de las funciones y D1
export async function onRequestGet(context) {
  try {
    await ensureSchema(context.env.DB);
    return json({ ok: true, mode: 'd1', message: 'Cloudflare D1 conectado' });
  } catch (err) {
    return json({ ok: false, error: String(err) }, 500);
  }
}