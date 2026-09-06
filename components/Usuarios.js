'use client'

import { useEffect, useState } from 'react'
import Modal from './Modal'
import MemberRow, { PlusIcon } from './MemberRow'
import { fmtAmount } from '@/lib/format'

export default function Usuarios({ data, onReload }) {
  const { users, settings } = data
  const [modal, setModal] = useState(null) // {type:'new'|'edit', user?}
  const [error, setError] = useState('')

  const sorted = [...users].sort((a, b) => a.name.localeCompare(b.name, 'es'))

  async function reload() {
    setError('')
    await onReload()
  }

  async function removeUser(user) {
    if (!window.confirm(`¿Eliminar a ${user.name}? Se borrarán también sus pagos.`)) return
    const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' })
    if (!res.ok) {
      setError('Error al eliminar')
      return
    }
    setModal(null)
    reload()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Usuarios</h1>
          <p className="text-sm text-ink-2 mt-1">
            {users.length} {users.length === 1 ? 'miembro' : 'miembros'}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({ type: 'new' })}>
          <PlusIcon /> Nuevo usuario
        </button>
      </div>

      {error && <p className="text-sm text-bad">{error}</p>}

      {users.length === 0 ? (
        <div className="card p-8 text-center text-ink-3 text-sm">Aún no hay usuarios.</div>
      ) : (
        <ul className="space-y-2">
          {sorted.map((u) => (
            <MemberRow
              key={u.id}
              user={u}
              onEdit={() => setModal({ type: 'edit', user: u })}
              onDelete={() => removeUser(u)}
            />
          ))}
        </ul>
      )}

      {modal && (
        <UserModal
          key={modal.type + (modal.user?.id || 'new')}
          modal={modal}
          settings={settings}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null)
            reload()
          }}
        />
      )}
    </div>
  )
}

function UserModal({ modal, settings, onClose, onSaved }) {
  const existing = modal.user
  const [name, setName] = useState(existing?.name || '')
  const [phone, setPhone] = useState(existing?.phone || '')
  const [weeklyAmount, setWeeklyAmount] = useState(
    String(existing?.weekly_amount ?? settings.weeklyAmount),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isEdit = modal.type === 'edit'

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!name.trim()) {
      setError('El nombre es requerido')
      return
    }
    setSaving(true)
    const url = isEdit ? `/api/users/${existing.id}` : '/api/users'
    const method = isEdit ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        phone: phone.trim() || null,
        weekly_amount: Number(weeklyAmount),
      }),
    })
    if (res.ok) {
      onSaved()
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'Error al guardar')
      setSaving(false)
    }
  }

  return (
    <Modal title={isEdit ? `Editar — ${existing.name}` : 'Nuevo usuario'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-xs uppercase tracking-wider text-ink-3 mb-1.5">Nombre</label>
          <input
            className="field-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Ana Martínez"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-ink-3 mb-1.5">Teléfono</label>
          <input
            className="field-input mono"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Opcional"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-ink-3 mb-1.5">
            Cuota semanal {settings.currency}
          </label>
          <input
            className="field-input mono"
            type="number"
            min="0"
            step="0.01"
            value={weeklyAmount}
            onChange={(e) => setWeeklyAmount(e.target.value)}
          />
          <p className="text-[11px] text-ink-3 mt-1">
            Por defecto: {fmtAmount(settings.weeklyAmount, settings.currency)}
          </p>
        </div>

        {error && <p className="text-sm text-bad">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Guardando…' : isEdit ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </form>
    </Modal>
  )
}