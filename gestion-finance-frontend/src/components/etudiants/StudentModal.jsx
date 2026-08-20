import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { dossiersApi } from '../../api/dossiersApi';
import axios from '../../api/client'

export function StudentModal({ isOpen, onClose, onSubmit, initialData = null, mode = 'add' }) {
  const [formData, setFormData] = useState({
    etudiant_id: '',
    montant_total: '',
    mode_paiement: 'cash'
  });
  const [error, setError] = useState('');
  const [etudiantsList, setEtudiantsList] = useState([]);
  const [loadingEtudiants, setLoadingEtudiants] = useState(false);

  // Chargement de la liste des étudiants (pour le select)
  useEffect(() => {
    if (isOpen && mode === 'add') {
      setLoadingEtudiants(true);
      // Appel API pour récupérer la liste des étudiants disponibles
      // Remplace par ton endpoint réel si nécessaire
      const fetchEtudiants = async () => {
        try {
          // Exemple : tu as un endpoint /api/etudiants/list/ ou similaire
          // Pour l'instant, je simule
          const response = await fetch('/api/etudiants/list/', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
          });
          if (response.ok) {
            const data = await response.json();
            setEtudiantsList(data);
          }
        } catch (err) {
          console.error('Erreur chargement étudiants:', err);
          // Fallback: liste vide ou simulée
          setEtudiantsList([]);
        } finally {
          setLoadingEtudiants(false);
        }
      };
      fetchEtudiants();
    }
  }, [isOpen, mode]);

  // Préremplir si édition
  useEffect(() => {
    if (initialData) {
      setFormData({
        etudiant_id: initialData.etudiant_id || '',
        montant_total: (initialData.montant_total || 0).toString(),
        mode_paiement: initialData.mode_paiement || 'cash'
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!formData.etudiant_id) {
      setError('Sélectionnez un étudiant');
      return;
    }

    const amount = parseFloat(formData.montant_total);
    if (isNaN(amount) || amount <= 0) {
      setError('Le montant total doit être un nombre positif');
      return;
    }

    onSubmit({
      ...formData,
      montant_total: amount
    });

    setFormData({
      etudiant_id: '',
      montant_total: '',
      mode_paiement: 'cash'
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'edit' ? 'Modifier le dossier' : 'Nouveau dossier étudiant'}
      subtitle={mode === 'edit' ? 'Mettre à jour les informations' : 'Ajouter un étudiant à la base'}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Annuler</button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={!formData.etudiant_id || loadingEtudiants}
          >
            {mode === 'edit' ? 'Mettre à jour' : 'Enregistrer'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="alert alert-error mb-4">{error}</div>
        )}

        <div className="field-group">
          <label htmlFor="etudiant_id">
            {mode === 'add' ? 'Sélectionner un étudiant' : 'Étudiant'}
          </label>
          {mode === 'add' ? (
            <select
              id="etudiant_id"
              name="etudiant_id"
              value={formData.etudiant_id}
              onChange={handleChange}
              required
              className="form-input"
              disabled={loadingEtudiants}
            >
              <option value="">— Sélectionner un étudiant —</option>
              {etudiantsList.map(student => (
                <option key={student.id} value={student.id}>
                  {student.nom} {student.prenom} — {student.matricule}
                </option>
              ))}
            </select>
          ) : (
            <div className="form-input" style={{ background: '#f7f8fa' }}>
              {initialData?.etudiant?.nom || ''} {initialData?.etudiant?.prenom || ''}
              <br />
              <span className="text-slate">{initialData?.etudiant?.matricule || ''}</span>
            </div>
          )}
        </div>

        <div className="field-group">
          <label htmlFor="montant_total">Montant total (FCFA)</label>
          <input
            id="montant_total"
            name="montant_total"
            type="number"
            placeholder="500000"
            step="0.01"
            value={formData.montant_total}
            onChange={handleChange}
            required
            className="form-input"
          />
        </div>

        <div className="field-group">
          <label htmlFor="mode_paiement">Mode de paiement initial</label>
          <select
            id="mode_paiement"
            name="mode_paiement"
            value={formData.mode_paiement}
            onChange={handleChange}
            className="form-input"
          >
            <option value="cash">Espèces</option>
            <option value="mobile_money">Mobile Money</option>
            <option value="virement">Virement bancaire</option>
            <option value="cheque">Chèque</option>
          </select>
        </div>
      </form>
    </Modal>
  );
}