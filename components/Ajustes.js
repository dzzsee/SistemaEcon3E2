'use client'

import { useState } from 'react'
import { WEEK_DAYS } from '@/lib/format'

export default function Ajustes({ settings, onReload }) {
  const [globalStart, setGlobalStart] = useState(settings.globalStart || '')
  const [weeklyAmount, setWeeklyAmount] = useState(String(settings.weeklyAmount ?? 0))
  const [weekStartDay, setWeekStartDay] = useState(String(settings.weekStartDay ?? 1))
  const [currency, setCurrency] = useState(settings.currency || '$')
  const [groupName, setGroupName] = useState(settings.groupName || '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    setSaving(true)
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        globalStart,
        weeklyAmount: Number(weeklyAmount),
        weekStartDay: Number(weekStartDay),
        currency,
        groupName,
      }),
    })
    if (res.ok) {
      setMessage('Ajustes guardados')
      onReload()
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'Error al guardar')
    }
    setSaving(false)
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-xl font-semibold">Ajustes</h1>
        <p className="text-sm text-ink-2 mt-1">Configuración general del sistema de cuotas</p>
      </div>

      <form onSubmit={submit} className="card p-6 space-y-5">
        <div>
          <label className="block text-xs uppercase tracking-wider text-ink-3 mb-1.5">Nombre del grupo</label>
          <input className="field-input" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-ink-3 mb-1.5">Símbolo de moneda</label>
          <input
            className="field-input mono"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            maxLength={3}
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-ink-3 mb-1.5">
            Cuota semanal por defecto
          </label>
          <input
            className="field-input mono"
            type="number"
            min="0"
            step="0.01"
            value={weeklyAmount}
            onChange={(e) => setWeeklyAmount(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-ink-3 mb-1.5">
            Fecha de inicio de las cuotas
          </label>
          <input
            className="field-input mono"
            type="date"
            value={globalStart}
            onChange={(e) => setGlobalStart(e.target.value)}
          />
          <p className="text-[11px] text-ink-3 mt-1">
            Las semanas de cuota se cuentan a partir de esta fecha para todos los usuarios.
          </p>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-ink-3 mb-1.5">
            Día de inicio de semana
          </label>
          <select
            className="field-input"
            value={weekStartDay}
            onChange={(e) => setWeekStartDay(e.target.value)}
          >
            {WEEK_DAYS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-sm text-bad">{error}</p>}
        {message && <p className="text-sm text-ok">{message}</p>}

        <div className="flex justify-end">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar ajustes'}
          </button>
        </div>
      </form>
    </div>
  )
}