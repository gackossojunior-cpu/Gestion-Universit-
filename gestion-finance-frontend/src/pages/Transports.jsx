import {useState} from 'react';
import {useDepensesTransport} from '../hooks/useDepensesTransport';
import {DepenseTransportModal} from '../components/transports/DepenseTransportModal.jsx';
import {formatCurrency} from '../utils/formatCurrency';
import {depensesTransportApi} from '../api/depensesTransportApi';
import '../styles/etudiants.css';

const TYPE_LABELS = {
    carburant: 'Carburant',
    entretien: 'Entretien',
    reparation: 'Réparation',
};

export function TransportsPage() {
    const [filterType, setFilterType] = useState('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const {
        data: depenses,
        loading,
        error,
        stats: rawStats,
        refetch
    } = useDepensesTransport();

    const stats = {
        total: rawStats?.total ?? 0,
        byType: {
            carburant: rawStats?.byType?.carburant ?? 0,
            entretien: rawStats?.byType?.entretien ?? 0,
            reparation: rawStats?.byType?.reparation ?? 0,
        },
    };

    const showMessage = (msg) => {
        setSuccessMessage(msg);
        setTimeout(() => setSuccessMessage(''), 3000);
    };

    const handleAdd = async (formData) => {
        try {
            await depensesTransportApi.create(formData);
            showMessage('Dépense enregistrée avec succès');
            refetch();
            setIsModalOpen(false);
        } catch (err) {
            console.error('Erreur ajout:', err);
            showMessage("Erreur lors de l'ajout");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Supprimer cette dépense ?')) return;
        try {
            await depensesTransportApi.delete(id);
            showMessage('Dépense supprimée');
            refetch();
        } catch (err) {
            console.error('Erreur suppression:', err);
            showMessage('Erreur lors de la suppression');
        }
    };

    const filtered = (depenses || []).filter(d => {
        if (filterType === 'all') return true;
        return d.type_depense === filterType;
    });

    if (loading) {
        return (
            <div className="loading-state">
                <div className="spinner"></div>
                <p>Chargement des dépenses...</p>
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
                    <div className="scard-val">{formatCurrency(stats.total)}</div>
                    <div className="scard-label">Dépenses totales</div>
                </div>
                <div className="scard amber">
                    <div className="scard-val">{formatCurrency(stats.byType.carburant)}</div>
                    <div className="scard-label">Carburant</div>
                </div>
                <div className="scard rose">
                    <div className="scard-val">{formatCurrency(stats.byType.entretien + stats.byType.reparation)}</div>
                    <div className="scard-label">Entretien &amp; réparation</div>
                </div>
            </div>

            <div className="filter-box">
                <div className="filter-row">
                    <span className="filter-label">Filtrer :</span>
                    {[
                        {key: 'all', label: 'Tous'},
                        {key: 'carburant', label: 'Carburant'},
                        {key: 'entretien', label: 'Entretien'},
                        {key: 'reparation', label: 'Réparation'},
                    ].map(f => (
                        <button
                            key={f.key}
                            className={`filter-btn ${filterType === f.key ? 'active-blue' : ''}`}
                            onClick={() => setFilterType(f.key)}
                        >
                            {f.label}
                        </button>
                    ))}
                    <span className="filter-count" style={{marginLeft: 'auto'}}>{filtered.length} dépense(s)</span>

                    <button type="button" className="btn-add" onClick={() => setIsModalOpen(true)}>
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                             strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
                        </svg>
                        Nouvelle dépense
                    </button>
                </div>
            </div>

            <div className="table-card">
                <div className="table-scroll">
                    <table className="data-table">
                        <thead>
                        <tr>
                            <th>Véhicule</th>
                            <th>Type</th>
                            <th className="right">Montant</th>
                            <th>Description</th>
                            <th className="center">Date</th>
                            <th className="center">Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="empty-td">
                                    <div className="empty-circle">
                                        <svg width="24" height="24" fill="none" stroke="currentColor"
                                             viewBox="0 0 24 24" strokeWidth="1.5">
                                            <rect x="2" y="5" width="20" height="14" rx="2"/>
                                            <line x1="2" y1="10" x2="22" y2="10"/>
                                        </svg>
                                    </div>
                                    <div className="empty-title">Aucune dépense enregistrée</div>
                                    <div className="empty-sub">Ajoutez votre première dépense de transport.</div>
                                    <button className="btn-empty" onClick={() => setIsModalOpen(true)}>Ajouter</button>
                                </td>
                            </tr>
                        ) : (
                            filtered.map((d) => (
                                <tr key={d.id}>
                                    <td><span className="badge-mono">{d.bus_numero}</span></td>
                                    <td><span
                                        className="badge-level">{TYPE_LABELS[d.type_depense] || d.type_depense}</span>
                                    </td>
                                    <td className="right">
                                        <div className="amount-main">{formatCurrency(d.montant)}</div>
                                    </td>
                                    <td style={{
                                        color: 'var(--muted)',
                                        fontSize: '.8125rem'
                                    }}>{d.description || '-'}</td>
                                    <td className="center" style={{fontSize: '.8125rem', color: 'var(--muted)'}}>
                                        {d.date ? new Date(d.date).toLocaleDateString('fr-FR', {
                                            day: '2-digit',
                                            month: 'short',
                                            year: 'numeric'
                                        }) : '-'}
                                    </td>
                                    <td className="center">
                                        <div className="action-row">
                                            <button className="btn-del" onClick={() => handleDelete(d.id)}>
                                                <svg width="14" height="14" fill="none" stroke="currentColor"
                                                     viewBox="0 0 24 24" strokeWidth="2">
                                                    <path strokeLinecap="round" strokeLinejoin="round"
                                                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>
            </div>

            <DepenseTransportModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleAdd}
            />
        </div>
    );
}

export default TransportsPage;