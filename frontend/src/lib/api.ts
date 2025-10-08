import axios from 'axios';
import { resolveApiBaseUrl } from './resolveApiBaseUrl';

const resolvedBase = resolveApiBaseUrl();

const api = axios.create({
  baseURL: resolvedBase,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

export default api;
