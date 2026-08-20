import { useState, useEffect, useCallback } from "react";
import { busApi } from "../api/busApi.js";

export function useBuses() {
    const [buses, setBuses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchBuses = useCallback(async () => {
        try {
            setLoading(true);
            const data = await busApi.getAll();
            setBuses(data);
            setError(null);
        } catch (err) {
            setError(err.message || 'Erreur lors du changement des véhicules');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBuses();
    }, [fetchBuses]);

    return { buses, loading, error, refetch: fetchBuses };
}