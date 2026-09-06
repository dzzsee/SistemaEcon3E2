import { getDb } from '@/lib/db.js'
import { guard, json, badRequest } from '@/lib/api.js'

export async function DELETE(_req, { params }) {
  const { response } = await guard()
  if (response) return response

  const d = getDb()
  const result = d.prepare('DELETE FROM payments WHERE id = ?').run(params.id)
  if (result.changes === 0) return json({ error: 'No encontrado' }, 404)
  return json({ ok: true })
}