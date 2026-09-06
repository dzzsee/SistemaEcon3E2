import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { getDb } from './db.js'

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || 'cambia-esta-clave-secreta-en-produccion-123',
)
const COOKIE = 'session'

async function sign(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET)
}

export async function createSession(adminId, username) {
  const token = await sign({ adminId, username })
  cookies().set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
  return token
}

export async function getSession() {
  const token = cookies().get(COOKIE)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload
  } catch {
    return null
  }
}

export async function destroySession() {
  cookies().set(COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
}

export async function verifyLogin(username, password) {
  const d = getDb()
  const admin = d.prepare('SELECT id, username, password_hash FROM admin WHERE username = ?').get(username)
  if (!admin) return null
  const ok = bcrypt.compareSync(password, admin.password_hash)
  if (!ok) return null
  return { id: admin.id, username: admin.username }
}

export async function requireAuth() {
  const session = await getSession()
  if (!session) {
    return null
  }
  return session
}