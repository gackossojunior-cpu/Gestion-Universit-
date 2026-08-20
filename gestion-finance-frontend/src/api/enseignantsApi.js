import axios from './client';

export const enseignantsApi = {
    getAll: async (filters = {}) => {
        const params = new URLSearchParams();

        if (filters.q) params.append('q', filters.q);
        if (filters.mois) params.append('mois', filters.mois);
        if (filters.statut && filters.statut !== 'all') params.append('statut', filters.statut);

        const queryString = params.toString();
        const url = queryString ? `/enseignants/?${queryString}` : '/enseignants/';
        const res = await axios.get(url);
        return res.data;
    },


    pay: async (id, data) => {
        const res = await axios.put(`/enseignants/${id}/pay/`, data);
        return res.data;
    }
};