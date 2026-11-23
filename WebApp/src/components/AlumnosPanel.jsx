import { useMemo, useState } from 'react';
import { ChevronDown, User, Wallet, AlertTriangle } from 'lucide-react';
import { cn, money, weekLabel, estadoInfo } from '../utils/cn.js';

export default function AlumnosPanel({ status, session }) {
  const [expanded, setExpanded] = useState(null);

  const rows = useMemo(
    () =>
      status.members.map((m) => {
        let totalAbonado = 0;
        let totalDeuda = 0;
        const weekRows = status.weeks.map((w) => {
          const key = `${m.numero_lista}-${w.id}`;
          const g = status.grouped?.[key];
          const abonado = g ? g.total : 0;
          const deuda = Math.max(0, w.monto_cuota - abonado);
          const estado = abonado >= w.monto_cuota ? 'pagado' : abonado > 0 ? 'abonado' : 'deuda';
          totalAbonado += abonado;
          totalDeuda += deuda;
          return { w, abonado, deuda, estado };
        });
        return { m, totalAbonado, totalDeuda, weekRows };
      }),
    [status]
  );

  return (
    <div className="space-y-5">
      <div className="animate-[fadeUp_0.4s_ease-out_both]">
        <h1 className="flex items-center gap-2 text-xl font-bold text-white">
          <User className="h-5 w-5 text-emerald-400" />
          Integrantes de 3E2
        </h1>
        <p className="mt-0.5 text-sm text-slate-400">Lista fija de {status.members.length} integrantes.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.map(({ m, totalAbonado, totalDeuda, weekRows }, idx) => {
          const isOpen = expanded === m.numero_lista;
          const percentage = status.weeks.length
            ? Math.round((weekRows.filter((r) => r.estado === 'pagado').length / status.weeks.length) * 100)
            : 0;

          return (
            <div
              key={m.numero_lista}
              className={cn(
                'glass-card overflow-hidden rounded-2xl transition animate-[fadeUp_0.4s_ease-out_both]',
                isOpen && 'border-emerald-400/30'
              )}
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              <button
                onClick={() => setExpanded(isOpen ? null : m.numero_lista)}
                className="flex w-full items-center gap-3 p-4 text-left"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 font-bold text-emerald-300">
                  {m.numero_lista}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{m.nombre}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Wallet className="h-3 w-3 text-emerald-400" /> {money(totalAbonado)}
                    </span>
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-rose-400" /> {money(totalDeuda)}
                    </span>
                  </div>
                  {/* barra de cumplimiento */}
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-sm font-bold text-slate-200">{percentage}%</span>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500">cumplido</span>
                  <ChevronDown className={cn('h-4 w-4 text-slate-400 transition-transform', isOpen && 'rotate-180')} />
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-white/5 px-4 pb-4 pt-3 animate-[fadeUp_0.25s_ease-out_both]">
                  <div className="mb-2 flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-slate-500">
                    <span>Semana</span>
                    <span>Estado</span>
                  </div>
                  <div className="space-y-1.5">
                    {weekRows.map((r) => {
                      const est = estadoInfo(r.estado);
                      return (
                        <div
                          key={r.w.id}
                          className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2 text-xs"
                        >
                          <span className="text-slate-300">
                            {weekLabel(r.w)}
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="text-slate-400">
                              {r.abonado > 0 ? money(r.abonado) : '—'}
                            </span>
                            {r.estado === 'pagado' ? (
                              <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold', est.soft)}>
                                {est.label}
                              </span>
                            ) : (
                              <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold', est.soft)}>
                                {r.estado === 'abonado' ? `Falta ${money(r.deuda)}` : money(r.deuda)}
                              </span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}