import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { ChevronLeft, ChevronRight, HandCoins, PlusCircle } from 'lucide-react-native';
import { useApp } from '../../context/AppContext.jsx';
import { cn, estadoInfo, money, weekLabel } from '../../utils/cn.js';
import { Card, EmptyState, Screen, Text } from '../../components/ui.jsx';
import AbonoModal from '../../components/AbonoModal.jsx';

export default function PlanillaScreen() {
  const { status, session, loading, refresh, showToast } = useApp();
  const weeks = status?.weeks || [];
  const [selectedWeekId, setSelectedWeekId] = useState(null);
  const [modal, setModal] = useState(null);

  const selectedWeek =
    weeks.find((w) => w.id === selectedWeekId) || weeks[weeks.length - 1] || null;

  const weekStats = useMemo(() => {
    if (!selectedWeek || !status) return { pagados: 0, abonados: 0, deudas: 0, recaudado: 0, esperado: 0 };
    let pagados = 0;
    let abonados = 0;
    let deudas = 0;
    let recaudado = 0;
    for (const member of status.members || []) {
      const key = `${member.numero_lista}-${selectedWeek.id}`;
      const abonado = Number(status.grouped?.[key]?.total || 0);
      recaudado += abonado;
      if (abonado >= selectedWeek.monto_cuota) pagados++;
      else if (abonado > 0) abonados++;
      else deudas++;
    }
    return {
      pagados,
      abonados,
      deudas,
      recaudado,
      esperado: selectedWeek.monto_cuota * (status.members?.length || 0)
    };
  }, [status, selectedWeek]);

  function moverSemana(direccion) {
    if (!selectedWeek) return;
    const indice = weeks.findIndex((w) => w.id === selectedWeek.id);
    const siguiente = indice + direccion;
    if (siguiente >= 0 && siguiente < weeks.length) setSelectedWeekId(weeks[siguiente].id);
  }

  if (!status) {
    return (
      <Screen>
        <EmptyState icon={HandCoins} title="Cargando planilla" message="Leyendo semanas e integrantes guardados." />
      </Screen>
    );
  }

  if (!selectedWeek) {
    return (
      <Screen>
        <EmptyState icon={HandCoins} title="Sin semanas" message="No hay semanas registradas. Agrégalas desde Exportar." />
      </Screen>
    );
  }

  return (
    <Screen refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#34d399" />}>
      <View className="mb-4 flex-row items-center gap-2">
        <Pressable onPress={() => moverSemana(-1)} className="rounded-xl border border-white/10 bg-white/5 p-2">
          <ChevronLeft size={17} color="#cbd5e1" />
        </Pressable>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-1">
          <View className="flex-row gap-1.5">
            {weeks.map((week) => {
              const active = week.id === selectedWeek.id;
              return (
                <Pressable
                  key={week.id}
                  onPress={() => setSelectedWeekId(week.id)}
                  className={cn(
                    'rounded-xl px-3.5 py-2',
                    active ? 'bg-emerald-500' : 'border border-white/10 bg-white/5'
                  )}
                >
                  <Text className={cn('text-xs font-medium', active ? 'text-white' : 'text-slate-400')}>
                    Sem. {week.numero_semana}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
        <Pressable onPress={() => moverSemana(1)} className="rounded-xl border border-white/10 bg-white/5 p-2">
          <ChevronRight size={17} color="#cbd5e1" />
        </Pressable>
      </View>

      <Card className="mb-5 p-5">
        <View className="flex-row items-center gap-2">
          <HandCoins size={20} color="#34d399" />
          <Text className="text-base font-bold text-white">{weekLabel(selectedWeek)}</Text>
        </View>
        <Text className="mt-1 text-xs text-slate-400">
          Cuota semanal de {money(selectedWeek.monto_cuota)} por integrante
        </Text>

        <View className="mt-4 flex-row gap-2">
          <View className="flex-1 rounded-xl bg-emerald-500/10 px-2 py-2">
            <Text className="text-center text-lg font-bold text-emerald-400">{weekStats.pagados}</Text>
            <Text className="text-center text-[10px] uppercase tracking-wider text-slate-400">Pagados</Text>
          </View>
          <View className="flex-1 rounded-xl bg-amber-500/10 px-2 py-2">
            <Text className="text-center text-lg font-bold text-amber-400">{weekStats.abonados}</Text>
            <Text className="text-center text-[10px] uppercase tracking-wider text-slate-400">Abonados</Text>
          </View>
          <View className="flex-1 rounded-xl bg-rose-500/10 px-2 py-2">
            <Text className="text-center text-lg font-bold text-rose-400">{weekStats.deudas}</Text>
            <Text className="text-center text-[10px] uppercase tracking-wider text-slate-400">Deudas</Text>
          </View>
        </View>

        <View className="mt-4 flex-row items-center justify-between border-t border-white/5 pt-3">
          <Text className="text-sm text-slate-400">Recaudado esta semana</Text>
          <View>
            <Text className="text-right font-bold text-emerald-400">{money(weekStats.recaudado)}</Text>
            <Text className="text-right text-xs text-slate-500">/ {money(weekStats.esperado)}</Text>
          </View>
        </View>
      </Card>

      <View className="gap-2.5">
        {(status.members || []).map((member) => {
          const key = `${member.numero_lista}-${selectedWeek.id}`;
          const abonado = Number(status.grouped?.[key]?.total || 0);
          const deuda = Math.max(0, selectedWeek.monto_cuota - abonado);
          const estado = abonado >= selectedWeek.monto_cuota ? 'pagado' : abonado > 0 ? 'abonado' : 'deuda';
          const est = estadoInfo(estado);
          const cubierto = abonado >= selectedWeek.monto_cuota;

          return (
            <Pressable
              key={member.numero_lista}
              onPress={() => setModal({ member, week: selectedWeek })}
              className="active:opacity-80"
            >
              <Card className="flex-row items-center gap-3 p-3.5">
                <View className="h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5">
                  <Text className="font-bold text-slate-300">{member.numero_lista}</Text>
                </View>
                <View className="min-w-0 flex-1">
                  <Text numberOfLines={1} className="text-sm font-semibold text-white">
                    {member.nombre}
                  </Text>
                  <Text className="text-xs text-slate-400">
                    {estado === 'pagado'
                      ? `${money(abonado)} · Completado`
                      : estado === 'abonado'
                        ? `Abonado ${money(abonado)} · falta ${money(deuda)}`
                        : `Debe ${money(deuda)}`}
                  </Text>
                </View>
                <View className={cn('h-2.5 w-2.5 shrink-0 rounded-full', est.bg)} />
                <View className={cn('flex-row items-center gap-1 rounded-xl px-2 py-2', cubierto ? 'bg-emerald-500' : 'bg-white/5')}>
                  <PlusCircle size={14} color={cubierto ? '#fff' : '#6ee7b7'} />
                  <Text className={cn('text-xs font-semibold', cubierto ? 'text-white' : 'text-emerald-300')}>
                    {cubierto ? 'Registrado' : 'Cobrar'}
                  </Text>
                </View>
              </Card>
            </Pressable>
          );
        })}
      </View>

      {modal ? (
        <AbonoModal
          member={modal.member}
          week={modal.week}
          grouped={status.grouped}
          session={session}
          showToast={showToast}
          onClose={() => setModal(null)}
          onSaved={async (msg) => {
            setModal(null);
            await refresh();
            showToast(msg || 'Abono registrado correctamente.');
          }}
        />
      ) : null}
    </Screen>
  );
}
