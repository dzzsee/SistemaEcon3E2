import { getDb } from '@/lib/db.js'
import { getRuntimeSettings } from '@/lib/settings.js'
import { guard, json, badRequest } from '@/lib/api.js'
import {
  currentWeekKey,
  weekKey,
  weeksBetween,
  addWeeks,
} from '@/lib/arrears.js'

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
  const weeklyAmount = user.weekly_amount ?? settings.weeklyAmount

  const requestedAmount = body.amount != null ? Number(body.amount) : weeklyAmount
  if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
    return badRequest('Monto inválido')
  }

  // Weeks the member can still pay for, from oldest to newest.
  const paidRows = d
    .prepare('SELECT week_key FROM payments WHERE user_id = ?')
    .all(userId)
  const paid = new Set(paidRows.map((p) => p.week_key))
  const today = currentWeekKey(settings.weekStartDay)

  const unpaidWeeks = []
  if (new Date(settings.globalStart + 'T00:00:00Z') <= new Date(today + 'T00:00:00Z')) {
    const totalWeeks = weeksBetween(settings.globalStart, today) + 1
    for (let i = 0; i < totalWeeks; i++) {
      const key = weekKey(addWeeks(new Date(settings.globalStart + 'T00:00:00Z'), i), settings.weekStartDay)
      if (new Date(key + 'T00:00:00Z') > new Date(today + 'T00:00:00Z')) break
      if (!paid.has(key)) unpaidWeeks.push(key)
    }
  }

  const explicitWeek = body.week_key || null
  if (explicitWeek && !unpaidWeeks.includes(explicitWeek)) {
    unpaidWeeks.push(explicitWeek)
  }

  if (unpaidWeeks.length === 0) {
    return json({ error: 'No hay semanas pendientes por pagar' }, 409)
  }

  // Cover as many unpaid weeks as the amount allows (oldest first).
  let remaining = requestedAmount
  const addStmt = d.prepare(
    'INSERT INTO payments (user_id, week_key, amount, paid_at) VALUES (?, ?, ?, ?)',
  )
  const created = []
  const paidAt = new Date().toISOString()

  const round2 = (n) => Math.round(n * 100) / 100

  for (const key of unpaidWeeks) {
    if (remaining <= 0) break
    const take = Math.min(remaining, weeklyAmount)
    remaining = round2(remaining - take)
    const res = addStmt.run(userId, key, round2(take), paidAt)
    created.push(res.lastInsertRowid)
  }

  if (created.length === 0) {
    return json({ error: 'No se pudo registrar el pago' }, 400)
  }

  const payments = d
    .prepare('SELECT * FROM payments WHERE id IN (' + created.map(() => '?').join(',') + ')')
    .all(...created)
  return json({ payments }, 201)
}