import axios from 'axios';

// In dev, use relative '/api' to route through Vite's dev proxy.
// In production, import.meta.env.VITE_API_URL can provide the full URL if hosted on a separate domain.
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 8000 // Timeout early so Dexie fallback triggers faster when network drops
});

// Helper to strip leading '/api' if caller passes '/api/weather/stations' while baseURL already ends in '/api'
const normalizeUrl = (url) => {
  if (API_BASE_URL.endsWith('/api') && url.startsWith('/api/')) {
    return url.replace(/^\/api/, '');
  }
  return url;
};

// Request interceptor to add auth token & normalize paths
api.interceptors.request.use(
  (config) => {
    if (config.url) {
      config.url = normalizeUrl(config.url);
    }
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle transparent token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Clean endpoint path for refresh request
        const refreshEndpoint = API_BASE_URL.endsWith('/api')
          ? `${API_BASE_URL}/auth/refresh`
          : `${API_BASE_URL}/api/auth/refresh`;

        const response = await axios.post(
          refreshEndpoint,
          {},
          {
            headers: {
              Authorization: `Bearer ${refreshToken}`
            }
          }
        );

        const { access_token } = response.data;
        localStorage.setItem('access_token', access_token);

        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed -> clear session and redirect to login
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;