// src/components/etudiants/PaymentModal.jsx
import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { formatCurrency } from '../../utils/formatCurrency';

export function PaymentModal({ isOpen, onClose, onSubmit, initialData = null }) {
  const [montant, setMontant] = useState('');
  const [modePaiement, setModePaiement] = useState('cash');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMontant('');
      setModePaiement('cash');
      setError('');
    }
  }, [isOpen, initialData]);

  if (!initialData) return null;

  const total = parseFloat(initialData.montant_total || 0);
  const paye = parseFloat(initialData.montant_paye || 0);
  const reste = total - paye;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const amount = parseFloat(montant);
    if (isNaN(amount) || amount <= 0) {
      setError('Le montant doit être un nombre positif');
      return;
    }
    if (amount > reste) {
      setError(`Le montant ne peut pas dépasser le reste à payer (${formatCurrency(reste)})`);
      return;
    }

    onSubmit({
      id: initialData.id,
      montant: amount,
      mode_paiement: modePaiement
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Enregistrer un paiement"
      subtitle={`${initialData.etudiant?.nom || ''} ${initialData.etudiant?.prenom || ''}`}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={handleSubmit}>
            Enregistrer le paiement
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="alert alert-error mb-4">{error}</div>
        )}

        <div className="field-group">
          <label>Montant total</label>
          <div className="form-input" style={{ background: '#f7f8fa' }}>
            {formatCurrency(total)}
          </div>
        </div>

        <div className="field-group">
          <label>Déjà payé</label>
          <div className="form-input" style={{ background: '#f7f8fa' }}>
            {formatCurrency(paye)}
          </div>
        </div>

        <div className="field-group">
          <label>Reste à payer</label>
          <div className="form-input" style={{ background: '#f7f8fa', fontWeight: 600 }}>
            {formatCurrency(reste)}
          </div>
        </div>

        <div className="field-group">
          <label htmlFor="montant">Montant à verser (FCFA)</label>
          <input
            id="montant"
            name="montant"
            type="number"
            placeholder="0"
            step="0.01"
            max={reste}
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
            required
            className="form-input"
            autoFocus
          />
        </div>

        <div className="field-group">
          <label htmlFor="mode_paiement">Mode de paiement</label>
          <select
            id="mode_paiement"
            name="mode_paiement"
            value={modePaiement}
            onChange={(e) => setModePaiement(e.target.value)}
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