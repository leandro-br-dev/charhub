import axios from 'axios';
import { resolveApiBaseUrl } from './resolveApiBaseUrl';
import type { AuthUser } from '../types/auth';

const STORAGE_KEY = 'charhub.auth.user';
const resolvedBase = resolveApiBaseUrl();

const api = axios.create({
  baseURL: resolvedBase,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add JWT token and language preference to all requests
api.interceptors.request.use(
  config => {
    try {
      // Add auth token
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const user: AuthUser = JSON.parse(raw);
        if (user.token) {
          config.headers.Authorization = `Bearer ${user.token}`;
        }
      }

      // Add user's preferred language from i18next localStorage
      const userLanguage = window.localStorage.getItem('i18nextLng');
      if (userLanguage) {
        config.headers['X-User-Language'] = userLanguage;
      }
    } catch (error) {
      console.warn('[api] Failed to attach auth token or language:', error);
    }
    return config;
  },
  error => Promise.reject(error)
);

export default api;
