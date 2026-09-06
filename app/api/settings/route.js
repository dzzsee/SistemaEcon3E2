import { getRuntimeSettings } from '@/lib/settings.js'
import { setSetting } from '@/lib/db.js'
import { guard, json, badRequest } from '@/lib/api.js'

export async function GET() {
  const { response } = await guard()
  if (response) return response
  const settings = await getRuntimeSettings()
  return json({ settings })
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

  const current = await getRuntimeSettings()
  const fields = ['globalStart', 'weeklyAmount', 'weekStartDay', 'currency', 'groupName']
  for (const f of fields) {
    if (body[f] == null) continue
    let value = body[f]
    if (f === 'weeklyAmount') {
      const n = Number(value)
      if (!Number.isFinite(n) || n < 0) return badRequest('Monto inválido')
      value = n
    }
    if (f === 'weekStartDay') {
      const n = Number(value)
      if (n < 0 || n > 6) return badRequest('Día de inicio inválido')
      value = n
    }
    if (f === 'globalStart') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return badRequest('Fecha inválida')
    }
    setSetting(f, value)
  }

  const settings = await getRuntimeSettings()
  return json({ settings })
}