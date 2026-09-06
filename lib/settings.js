import { getSettings } from '@/lib/db.js'
import { json } from '@/lib/api.js'

export async function getRuntimeSettings() {
  const s = getSettings()
  return {
    globalStart: s.globalStart || '',
    weeklyAmount: Number(s.weeklyAmount) || 0,
    weekStartDay: Number(s.weekStartDay) ?? 1,
    currency: s.currency || '$',
    groupName: s.groupName || 'Grupo',
  }
}

export default async function handler() {
  return json({})
}