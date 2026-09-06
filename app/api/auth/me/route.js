import { requireAuth } from '@/lib/auth.js'
import { json } from '@/lib/api.js'

export async function GET() {
  const session = await requireAuth()
  if (!session) return json({ authenticated: false })
  return json({ authenticated: true, username: session.username })
}