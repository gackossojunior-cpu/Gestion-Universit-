import { useState, useEffect, useCallback } from "react";
import { depensesTransportApi } from "../api/depensesTransportApi";

const EMPTY_FILTERS = {};

export function useDepensesTransport(filters = EMPTY_FILTERS) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState({
        total: 0,
        byType: { carburant: 0, entretien: 0, repartition: 0}
    });

    const fetchDepenses = useCallback(async () => {
        try {
            setLoading(true);
            const depenses =  await depensesTransportApi.getAll(filters);
            setData(depenses);

            const byType = { carburant: 0, entretien: 0, repartition: 0 };
            let total = 0;
            depenses.forEach(depense => {
                const montant = parseFloat(depense.montant || 0);
                total += montant;
                if (byType[d.type_depense]!== undefined) {
                    byType[d.type_depense] += montant;
                }
            });

            setStats({ total, byType });
            setError(null);
        } catch (err) {
            setError(err.message || 'Erreur lors du chargement');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchDepenses();
    }, [fetchDepenses]);

    return { data, loading, error, refetch: fetchDepenses };
}