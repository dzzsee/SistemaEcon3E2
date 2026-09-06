import { getDb } from '@/lib/db.js'
import { getRuntimeSettings } from '@/lib/settings.js'
import { guard } from '@/lib/api.js'
import { computeStatus } from '@/lib/arrears.js'

function csvField(value) {
  const s = String(value ?? '')
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
  return s
}

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

  const payStmt = d.prepare('SELECT week_key FROM payments WHERE user_id = ?')
  const debtors = users
    .map((u) => {
      const paidWeeks = payStmt.all(u.id).map((p) => p.week_key)
      const amount = u.weekly_amount ?? settings.weeklyAmount
      const status = computeStatus({
        globalStart: settings.globalStart,
        weekStartDay: settings.weekStartDay,
        paidWeeks,
      })
      const debt = status.unpaidWeeks * amount
      return {
        name: u.name,
        phone: u.phone || '',
        status: status.atrasado ? 'Atrasado' : 'Al día',
        unpaidWeeks: status.unpaidWeeks,
        amount,
        debt,
      }
    })
    .filter((r) => r.unpaidWeeks > 0)

  const header = ['Nombre', 'Teléfono', 'Estado', 'Semanas adeudadas', 'Cuota semanal', 'Deuda total']
  const lines = debtors.map((r) =>
    [
      r.name,
      r.phone,
      r.status,
      r.unpaidWeeks,
      r.amount.toFixed(2),
      r.debt.toFixed(2),
    ]
      .map(csvField)
      .join(','),
  )

  const csv = '\uFEFF' + [header.join(','), ...lines].join('\n')

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="deudores.csv"',
    },
  })
}