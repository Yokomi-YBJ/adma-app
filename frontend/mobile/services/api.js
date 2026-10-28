/**
 * ADMA — Client API sécurisé
 * Axios avec intercepteurs, refresh token automatique, queue de retry,
 * gestion du démarrage à froid Render et traduction systématique des erreurs.
 */
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../constants/config';
import { getLocalizedErrorMessage } from './apiErrors';
import { useModalStore } from '../store/modal.store';
import { useAuthStore } from '../store/auth.store';
import i18n from '../i18n';

const ACCESS_KEY  = 'adma_access_token';
const REFRESH_KEY = 'adma_refresh_token';

const api = axios.create({
  baseURL: API_URL,
  timeout: 45000, // 45s pour tolérer le démarrage à froid Render (Cold Start)
  headers: { 'Content-Type': 'application/json' },
});

// ── Requête : injecter le token ───────────────────────────────────
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(ACCESS_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config._requestStartTime = Date.now();
  return config;
});

// ── Réponse : refresh automatique sur 401 TOKEN_EXPIRED & retry ──
let isRefreshing = false;
let failedQueue  = [];

function processQueue(error, token = null) {
  failedQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(token)
  );
  failedQueue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    // 1. Normalisation systématique du message utilisateur (i18n, zéro texte brut)
    err.userMessage = getLocalizedErrorMessage(err);

    const original = err.config;
    if (!original) return Promise.reject(err);

    const status = err.response?.status;
    const code = err.response?.data?.code;

    // 2. Retry automatique unique sur requêtes GET (Réseau/5xx/Timeout)
    const isGet = original.method?.toLowerCase() === 'get';
    const isNetworkOrServerDown = !err.response || status >= 500 || err.code === 'ECONNABORTED';

    if (isGet && isNetworkOrServerDown && !original._autoRetried) {
      original._autoRetried = true;
      return api(original);
    }

    // 3. Gestion du refresh token sur 401 TOKEN_EXPIRED
    if (status === 401 && (code === 'TOKEN_EXPIRED' || code === 'INVALID_TOKEN') && !original._refreshRetried) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      original._refreshRetried = true;
      isRefreshing = true;

      try {
        const refresh = await SecureStore.getItemAsync(REFRESH_KEY);
        if (!refresh) throw new Error('NO_REFRESH_TOKEN');

        const { data } = await axios.post(`${API_URL}/auth/refresh`, {}, {
          headers: { 'X-Refresh-Token': refresh },
          timeout: 20000,
        });

        const newAccess  = data.data?.accessToken;
        const newRefresh = data.data?.refreshToken;

        if (!newAccess) throw new Error('INVALID_REFRESH_RESPONSE');

        await SecureStore.setItemAsync(ACCESS_KEY, newAccess);
        if (newRefresh) await SecureStore.setItemAsync(REFRESH_KEY, newRefresh);

        api.defaults.headers.common.Authorization = `Bearer ${newAccess}`;
        processQueue(null, newAccess);
        original.headers.Authorization = `Bearer ${newAccess}`;
        return api(original);
      } catch (refreshErr) {
        processQueue(refreshErr, null);

        // Nettoyer les tokens
        await SecureStore.deleteItemAsync(ACCESS_KEY).catch(() => {});
        await SecureStore.deleteItemAsync(REFRESH_KEY).catch(() => {});
        delete api.defaults.headers.common.Authorization;

        // Déconnecter proprement le store sans boucle d'appel API
        useAuthStore.setState({ user: null, provider: null, isLoggedIn: false });

        // Afficher le modal bloquant de session expirée
        useModalStore.getState().show({
          type: 'session',
          title: i18n.t('common.info', 'Information'),
          message: i18n.t('errors.sessionExpired', 'Votre session a expiré. Veuillez vous reconnecter.'),
          confirmText: i18n.t('common.reconnect', 'Se reconnecter'),
          dismissible: false,
          onConfirm: () => {
            import('expo-router').then(({ router }) => {
              router.replace('/(auth)/login');
            }).catch(() => {});
          },
        });

        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  }
);

// ── Helpers publics ───────────────────────────────────────────────
export async function saveTokens(accessToken, refreshToken) {
  await SecureStore.setItemAsync(ACCESS_KEY, accessToken);
  if (refreshToken) await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
  api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(ACCESS_KEY).catch(() => {});
  await SecureStore.deleteItemAsync(REFRESH_KEY).catch(() => {});
  delete api.defaults.headers.common.Authorization;
}

export async function loadStoredToken() {
  const token = await SecureStore.getItemAsync(ACCESS_KEY);
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  return token;
}

export default api;
