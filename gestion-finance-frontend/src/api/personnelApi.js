import axios from './client';

const API_BASE = 'personnel';

export const personnelApi = {
    // GET /finance/api/personnel/
    getAll: async (filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        const url = params ? `${API_BASE}/?${params}` : `${API_BASE}/`;
        const res = await axios.get(url);
        return res.data.results ?? res.data;
    },
    
    // DELETE /finance/api/personnel/<uuid:id>/
    delete: async (id) => {
        const res = await axios.delete(`${API_BASE}/${id}/`);
        return res.data;
    },

    // POST /finance/api/personnel/<uuid:id>/pay/
    pay: async (id, data) => {
        const res = await axios.post(`${API_BASE}/${id}/pay/`, data);
        return res.data;
    }
};