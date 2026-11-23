import { useMemo } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  PiggyBank,
  Receipt,
  Sparkles,
  TrendingUp,
  Users,
  Wallet
} from 'lucide-react-native';
import { useApp } from '../../context/AppContext.jsx';
import { money, weekLabel } from '../../utils/cn.js';
import { Card, EmptyState, Screen, SectionTitle, StatCard, Text } from '../../components/ui.jsx';

function SemanaCard({ week, status, onPress }) {
  const members = status.members || [];
  let pagados = 0;
  let abonados = 0;
  let deudas = 0;
  let recaudado = 0;

  for (const member of members) {
    const key = `${member.numero_lista}-${week.id}`;
    const abonado = Number(status.grouped?.[key]?.total || 0);
    recaudado += abonado;
    if (abonado >= week.monto_cuota) pagados++;
    else if (abonado > 0) abonados++;
    else deudas++;
  }

  return (
    <Pressable onPress={onPress} className="active:opacity-80">
      <Card className="p-4">
        <View className="flex-row items-center justify-between gap-2">
          <View className="flex-row items-center gap-2">
            <CalendarDays size={16} color="#34d399" />
            <Text className="text-sm font-semibold text-white">{weekLabel(week)}</Text>
          </View>
          <View className="rounded-full bg-white/5 px-2 py-1">
            <Text className="text-[10px] font-medium text-slate-300">
              {money(week.monto_cuota)}/semana
            </Text>
          </View>
        </View>

        <View className="mt-3 flex-row items-center justify-between">
          <Text className="text-xs text-slate-400">
            Recaudado {money(recaudado)} de {money(week.monto_cuota * members.length)}
          </Text>
          <Text className="text-xs font-semibold text-slate-300">{pagados} pagados</Text>
        </View>

        <View className="mt-2 flex-row gap-1.5">
          <View className="h-1 flex-1 rounded-full bg-emerald-500/80" />
          <View className="h-1 flex-1 rounded-full bg-amber-500/80" />
          <View className="h-1 flex-1 rounded-full bg-rose-500/80" />
        </View>

        <View className="mt-2 flex-row gap-2">
          <View className="rounded-full bg-emerald-500/15 px-2 py-0.5">
            <Text className="text-[10px] font-semibold text-emerald-300">{pagados}</Text>
          </View>
          <View className="rounded-full bg-amber-500/15 px-2 py-0.5">
            <Text className="text-[10px] font-semibold text-amber-300">{abonados}</Text>
          </View>
          <View className="rounded-full bg-rose-500/15 px-2 py-0.5">
            <Text className="text-[10px] font-semibold text-rose-300">{deudas}</Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

export default function ResumenScreen() {
  const router = useRouter();
  const { session, status, balance, loading, refresh } = useApp();

  const weeksToShow = useMemo(() => {
    if (!status?.weeks) return [];
    const weeks = [...status.weeks].sort((a, b) => a.numero_semana - b.numero_semana);
    if (!status.members?.length) return weeks;
    return weeks.filter((week) => {
      const pagados = status.members.reduce((total, member) => {
        const key = `${member.numero_lista}-${week.id}`;
        const abonado = Number(status.grouped?.[key]?.total || 0);
        return total + (abonado >= Number(week.monto_cuota) ? 1 : 0);
      }, 0);
      return pagados < status.members.length;
    });
  }, [status]);

  if (!status || !balance) {
    return (
      <Screen>
        <EmptyState icon={Wallet} title="Cargando información" message="Preparando el estado financiero del grupo." />
      </Screen>
    );
  }

  const pct = balance.porcentajeCobro || 0;
  const anchoBarra = Math.max(0, Math.min(100, pct));
  const nombre = String(session?.nombre || '').split(' ')[0] || 'administrador';

  return (
    <Screen refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#34d399" />}>
      <View className="mb-6">
        <Text className="text-xl font-bold text-white">Hola, {nombre}</Text>
        <Text className="mt-1 text-sm text-slate-400">Este es el estado financiero del grupo 3E2.</Text>
      </View>

      <View className="mb-6 flex-row flex-wrap gap-3">
        <StatCard icon={Wallet} label="Total recaudado" value={money(balance.totalRecaudado)} hint={`de ${money(balance.totalEsperado)} esperados`} accent="#34d399" className="w-[47%]" />
        <StatCard icon={AlertTriangle} label="En deuda" value={money(balance.totalDeuda)} hint={`${balance.totalAlumnos} integrantes · ${balance.semanasCursadas} semanas`} accent="#fb7185" className="w-[47%]" />
        <StatCard icon={PiggyBank} label="Efectivo en caja" value={money(balance.saldoCaja)} hint="recaudado − gastos" accent="#38bdf8" className="w-[47%]" />
        <StatCard icon={Receipt} label="Gastos" value={money(balance.totalGastos)} hint={`${status.gastos?.length || 0} registros`} accent="#fbbf24" className="w-[47%]" />
        <StatCard icon={TrendingUp} label="Porcentaje cobrado" value={`${pct}%`} hint="del total proyectado" accent="#2dd4bf" className="w-[47%]" />
        <StatCard icon={CheckCircle2} label="Grupo" value={`${balance.totalAlumnos}`} hint="integrantes inscritos" accent="#a78bfa" className="w-[47%]" />
      </View>

      <Card className="mb-6 p-5">
        <View className="mb-3 flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Sparkles size={16} color="#34d399" />
            <Text className="text-sm font-medium text-slate-300">Cumplimiento global</Text>
          </View>
          <Text className={pct < 0 ? 'font-bold text-rose-400' : 'font-bold text-emerald-400'}>
            {pct}%
          </Text>
        </View>
        <View className="h-3 w-full overflow-hidden rounded-full bg-slate-800/80">
          <View className="h-full rounded-full bg-emerald-500" style={{ width: `${anchoBarra}%` }} />
        </View>
        {pct < 0 ? (
          <Text className="mt-2 text-xs text-rose-300">
            El porcentaje es negativo porque los gastos superan lo recaudado.
          </Text>
        ) : null}
      </Card>

      <SectionTitle
        right={
          <Pressable onPress={() => router.push('/(tabs)/planilla')}>
            <Text className="text-xs font-medium text-emerald-400">Ver planilla →</Text>
          </Pressable>
        }
      >
        <View className="flex-row items-center gap-2">
          <Users size={16} color="#34d399" />
          <Text className="text-base font-semibold text-white">Progreso semanal</Text>
        </View>
      </SectionTitle>

      {weeksToShow.length ? (
        <View className="gap-3">
          {weeksToShow.map((week) => (
            <SemanaCard
              key={week.id}
              week={week}
              status={status}
              onPress={() => router.push('/(tabs)/planilla')}
            />
          ))}
        </View>
      ) : (
        <EmptyState icon={CheckCircle2} title="Todo al día" message="Todas las semanas están completamente pagadas." />
      )}
    </Screen>
  );
}
