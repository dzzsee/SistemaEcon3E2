'use client'

import { useState } from 'react'
import Modal from './Modal'
import { fmtAmount } from '@/lib/format'

export default function PayModal({ user, settings, onClose, onDone }) {
  const [amount, setAmount] = useState(String(user.amount ?? settings.weeklyAmount))
  const [weekKey, setWeekKey] = useState(user.nextUnpaid || '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user.id,
        amount: Number(amount),
        week_key: weekKey || undefined,
      }),
    })
    if (res.ok) {
      onDone()
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'Error al registrar pago')
      setSaving(false)
    }
  }

  return (
    <Modal title={`Registrar pago — ${user.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-xs uppercase tracking-wider text-ink-3 mb-1.5">Monto</label>
          <div className="flex items-center gap-2">
            <span className="text-ink-3 mono text-lg">{settings.currency}</span>
            <input
              className="field-input mono"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-ink-3 mb-1.5">
            Semana (clave)
          </label>
          <input
            className="field-input mono"
            value={weekKey}
            onChange={(e) => setWeekKey(e.target.value)}
            placeholder="YYYY-MM-DD"
          />
          <p className="text-[11px] text-ink-3 mt-1">
            Semana sugerida: <span className="mono">{user.nextUnpaid || '—'}</span> (primera semana impaga)
          </p>
        </div>

        <div className="text-sm text-ink-2 mono">
          Deuda actual: <span className="text-ink font-semibold">{fmtAmount(user.debt, settings.currency)}</span>
        </div>

        {error && <p className="text-sm text-bad">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving || !amount}>
            {saving ? 'Guardando…' : 'Registrar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}