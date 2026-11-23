import { useState } from 'react';
import { Wallet, Lock, User, CloudLightning, Loader2, Feather } from 'lucide-react';
import { cn } from '../utils/cn.js';
import { login } from '../services/api.js';

const QUICK = [
  { rol: 'tutor', usuario: 'tutor', pin: '1234', label: 'Tutor(a)' },
  { rol: 'presidente', usuario: 'presidente', pin: '2345', label: 'Presidente' },
  { rol: 'tesorero', usuario: 'tesorero', pin: '3456', label: 'Tesorero' }
];

export default function LoginPage({ onLogin }) {
  const [usuario, setUsuario] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(usuario, pin);
      if (res.success) {
        onLogin(res.user);
      } else {
        setError(res.message || 'Credenciales inválidas.');
      }
    } catch (err) {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  function fill(role) {
    setUsuario(role.usuario);
    setPin(role.pin);
    setError('');
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      {/* Fondo decorativo animado */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 -left-40 h-[30rem] w-[30rem] rounded-full bg-emerald-600/20 blur-[120px] animate-pulse" />
        <div className="absolute -bottom-40 -right-40 h-[28rem] w-[28rem] rounded-full bg-teal-500/20 blur-[120px] animate-pulse [animation-delay:2s]" />
        <div className="absolute top-1/3 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-violet-600/10 blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)',
            backgroundSize: '28px 28px'
          }}
        />
      </div>

      <div className="w-full max-w-md animate-[fadeUp_0.6s_ease-out_both]">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 shadow-lg shadow-emerald-500/30 animate-[float_6s_ease-in-out_infinite]">
            <Wallet className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Control 3E2
          </h1>
          <p className="mt-1.5 text-sm text-slate-400">
            Cuotas semanales · Grupo de trabajo
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="glass-panel rounded-3xl p-7 shadow-2xl shadow-black/40"
        >
          <h2 className="mb-5 text-lg font-semibold text-white">Acceso de administrador</h2>

          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">
            Usuario
          </label>
          <div className="relative mb-4">
            <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="tutor, presidente, tesorero"
              className="w-full rounded-xl border border-white/10 bg-slate-900/70 py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20"
              autoComplete="username"
            />
          </div>

          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">
            PIN
          </label>
          <div className="relative mb-5">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              inputMode="numeric"
              className="w-full rounded-xl border border-white/10 bg-slate-900/70 py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="mb-4 animate-[fadeUp_0.3s_ease-out_both] rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !usuario || !pin}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:from-emerald-400 hover:to-teal-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            {loading ? 'Validando…' : 'Entrar al sistema'}
          </button>
        </form>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-3 flex items-center justify-center gap-2 text-xs text-slate-400">
            <Feather className="h-3.5 w-3.5 text-emerald-400" />
            Acceso rápido (demo)
          </div>
          <div className="grid grid-cols-3 gap-2">
            {QUICK.map((q) => (
              <button
                key={q.rol}
                type="button"
                onClick={() => fill(q)}
                className="rounded-xl border border-white/10 bg-slate-800/60 px-2 py-2 text-xs font-medium text-slate-300 transition hover:border-emerald-400/40 hover:text-white"
              >
                {q.label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
            <CloudLightning className="h-3.5 w-3.5" />
            Conexión Cloudflare D1 detectada automáticamente
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-600">
          Solo el tutor, presidente y tesorero tienen acceso
        </p>
      </div>
    </div>
  );
}