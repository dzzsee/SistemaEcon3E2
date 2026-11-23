import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { AlertTriangle, ChevronDown, User, Wallet } from 'lucide-react-native';
import { useApp } from '../../context/AppContext.jsx';
import { cn, estadoInfo, money, weekLabel } from '../../utils/cn.js';
import { Card, EmptyState, Screen, Text } from '../../components/ui.jsx';

export default function AlumnosScreen() {
  const { status } = useApp();
  const [expanded, setExpanded] = useState(null);

  const rows = useMemo(() => {
    if (!status?.members) return [];
    return status.members.map((member) => {
      let totalAbonado = 0;
      let totalDeuda = 0;
      const weekRows = (status.weeks || []).map((week) => {
        const key = `${member.numero_lista}-${week.id}`;
        const abonado = Number(status.grouped?.[key]?.total || 0);
        const deuda = Math.max(0, week.monto_cuota - abonado);
        const estado = abonado >= week.monto_cuota ? 'pagado' : abonado > 0 ? 'abonado' : 'deuda';
        totalAbonado += abonado;
        totalDeuda += deuda;
        return { week, abonado, deuda, estado };
      });
      return { member, totalAbonado, totalDeuda, weekRows };
    });
  }, [status]);

  if (!status) {
    return (
      <Screen>
        <EmptyState icon={User} title="Cargando integrantes" message="Leyendo la lista del grupo." />
      </Screen>
    );
  }

  return (
    <Screen>
      <View className="mb-5">
        <View className="flex-row items-center gap-2">
          <User size={20} color="#34d399" />
          <Text className="text-xl font-bold text-white">Integrantes de 3E2</Text>
        </View>
        <Text className="mt-1 text-sm text-slate-400">Lista fija de {status.members.length} integrantes.</Text>
      </View>

      {rows.length ? (
        <View className="gap-3">
          {rows.map(({ member, totalAbonado, totalDeuda, weekRows }) => {
            const isOpen = expanded === member.numero_lista;
            const percentage = status.weeks?.length
              ? Math.round((weekRows.filter((r) => r.estado === 'pagado').length / status.weeks.length) * 100)
              : 0;

            return (
              <Card key={member.numero_lista} className={cn('overflow-hidden', isOpen && 'border-emerald-400/30')}>
                <Pressable
                  onPress={() => setExpanded(isOpen ? null : member.numero_lista)}
                  className="flex-row items-center gap-3 p-4"
                >
                  <View className="h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
                    <Text className="font-bold text-emerald-300">{member.numero_lista}</Text>
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text numberOfLines={1} className="text-sm font-semibold text-white">
                      {member.nombre}
                    </Text>
                    <View className="mt-1 flex-row gap-3">
                      <View className="flex-row items-center gap-1">
                        <Wallet size={12} color="#34d399" />
                        <Text className="text-xs text-slate-400">{money(totalAbonado)}</Text>
                      </View>
                      <View className="flex-row items-center gap-1">
                        <AlertTriangle size={12} color="#fb7185" />
                        <Text className="text-xs text-slate-400">{money(totalDeuda)}</Text>
                      </View>
                    </View>
                    <View className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                      <View className="h-full rounded-full bg-emerald-500" style={{ width: `${percentage}%` }} />
                    </View>
                  </View>
                  <View className="items-end gap-1">
                    <Text className="text-sm font-bold text-slate-200">{percentage}%</Text>
                    <Text className="text-[10px] uppercase tracking-wider text-slate-500">cumplido</Text>
                    <ChevronDown
                      size={16}
                      color="#94a3b8"
                      style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }}
                    />
                  </View>
                </Pressable>

                {isOpen ? (
                  <View className="border-t border-white/5 px-4 pb-4 pt-3">
                    <View className="mb-2 flex-row items-center justify-between">
                      <Text className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Semana</Text>
                      <Text className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Estado</Text>
                    </View>
                    <View className="gap-1.5">
                      {weekRows.map((r) => {
                        const est = estadoInfo(r.estado);
                        return (
                          <View key={r.week.id} className="flex-row items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                            <Text className="text-xs text-slate-300">{weekLabel(r.week)}</Text>
                            <View className="flex-row items-center gap-2">
                              <Text className="text-xs text-slate-400">{r.abonado > 0 ? money(r.abonado) : '—'}</Text>
                              <View className={cn('rounded-full px-2 py-0.5', est.soft)}>
                                <Text className={cn('text-[10px] font-semibold', est.text)}>
                                  {r.estado === 'pagado'
                                    ? est.label
                                    : r.estado === 'abonado'
                                      ? `Falta ${money(r.deuda)}`
                                      : money(r.deuda)}
                                </Text>
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ) : null}
              </Card>
            );
          })}
        </View>
      ) : (
        <EmptyState icon={User} title="Sin integrantes" message="Todavía no hay lista de alumnos." />
      )}
    </Screen>
  );
}
