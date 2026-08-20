// src/pages/Etudiants.jsx
import { useState } from 'react';
import { useEtudiants } from '../hooks/useEtudiants';
import { Modal } from '../components/ui/Modal';
import { StudentModal } from '../components/etudiants/StudentModal';
import { PaymentModal } from '../components/etudiants/PaymentModal';
import { formatCurrency, formatDate } from '../utils/formatCurrency';
import { dossiersApi } from '../api/dossiersApi';
import '../styles/etudiants.css';

export function EtudiantsPage() {
  const [filters, setFilters] = useState({
    q: '',
    cycle: 'all',
    statut: 'all'
  });

  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [paymentData, setPaymentData] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const { data: dossiers, loading, error, stats, refetch } = useEtudiants(filters);

  const handleAddStudent = async (formData) => {
    try {
      await dossiersApi.create(formData);
      setSuccessMessage('Dossier ajouté avec succès');
      refetch();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Erreur ajout:', err);
      setSuccessMessage('Erreur lors de l\'ajout');
    }
  };

  const handleEditStudent = (student) => {
    setEditingStudent(student);
    setIsStudentModalOpen(true);
  };

  const handleUpdateStudent = async (formData) => {
    if (!editingStudent) return;

    try {
      await dossiersApi.update(editingStudent.id, formData);
      setSuccessMessage('Dossier mis à jour');
      refetch();
      setTimeout(() => {
        setSuccessMessage('');
        setIsStudentModalOpen(false);
        setEditingStudent(null);
      }, 2000);
    } catch (err) {
      console.error('Erreur mise à jour:', err);
      setSuccessMessage('Erreur lors de la mise à jour');
    }
  };

  const handleDeleteStudent = async (id) => {
    if (!window.confirm('Supprimer ce dossier ?')) return;

    try {
      await dossiersApi.delete(id);
      setSuccessMessage('Dossier supprimé');
      refetch();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Erreur suppression:', err);
      setSuccessMessage('Erreur lors de la suppression');
    }
  };

  const openPaymentModal = (student) => {
    setPaymentData(student);
    setIsPaymentModalOpen(true);
  };

  const handlePayment = async (data) => {
    try {
      await dossiersApi.pay(data.id, {
        montant: data.montant,
        mode_paiement: data.mode_paiement
      });
      setSuccessMessage('Paiement enregistré avec succès');
      refetch();
      setIsPaymentModalOpen(false);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Erreur paiement:', err);
      setSuccessMessage('Erreur lors du paiement');
    }
  };

  const filteredDossiers = dossiers.filter(d => {
    // Filtre recherche
    if (filters.q) {
      const q = filters.q.toLowerCase();
      const matchNom = (d.etudiant?.nom || '').toLowerCase().includes(q);
      const matchMatricule = (d.etudiant?.matricule || '').toLowerCase().includes(q);
      if (!matchNom && !matchMatricule) return false;
    }

    // Filtre cycle
    if (filters.cycle !== 'all' && d.etudiant?.cycle !== filters.cycle) {
      return false;
    }

    // Filtre statut
    if (filters.statut !== 'all') {
      const total = parseFloat(d.montant_total || 0);
      const paye = parseFloat(d.montant_paye || 0);

      if (filters.statut === 'paye') {
        return Math.abs(total - paye) < 0.01;
      }
      if (filters.statut === 'partiel') {
        return total > 0 && paye > 0 && Math.abs(total - paye) > 0.01;
      }
      if (filters.statut === 'non_paye') {
        return paye === 0;
      }
    }

    return true;
  });

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Chargement des étudiants...</p>
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
      {successMessage && (
        <div className="alert alert-success mb-4">{successMessage}</div>
      )}

      {/* Stat cards */}
      <div className="stat-grid">
        <div className="scard ink">
          <div className="scard-icon">
            <svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z"/>
            </svg>
          </div>
          <div className="scard-val">{stats.total}</div>
          <div className="scard-label">Total étudiants</div>
        </div>
        <div className="scard green">
          <div className="scard-icon">
            <svg width="17" height="17" fill="none" stroke="#1E7A4C" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div className="scard-val">{stats.payes}</div>
          <div className="scard-label">Payés</div>
        </div>
        <div className="scard amber">
          <div className="scard-icon">
            <svg width="17" height="17" fill="none" stroke="#A9803F" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div className="scard-val">{stats.partiels}</div>
          <div className="scard-label">Partiels</div>
        </div>
        <div className="scard rose">
          <div className="scard-icon">
            <svg width="17" height="17" fill="none" stroke="#A93A26" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div className="scard-val">{stats.nonPayes}</div>
          <div className="scard-label">Non payés</div>
        </div>
      </div>

      {/* Filtres */}
      <div className="filter-box">
        <form className="filter-row">
          <div className="filter-search">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input
              type="text"
              placeholder="Rechercher par nom ou matricule…"
              value={filters.q}
              onChange={(e) => setFilters(prev => ({ ...prev, q: e.target.value }))}
              className="filter-input"
            />
          </div>

          <select
            value={filters.cycle}
            onChange={(e) => setFilters(prev => ({ ...prev, cycle: e.target.value }))}
            className="filter-select"
          >
            <option value="all">Tous niveaux</option>
            <option value="Licence 1">Licence 1</option>
            <option value="Licence 2">Licence 2</option>
            <option value="Licence 3">Licence 3</option>
            <option value="Master">Master</option>
          </select>

          <select
            value={filters.statut}
            onChange={(e) => setFilters(prev => ({ ...prev, statut: e.target.value }))}
            className="filter-select"
          >
            <option value="all">Tous statuts</option>
            <option value="paye">Payé</option>
            <option value="partiel">Partiel</option>
            <option value="non_paye">Non payé</option>
          </select>

          <button
            type="button"
            className="btn-add"
            onClick={() => setIsStudentModalOpen(true)}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
            </svg>
            Nouvel étudiant
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="table-card">
        <div className="table-card-head">
          <h3>Liste des étudiants</h3>
          <span>{filteredDossiers.length} étudiant(s)</span>
        </div>

        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Étudiant</th>
                <th>Matricule</th>
                <th>Filière</th>
                <th className="center">Niveau</th>
                <th className="right">Montant</th>
                <th className="center">Statut</th>
                <th className="center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDossiers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="empty-td">
                    <div className="empty-circle">
                      <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z"/>
                      </svg>
                    </div>
                    <div className="empty-title">Aucun étudiant trouvé</div>
                    <div className="empty-sub">Ajoutez votre premier étudiant pour commencer.</div>
                    <button className="btn-empty" onClick={() => setIsStudentModalOpen(true)}>
                      Ajouter un étudiant
                    </button>
                  </td>
                </tr>
              ) : (
                filteredDossiers.map((d) => {
                  const total = parseFloat(d.montant_total || 0);
                  const paye = parseFloat(d.montant_paye || 0);
                  const reste = total - paye;
                  let statut = 'non_paye';
                  if (Math.abs(total - paye) < 0.01) statut = 'paye';
                  else if (paye > 0) statut = 'partiel';

                  return (
                    <tr key={d.id}>
                      <td>
                        <div className="etu-name">
                          <div className="etu-avatar">
                            {d.etudiant?.nom?.[0] || ''}
                            {d.etudiant?.prenom?.[0] || ''}
                          </div>
                          <div>
                            <div className="etu-label">
                              {d.etudiant?.nom || ''} {d.etudiant?.prenom || ''}
                            </div>
                            {reste > 0 && total > 0 && (
                              <div className="etu-alerte">
                                <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                                Paiement en retard
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge-mono">{d.etudiant?.matricule || 'N/A'}</span>
                      </td>
                      <td style={{ fontWeight: 500, fontSize: 13 }}>
                        {d.etudiant?.parcours || '-'}
                      </td>
                      <td className="center">
                        <span className="badge-level">{d.etudiant?.cycle || '-'}</span>
                      </td>
                      <td className="right">
                        <div className="amount-main">{formatCurrency(total)}</div>
                        <div className="amount-sub">Payé : {formatCurrency(paye)}</div>
                      </td>
                      <td className="center">
                        {statut === 'paye' && (
                          <span className="badge-status badge-paye">
                            <span className="dot"></span>Payé
                          </span>
                        )}
                        {statut === 'partiel' && (
                          <span className="badge-status badge-partiel">
                            <span className="dot"></span>Partiel
                          </span>
                        )}
                        {statut === 'non_paye' && (
                          <span className="badge-status badge-nonpaye">
                            <span className="dot"></span>Non payé
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="action-row">
                          <a
                            href={`/etudiants/${d.id}/receipt/`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-recu"
                          >
                            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                            </svg>
                            Reçu
                          </a>
                          <button
                            className="btn-pay"
                            onClick={() => openPaymentModal(d)}
                          >
                            Payer
                          </button>
                          <button
                            className="btn-edit"
                            onClick={() => handleEditStudent(d)}
                          >
                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                          </button>
                          <button
                            className="btn-del"
                            onClick={() => handleDeleteStudent(d.id)}
                          >
                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
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

      {/* Modals */}
      <StudentModal
        isOpen={isStudentModalOpen}
        onClose={() => {
          setIsStudentModalOpen(false);
          setEditingStudent(null);
        }}
        onSubmit={editingStudent ? handleUpdateStudent : handleAddStudent}
        initialData={editingStudent}
        mode={editingStudent ? 'edit' : 'add'}
      />

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSubmit={handlePayment}
        initialData={paymentData}
      />
    </div>
  );
}
export default EtudiantsPage;