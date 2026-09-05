/**
 * ADMA — Client API sécurisé
 * Axios avec intercepteurs, refresh token automatique, queue de retry
 */
import axios         from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../constants/config';

const ACCESS_KEY  = 'adma_access_token';
const REFRESH_KEY = 'adma_refresh_token';

const api = axios.create({
  baseURL:        API_URL,
  timeout:        20000,
  headers:        { 'Content-Type': 'application/json' },
  validateStatus: (status) => status < 500,
});

// ── Requête : injecter le token ───────────────────────────────────
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(ACCESS_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Réponse : refresh automatique sur 401 TOKEN_EXPIRED ──────────
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
    const original = err.config;
    const code     = err.response?.data?.code;

    if (err.response?.status === 401 && code === 'TOKEN_EXPIRED' && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return axios(original);
        });
      }

      original._retry = true;
      isRefreshing    = true;

      try {
        const refresh = await SecureStore.getItemAsync(REFRESH_KEY);
        if (!refresh) throw new Error('No refresh token');

        const { data } = await axios.post(`${API_URL}/auth/refresh`, {}, {
          headers: { 'X-Refresh-Token': refresh },
        });
        const newAccess  = data.data.accessToken;
        const newRefresh = data.data.refreshToken;

        await SecureStore.setItemAsync(ACCESS_KEY,  newAccess);
        await SecureStore.setItemAsync(REFRESH_KEY, newRefresh);

        api.defaults.headers.common.Authorization = `Bearer ${newAccess}`;
        processQueue(null, newAccess);
        original.headers.Authorization = `Bearer ${newAccess}`;
        return axios(original);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        await SecureStore.deleteItemAsync(ACCESS_KEY);
        await SecureStore.deleteItemAsync(REFRESH_KEY);
        delete api.defaults.headers.common.Authorization;
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
  await SecureStore.setItemAsync(ACCESS_KEY,  accessToken);
  await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
  api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(ACCESS_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
  delete api.defaults.headers.common.Authorization;
}

export async function loadStoredToken() {
  const token = await SecureStore.getItemAsync(ACCESS_KEY);
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  return token;
}

export default api;
