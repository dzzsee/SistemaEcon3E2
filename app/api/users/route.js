import { getDb } from '@/lib/db.js'
import { guard, json, badRequest } from '@/lib/api.js'

export async function GET() {
  const { response } = await guard()
  if (response) return response

  const d = getDb()
  const users = d
    .prepare('SELECT id, name, phone, weekly_amount, active, created_at FROM users ORDER BY name COLLATE NOCASE')
    .all()
  return json({ users })
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
  const name = (body.name || '').trim()
  if (!name) return badRequest('El nombre es requerido')

  const weeklyAmount = body.weekly_amount != null ? Number(body.weekly_amount) : null
  const phone = (body.phone || '').trim() || null

  const d = getDb()
  const result = d
    .prepare('INSERT INTO users (name, phone, weekly_amount, active, created_at) VALUES (?, ?, ?, 1, ?)')
    .run(name, phone, weeklyAmount, new Date().toISOString())

  const user = d.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid)
  return json({ user }, 201)
}