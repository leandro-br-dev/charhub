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

// Add JWT token to all requests if available
api.interceptors.request.use(
  config => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const user: AuthUser = JSON.parse(raw);
        if (user.token) {
          config.headers.Authorization = `Bearer ${user.token}`;
        }
      }
    } catch (error) {
      console.warn('[api] Failed to attach auth token:', error);
    }
    return config;
  },
  error => Promise.reject(error)
);

export default api;
