import { destroySession } from '@/lib/auth.js'
import { json } from '@/lib/api.js'

export async function POST() {
  await destroySession()
  return json({ ok: true })
}