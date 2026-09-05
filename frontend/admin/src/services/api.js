import axios from 'axios';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const api = axios.create({ baseURL: `${API_URL}/admin`, timeout: 15000 });

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('adma_admin_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('adma_admin_token');
      localStorage.removeItem('adma_admin_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
