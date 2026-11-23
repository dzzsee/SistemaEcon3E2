import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, TextInput, View } from 'react-native';
import {
  AlertTriangle,
  Download,
  FileText,
  Loader2,
  Plus,
  Receipt,
  Search,
  Trash2
} from 'lucide-react-native';
import { useApp } from '../../context/AppContext.jsx';
import { cn, money } from '../../utils/cn.js';
import * as api from '../../services/api.js';
import { compartirFactura, formatearTamano } from '../../services/files.js';
import { Card, Chip, EmptyState, PrimaryButton, Screen, Text } from '../../components/ui.jsx';
import GastoModal from '../../components/GastoModal.jsx';

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

export default function GastosScreen() {
  const { status, balance, session, loading, refresh, showToast } = useApp();
  const [modal, setModal] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState('');
  const [borrando, setBorrando] = useState(null);
  const [descargando, setDescargando] = useState(null);
  const [confirmar, setConfirmar] = useState(null);

  const gastos = useMemo(() => status?.gastos || [], [status?.gastos]);

  const categorias = useMemo(() => {
    const set = new Set(gastos.map((g) => g.categoria).filter(Boolean));
    return [...set].sort();
  }, [gastos]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return gastos
      .filter((g) => (categoria ? g.categoria === categoria : true))
      .filter((g) =>
        q
          ? `${g.concepto} ${g.nota || ''} ${g.categoria || ''} ${g.registrado_por || ''}`
              .toLowerCase()
              .includes(q)
          : true
      )
      .sort((a, b) => (a.fecha === b.fecha ? b.id - a.id : a.fecha < b.fecha ? 1 : -1));
  }, [gastos, busqueda, categoria]);

  const total = useMemo(
    () => filtrados.reduce((acc, g) => acc + Number(g.monto || 0), 0),
    [filtrados]
  );
  const conFactura = gastos.filter((g) => g.tiene_archivo).length;

  async function abrirFactura(g) {
    setDescargando(g.id);
    try {
      await compartirFactura(g);
    } catch (error) {
      showToast(error?.message || 'No se pudo abrir la factura.', 'error');
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
      await refresh();
    } catch (error) {
      showToast(error?.message || 'No se pudo eliminar el gasto.', 'error');
    } finally {
      setBorrando(null);
    }
  }

  return (
    <Screen refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#fbbf24" />}>
      <View className="mb-5 flex-row items-end justify-between gap-3">
        <View className="flex-1">
          <Text className="text-xl font-bold text-white">Gastos</Text>
          <Text className="mt-1 text-sm text-slate-400">
            Salidas de dinero con su factura. Reducen el saldo de caja.
          </Text>
        </View>
        <PrimaryButton
          onPress={() => setModal(true)}
          icon={Plus}
          className="bg-amber-500 px-3 py-2.5"
        >
          Registrar
        </PrimaryButton>
      </View>

      <View className="mb-5 gap-3">
        <Card className="p-4">
          <Text className="text-[11px] uppercase tracking-wider text-slate-400">Total en gastos</Text>
          <Text className="mt-2 text-2xl font-extrabold text-amber-400">{money(total)}</Text>
          <Text className="mt-1 text-xs text-slate-400">{filtrados.length} registros</Text>
        </Card>
        <View className="flex-row gap-3">
          <Card className="flex-1 p-4">
            <Text className="text-[11px] uppercase tracking-wider text-slate-400">Con factura</Text>
            <Text className="mt-2 text-xl font-extrabold text-white">{conFactura}</Text>
            <Text className="mt-1 text-xs text-slate-400">de {gastos.length} gastos</Text>
          </Card>
          <Card className="flex-1 p-4">
            <Text className="text-[11px] uppercase tracking-wider text-slate-400">Efectivo en caja</Text>
            <Text
              className={cn(
                'mt-2 text-xl font-extrabold',
                (balance?.saldoCaja || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
              )}
            >
              {money(balance?.saldoCaja)}
            </Text>
            <Text className="mt-1 text-xs text-slate-400">recaudado − gastos</Text>
          </Card>
        </View>
      </View>

      <View className="mb-4">
        <View className="mb-2 flex-row items-center rounded-xl border border-white/10 bg-slate-950/70 px-3">
          <Search size={16} color="#64748b" />
          <TextInput
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Buscar por concepto, nota o quien registró…"
            placeholderTextColor="#64748b"
            className="flex-1 py-2.5 pl-2 text-sm text-white"
          />
        </View>
        {categorias.length ? (
          <View className="flex-row flex-wrap gap-1.5">
            <Chip active={!categoria} onPress={() => setCategoria('')}>
              Todas
            </Chip>
            {categorias.map((c) => (
              <Chip key={c} active={categoria === c} onPress={() => setCategoria(categoria === c ? '' : c)}>
                {c}
              </Chip>
            ))}
          </View>
        ) : null}
      </View>

      {filtrados.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={gastos.length === 0 ? 'Aún no hay gastos registrados.' : 'Ningún gasto coincide con el filtro.'}
          message="Registra la compra y toma una foto de la factura en el momento."
        />
      ) : (
        <View className="gap-2">
          {filtrados.map((g) => (
            <Card key={g.id} className="p-4">
              <View className="flex-row items-start gap-3">
                <View className="min-w-0 flex-1">
                  <View className="flex-row flex-wrap items-center gap-2">
                    <Text numberOfLines={1} className="text-sm font-semibold text-white">
                      {g.concepto}
                    </Text>
                    {g.categoria ? (
                      <View className="rounded-full bg-amber-500/15 px-2 py-0.5">
                        <Text className="text-[10px] font-medium text-amber-300">{g.categoria}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text className="mt-1 text-xs text-slate-400">
                    {fechaCorta(g.fecha)}
                    {g.registrado_por ? ` · ${g.registrado_por}` : ''}
                  </Text>
                  {g.nota ? <Text className="mt-1 text-xs italic text-slate-500">{g.nota}</Text> : null}
                  {g.tiene_archivo && g.nombre_archivo ? (
                    <Text className="mt-1 text-[10px] text-slate-500">
                      {g.nombre_archivo}
                      {g.tamano ? ` · ${formatearTamano(g.tamano)}` : ''}
                    </Text>
                  ) : null}
                </View>

                <View className="shrink-0 items-end gap-2">
                  <Text className="text-base font-extrabold text-amber-400">{money(g.monto)}</Text>
                  <View className="flex-row gap-1">
                    {g.tiene_archivo ? (
                      <Pressable onPress={() => abrirFactura(g)} disabled={descargando === g.id} hitSlop={6}>
                        {descargando === g.id ? (
                          <Loader2 size={17} color="#7dd3fc" />
                        ) : (
                          <Download size={17} color="#7dd3fc" />
                        )}
                      </Pressable>
                    ) : (
                      <FileText size={17} color="#475569" />
                    )}
                    <Pressable onPress={() => setConfirmar(confirmar === g.id ? null : g.id)} hitSlop={6}>
                      <Trash2 size={17} color="#fda4af" />
                    </Pressable>
                  </View>
                </View>
              </View>

              {confirmar === g.id ? (
                <View className="mt-3 flex-row items-center gap-3 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2.5">
                  <AlertTriangle size={16} color="#fda4af" />
                  <Text className="flex-1 text-xs text-rose-200">
                    ¿Eliminar {g.concepto} ({money(g.monto)})?
                    {g.tiene_archivo ? ' También se borra su factura.' : ''} No se puede deshacer.
                  </Text>
                  <Pressable onPress={() => setConfirmar(null)} className="rounded-lg border border-white/15 px-2 py-1.5">
                    <Text className="text-xs font-semibold text-slate-300">Cancelar</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => eliminar(g)}
                    disabled={borrando === g.id}
                    className="flex-row items-center gap-1 rounded-lg bg-rose-500 px-2 py-1.5"
                  >
                    {borrando === g.id ? <Loader2 size={13} color="#fff" /> : null}
                    <Text className="text-xs font-semibold text-white">Eliminar</Text>
                  </Pressable>
                </View>
              ) : null}
            </Card>
          ))}
        </View>
      )}

      {modal ? (
        <GastoModal
          session={session}
          showToast={showToast}
          onClose={() => setModal(false)}
          onSaved={async (msg) => {
            setModal(false);
            showToast(msg);
            await refresh();
          }}
        />
      ) : null}
    </Screen>
  );
}
