// src/api/logistiqueClient.js
import axios from 'axios';

const LOGISTIQUE_BASE_URL = import.meta.env.VITE_LOGISTIQUE_API_URL || 'http://127.0.0.1:8000/logistique/api';

const logistiqueClient = axios.create({
  baseURL: LOGISTIQUE_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attache le token d'accès sur chaque requête
logistiqueClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let pendingQueue = [];

function resolvePending(token) {
  pendingQueue.forEach(({ resolve }) => resolve(token));
  pendingQueue = [];
}

function rejectPending(error) {
  pendingQueue.forEach(({ reject }) => reject(error));
  pendingQueue = [];
}

// Sur un 401 : tente un refresh silencieux via le endpoint de token du module
// Finance (le token JWT est partagé sur tout le projet Django), sinon renvoie
// vers la page de connexion.
logistiqueClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      window.location.href = '/finance/login';
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return logistiqueClient(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const REFRESH_URL = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/finance/api') + '/token/refresh/';
      const { data } = await axios.post(REFRESH_URL, { refresh: refreshToken });
      localStorage.setItem('access_token', data.access);
      resolvePending(data.access);
      originalRequest.headers.Authorization = `Bearer ${data.access}`;
      return logistiqueClient(originalRequest);
    } catch (refreshError) {
      rejectPending(refreshError);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/finance/login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default logistiqueClient;