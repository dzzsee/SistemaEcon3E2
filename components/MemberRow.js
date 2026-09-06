'use client'

import { Badge } from './ui'
import { fmtAmount, initials, STATUS } from '@/lib/format'

export default function MemberRow({ user, onPay, onEdit, onDelete }) {
  const st = STATUS[user.status?.key] || STATUS.aldia
  const inactive = !user.active

  return (
    <li className={`member-row ${inactive ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-accent/15 text-accent-2 flex items-center justify-center text-xs font-semibold">
          {initials(user.name)}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{user.name}</div>
          <div className="text-xs text-ink-3 mono">
            {inactive ? 'Inactivo' : user.totalWeeks != null ? `${user.paidCount}/${user.totalWeeks} semanas pagas` : ''}
          </div>
        </div>
      </div>

      <div className="flex-shrink-0">
        {inactive ? <Badge tone="empty" label="Inactivo" /> : <Badge tone={st.tone} label={st.label} />}
      </div>

      <div className="flex-shrink-0 text-right">
        <div className="text-sm mono font-medium">{fmtAmount(user.debt, user.currency)}</div>
        <div className="text-[10px] text-ink-3 uppercase tracking-wider">adeudado</div>
      </div>

      <div className="flex-shrink-0 flex items-center gap-1.5 member-actions">
        {!inactive && (
          <button onClick={() => onPay(user)} className="btn btn-primary btn-sm">
            Registrar pago
          </button>
        )}
        {onEdit && (
          <button onClick={() => onEdit(user)} className="icon-btn" aria-label={`Editar ${user.name}`}>
            <EditIcon />
          </button>
        )}
        {onDelete && (
          <button onClick={() => onDelete(user)} className="icon-btn icon-btn-danger" aria-label={`Eliminar ${user.name}`}>
            <TrashIcon />
          </button>
        )}
      </div>
    </li>
  )
}

export function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 20h4L20 8l-4-4L4 16v4zM13 5l6 6" />
    </svg>
  )
}

export function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />
    </svg>
  )
}

export function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

export function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 3l10 17H2L12 3zM12 10v4M12 17.5v.01" />
    </svg>
  )
}