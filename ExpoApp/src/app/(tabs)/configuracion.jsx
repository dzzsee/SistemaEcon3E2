import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { CalendarCog, Check, Coins, RefreshCw, Save, Users } from 'lucide-react-native';
import { useApp } from '../../context/AppContext.jsx';
import * as api from '../../services/api.js';
import { Background, Card, EmptyState, Field, PrimaryButton, SecondaryButton, Text } from '../../components/ui.jsx';

const ROLES = { tutor: 'Tutor(a)', presidente: 'Presidente', tesorero: 'Tesorero' };

function aISO(date) {
  const d = date instanceof Date ? date : new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function desdeISO(iso, fallback) {
  if (!iso) return fallback;
  const date = new Date(`${iso}T00:00:00`);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function FechaField({ label, value, onChange }) {
  const [visible, setVisible] = useState(false);
  return (
    <View className="mb-3 flex-1">
      <Text className="mb-1.5 text-xs uppercase tracking-wider text-slate-400">{label}</Text>
      <PrimaryButton onPress={() => setVisible(true)} className="bg-white/5 py-3" icon={CalendarCog}>
        {aISO(desdeISO(value, new Date()))}
      </PrimaryButton>
      {visible ? (
        <DateTimePicker
          value={desdeISO(value, new Date())}
          mode="date"
          display="default"
          onChange={(_, selected) => {
            setVisible(false);
            if (selected) onChange(aISO(selected));
          }}
        />
      ) : null}
    </View>
  );
}

function AdminRow({ admin, onSave }) {
  const [form, setForm] = useState({ nombre: admin.nombre, usuario: admin.usuario, pin: '' });
  return (
    <Card className="p-4">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-white">{admin.nombre}</Text>
        <View className="rounded-full border border-white/10 px-2 py-1">
          <Text className="text-[10px] text-slate-300">{ROLES[admin.rol] || admin.rol}</Text>
        </View>
      </View>
      <Field
        label="Nombre"
        value={form.nombre}
        onChangeText={(v) => setForm((f) => ({ ...f, nombre: v }))}
        autoCapitalize="words"
      />
      <Field
        label="Usuario"
        value={form.usuario}
        onChangeText={(v) => setForm((f) => ({ ...f, usuario: v }))}
        autoCapitalize="none"
      />
      <Field
        label="PIN nuevo (opcional)"
        value={form.pin}
        onChangeText={(v) => setForm((f) => ({ ...f, pin: v }))}
        placeholder="••••"
        keyboardType="numeric"
        secureTextEntry
      />
      <PrimaryButton onPress={() => onSave(form)} icon={Check}>
        Guardar usuario
      </PrimaryButton>
    </Card>
  );
}

export default function ConfiguracionScreen() {
  const { refresh, showToast } = useApp();
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ cuota_semanal: '', periodo_inicio: '', periodo_fin: '' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await api.getConfig();
      setData(result);
      setForm(result.config);
    } catch (error) {
      showToast(error?.message || 'No se pudo cargar la configuración.', 'error');
    }
  }, [showToast]);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const result = await api.getConfig();
        if (!activo) return;
        setData(result);
        setForm(result.config);
      } catch (error) {
        if (activo) showToast(error?.message || 'No se pudo cargar la configuración.', 'error');
      }
    })();
    return () => {
      activo = false;
    };
  }, [showToast]);

  async function save() {
    setBusy(true);
    try {
      const result = await api.saveConfig({ ...form, cuota_semanal: Number(form.cuota_semanal) });
      if (!result.success) throw new Error(result.message);
      setData((current) => ({ ...current, config: result.config }));
      showToast('Configuración guardada.');
      await refresh();
    } catch (error) {
      showToast(error?.message || 'No se pudo guardar.', 'error');
    } finally {
      setBusy(false);
    }
  }

  function regenerate() {
    Alert.alert(
      'Reconstruir semanas',
      'Se eliminarán las semanas fuera del nuevo periodo y sus abonos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Regenerar', style: 'destructive', onPress: ejecutarRegeneracion }
      ]
    );
  }

  async function ejecutarRegeneracion() {
    setBusy(true);
    try {
      const result = await api.regenerateWeeks({ ...form, cuota_semanal: Number(form.cuota_semanal) });
      if (!result.success) throw new Error(result.message);
      showToast(`Periodo regenerado: ${result.weeks} semanas.`);
      await refresh();
      await load();
    } catch (error) {
      showToast(error?.message || 'No se pudo regenerar el periodo.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function saveAdmin(admin, values) {
    try {
      const result = await api.updateAdmin({
        id: admin.id,
        nombre: values.nombre,
        usuario: values.usuario,
        pin: values.pin
      });
      if (!result.success) throw new Error(result.message);
      setData((current) => ({ ...current, admins: result.admins }));
      showToast('Usuario actualizado.');
    } catch (error) {
      showToast(error?.message || 'No se pudo actualizar el usuario.', 'error');
    }
  }

  if (!data) {
    return (
      <Background>
        <View className="flex-1 items-center justify-center">
          <Text className="text-sm text-slate-400">Cargando configuración…</Text>
        </View>
      </Background>
    );
  }

  return (
    <Background>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View className="gap-5">
      <View>
        <View className="flex-row items-center gap-2">
          <CalendarCog size={20} color="#34d399" />
          <Text className="text-xl font-bold text-white">Configuración</Text>
        </View>
        <Text className="mt-1 text-sm text-slate-400">
          Cuota semanal, periodo lectivo y acceso de administradores.
        </Text>
      </View>

      <Card className="p-5">
        <View className="flex-row items-center gap-2">
          <Coins size={17} color="#34d399" />
          <Text className="text-base font-semibold text-white">Cuota y periodo lectivo</Text>
        </View>

        <View className="mt-4 flex-row gap-2">
          <FechaField
            label="Inicio del periodo"
            value={form.periodo_inicio}
            onChange={(v) => setForm((f) => ({ ...f, periodo_inicio: v }))}
          />
          <FechaField
            label="Fin del periodo"
            value={form.periodo_fin}
            onChange={(v) => setForm((f) => ({ ...f, periodo_fin: v }))}
          />
        </View>

        <Field
          label="Cuota semanal ($)"
          value={String(form.cuota_semanal)}
          onChangeText={(v) => setForm((f) => ({ ...f, cuota_semanal: v }))}
          keyboardType="decimal-pad"
        />

        <View className="mt-2 flex-row gap-2">
          <SecondaryButton onPress={regenerate} disabled={busy} icon={RefreshCw} danger className="flex-1">
            Regenerar
          </SecondaryButton>
          <PrimaryButton onPress={save} disabled={busy} loading={busy} icon={Save} className="flex-1">
            Guardar
          </PrimaryButton>
        </View>

        <Text className="mt-3 text-xs text-slate-500">
          Guardar actualiza la cuota. Regenerar reconstruye el calendario y conserva los abonos dentro del periodo.
        </Text>
      </Card>

      <View>
        <View className="mb-3 flex-row items-center gap-2">
          <Users size={17} color="#34d399" />
          <Text className="text-base font-semibold text-white">Usuarios administradores</Text>
        </View>
        {data.admins?.length ? (
          <View className="gap-3">
            {data.admins.map((admin) => (
              <AdminRow key={admin.id} admin={admin} onSave={(values) => saveAdmin(admin, values)} />
            ))}
          </View>
        ) : (
          <EmptyState icon={Users} title="Sin usuarios" message="No hay administradores configurados." />
        )}
          </View>
        </View>
      </ScrollView>
    </Background>
  );
}
