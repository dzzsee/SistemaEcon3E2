import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../context/AppContext.jsx';
import { Background } from '../components/ui.jsx';

export default function IndexScreen() {
  const router = useRouter();
  const { checked, session } = useApp();

  useEffect(() => {
    if (!checked) return;
    router.replace(session ? '/(tabs)/resumen' : '/login');
  }, [checked, session, router]);

  return (
    <Background>
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color="#34d399" />
      </View>
    </Background>
  );
}
