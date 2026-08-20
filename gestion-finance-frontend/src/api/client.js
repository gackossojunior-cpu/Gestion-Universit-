import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/finance/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
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

apiClient.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status !== 401 ||
      originalRequest._retry
    ) {
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
        return apiClient(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { data } = await axios.post(
        `${apiClient.defaults.baseURL}/token/refresh/`,
        {
          refresh: refreshToken,
        }
      );

      localStorage.setItem('access_token', data.access);

      resolvePending(data.access);

      originalRequest.headers.Authorization = `Bearer ${data.access}`;

      return apiClient(originalRequest);

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

export default apiClient;