import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
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
