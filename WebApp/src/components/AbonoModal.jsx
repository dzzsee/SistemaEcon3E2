import { useMemo, useState } from 'react';
import { X, CheckCircle2, Banknote } from 'lucide-react';
import { cn, money, weekLabel } from '../utils/cn.js';
import * as api from '../services/api.js';

export default function AbonoModal({ member, week, grouped, session, onClose, onSaved }) {
  const currentAbonado = useMemo(() => {
    const key = `${member.numero_lista}-${week.id}`;
    return grouped?.[key] ? grouped[key].total : 0;
  }, [grouped, member, week]);

  const pendiente = Math.max(0, week.monto_cuota - currentAbonado);
  const [monto, setMonto] = useState(pendiente > 0 ? pendiente : '');
  const [nota, setNota] = useState('');
  const [loading, setLoading] = useState(false);

  const presets = useMemo(() => {
    const list = [20, 25, 50, week.monto_cuota];
    if (pendiente > 0 && !list.includes(pendiente)) list.push(pendiente);
    if (currentAbonado > 0 && !list.includes(currentAbonado)) list.push(currentAbonado);
    return [...new Set(list)].sort((a, b) => a - b).slice(0, 6);
  }, [week.monto_cuota, pendiente, currentAbonado]);

  const montoNum = Number(monto);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!montoNum || montoNum <= 0) return;
    setLoading(true);
    try {
      await api.addAbono({
        miembro_id: member.numero_lista,
        semana_id: week.id,
        monto: montoNum,
        nota
      });
      onSaved(
        montoNum >= pendiente && pendiente > 0
          ? `${member.nombre} quedó al corriente :)`
          : `Abono de ${money(montoNum)} registrado para ${member.nombre}.`
      );
    } catch (err) {
      onClose();
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center p-0 sm:p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md animate-[slideUp_0.35s_ease-out_both] overflow-hidden rounded-t-3xl sm:rounded-3xl glass-panel shadow-2xl"
      >
        {/* Header */}
        <div className="relative border-b border-white/5 px-6 py-5">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-xl border border-white/10 bg-white/5 p-1.5 text-slate-400 transition hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
          <p className="text-[11px] font-medium uppercase tracking-wider text-emerald-400">
            #{member.numero_lista} · Semana {week.numero_semana}
          </p>
          <h3 className="mt-1 text-lg font-bold text-white">{member.nombre}</h3>
          <p className="mt-0.5 text-xs text-slate-400">{weekLabel(week)}</p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5">
          {/* Resumen de pagos */}
          <div className="mb-5 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-white/5 px-2 py-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-400">Cuota</p>
              <p className="mt-1 text-sm font-bold text-white">{money(week.monto_cuota)}</p>
            </div>
            <div className="rounded-xl bg-emerald-500/10 px-2 py-3">
              <p className="text-[10px] uppercase tracking-wider text-emerald-400/70">Abonado</p>
              <p className="mt-1 text-sm font-bold text-emerald-400">{money(currentAbonado)}</p>
            </div>
            <div className={cn('rounded-xl px-2 py-3', pendiente > 0 ? 'bg-rose-500/10' : 'bg-emerald-500/10')}>
              <p className={cn('text-[10px] uppercase tracking-wider', pendiente > 0 ? 'text-rose-400/70' : 'text-emerald-400/70')}>
                Pendiente
              </p>
              <p className={cn('mt-1 text-sm font-bold', pendiente > 0 ? 'text-rose-400' : 'text-emerald-400')}>
                {money(pendiente)}
              </p>
            </div>
          </div>

          {currentAbonado >= week.monto_cuota ? (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Esta cuota ya está cubierta. Puedes registrar un aporte voluntario.
            </div>
          ) : null}

          {/* Monto */}
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">
            Monto del abono
          </label>
          <div className="relative mb-3">
            <Banknote className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
            <input
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="0.00"
              autoFocus
              className="w-full rounded-xl border border-white/10 bg-slate-900/80 py-3 pl-10 pr-4 text-lg font-bold text-white outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20"
            />
          </div>

          {/* Presets */}
          <div className="mb-4 flex flex-wrap gap-1.5">
            {presets.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setMonto(p)}
                className={cn(
                  'rounded-lg border px-3 py-1.5 text-xs font-semibold transition',
                  monto === p
                    ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-300'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/25'
                )}
              >
                {money(p)}
              </button>
            ))}
          </div>

          {/* Nota */}
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">
            Nota (opcional)
          </label>
          <input
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Ej: Pago parcial, abono en efectivo…"
            className="mb-5 w-full rounded-xl border border-white/10 bg-slate-900/70 py-3 px-4 text-sm text-white placeholder-slate-500 outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20"
          />

          <button
            type="submit"
            disabled={loading || !montoNum || montoNum <= 0}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:from-emerald-400 hover:to-teal-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            Registrar abono de {money(montoNum || 0)}
          </button>

          <p className="mt-3 text-center text-[11px] text-slate-500">
            Registrado por: {session.nombre} ({session.rol})
          </p>
        </form>
      </div>
    </div>
  );
}