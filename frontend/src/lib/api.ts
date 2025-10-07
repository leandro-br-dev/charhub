import axios from 'axios';

const rawBase = import.meta.env.VITE_API_BASE_URL?.trim();
const baseURL = rawBase && rawBase.length > 0 ? rawBase : undefined;

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

export default api;
