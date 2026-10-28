/**
 * ADMA — Layout racine
 */
import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { initI18n }   from '../i18n';
import { initCache }  from '../services/cache';
import { useAuthStore }    from '../store/auth.store';
import { useNetworkStore } from '../store/network.store';
import { registerForPushNotifications, setupNotificationListeners } from '../services/notifications';
import { colors } from '../constants/colors';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { AppModalProvider } from '../components/ui/AppModal';
import { NetworkBanner } from '../components/ui/NetworkBanner';
import { ErrorBoundary } from '../components/ErrorBoundary';

// Export conventionnel Expo Router pour attraper les crashs
export { ErrorBoundary };

// Empêche le splash natif de disparaître tout seul
// Expo peut rejeter cet appel si le splash natif a déjà été empêché ; le layout garde le rendu de secours.
SplashScreen.preventAutoHideAsync().catch((error) => {
  console.warn('[ADMA] Impossible de maintenir le splash natif.', error);
});

// Réveille Render en arrière-plan
if (process.env.EXPO_PUBLIC_API_URL) {
  // Best-effort warm-up only; normal API requests provide user-visible errors and retries.
  fetch(`${process.env.EXPO_PUBLIC_API_URL}/health`).catch(() => {});
}

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

  useEffect(() => {
    SplashScreen.hideAsync().catch((error) => {
      console.warn('[ADMA] Impossible de masquer le splash natif.', error);
    });

    (async () => {
      try {
        await Promise.all([initI18n(), initCache()]);
        await init();
      } catch (e) {
        console.error("Erreur init:", e);
      } finally {
        setReady(true);
      }
    })();
    
    const unsub = subscribeNetwork();
    return unsub;
  }, []);

  useEffect(() => {
    if (ready && isLoggedIn) registerForPushNotifications();
  }, [ready, isLoggedIn]);

  useEffect(() => {
    if (!ready) return;
    const cleanup = setupNotificationListeners(router);
    return cleanup;
  }, [ready]);

  // Tant que l'app n'est pas prête, on affiche notre écran simple
  if (!ready) return <LoadingScreen />;

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.flex}>
        <SafeAreaProvider>
          <StatusBar style="dark" backgroundColor={colors.white} />
          <AuthGuard>
            <NetworkBanner />
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
              <Stack.Screen name="subscription/success"      options={{ headerShown: false, gestureEnabled: false }} />
              <Stack.Screen name="notifications/index"       options={{ headerShown: false }} />
              <Stack.Screen name="settings/index"            options={{ headerShown: false }} />
              <Stack.Screen name="settings/edit-profile"     options={{ headerShown: false, presentation: 'modal' }} />
              <Stack.Screen name="settings/notifications"    options={{ headerShown: false, presentation: 'modal' }} />
              <Stack.Screen name="settings/legal"            options={{ headerShown: false, presentation: 'modal' }} />
              <Stack.Screen name="settings/support"          options={{ headerShown: false, presentation: 'modal' }} />
              <Stack.Screen name="report"                    options={{ headerShown: false, presentation: 'modal' }} />
              <Stack.Screen name="map"                       options={{ headerShown: false, presentation: 'fullScreenModal' }} />
            </Stack>
          </AuthGuard>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
