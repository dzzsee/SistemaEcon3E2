'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginForm() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    if (res.ok) {
      router.push('/')
      router.refresh()
    } else {
      setError('Credenciales inválidas')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center rounded-2xl w-12 h-12 mb-4 bg-gradient-to-br from-accent to-accent-2 shadow-lg shadow-accent/30">
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3v18M5 8l14 8M19 8L5 16" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold">SistemaEcon3E2</h1>
          <p className="text-sm text-ink-2 mt-1">Cuotas semanales — acceso de administrador</p>
        </div>

        <div className="card p-6">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-ink-3 mb-1.5">Usuario</label>
              <input
                className="field-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="off"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-ink-3 mb-1.5">Contraseña</label>
              <input
                className="field-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="off"
              />
            </div>
            {error && <p className="text-sm text-bad">{error}</p>}
            <button type="submit" className="btn btn-primary w-full justify-center" disabled={loading || !username || !password}>
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}