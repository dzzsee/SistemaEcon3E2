'use client'

import { useEffect, useState } from 'react'
import { fmtAmount, fmtDate, weekLabel, initials } from '@/lib/format'

export default function Pagos({ data, onReload }) {
  const [payments, setPayments] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/payments')
      .then((r) => r.json())
      .then((d) => setPayments(d.payments || []))
      .catch(() => setPayments([]))
      .finally(() => setLoading(false))
  }, [data])

  async function remove(id) {
    if (!window.confirm('¿Deshacer este pago?')) return
    await fetch(`/api/payments/${id}`, { method: 'DELETE' })
    setPayments((p) => p.filter((x) => x.id !== id))
    onReload()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Pagos</h1>
        <p className="text-sm text-ink-2 mt-1">Historial de pagos registrados</p>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-ink-3 text-sm">Cargando…</div>
      ) : payments.length === 0 ? (
        <div className="card p-8 text-center text-ink-3 text-sm">Aún no hay pagos registrados.</div>
      ) : (
        <div className="card overflow-hidden">
          <ul className="divide-y divide-line-soft">
            {payments.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-lg bg-accent/15 text-accent-2 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                  {initials(p.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{p.name}</div>
                  <div className="text-xs text-ink-3 mono">
                    Semana {weekLabel(p.week_key)} · {fmtDate(p.paid_at)}
                  </div>
                </div>
                <div className="mono text-sm font-medium flex-shrink-0">{fmtAmount(p.amount)}</div>
                <button
                  onClick={() => remove(p.id)}
                  className="icon-btn icon-btn-danger flex-shrink-0"
                  aria-label={`Deshacer pago de ${p.name}`}
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}