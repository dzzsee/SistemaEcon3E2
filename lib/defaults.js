import { getDb } from './db.js'

export function getDefaultSettings() {
  const d = getDb()
  const todayWeek = weekKeyNow()
  return {
    globalStart: todayWeek,
    weeklyAmount: 5000,
    weekStartDay: 1,
    currency: '$',
    groupName: '3ro E2',
  }
}

function weekKeyNow() {
  const d = new Date()
  const dayOffset = (d.getDay() - 1 + 7) % 7
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - dayOffset)
  return d.toISOString().slice(0, 10)
}

export function ensureDefaults() {
  const d = getDb()
  const defaults = getDefaultSettings()
  const upsert = d.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING',
  )
  for (const [k, v] of Object.entries(defaults)) {
    upsert.run(k, String(v))
  }
}