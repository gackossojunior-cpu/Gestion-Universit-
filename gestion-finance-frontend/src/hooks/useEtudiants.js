import { useState, useEffect, useCallback } from 'react';
import { dossiersApi } from "../api/dossiersApi";

export function useEtudiants(filters = {}) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState({
        total: 0,
        payes: 0,
        partiels: 0,
        nonPayes: 0
    });

    const fetchEtudiants = useCallback(async () => {
        try {
            setLoading(true);
            const dossiers = await dossiersApi.getAll(filters);

            setData(dossiers);

            const payes = dossiers.filter(d => {
                const total = parseFloat(d.montant_total || 0);
                const paye = parseFloat(d.montant_paye || 0);
                return total > 0 && Math.abs(total - paye) < 0.01;
            }).length;

            const partiels = dossiers.filter(d => {
                const total = parseFloat(d.montant_total || 0);
                const paye = parseFloat(d.montant_paye || 0);
                return total > 0 && paye > 0 && Math.abs(total - paye) > 0.01;
            }).length;

            const nonPayes = dossiers.filter(d => {
                const paye = parseFloat(d.montant_paye || 0);
                return paye === 0;
            }).length;

            setStats({
                total: dossiers.length,
                payes,
                partiels,
                nonPayes,
            });
            setError(null);
        } catch (err) {
            setError(err.message || 'Erreur lors du chargement');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchEtudiants();
    }, [fetchEtudiants]);

    return {
        data,
        loading,
        error,
        stats,
        refetch: fetchEtudiants
    };
}