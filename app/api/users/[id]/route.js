import { getDb } from '@/lib/db.js'
import { guard, json, badRequest } from '@/lib/api.js'

export async function GET(_req, { params }) {
  const { response } = await guard()
  if (response) return response

  const d = getDb()
  const user = d.prepare('SELECT * FROM users WHERE id = ?').get(params.id)
  if (!user) return json({ error: 'No encontrado' }, 404)
  const payments = d
    .prepare('SELECT id, week_key, amount, paid_at FROM payments WHERE user_id = ? ORDER BY week_key DESC')
    .all(user.id)
  return json({ user, payments })
}

export async function PUT(req, { params }) {
  const { response } = await guard()
  if (response) return response

  let body
  try {
    body = await req.json()
  } catch {
    return badRequest('Cuerpo inválido')
  }

  const d = getDb()
  const existing = d.prepare('SELECT * FROM users WHERE id = ?').get(params.id)
  if (!existing) return json({ error: 'No encontrado' }, 404)

  const name = body.name != null ? String(body.name).trim() : existing.name
  if (!name) return badRequest('El nombre es requerido')
  const phone = body.phone != null ? (String(body.phone).trim() || null) : existing.phone
  const weekly_amount = body.weekly_amount != null ? Number(body.weekly_amount) : existing.weekly_amount
  const active = body.active != null ? (body.active ? 1 : 0) : existing.active

  d.prepare('UPDATE users SET name = ?, phone = ?, weekly_amount = ?, active = ? WHERE id = ?').run(
    name,
    phone,
    weekly_amount,
    active,
    params.id,
  )
  const user = d.prepare('SELECT * FROM users WHERE id = ?').get(params.id)
  return json({ user })
}

export async function DELETE(_req, { params }) {
  const { response } = await guard()
  if (response) return response

  const d = getDb()
  const result = d.prepare('DELETE FROM users WHERE id = ?').run(params.id)
  if (result.changes === 0) return json({ error: 'No encontrado' }, 404)
  return json({ ok: true })
}