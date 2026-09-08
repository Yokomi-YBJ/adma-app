/**
 * ADMA — Layout racine
 * Initialise : i18n, cache, auth, réseau, notifications push
 */
import { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initI18n }   from '../i18n';
import { initCache }  from '../services/cache';
import { useAuthStore }    from '../store/auth.store';
import { useNetworkStore } from '../store/network.store';
// ✅ Correction : import depuis notifications.js
import { registerForPushNotifications, setupNotificationListeners } from '../services/notifications';
import { colors } from '../constants/colors';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { AppModalProvider } from '../components/ui/AppModal';

function AuthGuard({ children }) {
  const router    = useRouter();
  const segments  = useSegments();
  const isLoggedIn= useAuthStore((s) => s.isLoggedIn);
  const isLoading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
    if (isLoading) return;
    const inAuth = segments[0] === '(auth)';
    if (!isLoggedIn && !inAuth) router.replace('/(auth)/login');
    if (isLoggedIn && inAuth)  router.replace('/(tabs)');
  }, [isLoggedIn, isLoading, segments]);

  return children;
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const init = useAuthStore((s) => s.initialize);
  const subscribeNetwork = useNetworkStore((s) => s.subscribe);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  const bootstrap = useCallback(async () => {
    await Promise.all([
      initI18n(),
      initCache(),
    ]);
    await init();
    // ✅ On n'enregistre les notifications que si l'utilisateur est connecté
    if (isLoggedIn) {
      await registerForPushNotifications();
    }
    setReady(true);
  }, [isLoggedIn]);

  useEffect(() => {
    bootstrap();
    const unsub = subscribeNetwork();
    return unsub;
  }, []);

  // ✅ Ajout des listeners de notifications une fois le layout monté
  useEffect(() => {
    if (!ready) return;
    // On écoute les notifications même si non connecté (pour les notifications en arrière-plan)
    const cleanup = setupNotificationListeners(router);
    return cleanup;
  }, [ready]);

  if (!ready) return <LoadingScreen />;

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <StatusBar style="dark" backgroundColor={colors.white} />
        <AuthGuard>
          <AppModalProvider />
          <Stack
            screenOptions={{
              headerStyle:      { backgroundColor: colors.white },
              headerTintColor:  colors.navy,
              headerTitleStyle: { fontWeight: '700', fontSize: 17 },
              headerShadowVisible: false,
              contentStyle:     { backgroundColor: colors.background },
              animation:        'slide_from_right',
              headerBackTitleVisible: false,
            }}
          >
            <Stack.Screen name="(auth)"                    options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)"                    options={{ headerShown: false }} />
            <Stack.Screen name="onboarding/index"          options={{ headerShown: false, gestureEnabled: false }} />
            <Stack.Screen name="provider/[id]"             options={{ headerShown: false }} />
            <Stack.Screen name="provider/create"           options={{ headerShown: false, presentation: 'modal' }} />
            <Stack.Screen name="provider/edit"             options={{ headerShown: false, presentation: 'modal' }} />
            <Stack.Screen name="reviews/[id]"              options={{ headerShown: false, presentation: 'modal' }} />
            <Stack.Screen name="verification/index"        options={{ headerShown: false, presentation: 'modal' }} />
            <Stack.Screen name="subscription/plans"        options={{ headerShown: false }} />
            <Stack.Screen name="subscription/payment"      options={{ headerShown: false, presentation: 'modal' }} />
            <Stack.Screen name="notifications/index"       options={{ headerShown: false }} />
            <Stack.Screen name="settings/index"            options={{ headerShown: false }} />
            <Stack.Screen name="settings/edit-profile"     options={{ headerShown: false, presentation: 'modal' }} />
            <Stack.Screen name="settings/notifications"    options={{ headerShown: false, presentation: 'modal' }} />
            <Stack.Screen name="settings/legal"            options={{ headerShown: false, presentation: 'modal' }} />
            <Stack.Screen name="settings/support"          options={{ headerShown: false, presentation: 'modal' }} />
            <Stack.Screen name="report"                    options={{ headerShown: false, presentation: 'modal' }} />
          </Stack>
        </AuthGuard>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });