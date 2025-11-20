import axios, { AxiosRequestHeaders } from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('spending_token');
  const headers = (config.headers ?? {}) as AxiosRequestHeaders;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const tenantId = import.meta.env.VITE_TENANT_ID ?? 'default';
  headers['x-tenant-id'] = tenantId;
  config.headers = headers;
  return config;
});

export default api;


