'use client'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

export function fmtAmount(value, currency = '$') {
  const n = Math.round(Number(value) || 0)
  return `${currency}${n.toLocaleString('es-AR')}`
}

export function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso)
  return d.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function weekLabel(key) {
  if (!key) return '—'
  const d = new Date(key + 'T00:00:00')
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
}

export function initials(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  const a = parts[0]?.[0] || '?'
  const b = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (a + b).toUpperCase()
}

export const STATUS = {
  aldia: { label: 'Al día', tone: 'ok' },
  '1sem': { label: '1 semana', tone: 'warn' },
  '2sem': { label: '2+ semanas', tone: 'bad' },
}

export const WEEK_DAYS = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
]

export function icon(name) {
  return { name }
}