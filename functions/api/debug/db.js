import { ensureSchema, json } from '../../_lib/db.js';
import { withProtection } from '../../_lib/security.js';

// GET /api/debug/db - debug endpoint to check database contents
async function handler(context) {
  await ensureSchema(context.env.DB);
  
  const admins = await context.env.DB.prepare('SELECT * FROM administradores').all();
  const members = await context.env.DB.prepare('SELECT COUNT(*) as count FROM miembros').first();
  const weeks = await context.env.DB.prepare('SELECT COUNT(*) as count FROM semanas').first();
  const gastos = await context.env.DB.prepare('SELECT COUNT(*) as count FROM gastos').first();
  const abonos = await context.env.DB.prepare('SELECT COUNT(*) as count FROM abonos').first();
  const rateLimits = await context.env.DB.prepare('SELECT COUNT(*) as count FROM rate_limits').first();
  
  return json({
    admins: admins.results,
    counts: {
      members: members.count,
      weeks: weeks.count,
      gastos: gastos.count,
      abonos: abonos.count,
      rateLimits: rateLimits.count
    }
  });
}

export const onRequestGet = withProtection(handler, { skipRateLimit: true });