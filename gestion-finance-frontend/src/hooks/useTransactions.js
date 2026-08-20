import { useState, useEffect, useCallback } from 'react';
import { transactionsApi } from '../api/transactionsApi';

const EMPTY_FILTERS = {};

export function useTransactions(filters = EMPTY_FILTERS) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState({ solde: 0, income: 0, expense: 0 });

    const fetchTransactions = useCallback(async () => {
        try {
            setLoading(true);
            const transactions = await transactionsApi.getAll(filters);

            setData(transactions);

            let income = 0;
            let expense = 0;
            transactions.forEach(t => {
                const amount = parseFloat(t.amount || 0);
                if (amount > 0) income += amount;
                else expense += Math.abs(amount);
            });

            setStats({
                solde: income - expense,
                income,
                expense
            });
            setError(null);
        } catch (err) {
            setError(err.message || 'Erreur lors du chargement');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    return { data, loading, error, stats, refetch: fetchTransactions };
}