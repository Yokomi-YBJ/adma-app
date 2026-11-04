/**
 * ADMA — Store Zustand pour l'authentification
 * Remplace le Context classique — plus performant, pas de re-render global
 */
import { create } from 'zustand';
import api, { saveTokens, clearTokens, loadStoredToken } from '../services/api';

export const useAuthStore = create((set, get) => ({
  user:         null,
  provider:     null,
  isLoading:    true,
  isLoggedIn:   false,

  // Initialisation au lancement
  initialize: async () => {
    try {
      const token = await loadStoredToken();
      
      // Si aucun token, on s'arrête là.
      if (!token) { 
        set({ isLoading: false }); 
        return; 
      }

      // ✅ CONNEXION OPTIMISTE : On a un token, on laisse l'utilisateur entrer.
      // On passe isLoading à false immédiatement pour ne pas le bloquer.
      set({ isLoggedIn: true, isLoading: false });

      // On tente de récupérer les infos fraîches en arrière-plan
      try {
        const res = await api.get('/auth/me');
        if (res.data?.success) {
          const user = res.data.data;
          let provider = null;
          try {
            const pRes = await api.get('/providers/me');
            if (pRes.data?.success) provider = pRes.data.data;
          } catch {
            // Profile screen re-fetches provider data
          }
          set({ user, provider, isLoggedIn: true });
        }
      } catch (error) {
        // ✅ Si le serveur répond 401, le token est vraiment mort -> Déconnexion
        if (error.response?.status === 401) {
          console.warn('[Auth] Token expiré, déconnexion.');
          await clearTokens();
          set({ user: null, provider: null, isLoggedIn: false });
        } else {
          // ✅ Si c'est une erreur réseau (hors-ligne), on GARDE la session !
          console.warn('[Auth] Hors-ligne, conservation de la session locale.');
        }
      }
    } catch (error) {
      console.warn('[Auth] Unable to restore the saved session:', error);
      set({ isLoading: false });
    }
  },

  login: async (accessToken, refreshToken, userData) => {
    await saveTokens(accessToken, refreshToken);
    let provider = null;
    try {
      const pRes = await api.get('/providers/me');
      if (pRes.data?.success) provider = pRes.data.data;
    } catch {
      // Provider lookup is optional at login
    }
    set({ user: userData, provider, isLoggedIn: true });
  },

  logout: async () => {
    try {
      const refresh = await import('expo-secure-store').then(m => m.getItemAsync('adma_refresh_token'));
      if (refresh) await api.post('/auth/logout', {}, { headers: { 'X-Refresh-Token': refresh } });
    } catch {
      // Server-side logout is best-effort
    }
    await clearTokens();
    set({ user: null, provider: null, isLoggedIn: false });
  },

  updateUser: (data) => set((state) => ({ user: { ...state.user, ...data } })),
  updateProvider: (data) => set((state) => ({
    provider: state.provider ? { ...state.provider, ...data } : data,
  })),
  setProvider: (provider) => set({ provider }),
}));
