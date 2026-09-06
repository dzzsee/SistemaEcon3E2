import { getDb } from '@/lib/db.js'
import { getRuntimeSettings } from '@/lib/settings.js'
import { guard, json, badRequest } from '@/lib/api.js'
import { currentWeekKey } from '@/lib/arrears.js'

export async function GET() {
  const { response } = await guard()
  if (response) return response

  const d = getDb()
  const payments = d
    .prepare(
      `SELECT p.id, p.user_id, p.week_key, p.amount, p.paid_at, u.name
       FROM payments p JOIN users u ON u.id = p.user_id
       ORDER BY p.week_key DESC, p.paid_at DESC`,
    )
    .all()
  return json({ payments })
}

export async function POST(req) {
  const { response } = await guard()
  if (response) return response

  let body
  try {
    body = await req.json()
  } catch {
    return badRequest('Cuerpo inválido')
  }
  const userId = body.user_id
  if (!userId) return badRequest('user_id requerido')

  const d = getDb()
  const user = d.prepare('SELECT * FROM users WHERE id = ?').get(userId)
  if (!user) return badRequest('Usuario no encontrado')

  const settings = await getRuntimeSettings()
  const week = body.week_key || currentWeekKey(settings.weekStartDay)
  const amount = body.amount != null ? Number(body.amount) : user.weekly_amount ?? settings.weeklyAmount

  let result
  try {
    result = d
      .prepare(
        'INSERT INTO payments (user_id, week_key, amount, paid_at) VALUES (?, ?, ?, ?)',
      )
      .run(userId, week, amount, new Date().toISOString())
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) {
      return json({ error: 'Esa semana ya fue pagada' }, 409)
    }
    throw e
  }

  const payment = d.prepare('SELECT * FROM payments WHERE id = ?').get(result.lastInsertRowid)
  return json({ payment }, 201)
}