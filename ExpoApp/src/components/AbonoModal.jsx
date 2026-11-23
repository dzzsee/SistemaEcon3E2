import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Banknote, CheckCircle2, X } from 'lucide-react-native';
import { cn, money, weekLabel } from '../utils/cn.js';
import * as api from '../services/api.js';
import { Card, Chip, Field, Label, PrimaryButton, Text } from './ui.jsx';

export default function AbonoModal({ member, week, grouped, session, onClose, onSaved, showToast }) {
  const currentAbonado = useMemo(() => {
    const key = `${member.numero_lista}-${week.id}`;
    return grouped?.[key] ? grouped[key].total : 0;
  }, [grouped, member, week]);

  const pendiente = Math.max(0, week.monto_cuota - currentAbonado);
  const [monto, setMonto] = useState(pendiente > 0 ? String(pendiente) : '');
  const [nota, setNota] = useState('');
  const [loading, setLoading] = useState(false);

  const presets = useMemo(() => {
    const list = [20, 25, 50, week.monto_cuota];
    if (pendiente > 0 && !list.includes(pendiente)) list.push(pendiente);
    if (currentAbonado > 0 && !list.includes(currentAbonado)) list.push(currentAbonado);
    return [...new Set(list)].sort((a, b) => a - b).slice(0, 6);
  }, [week.monto_cuota, pendiente, currentAbonado]);

  const montoNum = Number(monto);

  async function handleSubmit() {
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
    } catch (error) {
      showToast?.(error?.message || 'No se pudo registrar el abono.', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 justify-end bg-black/60 px-0 pb-0 sm:px-4 sm:pb-4">
        <Pressable onPress={() => {}}>
          <Card className="max-h-[88%] rounded-t-3xl sm:rounded-3xl">
            <ScrollView keyboardShouldPersistTaps="handled">
              <View className="relative border-b border-white/5 px-6 py-5">
                <Pressable
                  onPress={onClose}
                  hitSlop={8}
                  className="absolute right-4 top-4 rounded-xl border border-white/10 bg-white/5 p-1.5"
                >
                  <X size={16} color="#94a3b8" />
                </Pressable>
                <Text className="text-[11px] font-medium uppercase tracking-wider text-emerald-400">
                  #{member.numero_lista} · Semana {week.numero_semana}
                </Text>
                <Text className="mt-1 text-lg font-bold text-white">{member.nombre}</Text>
                <Text className="mt-0.5 text-xs text-slate-400">{weekLabel(week)}</Text>
              </View>

              <View className="px-6 py-5">
                <View className="mb-5 flex-row gap-2">
                  <View className="flex-1 rounded-xl bg-white/5 px-2 py-3">
                    <Text className="text-center text-[10px] uppercase tracking-wider text-slate-400">Cuota</Text>
                    <Text className="mt-1 text-center text-sm font-bold text-white">{money(week.monto_cuota)}</Text>
                  </View>
                  <View className="flex-1 rounded-xl bg-emerald-500/10 px-2 py-3">
                    <Text className="text-center text-[10px] uppercase tracking-wider text-emerald-400/70">Abonado</Text>
                    <Text className="mt-1 text-center text-sm font-bold text-emerald-400">{money(currentAbonado)}</Text>
                  </View>
                  <View className={cn('flex-1 rounded-xl px-2 py-3', pendiente > 0 ? 'bg-rose-500/10' : 'bg-emerald-500/10')}>
                    <Text className={cn('text-center text-[10px] uppercase tracking-wider', pendiente > 0 ? 'text-rose-400/70' : 'text-emerald-400/70')}>
                      Pendiente
                    </Text>
                    <Text className={cn('mt-1 text-center text-sm font-bold', pendiente > 0 ? 'text-rose-400' : 'text-emerald-400')}>
                      {money(pendiente)}
                    </Text>
                  </View>
                </View>

                {currentAbonado >= week.monto_cuota ? (
                  <View className="mb-4 flex-row items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3">
                    <CheckCircle2 size={16} color="#6ee7b7" />
                    <Text className="flex-1 text-sm text-emerald-200">
                      Esta cuota ya está cubierta. Puedes registrar un aporte voluntario.
                    </Text>
                  </View>
                ) : null}

                <Label>Monto del abono</Label>
                <View className="mb-3 flex-row items-center rounded-xl border border-white/10 bg-slate-950/80 px-4">
                  <Banknote size={17} color="#34d399" />
                  <TextInput
                    value={monto}
                    onChangeText={setMonto}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor="#64748b"
                    autoFocus
                    className="flex-1 py-3 pl-3 text-lg font-bold text-white"
                  />
                </View>

                <View className="mb-4 flex-row flex-wrap gap-1.5">
                  {presets.map((preset) => (
                    <Chip key={preset} active={Number(monto) === preset} onPress={() => setMonto(String(preset))}>
                      {money(preset)}
                    </Chip>
                  ))}
                </View>

                <Field
                  label="Nota (opcional)"
                  value={nota}
                  onChangeText={setNota}
                  placeholder="Ej: Pago parcial, abono en efectivo…"
                  className="mb-5"
                />

                <PrimaryButton
                  onPress={handleSubmit}
                  disabled={!montoNum || montoNum <= 0}
                  loading={loading}
                  icon={CheckCircle2}
                >
                  Registrar abono de {money(montoNum || 0)}
                </PrimaryButton>

                <Text className="mt-3 text-center text-[11px] text-slate-500">
                  Registrado por: {session?.nombre} ({session?.rol})
                </Text>
              </View>
            </ScrollView>
          </Card>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
