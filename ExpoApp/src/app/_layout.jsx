import '../../global.css';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { Slot } from 'expo-router';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans';
import { AppProvider, useApp } from '../context/AppContext.jsx';
import { ToastView } from '../components/ui.jsx';

function ToastGate() {
  const { toast, hideToast } = useApp();
  return <ToastView toast={toast} onClose={hideToast} />;
}

export default function RootLayout() {
  const [loaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold
  });

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProvider>
        <StatusBar style="light" backgroundColor="#020617" />
        <View style={{ flex: 1 }}>
          <Slot />
          <ToastGate />
        </View>
      </AppProvider>
    </GestureHandlerRootView>
  );
}
