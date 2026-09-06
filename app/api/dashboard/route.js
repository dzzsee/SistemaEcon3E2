import { getDb } from '@/lib/db.js'
import { getRuntimeSettings } from '@/lib/settings.js'
import { guard, json } from '@/lib/api.js'
import { computeStatus, latestUnpaidWeek } from '@/lib/arrears.js'

export async function GET() {
  const { response } = await guard()
  if (response) return response

  const d = getDb()
  const settings = await getRuntimeSettings()

  const users = d
    .prepare(
      'SELECT id, name, phone, weekly_amount, active, created_at FROM users ORDER BY name COLLATE NOCASE',
    )
    .all()

  const payStmt = d.prepare('SELECT week_key, amount, paid_at FROM payments WHERE user_id = ?')
  const rows = users.map((u) => {
    const pays = payStmt.all(u.id)
    const paidWeeks = pays.map((p) => p.week_key)
    const amount = u.weekly_amount ?? settings.weeklyAmount
    const status = computeStatus({
      globalStart: settings.globalStart,
      weekStartDay: settings.weekStartDay,
      paidWeeks,
    })
    const debt = status.unpaidWeeks * amount
    const nextUnpaid = latestUnpaidWeek({
      globalStart: settings.globalStart,
      weekStartDay: settings.weekStartDay,
      paidWeeks,
    })
    return {
      ...u,
      amount,
      currency: settings.currency,
      status,
      debt,
      nextUnpaid,
      paidCount: status.paidCount,
      totalWeeks: status.totalWeeks,
    }
  })

  const active = rows.filter((r) => r.active)
  const atrasados = active.filter((r) => r.status.atrasado)
  const alDia = active.filter((r) => !r.status.atrasado)
  const totalDebt = active.reduce((s, r) => s + r.debt, 0)
  const oneWeek = atrasados.filter((r) => r.status.key === '1sem').length
  const twoWeeks = atrasados.filter((r) => r.status.key === '2sem').length

  return json({
    settings,
    stats: {
      totalActive: active.length,
      totalInactive: rows.length - active.length,
      alDia: alDia.length,
      atrasados: atrasados.length,
      oneWeek,
      twoWeeks,
      totalDebt,
    },
    users: rows,
  })
}