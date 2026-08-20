import { useState } from 'react';
import { usePersonnel } from '../hooks/usePersonnel';
import { PayPersonnelModal } from '../components/personnel/PayPersonnelModal';
import { formatCurrency } from '../utils/formatCurrency';
import { personnelApi } from '../api/personnelApi';
import '../styles/etudiants.css';

export function PersonnelPage() {
  const [filters, setFilters] = useState({ q: '', mois: '', statut: 'all' });
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payTarget, setPayTarget] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const { data: personnel, loading, error, stats, refetch } = usePersonnel(filters);

  const showMessage = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const openPayModal = (p) => {
    setPayTarget(p);
    setIsPayModalOpen(true);
  };

  const handlePay = async (data) => {
    try {
      await personnelApi.pay(data.id, { montant: data.montant });
      showMessage('Paiement enregistré avec succès');
      refetch();
      setIsPayModalOpen(false);
    } catch (err) {
      console.error('Erreur paiement:', err);
      showMessage('Erreur lors du paiement');
    }
  };

  const filtered = (personnel || []).filter(p => {
    if (filters.q) {
      const q = filters.q.toLowerCase();
      if (!(p.name || '').toLowerCase().includes(q)) return false;
    }
    if (filters.mois && p.mois_concerne !== filters.mois) return false;

    if (filters.statut !== 'all') {
      const salaire = parseFloat(p.salaire || 0);
      const paye = parseFloat(p.montant_paye || 0);
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
        <p>Chargement du personnel...</p>
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
        <div className="scard blue">
          <div className="scard-val">{stats.total}</div>
          <div className="scard-label">Membres</div>
        </div>
        <div className="scard violet">
          <div className="scard-val">{formatCurrency(stats.totalSalary)}</div>
          <div className="scard-label">Masse salariale</div>
        </div>
        <div className="scard green">
          <div className="scard-val">{formatCurrency(stats.totalPaid)}</div>
          <div className="scard-label">Déjà payés</div>
        </div>
        <div className="scard rose">
          <div className="scard-val">{formatCurrency(stats.totalRemaining)}</div>
          <div className="scard-label">Restant dû</div>
        </div>
      </div>

      <div className="pill-row">
        <span className="pill pill-green">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
          </svg>
          Payés : {stats.nbPayes}
        </span>
        <span className="pill pill-amber">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          Partiels : {stats.nbPartiels}
        </span>
        <span className="pill pill-slate">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          En attente : {stats.nbAttente}
        </span>
      </div>

      <div className="filter-box">
        <div className="filter-row">
          <div className="filter-search">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input
              type="text"
              placeholder="Rechercher par nom…"
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
            <option value="all">Tous statuts</option>
            <option value="paye">Payé</option>
            <option value="partiel">Partiel</option>
            <option value="en_attente">En attente</option>
          </select>
        </div>
      </div>

      <div className="table-card">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Poste</th>
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
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                      </svg>
                    </div>
                    <div className="empty-title">Aucun membre trouvé</div>
                    <div className="empty-sub">Le personnel est enregistré depuis l'espace ressources humaines.</div>
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const salaire = parseFloat(p.salaire || 0);
                  const paye = parseFloat(p.montant_paye || 0);
                  let statut = 'en_attente';
                  if (salaire > 0 && Math.abs(salaire - paye) < 0.01) statut = 'paye';
                  else if (paye > 0) statut = 'partiel';

                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="member-cell">
                          <div className="member-row">
                            <div className="member-avatar">{(p.name || '?')[0]?.toUpperCase()}</div>
                            <span className="member-name">{p.name}</span>
                          </div>
                          <div className="member-meta">
                            {p.email || '-'} · {p.matricule || 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td><span className="badge-poste">{p.poste_display || p.poste}</span></td>
                      <td className="center"><span className="badge-level">{p.mois_concerne || '-'}</span></td>
                      <td className="right"><div className="amount-main">{formatCurrency(salaire)}</div></td>
                      <td className="right"><div className="amount-main">{formatCurrency(paye)}</div></td>
                      <td className="center">
                        {statut === 'paye' && <span className="badge-status badge-paye"><span className="dot"></span>Payé</span>}
                        {statut === 'partiel' && <span className="badge-status badge-partiel"><span className="dot"></span>Partiel</span>}
                        {statut === 'en_attente' && <span className="badge-status badge-nonpaye"><span className="dot"></span>En attente</span>}
                      </td>
                      <td className="center">
                        <div className="action-row">
                          <button className="btn-pay" onClick={() => openPayModal(p)}>Payer</button>
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

      <PayPersonnelModal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        onSubmit={handlePay}
        initialData={payTarget}
      />
    </div>
  );
}

export default PersonnelPage;