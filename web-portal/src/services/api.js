import axios from 'axios';

// In local dev: VITE_API_URL is empty → baseURL is '' → Vite proxy forwards /api → localhost:3000
// In production or ngrok: set VITE_API_URL to the full base URL in .env
const BASE = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('medifind_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Silent refresh on 401 — retry once with a new access token
let _isRefreshing = false;
let _waitQueue = [];

const processQueue = (error, token = null) => {
  _waitQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  _waitQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      const refreshToken = localStorage.getItem('medifind_refresh_token');

      if (!refreshToken) {
        // No refresh token — force logout
        localStorage.removeItem('medifind_token');
        localStorage.removeItem('medifind_user');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      if (_isRefreshing) {
        // Queue other requests while refresh is in progress
        return new Promise((resolve, reject) => {
          _waitQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      original._retry = true;
      _isRefreshing = true;

      try {
        const res = await api.post('/api/auth/refresh-token', { refreshToken });
        const { accessToken } = res.data.data;
        localStorage.setItem('medifind_token', accessToken);
        api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        processQueue(null, accessToken);
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.removeItem('medifind_token');
        localStorage.removeItem('medifind_refresh_token');
        localStorage.removeItem('medifind_user');
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      } finally {
        _isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
