import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CloudOff, Feather, Lock, Wallet } from 'lucide-react-native';
import { useApp } from '../context/AppContext.jsx';
import { Background, Card, Field, PrimaryButton } from '../components/ui.jsx';

const QUICK = [
  { rol: 'tutor', usuario: 'tutor', pin: '1234', label: 'Tutor(a)' },
  { rol: 'presidente', usuario: 'presidente', pin: '2345', label: 'Presidente' },
  { rol: 'tesorero', usuario: 'tesorero', pin: '3456', label: 'Tesorero' }
];

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useApp();
  const [usuario, setUsuario] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError('');
    setLoading(true);
    try {
      const resultado = await login(usuario, pin);
      if (resultado.success) {
        router.replace('/(tabs)/resumen');
      } else {
        setError(resultado.message || 'Credenciales inválidas.');
      }
    } catch (err) {
      setError(err?.message || 'No se pudo iniciar sesión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  function fill(role) {
    setUsuario(role.usuario);
    setPin(role.pin);
    setError('');
  }

  return (
    <Background>
      <View className="flex-1 justify-center px-5 py-8">
        <View className="mb-8 items-center">
          <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl border border-emerald-300/30 bg-emerald-500/20">
            <Wallet size={30} color="#6ee7b7" />
          </View>
          <Text className="text-3xl font-extrabold tracking-tight text-white">Control 3E2</Text>
          <Text className="mt-1.5 text-sm text-slate-400">Cuotas semanales · Grupo de trabajo</Text>
        </View>

        <Card className="p-6">
          <Text className="mb-5 text-lg font-semibold text-white">Acceso de administrador</Text>
          <Field
            label="Usuario"
            value={usuario}
            onChangeText={setUsuario}
            placeholder="tutor, presidente, tesorero"
            autoCapitalize="none"
          />
          <Field
            label="PIN"
            value={pin}
            onChangeText={setPin}
            placeholder="••••"
            keyboardType="numeric"
            secureTextEntry
            className="mb-5"
          />

          {error ? (
            <View className="mb-4 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3">
              <Text className="text-sm text-rose-200">{error}</Text>
            </View>
          ) : null}

          <PrimaryButton
            onPress={handleSubmit}
            disabled={!usuario || !pin}
            loading={loading}
            icon={Lock}
          >
            {loading ? 'Validando…' : 'Entrar al sistema'}
          </PrimaryButton>
        </Card>

        <Card className="mt-5 p-4">
          <View className="mb-3 flex-row items-center justify-center gap-2">
            <Feather size={15} color="#34d399" />
            <Text className="text-xs text-slate-400">Acceso rápido (demo)</Text>
          </View>
          <View className="flex-row gap-2">
            {QUICK.map((q) => (
              <Pressable
                key={q.rol}
                onPress={() => fill(q)}
                className="flex-1 rounded-xl border border-white/10 bg-slate-800/60 px-2 py-2.5 active:opacity-70"
              >
                <Text className="text-center text-xs font-medium text-slate-300">{q.label}</Text>
              </Pressable>
            ))}
          </View>
          <View className="mt-3 flex-row items-center justify-center gap-2">
            <CloudOff size={14} color="#64748b" />
            <Text className="text-[11px] text-slate-500">Modo local/offline · datos en este dispositivo</Text>
          </View>
        </Card>

        <Text className="mt-6 text-center text-xs text-slate-600">
          Solo el tutor, presidente y tesorero tienen acceso
        </Text>
      </View>
    </Background>
  );
}
