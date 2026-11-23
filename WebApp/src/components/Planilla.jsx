import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, PlusCircle, HandCoins } from 'lucide-react';
import { cn, money, weekLabel, estadoInfo } from '../utils/cn.js';
import AbonoModal from './AbonoModal.jsx';

export default function Planilla({ status, balance, refresh, session, showToast }) {
  const [selectedWeekId, setSelectedWeekId] = useState(() => {
    if (!status.weeks.length) return null;
    return status.weeks[status.weeks.length - 1].id;
  });
  const [modal, setModal] = useState(null);

  const selectedWeek = status.weeks.find((w) => w.id === selectedWeekId) || status.weeks[status.weeks.length - 1];

  const matrix = useMemo(() => {
    const rows = {};
    for (const m of status.members) {
      rows[m.numero_lista] = {
        member: m,
        total_abonado: 0,
        cells: {}
      };
      for (const w of status.weeks) {
        const key = `${m.numero_lista}-${w.id}`;
        const g = status.grouped?.[key];
        const abonado = g ? g.total : 0;
        const deuda = Math.max(0, w.monto_cuota - abonado);
        const estado = abonado >= w.monto_cuota ? 'pagado' : abonado > 0 ? 'abonado' : 'deuda';
        rows[m.numero_lista].total_abonado += abonado;
        rows[m.numero_lista].cells[w.id] = { abonado, deuda, estado };
      }
    }
    return rows;
  }, [status]);

  function openModal(member, week = selectedWeek) {
    setModal({ member, week });
  }

  // Resumen del estado de la semana seleccionada
  const weekStats = useMemo(() => {
    if (!selectedWeek) return { pagados: 0, abonados: 0, deudas: 0, recaudado: 0, esperado: 0 };
    let pagados = 0, abonados = 0, deudas = 0, recaudado = 0;
    for (const m of status.members) {
      const key = `${m.numero_lista}-${selectedWeek.id}`;
      const g = status.grouped?.[key];
      const abonado = g ? g.total : 0;
      recaudado += abonado;
      if (abonado >= selectedWeek.monto_cuota) pagados++;
      else if (abonado > 0) abonados++;
      else deudas++;
    }
    return {
      pagados, abonados, deudas, recaudado,
      esperado: selectedWeek.monto_cuota * status.members.length
    };
  }, [status, selectedWeek]);

  if (!selectedWeek) {
    return <div className="py-16 text-center text-sm text-slate-400">No hay semanas registradas.</div>;
  }

  return (
    <div className="space-y-5">
      {/* Selector de semana */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setSelectedWeekId(prev => {
            const idx = status.weeks.findIndex(w => w.id === prev);
            return idx > 0 ? status.weeks[idx - 1].id : prev;
          })}
          className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 overflow-x-auto no-scrollbar">
          <div className="flex gap-1.5">
            {status.weeks.map((w) => {
              const active = w.id === selectedWeek.id;
              return (
                <button
                  key={w.id}
                  onClick={() => setSelectedWeekId(w.id)}
                  className={cn(
                    'shrink-0 rounded-xl px-3.5 py-2 text-xs font-medium transition',
                    active
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                      : 'border border-white/10 bg-white/5 text-slate-400 hover:text-white'
                  )}
                >
                  Sem. {w.numero_semana}
                </button>
              );
            })}
          </div>
        </div>
        <button
          onClick={() => setSelectedWeekId(prev => {
            const idx = status.weeks.findIndex(w => w.id === prev);
            return idx < status.weeks.length - 1 ? status.weeks[idx + 1].id : prev;
          })}
          className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:text-white"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Cabecera de semana seleccionada */}
      <div className="glass-panel rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-white">
              <HandCoins className="h-5 w-5 text-emerald-400" />
              {weekLabel(selectedWeek)}
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Cuota semanal de {money(selectedWeek.monto_cuota)} por integrante
            </p>
          </div>
          <div className="flex gap-3 text-center">
            <div className="rounded-xl bg-emerald-500/10 px-3 py-1.5">
              <p className="text-lg font-bold text-emerald-400">{weekStats.pagados}</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-400">Pagados</p>
            </div>
            <div className="rounded-xl bg-amber-500/10 px-3 py-1.5">
              <p className="text-lg font-bold text-amber-400">{weekStats.abonados}</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-400">Abonados</p>
            </div>
            <div className="rounded-xl bg-rose-500/10 px-3 py-1.5">
              <p className="text-lg font-bold text-rose-400">{weekStats.deudas}</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-400">Deudas</p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3 text-sm">
          <span className="text-slate-400">
            Recaudado esta semana
          </span>
          <span className="font-bold text-emerald-400">
            {money(weekStats.recaudado)} {' '}
            <span className="text-xs font-normal text-slate-500">/ {money(weekStats.esperado)}</span>
          </span>
        </div>
      </div>

      {/* Tabla escritorio */}
      <div className="hidden overflow-hidden rounded-2xl glass-panel lg:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03] text-left text-xs uppercase tracking-wider text-slate-400">
                <th className="sticky left-0 z-10 bg-slate-900 px-4 py-3">#</th>
                <th className="sticky left-10 z-10 bg-slate-900 px-4 py-3 min-w-[12rem]">Integrante</th>
                <th className="px-3 py-3 text-center">Anticipado</th>
                {status.weeks.map((w) => (
                  <th key={w.id} className="px-1 py-3 text-center">
                    <div className="text-[10px] text-slate-500">Sem {w.numero_semana}</div>
                    <div className="text-[10px] normal-case text-slate-600">
                      {w.fecha_inicio.slice(5, 10)}
                    </div>
                  </th>
                ))}
                <th className="px-3 py-3 text-center">Total abonado</th>
              </tr>
            </thead>
            <tbody>
              {status.members.map((m) => {
                const row = matrix[m.numero_lista];
                return (
                  <tr key={m.numero_lista} className="border-b border-white/5 transition hover:bg-white/[0.03]">
                    <td className="sticky left-0 z-10 bg-slate-900/95 px-4 py-2.5 font-semibold text-slate-300">
                      {m.numero_lista}
                    </td>
                    <td className="sticky left-10 z-10 bg-slate-900/95 px-4 py-2.5 font-medium text-white">
                      {m.nombre}
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs text-slate-300">
                      {money(row.total_abonado)}
                    </td>
                    {status.weeks.map((w) => {
                      const cell = row.cells[w.id];
                      const est = estadoInfo(cell.estado);
                      const selected = w.id === selectedWeek.id;
                      return (
                        <td key={w.id} className="px-1 py-2.5 text-center">
                          <button
                            onClick={() => openModal(m, w)}
                            title={`${m.nombre} · ${weekLabel(w)}`}
                            className={cn(
                              'mx-auto flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold transition hover:scale-110 hover:ring-2 hover:ring-white/30',
                              est.soft,
                              selected && 'ring-2 ring-emerald-400/60'
                            )}
                          >
                            {cell.abonado > 0 ? money(cell.abonado).replace('MX$', '$') : '·'}
                          </button>
                        </td>
                      );
                    })}
                    <td className="px-3 py-2.5 text-center text-xs font-bold text-emerald-400">
                      {money(row.total_abonado)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lista móvil */}
      <div className="space-y-2.5 lg:hidden">
        {status.members.map((m) => {
          const key = `${m.numero_lista}-${selectedWeek.id}`;
          const g = status.grouped?.[key];
          const abonado = g ? g.total : 0;
          const deuda = Math.max(0, selectedWeek.monto_cuota - abonado);
          const estado = abonado >= selectedWeek.monto_cuota ? 'pagado' : abonado > 0 ? 'abonado' : 'deuda';
          const est = estadoInfo(estado);

          return (
            <button
              key={m.numero_lista}
              onClick={() => openModal(m)}
              className="glass-card glass-card-hover flex w-full items-center gap-3 rounded-2xl p-3.5 text-left animate-[fadeUp_0.3s_ease-out_both]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 font-bold text-slate-300">
                {m.numero_lista}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{m.nombre}</p>
                <p className="text-xs text-slate-400">
                  {estado === 'pagado' ? `${money(abonado)} · Completado` : estado === 'abonado' ? `Abonado ${money(abonado)} · falta ${money(deuda)}` : `Debe ${money(deuda)}`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className={cn('h-2.5 w-2.5 rounded-full', est.bg)} />
                <span
                  className={cn(
                    'flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold',
                    abonado >= selectedWeek.monto_cuota
                      ? 'bg-emerald-500 text-white'
                      : 'bg-white/5 text-emerald-300'
                  )}
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  {abonado >= selectedWeek.monto_cuota ? 'Registrado' : 'Cobrar'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {modal && (
        <AbonoModal
          member={modal.member}
          week={modal.week}
          balance={balance}
          grouped={status.grouped}
          session={session}
          onClose={() => setModal(null)}
          onSaved={async (msg) => {
            setModal(null);
            await refresh();
            showToast(msg || 'Abono registrado correctamente.');
          }}
        />
      )}
    </div>
  );
}