import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/auth.store';

export default function Index() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  // Si l'utilisateur est connecté, on l'envoie sur l'accueil
  if (isLoggedIn) {
    return <Redirect href="/(tabs)" />;
  }

  // Sinon, on l'envoie sur la page de connexion
  return <Redirect href="/(auth)/login" />;
}