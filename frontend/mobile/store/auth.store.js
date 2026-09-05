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
      if (!token) { set({ isLoading: false }); return; }

      const res = await api.get('/auth/me');
      if (res.data?.success) {
        const user = res.data.data;
        // Charger la fiche prestataire si elle existe
        let provider = null;
        try {
          const pRes = await api.get('/providers/me');
          if (pRes.data?.success) provider = pRes.data.data;
        } catch {}
        set({ user, provider, isLoggedIn: true, isLoading: false });
      } else {
        await clearTokens();
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  login: async (accessToken, refreshToken, userData) => {
    await saveTokens(accessToken, refreshToken);
    let provider = null;
    try {
      const pRes = await api.get('/providers/me');
      if (pRes.data?.success) provider = pRes.data.data;
    } catch {}
    set({ user: userData, provider, isLoggedIn: true });
  },

  logout: async () => {
    try {
      const refresh = await import('expo-secure-store').then(m => m.getItemAsync('adma_refresh_token'));
      if (refresh) await api.post('/auth/logout', {}, { headers: { 'X-Refresh-Token': refresh } });
    } catch {}
    await clearTokens();
    set({ user: null, provider: null, isLoggedIn: false });
  },

  updateUser: (data) => set((state) => ({ user: { ...state.user, ...data } })),
  updateProvider: (data) => set((state) => ({
    provider: state.provider ? { ...state.provider, ...data } : data,
  })),
  setProvider: (provider) => set({ provider }),
}));
