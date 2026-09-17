import { useMemo, useState } from 'react';
import { FileDown, FileSpreadsheet, FileText, CalendarPlus, Loader2, Table2 } from 'lucide-react';
import { cn, money } from '../utils/cn.js';
import { exportCSV, exportPDF } from '../utils/export.js';
import * as api from '../services/api.js';

export default function ExportPanel({ status, balance, session, showToast }) {
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Resumen por integrante para previsualización
  const rows = useMemo(
    () =>
      status.members.map((m) => {
        let abonado = 0;
        let deuda = 0;
        for (const w of status.weeks) {
          const key = `${m.numero_lista}-${w.id}`;
          const g = status.grouped?.[key];
          const a = g ? g.total : 0;
          abonado += a;
          deuda += Math.max(0, w.monto_cuota - a);
        }
        return { m, abonado, deuda };
      }),
    [status]
  );

  function handleCSV() {
    exportCSV(status);
    showToast('Archivo CSV/Excel generado.');
  }

  function handlePDF() {
    exportPDF(status, balance, session);
    showToast('Reporte PDF generado.');
  }

  async function handleNewWeek(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    const inicio = form.get('inicio');
    const fin = form.get('fin');
    const monto = form.get('monto');
    if (!inicio || !fin || !monto) return;
    setBusy(true);
    try {
      await api.createWeek({
        fecha_inicio: inicio,
        fecha_fin: fin,
        monto_cuota: Number(monto),
        descripcion: form.get('descripcion') || undefined
      });
      showToast('Semana agregada correctamente.');
      setShowForm(false);
      e.target.reset();
    } catch {
      showToast('No se pudo agregar la semana.', 'error');
    }
    setBusy(false);
  }

  return (
    <div className="space-y-6">
      <div className="animate-[fadeUp_0.4s_ease-out_both]">
        <h1 className="flex items-center gap-2 text-xl font-bold text-white">
          <FileDown className="h-5 w-5 text-emerald-400" />
          Exportar y gestionar
        </h1>
        <p className="mt-0.5 text-sm text-slate-400">
          Descarga el estado de cuotas o agrega nuevas semanas del calendario.
        </p>
      </div>

      {/* Botones de exportación */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <button
          onClick={handleCSV}
          className="glass-card glass-card-hover group flex items-center gap-4 rounded-2xl p-5 text-left"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 transition group-hover:scale-110">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Descargar Excel / CSV</p>
            <p className="text-xs text-slate-400">Tabla completa por semana y totales</p>
          </div>
        </button>

        <button
          onClick={handlePDF}
          className="glass-card glass-card-hover group flex items-center gap-4 rounded-2xl p-5 text-left"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/15 text-rose-400 transition group-hover:scale-110">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Generar reporte PDF</p>
            <p className="text-xs text-slate-400">Documento listo para compartir</p>
          </div>
        </button>
      </div>

      {/* Gestión de semanas */}
      <div className="glass-panel rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-white">
            <CalendarPlus className="h-4.5 w-4.5 text-teal-400" />
            Semanas del calendario
          </h2>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-xl bg-teal-500/15 px-3.5 py-2 text-xs font-semibold text-teal-300 transition hover:bg-teal-500/25"
          >
            {showForm ? 'Cancelar' : 'Agregar semana'}
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleNewWeek}
            className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-4 sm:grid-cols-4 animate-[fadeUp_0.3s_ease-out_both]"
          >
            <div className="sm:col-span-1">
              <label className="mb-1 block text-[10px] uppercase tracking-wider text-slate-400">Inicio (lunes)</label>
              <input type="date" name="inicio" required className="w-full rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none focus:border-teal-400/60" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wider text-slate-400">Fin (domingo)</label>
              <input type="date" name="fin" required className="w-full rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none focus:border-teal-400/60" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wider text-slate-400">Cuota</label>
              <input type="number" name="monto" min="1" step="0.5" defaultValue="20" required className="w-full rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none focus:border-teal-400/60" />
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="mb-1 block text-[10px] uppercase tracking-wider text-slate-400">Descripción</label>
                <input name="descripcion" placeholder="Opcional" className="w-full rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-teal-400/60" />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="flex h-[38px] items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-4 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
              </button>
            </div>
          </form>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {status.weeks.map((w) => (
            <span key={w.id} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
              Sem {w.numero_semana} · {w.fecha_inicio.slice(5)} → {w.fecha_fin.slice(5)} · {money(w.monto_cuota)}
            </span>
          ))}
        </div>
      </div>

      {/* Previsualización */}
      <div className="glass-panel overflow-hidden rounded-2xl">
        <div className="flex items-center gap-2 border-b border-white/5 px-5 py-3">
          <Table2 className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-white">Previsualización de totales</h2>
        </div>
        <div className="max-h-96 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-900/95 text-left text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-2.5">#</th>
                <th className="px-4 py-2.5">Integrante</th>
                <th className="px-4 py-2.5 text-right">Abonado</th>
                <th className="px-4 py-2.5 text-right">Deuda</th>
                <th className="px-4 py-2.5 text-right">Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.m.numero_lista} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-2 text-slate-400">{r.m.numero_lista}</td>
                  <td className="px-4 py-2 font-medium text-white">{r.m.nombre}</td>
                  <td className="px-4 py-2 text-right text-emerald-400">{money(r.abonado)}</td>
                  <td className="px-4 py-2 text-right text-rose-400">{money(r.deuda)}</td>
                  <td className="px-4 py-2 text-right">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                        r.deuda === 0
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : r.abonado > 0
                            ? 'bg-amber-500/15 text-amber-300'
                            : 'bg-rose-500/15 text-rose-300'
                      )}
                    >
                      {r.deuda === 0 ? 'Al corriente' : r.abonado > 0 ? 'Parcial' : 'Sin pagos'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}