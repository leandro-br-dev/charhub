import axios from 'axios';
import { resolveApiBaseUrl } from './resolveApiBaseUrl';
import type { AuthUser } from '../types/auth';
import { isApiError } from '../utils/apiErrorHandler';

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

// Response interceptor for debugging API errors
api.interceptors.response.use(
  response => response,
  error => {
    // Log API errors for debugging
    if (error.response?.data && isApiError(error.response.data)) {
      const apiError = error.response.data.error;
      console.error('[api] API Error:', {
        code: apiError.code,
        message: apiError.message,
        field: apiError.field,
        details: apiError.details,
        status: error.response.status
      });
    }
    return Promise.reject(error);
  }
);

export default api;
