import axios from './client';

const API_BASE = 'dossiers';

export const dossiersApi = {
    getAll: async (filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        const url = params ? `${API_BASE}/?${params}` : `${API_BASE}/`;
        const res = await axios.get(url);
        return res.data.results;
    },

    create: async (data) => {
        const res = await axios.post(`${API_BASE}/`, data);
        return res.data;
    },

    update: async (id, data) => {
        const res = await axios.put(`${API_BASE}/${id}/`, data);
        return res.data;
    },

    delete: async (id) => {
        const res = await axios.delete(`${API_BASE}/${id}/`);
        return res.data;
    },

    getById: async (id) => {
        const res = await axios.get(`${API_BASE}/${id}/`);
        return res.data;
    },

    pay: async (id, data) => {
        const res = await axios.post(`${API_BASE}/${id}/pay/`, data);
        return res.data;
    }
};