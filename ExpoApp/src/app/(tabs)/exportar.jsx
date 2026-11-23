import { useMemo, useState } from 'react';
import { Platform, Pressable, RefreshControl, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  CalendarPlus,
  FileDown,
  FileSpreadsheet,
  FileText,
  Loader2,
  Receipt,
  Table2
} from 'lucide-react-native';
import { useApp } from '../../context/AppContext.jsx';
import { cn, money } from '../../utils/cn.js';
import * as api from '../../services/api.js';
import { exportarGastosCSV, exportarPDF, exportarPlanillaCSV } from '../../utils/export.js';
import { Card, EmptyState, Field, PrimaryButton, Screen, Text } from '../../components/ui.jsx';

function aISO(date) {
  const d = date instanceof Date ? date : new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function FechaField({ label, value, onChange }) {
  const [visible, setVisible] = useState(false);
  return (
    <View className="mb-3 flex-1">
      <Text className="mb-1.5 text-xs uppercase tracking-wider text-slate-400">{label}</Text>
      <Pressable
        onPress={() => setVisible(true)}
        className="rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3"
      >
        <Text className="text-sm text-white">{aISO(value)}</Text>
      </Pressable>
      {visible ? (
        <DateTimePicker
          value={value}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, selected) => {
            setVisible(false);
            if (selected) onChange(selected);
          }}
        />
      ) : null}
    </View>
  );
}

function ActionCard({ icon: Icon, title, description, onPress, disabled, accent }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} className={cn('active:opacity-70', disabled && 'opacity-40')}>
      <Card className="flex-row items-center gap-4 p-4">
        <View className="h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: `${accent}22` }}>
          <Icon size={23} color={accent} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-sm font-semibold text-white">{title}</Text>
          <Text className="mt-0.5 text-xs text-slate-400">{description}</Text>
        </View>
      </Card>
    </Pressable>
  );
}

