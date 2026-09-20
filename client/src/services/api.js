import axios from 'axios';

// In dev, Vite's proxy forwards /api to the local backend (see vite.config.js),
// so a relative URL is enough. In production, the frontend and backend are
// typically separate Vercel projects on different domains, so VITE_API_URL
// (set at build time) points straight at the deployed backend instead.
const API_ROOT = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: `${API_ROOT}/api`,
  withCredentials: true,
});

// If a token was returned at login (in addition to the httpOnly cookie),
// attach it as a fallback Authorization header for environments where
// third-party cookies are blocked.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('kstore_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
