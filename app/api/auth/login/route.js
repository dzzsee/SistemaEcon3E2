import { verifyLogin, createSession } from '@/lib/auth.js'
import { json, badRequest } from '@/lib/api.js'

export async function POST(req) {
  let body
  try {
    body = await req.json()
  } catch {
    return badRequest('Cuerpo inválido')
  }
  const { username, password } = body || {}
  if (!username || !password) return badRequest('Usuario y contraseña requeridos')

  const admin = await verifyLogin(username.trim(), password)
  if (!admin) return json({ error: 'Credenciales inválidas' }, 401)

  await createSession(admin.id, admin.username)
  return json({ ok: true, username: admin.username })
}