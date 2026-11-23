import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import {
  FileDown,
  LayoutDashboard,
  LogOut,
  Receipt,
  Settings,
  Table2,
  Users,
  Wallet
} from 'lucide-react-native';
import { useApp } from '../../context/AppContext.jsx';
import { rolInfo } from '../../utils/cn.js';

const TABS = [
  { name: 'resumen', label: 'Resumen', title: 'Resumen general', icon: LayoutDashboard },
  { name: 'planilla', label: 'Planilla', title: 'Planilla semanal', icon: Table2 },
  { name: 'alumnos', label: 'Alumnos', title: 'Integrantes', icon: Users },
  { name: 'gastos', label: 'Gastos', title: 'Salidas de dinero', icon: Receipt },
  { name: 'exportar', label: 'Exportar', title: 'Exportación', icon: FileDown },
  { name: 'configuracion', label: 'Configurar', title: 'Configuración', icon: Settings }
];

function HeaderTitle({ title }) {
  const { session } = useApp();
  const info = rolInfo(session?.rol);
  return (
    <View className="flex-row items-center gap-2.5">
      <View className="h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20">
        <Wallet size={16} color="#6ee7b7" />
      </View>
      <View>
        <Text className="text-sm font-bold leading-tight text-white">Control 3E2</Text>
        <Text className="text-[10px] leading-tight text-slate-400">
          {info.label} · {session?.nombre}
        </Text>
      </View>
    </View>
  );
}

function HeaderRight() {
  const router = useRouter();
  const { logout } = useApp();
  return (
    <Pressable
      onPress={async () => {
        await logout();
        router.replace('/login');
      }}
      hitSlop={8}
      className="flex-row items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5"
    >
      <LogOut size={15} color="#fda4af" />
      <Text className="text-xs font-medium text-slate-300">Salir</Text>
    </Pressable>
  );
}

export default function TabsLayout() {
  const { session, checked } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (checked && !session) router.replace('/login');
  }, [checked, session, router]);

  const titulos = Object.fromEntries(TABS.map((t) => [t.name, t.title]));

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: true,
        headerStyle: { backgroundColor: '#020617' },
        headerShadowVisible: false,
        headerTintColor: '#f8fafc',
        headerTitle: () => <HeaderTitle title={titulos[route.name]} />,
        headerRight: () => <HeaderRight />,
        tabBarActiveTintColor: '#34d399',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: {
          backgroundColor: '#020617ee',
          borderTopColor: 'rgba(255,255,255,0.08)',
          paddingBottom: 4,
          paddingTop: 4,
          height: 58
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' }
      })}
    >
      {TABS.map((t) => {
        const Icon = t.icon;
        return (
          <Tabs.Screen
            key={t.name}
            name={t.name}
            options={{
              title: t.label,
              tabBarIcon: ({ color, size }) => <Icon size={size ?? 20} color={color} />
            }}
          />
        );
      })}
    </Tabs>
  );
}
