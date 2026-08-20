import { useState, useEffect, useCallback } from 'react';
import { personnelApi } from '../api/personnelApi';

export function usePersonnel(filters = {}) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState({
        total: 0,
        totalSalary: 0,
        totalPaid: 0,
        totalRemaining: 0,
        nbPayes: 0,
        nbPartiels: 0,
        nbAttente: 0
    });

    const fetchPersonnel = useCallback(async () => {
        try {
            setLoading(true);
            const membres = await personnelApi.getAll(filters);

            setData(membres);

            const totalSalary = membres.reduce((sum, p) => sum + parseFloat(p.salaire || 0), 0);
            const totalPaid = membres.reduce((sum, p) => sum + parseFloat(p.montant_paye || 0), 0);

            let nbPayes = 0, nbPartiels = 0, nbAttente = 0;
            membres.forEach(p => {
                const salaire = parseFloat(p.salaire || 0);
                const paye = parseFloat(p.montant_paye || 0);
                if (salaire > 0 && Math.abs(salaire - paye) < 0.01) nbPayes++;
                else if (paye > 0) nbPartiels++;
                else nbAttente++;
            });

            setStats({
                total: membres.length,
                totalSalary,
                totalPaid,
                totalRemaining: totalSalary - totalPaid,
                nbPayes,
                nbPartiels,
                nbAttente
            });
            setError(null);
        } catch (err) {
            setError(err.message || 'Erreur lors du chargement');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchPersonnel();
    }, [fetchPersonnel]);

    return { data, loading, error, stats, refetch: fetchPersonnel };
}