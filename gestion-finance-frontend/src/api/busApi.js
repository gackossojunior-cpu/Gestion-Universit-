import logistiqueClient from './logistiqueClient';

export const busApi = {
    // GET /logistique/api/bus/
    getAll: async () => {
        const res = await logistiqueClient.get('bus/');
        return res.data.results ?? res.data;
    }
};