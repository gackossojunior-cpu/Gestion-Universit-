// src/api/auth.js
import axios from './client';

export const authApi = {
  login: async (username, password) => {
    const res = await axios.post('/token/', {
      username,
      password
    });

    if (res.data.access && res.data.refresh) {
      return {
        access: res.data.access,
        refresh: res.data.refresh
      };
    }
    throw new Error('Réponse d\'authentification invalide');
  },

  refresh: async (refreshToken) => {
    const res = await axios.post('/token/refresh/', {
      refresh: refreshToken
    });
    return res.data.access;
  }
};