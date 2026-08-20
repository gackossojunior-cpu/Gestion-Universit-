import { useState } from 'react';
import { useEnseignants } from '../hooks/useEnseignants';
import { PayEnseignantModal } from '../components/enseignants/PayEnseignantModal';
import { formatCurrency } from '../utils/formatCurrency';
import { enseignantsApi } from '../api/enseignantsApi';
import '../styles/etudiants.css';

export function EnseignantsPage() {
  const [filters, setFilters] = useState({ q: '', mois: '', statut: 'all' });
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payTarget, setPayTarget] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const { data: enseignants, loading, error, stats, refetch } = useEnseignants(filters);

  const showMessage = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const openPayModal = (enseignant) => {
    setPayTarget(enseignant);
    setIsPayModalOpen(true);
  };

  const handlePay = async (data) => {
    try {
      await enseignantsApi.pay(data.id, { montant: data.montant });
      showMessage('Paiement enregistré avec succès');
      refetch();
      setIsPayModalOpen(false);
    } catch (err) {
      console.error('Erreur paiement:', err);
      showMessage('Erreur lors du paiement');
    }
  };

  const filtered = (enseignants || []).filter(e => {
    if (filters.q) {
      const q = filters.q.toLowerCase();
      if (!(e.name || '').toLowerCase().includes(q)) return false;
    }
    if (filters.mois && e.mois_concerne !== filters.mois) return false;

    if (filters.statut !== 'all') {
      const salaire = parseFloat(e.salaire || 0);
      const paye = parseFloat(e.montant_paye || 0);
      if (filters.statut === 'paye') return salaire > 0 && Math.abs(salaire - paye) < 0.01;
      if (filters.statut === 'partiel') return paye > 0 && Math.abs(salaire - paye) > 0.01;
      if (filters.statut === 'en_attente') return paye === 0;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Chargement des enseignants...</p>
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

      <div className="stat-grid">
        <div className="scard ink">
          <div className="scard-val">{stats.total}</div>
          <div className="scard-label">Enseignants</div>
        </div>
        <div className="scard green">
          <div className="scard-val">{formatCurrency(stats.totalSalary)}</div>
          <div className="scard-label">Masse salariale</div>
        </div>
        <div className="scard amber">
          <div className="scard-val">{formatCurrency(stats.totalPaid)}</div>
          <div className="scard-label">Salaires payés</div>
        </div>
        <div className="scard rose">
          <div className="scard-val">{formatCurrency(stats.totalRemaining)}</div>
          <div className="scard-label">Reste à payer</div>
        </div>
      </div>

      <div className="filter-box">
        <div className="filter-row">
          <div className="filter-search">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input
              type="text"
              placeholder="Rechercher un enseignant…"
              value={filters.q}
              onChange={(e) => setFilters(prev => ({ ...prev, q: e.target.value }))}
              className="filter-input"
            />
          </div>

          <input
            type="month"
            value={filters.mois}
            onChange={(e) => setFilters(prev => ({ ...prev, mois: e.target.value }))}
            className="filter-select"
          />

          <select
            value={filters.statut}
            onChange={(e) => setFilters(prev => ({ ...prev, statut: e.target.value }))}
            className="filter-select"
          >
            <option value="all">Tous les statuts</option>
            <option value="paye">Payé</option>
            <option value="partiel">Partiel</option>
            <option value="en_attente">En attente</option>
          </select>
        </div>
      </div>

      <div className="table-card">
        <div className="table-card-head">
          <h3>Liste des enseignants</h3>
          <span>{filtered.length} enseignant(s)</span>
        </div>

        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Enseignant</th>
                <th>Département</th>
                <th className="center">Mois</th>
                <th className="right">Salaire</th>
                <th className="right">Payé</th>
                <th className="center">Statut</th>
                <th className="center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="empty-td">
                    <div className="empty-circle">
                      <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                      </svg>
                    </div>
                    <div className="empty-title">Aucun enseignant trouvé</div>
                    <div className="empty-sub">Les enseignants sont enregistrés depuis l'espace ressources humaines.</div>
                  </td>
                </tr>
              ) : (
                filtered.map((e) => {
                  const salaire = parseFloat(e.salaire || 0);
                  const paye = parseFloat(e.montant_paye || 0);
                  let statut = 'en_attente';
                  if (salaire > 0 && Math.abs(salaire - paye) < 0.01) statut = 'paye';
                  else if (paye > 0) statut = 'partiel';

                  return (
                    <tr key={e.id}>
                      <td>
                        <div className="etu-name">
                          <div className="etu-avatar">{(e.name || '?')[0]?.toUpperCase()}</div>
                          <div>
                            <div className="etu-label">{e.name}</div>
                            <div className="amount-sub">{e.email || 'Aucun email'}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className="badge-mono">{e.departement || 'N/A'}</span></td>
                      <td className="center"><span className="badge-level">{e.mois_concerne || '-'}</span></td>
                      <td className="right"><div className="amount-main">{formatCurrency(salaire)}</div></td>
                      <td className="right"><div className="amount-main">{formatCurrency(paye)}</div></td>
                      <td className="center">
                        {statut === 'paye' && <span className="badge-status badge-paye"><span className="dot"></span>Payé</span>}
                        {statut === 'partiel' && <span className="badge-status badge-partiel"><span className="dot"></span>Partiel</span>}
                        {statut === 'en_attente' && <span className="badge-status badge-nonpaye"><span className="dot"></span>En attente</span>}
                      </td>
                      <td className="center">
                        <div className="action-row">
                          <button className="btn-pay" onClick={() => openPayModal(e)}>Payer</button>
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

      <PayEnseignantModal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        onSubmit={handlePay}
        initialData={payTarget}
      />
    </div>
  );
}

export default EnseignantsPage;