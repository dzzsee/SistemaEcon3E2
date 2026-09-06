import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth.js'

export function json(data, status = 200) {
  return NextResponse.json(data, { status })
}

export function unauthorized() {
  return json({ error: 'No autorizado' }, 401)
}

export async function guard() {
  const session = await requireAuth()
  if (!session) return { session: null, response: unauthorized() }
  return { session, response: null }
}

export function badRequest(message) {
  return json({ error: message }, 400)
}