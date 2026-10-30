/**
 * ADMA — Client API sécurisé
 */
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../constants/config';
import { getLocalizedErrorMessage } from './apiErrors';
import { useModalStore } from '../store/modal.store';
import i18n from '../i18n';

const ACCESS_KEY  = 'adma_access_token';
const REFRESH_KEY = 'adma_refresh_token';

const api = axios.create({
  baseURL: API_URL,
  timeout: 45000, // 45s pour les requêtes normales
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(ACCESS_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config._requestStartTime = Date.now();
  return config;
});

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
    err.userMessage = getLocalizedErrorMessage(err);
    const original = err.config;
    if (!original) return Promise.reject(err);

    const status = err.response?.status;
    const code = err.response?.data?.code;

    const isGet = original.method?.toLowerCase() === 'get';
    const isNetworkOrServerDown = !err.response || status >= 500 || err.code === 'ECONNABORTED';

    if (isGet && isNetworkOrServerDown && !original._autoRetried) {
      original._autoRetried = true;
      return api(original);
    }

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
          timeout: 90000, // ✅ 1 minute 30 secondes (90 000 ms) pour le réveil de Render
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
        // ✅ On ne déconnecte QUE si le serveur renvoie une vraie erreur d'authentification
        const isRealAuthError = refreshErr.response?.status === 401 || refreshErr.response?.status === 403;

        if (!isRealAuthError) {
          // Si c'est un problème réseau (Render endormi, timeout), on ne déconnecte PAS !
          processQueue(refreshErr, null);
          return Promise.reject(refreshErr); 
        }

        // Si c'est un vrai 401 (token invalide ou expiré), on déconnecte proprement
        processQueue(refreshErr, null);

        await SecureStore.deleteItemAsync(ACCESS_KEY).catch(() => {});
        await SecureStore.deleteItemAsync(REFRESH_KEY).catch(() => {});
        delete api.defaults.headers.common.Authorization;

        const { useAuthStore } = await import('../store/auth.store');
        await useAuthStore.getState().logout();

        useModalStore.getState().show({
          type: 'session',
          title: i18n.t('common.info', 'Information'),
          message: i18n.t('errors.sessionExpired', 'Votre session a expiré. Veuillez vous reconnecter.'),
          confirmText: i18n.t('common.reconnect', 'Se reconnecter'),
          dismissible: false,
          onConfirm: () => {
            import('expo-router').then(({ router }) => {
              router.replace('/(auth)/login');
            }).catch((error) => {
              console.error('[API] Unable to navigate to login after session expiry:', error);
            });
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
