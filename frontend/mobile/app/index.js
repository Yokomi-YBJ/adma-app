import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/auth.store';

export default function Index() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const isLoading  = useAuthStore((s) => s.isLoading); // ✅ Ajout de isLoading

  // ✅ On attend que le store ait fini de charger avant de rediriger
  if (isLoading) {
    return null;
  }

  if (isLoggedIn) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
