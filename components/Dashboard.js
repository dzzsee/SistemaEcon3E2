'use client'

import { useState } from 'react'
import { Stat } from './ui'
import MemberRow, { AlertIcon } from './MemberRow'
import PayModal from './PayModal'
import { fmtAmount } from '@/lib/format'

export default function Dashboard({ data, onReload }) {
  const { stats, users, settings } = data
  const atrasados = users.filter((u) => u.active && u.status.atrasado)
  const [payTarget, setPayTarget] = useState(null)

  const sorted = [...users].sort((a, b) => {
    const rank = { '2sem': 3, '1sem': 2, aldia: 1 }
    const ra = rank[a.status?.key] || 0
    const rb = rank[b.status?.key] || 0
    if (ra !== rb) return rb - ra
    return b.debt - a.debt
  })

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-4">
          <p className="eyebrow">Resumen</p>
          <h1 className="text-2xl sm:text-3xl font-semibold mt-1">
            {stats.atrasados}{' '}
            <span className="text-ink-2 font-normal">
              {stats.atrasados === 1 ? 'miembro atrasado' : 'miembros atrasados'}
            </span>
          </h1>
          <p className="text-sm text-ink-2 mt-1">
            Deuda pendiente total{' '}
            <span className="mono font-semibold text-ink">{fmtAmount(stats.totalDebt, settings.currency)}</span>
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Miembros activos" value={String(stats.totalActive)} />
          <Stat label="Al día" value={String(stats.alDia)} tone="ok" />
          <Stat label="1 semana" value={String(stats.oneWeek)} tone="warn" />
          <Stat label="2+ semanas" value={String(stats.twoWeeks)} tone="bad" />
        </div>
      </section>

      {atrasados.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-bad mb-3">
            <AlertIcon /> Requieren atención
          </h2>
          <ul className="space-y-2">
            {atrasados.map((u) => (
              <MemberRow key={u.id} user={u} onPay={setPayTarget} />
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="text-sm font-semibold mb-3">Estado completo</h2>
        {users.length === 0 ? (
          <div className="card p-8 text-center text-ink-3 text-sm">
            Aún no hay miembros. Agregá el primero en la sección Usuarios.
          </div>
        ) : (
          <ul className="space-y-2">
            {sorted.map((u) => (
              <MemberRow key={u.id} user={u} onPay={setPayTarget} />
            ))}
          </ul>
        )}
      </section>

      {payTarget && (
        <PayModal
          user={payTarget}
          settings={settings}
          onClose={() => setPayTarget(null)}
          onDone={() => {
            setPayTarget(null)
            onReload()
          }}
        />
      )}
    </div>
  )
}