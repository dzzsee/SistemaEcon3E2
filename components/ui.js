'use client'

export function Stat({ label, value, tone }) {
  return (
    <div className={`card p-4 ${tone ? `stat-${tone}` : ''}`}>
      <div className="text-2xl font-semibold mono">{value}</div>
      <div className="text-xs text-ink-3 mt-0.5">{label}</div>
    </div>
  )
}

export function Badge({ tone, label }) {
  return (
    <span className={`badge badge-${tone}`}>
      <span className="dot" />
      {label}
    </span>
  )
}