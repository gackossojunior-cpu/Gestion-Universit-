import axios from './client';

const API_BASE = 'transactions';

export const transactionsApi = {
    // GET /finance/api/transactions/
    getAll: async (filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        const url = params ? `${API_BASE}/?${params}` : `${API_BASE}/`;
        const res = await axios.get(url);
        return res.data.results ?? res.data;
    },

    // POST /finance/api/transactions/
    create: async (data) => {
        const res = await axios.post(`${API_BASE}/`, data);
        return res.data;
    },

    // PUT /finance/api/transactions/<uuid:id>/
    update: async (id, data) => {
        const res = await axios.put(`${API_BASE}/${id}/`, data);
        return res.data;
    },

    // DELETE /finance/api/transactions/<uuid:id>/
    delete: async (id) => {
        const res = await axios.delete(`${API_BASE}/${id}/`);
        return res.data;
    },

    // GET /finance/api/transactions/<uuid:id>/
    getById: async (id) => {
        const res = await axios.get(`${API_BASE}/${id}/`);
        return res.data;
    }
};