export default function ExportarScreen() {
  const { status, balance, session, loading, refresh, showToast } = useApp();
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [inicio, setInicio] = useState(new Date());
  const [fin, setFin] = useState(new Date());
  const [cuota, setCuota] = useState('20');
  const [descripcion, setDescripcion] = useState('');

  const numGastos = status?.gastos?.length || 0;

  const rows = useMemo(() => {
    if (!status?.members) return [];
    return status.members.map((member) => {
      let abonado = 0;
      let deuda = 0;
      for (const week of status.weeks || []) {
        const key = `${member.numero_lista}-${week.id}`;
        const a = Number(status.grouped?.[key]?.total || 0);
        abonado += a;
        deuda += Math.max(0, week.monto_cuota - a);
      }
      return { member, abonado, deuda };
    });
  }, [status]);

  async function ejecutar(fn, mensaje) {
    try {
      await fn();
      showToast(mensaje);
    } catch (error) {
      showToast(error?.message || 'No se pudo generar el archivo.', 'error');
    }
  }

  async function handleCSV() {
    const report = await api.getReport();
    await ejecutar(
      () => exportarPlanillaCSV(report),
      'Archivo CSV/Excel generado.'
    );
  }

  async function handlePDF() {
    const report = await api.getReport();
    await ejecutar(
      () => exportarPDF(report, balance, session),
      'Reporte PDF generado.'
    );
  }

  async function handleGastosCSV() {
    await ejecutar(
      () => exportarGastosCSV(status.gastos || []),
      'CSV de gastos generado.'
    );
  }

  async function handleNewWeek() {
    if (!inicio || !fin || !cuota) return;
    setBusy(true);
    try {
      await api.createWeek({
        fecha_inicio: aISO(inicio),
        fecha_fin: aISO(fin),
        monto_cuota: Number(cuota),
        descripcion: descripcion.trim() || undefined
      });
      showToast('Semana agregada correctamente.');
      setShowForm(false);
      setDescripcion('');
      await refresh();
    } catch (error) {
      showToast(error?.message || 'No se pudo agregar la semana.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#2dd4bf" />}>
      <View className="mb-5">
        <View className="flex-row items-center gap-2">
          <FileDown size={20} color="#34d399" />
          <Text className="text-xl font-bold text-white">Exportar y gestionar</Text>
        </View>
        <Text className="mt-1 text-sm text-slate-400">
          Descarga el estado de cuotas o agrega nuevas semanas del calendario.
        </Text>
      </View>

      <View className="mb-5 gap-3">
        <ActionCard
          icon={FileSpreadsheet}
          title="Descargar Excel / CSV"
          description="Tabla completa por semana y totales"
          onPress={handleCSV}
          accent="#34d399"
        />
        <ActionCard
          icon={FileText}
          title="Generar reporte PDF"
          description="Planilla, gastos y resumen de caja"
          onPress={handlePDF}
          accent="#fb7185"
        />
        <ActionCard
          icon={Receipt}
          title="CSV de gastos"
          description={numGastos === 0 ? 'Todavía no hay gastos' : `${numGastos} registro(s) con su total`}
          onPress={handleGastosCSV}
          disabled={numGastos === 0}
          accent="#fbbf24"
        />
      </View>

      <Card className="mb-5 p-5">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <CalendarPlus size={17} color="#2dd4bf" />
            <Text className="text-base font-semibold text-white">Semanas del calendario</Text>
          </View>
          <Pressable
            onPress={() => setShowForm((v) => !v)}
            className="rounded-xl bg-teal-500/15 px-3 py-2 active:opacity-70"
          >
            <Text className="text-xs font-semibold text-teal-300">{showForm ? 'Cancelar' : 'Agregar'}</Text>
          </Pressable>
        </View>

        {showForm ? (
          <View className="mt-4 rounded-xl border border-white/5 bg-white/5 p-4">
            <View className="flex-row gap-2">
              <FechaField label="Inicio (lunes)" value={inicio} onChange={setInicio} />
              <FechaField label="Fin (domingo)" value={fin} onChange={setFin} />
            </View>
            <Field label="Cuota" value={cuota} onChangeText={setCuota} keyboardType="decimal-pad" />
            <Field
              label="Descripción"
              value={descripcion}
              onChangeText={setDescripcion}
              placeholder="Opcional"
              className="mb-4"
            />
            <PrimaryButton onPress={handleNewWeek} loading={busy} icon={CalendarPlus}>
              Guardar semana
            </PrimaryButton>
          </View>
        ) : null}

        <View className="mt-4 flex-row flex-wrap gap-2">
          {(status?.weeks || []).map((week) => (
            <View key={week.id} className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              <Text className="text-xs text-slate-300">
                Sem {week.numero_semana} · {week.fecha_inicio.slice(5)} → {week.fecha_fin.slice(5)} ·{' '}
                {money(week.monto_cuota)}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <Card className="overflow-hidden">
        <View className="flex-row items-center gap-2 border-b border-white/5 px-5 py-3">
          <Table2 size={16} color="#94a3b8" />
          <Text className="text-sm font-semibold text-white">Previsualización de totales</Text>
        </View>
        {rows.length ? (
          <View>
            {rows.map((r) => (
              <View key={r.member.numero_lista} className="flex-row items-center gap-2 border-b border-white/5 px-4 py-2.5">
                <Text className="w-6 text-xs text-slate-500">{r.member.numero_lista}</Text>
                <Text numberOfLines={1} className="flex-1 text-xs text-white">
                  {r.member.nombre}
                </Text>
                <Text className="w-20 text-right text-xs text-emerald-400">{money(r.abonado)}</Text>
                <Text className="w-20 text-right text-xs text-rose-400">{money(r.deuda)}</Text>
                <View
                  className={cn(
                    'w-24 rounded-full px-2 py-0.5',
                    r.deuda === 0
                      ? 'bg-emerald-500/15'
                      : r.abonado > 0
                        ? 'bg-amber-500/15'
                        : 'bg-rose-500/15'
                  )}
                >
                  <Text
                    className={cn(
                      'text-center text-[10px] font-semibold',
                      r.deuda === 0
                        ? 'text-emerald-300'
                        : r.abonado > 0
                          ? 'text-amber-300'
                          : 'text-rose-300'
                    )}
                  >
                    {r.deuda === 0 ? 'Al corriente' : r.abonado > 0 ? 'Parcial' : 'Sin pagos'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <EmptyState icon={Table2} title="Sin datos" message="Aún no hay integrantes para previsualizar." />
        )}
      </Card>

      {busy ? (
        <View className="absolute bottom-4 left-4 right-4 flex-row items-center justify-center gap-2 rounded-xl border border-white/10 bg-slate-900/90 py-3">
          <Loader2 size={16} color="#34d399" />
          <Text className="text-xs text-slate-300">Guardando…</Text>
        </View>
      ) : null}
    </Screen>
  );
}
