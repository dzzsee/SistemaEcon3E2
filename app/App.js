'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Dashboard from '@/components/Dashboard'
import Usuarios from '@/components/Usuarios'
import Pagos from '@/components/Pagos'
import Ajustes from '@/components/Ajustes'
import { fmtAmount } from '@/lib/format'

export default function App({ username }) {
  const [view, setView] = useState('panel')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/dashboard')
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error || 'Error al cargar datos')
        return
      }
      setData(await res.json())
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-line-soft bg-surface/40 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center gap-4">
            <Brand groupName={data?.settings?.groupName || 'Grupo'} />

            <div className="ml-auto flex items-center gap-3">
              <span className="hidden sm:inline text-xs text-ink-3 mono">{username}</span>
              <button onClick={logout} className="btn btn-ghost btn-shrink">
                Salir
              </button>
            </div>
          </div>

          <nav className="flex gap-1 mt-3 overflow-x-auto no-scrollbar -mx-1 px-1" role="tablist" aria-label="Secciones">
            <NavBtn active={view === 'panel'} onClick={() => setView('panel')} label="Panel" />
            <NavBtn active={view === 'usuarios'} onClick={() => setView('usuarios')} label="Usuarios" />
            <NavBtn active={view === 'pagos'} onClick={() => setView('pagos')} label="Pagos" />
            <NavBtn active={view === 'ajustes'} onClick={() => setView('ajustes')} label="Ajustes" />
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 overflow-x-hidden">
        {loading && !data && <Loading />}
        {error && !data && (
          <div className="card p-8 text-center">
            <p className="text-bad mb-4">{error}</p>
            <button className="btn btn-primary" onClick={load}>
              Reintentar
            </button>
          </div>
        )}
        {data && (
          <>
            {view === 'panel' && <Dashboard data={data} onReload={load} />}
            {view === 'usuarios' && <Usuarios data={data} onReload={load} />}
            {view === 'pagos' && <Pagos data={data} onReload={load} />}
            {view === 'ajustes' && <Ajustes settings={data.settings} onReload={load} />}
          </>
        )}
      </main>

      {data && (
        <div className="fixed bottom-4 right-4 z-30">
          <div className="card px-4 py-2.5 flex items-center gap-2.5 shadow-lg shadow-black/40 border border-line">
            <span className="text-[10px] uppercase tracking-wider text-ink-3 mono">Recaudado</span>
            <span className="mono font-semibold text-sm text-ink">
              {fmtAmount(data.stats.totalCollected, data.settings.currency)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function Brand({ groupName }) {
  return (
    <div className="flex items-center gap-2.5 flex-shrink-0">
      <div className="inline-flex items-center justify-center rounded-xl w-8 h-8 bg-gradient-to-br from-accent to-accent-2">
        <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 3v18M5 8l14 8M19 8L5 16" strokeLinecap="round" />
        </svg>
      </div>
      <div className="leading-tight">
        <div className="text-sm font-semibold">{groupName}</div>
        <div className="text-[10px] uppercase tracking-wider text-ink-3 mono">Cuotas semanales</div>
      </div>
    </div>
  )
}

function NavBtn({ active, onClick, label }) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
        active ? 'bg-raised text-ink border border-line' : 'text-ink-2 hover:text-ink'
      }`}
    >
      {label}
    </button>
  )
}

function Loading() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="card h-24 animate-pulse" />
      ))}
    </div>
  )
}