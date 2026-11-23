import { useMemo, useState } from 'react';
import { Plus, Receipt, Trash2, Download, FileText, Loader2, AlertTriangle, Search } from 'lucide-react';
import { cn, money } from '../utils/cn.js';
import { formatearTamano, descargarBlob } from '../utils/files.js';
import * as api from '../services/api.js';
import GastoModal from './GastoModal.jsx';

function fechaCorta(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

export default function GastosPanel({ status, balance, session, showToast }) {
  const [modal, setModal] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState('');
  const [borrando, setBorrando] = useState(null);
  const [descargando, setDescargando] = useState(null);
  const [confirmar, setConfirmar] = useState(null);

  const gastos = status.gastos || [];

  const categorias = useMemo(() => {
    const set = new Set(gastos.map((g) => g.categoria).filter(Boolean));
    return [...set].sort();
  }, [gastos]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return gastos
      .filter((g) => (categoria ? g.categoria === categoria : true))
      .filter((g) =>
        q ? `${g.concepto} ${g.nota || ''} ${g.categoria || ''} ${g.registrado_por || ''}`.toLowerCase().includes(q) : true
      )
      .sort((a, b) => (a.fecha === b.fecha ? b.id - a.id : a.fecha < b.fecha ? 1 : -1));
  }, [gastos, busqueda, categoria]);

  const total = useMemo(() => filtrados.reduce((acc, g) => acc + Number(g.monto || 0), 0), [filtrados]);
  const conFactura = gastos.filter((g) => g.tiene_archivo).length;

  async function descargar(g) {
    setDescargando(g.id);
    try {
      const archivo = await api.getGastoArchivo(g.id);
      if (!archivo) {
        showToast('Este gasto no tiene factura adjunta.', 'error');
        return;
      }
      descargarBlob(archivo.blob, archivo.nombre);
    } catch (err) {
      showToast(err.message === 'no-auth' ? 'Tu sesión expiró.' : 'No se pudo descargar la factura.', 'error');
    } finally {
      setDescargando(null);
    }
  }

  async function eliminar(g) {
    setBorrando(g.id);
    try {
      await api.deleteGasto(g.id);
      setConfirmar(null);
      showToast(`Gasto "${g.concepto}" eliminado.`);
    } catch (err) {
      showToast(err.message === 'no-auth' ? 'Tu sesión expiró.' : 'No se pudo eliminar el gasto.', 'error');
    } finally {
      setBorrando(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Gastos</h1>
          <p className="mt-0.5 text-sm text-slate-400">
            Salidas de dinero con su factura. Reducen el saldo de caja.
          </p>
        </div>
        <button
          onClick={() => setModal(true)}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 transition hover:from-amber-400 hover:to-orange-400"
        >
          <Plus className="h-4 w-4" />
          Registrar gasto
        </button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="glass-card rounded-2xl p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Total en gastos</p>
          <p className="mt-2 text-2xl font-extrabold tracking-tight text-amber-400">{money(total)}</p>
          <p className="mt-1 text-xs text-slate-400">{filtrados.length} registros</p>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Con factura</p>
          <p className="mt-2 text-2xl font-extrabold tracking-tight text-white">{conFactura}</p>
          <p className="mt-1 text-xs text-slate-400">de {gastos.length} gastos</p>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Efectivo en caja</p>
          <p className={cn('mt-2 text-2xl font-extrabold tracking-tight', balance.saldoCaja >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
            {money(balance.saldoCaja)}
          </p>
          <p className="mt-1 text-xs text-slate-400">recaudado − gastos</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por concepto, nota o quien registró…"
            className="w-full rounded-xl border border-white/10 bg-slate-900/70 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none transition focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20"
          />
        </div>
        {categorias.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setCategoria('')}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-xs font-semibold transition',
                categoria === '' ? 'border-amber-400/60 bg-amber-500/20 text-amber-300' : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/25'
              )}
            >
              Todas
            </button>
            {categorias.map((c) => (
              <button
                key={c}
                onClick={() => setCategoria(categoria === c ? '' : c)}
                className={cn(
                  'rounded-lg border px-3 py-1.5 text-xs font-semibold transition',
                  categoria === c ? 'border-amber-400/60 bg-amber-500/20 text-amber-300' : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/25'
                )}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lista */}
      {filtrados.length === 0 ? (
        <div className="glass-panel rounded-2xl px-6 py-16 text-center">
          <Receipt className="mx-auto h-10 w-10 text-slate-600" />
          <p className="mt-3 text-sm font-medium text-slate-300">
            {gastos.length === 0 ? 'Aún no hay gastos registrados.' : 'Ningún gasto coincide con el filtro.'}
          </p>
          {gastos.length === 0 && (
            <p className="mt-1 text-xs text-slate-500">
              Registra la compra y toma una foto de la factura en el momento.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtrados.map((g) => (
            <div key={g.id} className="glass-card rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-white">{g.concepto}</p>
                    {g.categoria && (
                      <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                        {g.categoria}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {fechaCorta(g.fecha)}
                    {g.registrado_por ? ` · ${g.registrado_por}` : ''}
                  </p>
                  {g.nota && <p className="mt-1 text-xs italic text-slate-500">{g.nota}</p>}
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <p className="mr-1 text-base font-extrabold text-amber-400">{money(g.monto)}</p>

                  {g.tiene_archivo ? (
                    <button
                      onClick={() => descargar(g)}
                      disabled={descargando === g.id}
                      title={g.tamano ? `Descargar factura (${formatearTamano(g.tamano)})` : 'Descargar factura'}
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-sky-300 disabled:opacity-50"
                    >
                      {descargando === g.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    </button>
                  ) : (
                    <span title="Sin factura adjunta" className="p-2 text-slate-600">
                      <FileText className="h-4 w-4" />
                    </span>
                  )}

                  <button
                    onClick={() => setConfirmar(g.id)}
                    title="Eliminar gasto"
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-rose-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {confirmar === g.id && (
                <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-300" />
                  <p className="min-w-0 flex-1 text-xs text-rose-200">
                    ¿Eliminar <span className="font-semibold">{g.concepto}</span> ({money(g.monto)})?
                    {g.tiene_archivo ? ' También se borra su factura.' : ''} No se puede deshacer.
                  </p>
                  <button
                    onClick={() => setConfirmar(null)}
                    className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => eliminar(g)}
                    disabled={borrando === g.id}
                    className="flex items-center gap-1.5 rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-400 disabled:opacity-50"
                  >
                    {borrando === g.id && <Loader2 className="h-3 w-3 animate-spin" />}
                    Eliminar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modal && (
        <GastoModal
          session={session}
          showToast={showToast}
          onClose={() => setModal(false)}
          onSaved={(msg) => {
            setModal(false);
            showToast(msg);
          }}
        />
      )}
    </div>
  );
}
