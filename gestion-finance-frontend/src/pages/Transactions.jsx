import {useState} from 'react';
import {useTransactions} from '../hooks/useTransactions';
import {TransactionModal} from '../components/transactions/TransactionModal';
import {formatCurrency} from '../utils/formatCurrency';
import {transactionsApi} from '../api/transactionsApi';
import '../styles/etudiants.css';

const RECEIPT_BASE = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/finance/api').replace('/api', '');

const QUICK_AMOUNTS = [50000, 100000, 200000, -25000, -50000];

export function TransactionsPage() {
    const [filterType, setFilterType] = useState('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const {data: transactions, loading, error, stats, refetch} = useTransactions();

    const showMessage = (msg) => {
        setSuccessMessage(msg);
        setTimeout(() => setSuccessMessage(''), 3000);
    };

    const handleAdd = async (formData) => {
        try {
            await transactionsApi.create(formData);
            showMessage('Transaction enregistrée avec succès');
            refetch();
            setIsModalOpen(false);
        } catch (err) {
            console.error('Erreur ajout:', err);
            showMessage("Erreur lors de l'ajout");
        }
    };

    const handleQuickAdd = async (amount) => {
        try {
            await transactionsApi.create({
                text: amount < 0 ? 'Dépense diverse' : 'Recette diverse',
                amount
            });
            showMessage('Transaction enregistrée avec succès');
            refetch();
        } catch (err) {
            console.error('Erreur ajout rapide:', err);
            showMessage("Erreur lors de l'ajout");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Supprimer cette transaction ?')) return;
        try {
            await transactionsApi.delete(id);
            showMessage('Transaction supprimée');
            refetch();
        } catch (err) {
            console.error('Erreur suppression:', err);
            showMessage('Erreur lors de la suppression');
        }
    };

    const getLabel = (text) => {
        if (text.includes('Salaire enseignant') || text.includes('Salaire personnel')) return 'Salaire';
        if (text.includes('Paiement scolarité')) return 'Scolarité';
        return null;
    };

    const filtered = (transactions || []).filter(t => {
        const amount = parseFloat(t.amount || 0);
        const label = getLabel(t.text || '');

        if (filterType === 'revenus') return amount > 0;
        if (filterType === 'depenses') return amount < 0;
        if (filterType === 'salaires') return label === 'Salaire';
        if (filterType === 'scolarite') return label === 'Scolarité';
        if (filterType === 'autres') return !label;
        return true;
    });

    if (loading) {
        return (
            <div className="loading-state">
                <div className="spinner"></div>
                <p>Chargement des transactions...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="error-state">
                <p>Erreur: {error}</p>
                <button onClick={refetch}>Réessayer</button>
            </div>
        );
    }

    return (
        <div className="etudiants-page">
            {successMessage && <div className="alert alert-success mb-4">{successMessage}</div>}

            <div className="stat-grid-3">
                <div className="scard ink">
                    <div className="scard-val">{formatCurrency(stats.solde)}</div>
                    <div className="scard-label">Solde actuel</div>
                </div>
                <div className="scard green">
                    <div className="scard-val">+{formatCurrency(stats.income)}</div>
                    <div className="scard-label">Revenus</div>
                </div>
                <div className="scard rose">
                    <div className="scard-val">-{formatCurrency(stats.expense)}</div>
                    <div className="scard-label">Dépenses</div>
                </div>
            </div>

            <div className="quick-row">
                {QUICK_AMOUNTS.map(amount => (
                    <button
                        key={amount}
                        className={`btn-quick ${amount > 0 ? 'income' : 'expense'}`}
                        onClick={() => handleQuickAdd(amount)}
                    >
                        {amount > 0 ? '+' : ''}{amount.toLocaleString('fr-FR')} FCFA
                    </button>
                ))}
            </div>

            <div className="table-card">
                <div className="table-head">
                    <span className="table-head-title">Historique des transactions</span>
                    <div className="filter-row" style={{flexWrap: 'wrap', gap: 4}}>
                        <span className="filter-label">Filtrer :</span>
                        {[
                            {key: 'all', label: 'Tous'},
                            {key: 'revenus', label: 'Revenus'},
                            {key: 'depenses', label: 'Dépenses'},
                            {key: 'salaires', label: 'Salaires'},
                            {key: 'scolarite', label: 'Scolarité'},
                            {key: 'autres', label: 'Autres'},
                        ].map(f => (
                            <button
                                key={f.key}
                                className={`filter-btn ${filterType === f.key ? 'active-blue' : ''}`}
                                onClick={() => setFilterType(f.key)}
                            >
                                {f.label}
                            </button>
                        ))}
                        <span className="filter-count">{filtered.length} transaction(s)</span>
                    </div>
                    <button type="button" className="btn-add" onClick={() => setIsModalOpen(true)}>
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                             strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
                        </svg>
                        Nouvelle transaction
                    </button>
                </div>

                <div className="table-scroll">
                    <table className="data-table">
                        <thead>
                        <tr>
                            <th>Date</th>
                            <th>Description</th>
                            <th className="right">Montant</th>
                            <th className="center">Type</th>
                            <th className="center">Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="empty-td">
                                    <div className="empty-circle">
                                        <svg width="24" height="24" fill="none" stroke="currentColor"
                                             viewBox="0 0 24 24" strokeWidth="1.5">
                                            <path strokeLinecap="round" strokeLinejoin="round"
                                                  d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                                        </svg>
                                    </div>
                                    <div className="empty-title">Aucune transaction</div>
                                    <div className="empty-sub">Enregistrez votre première transaction.</div>
                                    <button className="btn-empty" onClick={() => setIsModalOpen(true)}>Ajouter</button>
                                </td>
                            </tr>
                        ) : (
                            filtered.map((t) => {
                                const amount = parseFloat(t.amount || 0);
                                const label = getLabel(t.text || '');
                                const date = t.created_at ? new Date(t.created_at) : null;

                                return (
                                    <tr key={t.id}>
                                        <td>
                                            <div className="date-cell">
                                                <div className="date-icon">
                                                    <svg width="14" height="14" fill="none" stroke="currentColor"
                                                         viewBox="0 0 24 24" strokeWidth="2">
                                                        <path strokeLinecap="round" strokeLinejoin="round"
                                                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                                    </svg>
                                                </div>
                                                <div>
                                                    <div className="date-main">
                                                        {date ? date.toLocaleDateString('fr-FR', {
                                                            day: '2-digit',
                                                            month: 'short',
                                                            year: 'numeric'
                                                        }) : '-'}
                                                    </div>
                                                    <div className="date-time">
                                                        {date ? date.toLocaleTimeString('fr-FR', {
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        }) : ''}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="desc-main">
                                                {t.text}
                                                {label === 'Salaire' &&
                                                    <span className="desc-label blue">Salaire</span>}
                                                {label === 'Scolarité' &&
                                                    <span className="desc-label green">Scolarité</span>}
                                            </div>
                                        </td>
                                        <td className="right">
                        <span className={`amount-pill ${amount > 0 ? 'income' : 'expense'}`}>
                          {amount > 0 ? '+' : ''}{formatCurrency(amount)}
                        </span>
                                        </td>
                                        <td className="center">
                                            {amount > 0 ? (
                                                <span className="type-badge income"><span className="dot"></span>Revenu</span>
                                            ) : (
                                                <span className="type-badge expense"><span className="dot"></span>Dépense</span>
                                            )}
                                        </td>
                                        <td>
                                            <div className="action-row">
                                                <a
                                                    href={`${RECEIPT_BASE}/transactions/${t.id}/receipt/`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="btn-receipt"
                                                >
                                                    <svg width="13" height="13" fill="none" stroke="currentColor"
                                                         viewBox="0 0 24 24" strokeWidth="2">
                                                        <path strokeLinecap="round" strokeLinejoin="round"
                                                              d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                                                    </svg>
                                                    Reçu
                                                </a>
                                                <button className="btn-del" onClick={() => handleDelete(t.id)}>
                                                    <svg width="14" height="14" fill="none" stroke="currentColor"
                                                         viewBox="0 0 24 24" strokeWidth="2">
                                                        <path strokeLinecap="round" strokeLinejoin="round"
                                                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                        </tbody>
                    </table>
                </div>
            </div>

            <TransactionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleAdd}
            />
        </div>
    );
}

export default TransactionsPage;