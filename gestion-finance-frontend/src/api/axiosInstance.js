import axios from 'axios';


const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/finance/api';

const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
});

// Attache le token JWT à chaque requête
axiosInstance.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Rafraîchit le token en cas de 401, sinon déconnecte
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach((prom) => {
        if (error) prom.reject(error);
        else prom.resolve(error);
    });
    failedQueue = [];
};

axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response ?.status === 401 && !originalRequest._retry) {
          if (isRefreshing) {
              return new Promise((resolve, reject) => {
                  failedQueue.push({ resolve, reject });
              }).then((token) => {
                  originalRequest.headers.Authorization = `Bearer ${token}`;
                  return axiosInstance(originalRequest);
              });
          }

          originalRequest._retry = true;
          isRefreshing = true;

          const refreshToken = localStorage.getItem('refresh_token');

          try {
              const { data } = await axios.post(`${API_BASE_URL}/token/refresh/`, {
                  refresh: refreshToken,
              });
              localStorage.setItem('access_token', data.access);
              axiosInstance.defaults.headers.Authorization = `Bearer ${data.access}`;
              processQueue(null, data.access);
              originalRequest.headers.Authorization = `Bearer ${data.access}`;
              return axiosInstance(originalRequest);
          } catch (refreshError) {
              processQueue(refreshError, null);
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              window.location.href = '/finance/login';
              return Promise.reject(refreshError);
          } finally {
              isRefreshing = false;
          }
        }

        return Promise.reject(error);
    }
);

export default axiosInstance;