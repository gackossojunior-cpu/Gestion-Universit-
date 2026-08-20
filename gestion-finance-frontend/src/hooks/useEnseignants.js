import { useState, useEffect, useCallback} from "react";
import { enseignantsApi } from "../api/enseignantsApi";

export function useEnseignants(filters = {}) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState({
        total: 0,
        totalSalary: 0,
        totalPaid: 0,
        totalRemaining: 0
    });

    const fetchEnseignants = useCallback(async () => {
        try {
            setLoading(true);
            const enseignants = await enseignantsApi.getAll(filters);

            setData(enseignants);

            const totalSalary =  enseignants.reduce(
                (sum, e) => sum + parseFloat(e.salaire || 0), 0
            );
            const totalPaid =  enseignants.reduce(
                (sum, e) => sum + parseFloat(e.montant_paye || 0), 0
            );

            setStats({
                total: enseignants.length,
                totalSalary: totalSalary,
                totalPaid: totalPaid,
                totalRemaining: totalSalary - totalPaid
            });
            setLoading(false);
        } catch (err) {
            setError(err.message || 'Erreur lors du chargement');
        } finally {
            setLoading(false);
        }
    }, [filters]);
    useEffect(() => {
        fetchEnseignants();
    }, [fetchEnseignants]);

    return {
        data,
        loading,
        error,
        stats,
        refetch: fetchEnseignants
    };
}