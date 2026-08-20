import axios from './client';

const API_BASE = 'transports/depenses';

export const depensesTransportApi = {
    getAll: async (filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        const url = params ? `${API_BASE}/?${params}` : `${API_BASE}/`;
        const res = await axios.get(url);
        return res.data.results ?? res.data;
    },

    create : async (data) => {
        const res = await axios.post(`${API_BASE}/`, data);
        return res.data;
    },

    delete: async (id) => {
        const res = await axios.delete(`${API_BASE}/${id}/`);
        return res.data;
    }
};