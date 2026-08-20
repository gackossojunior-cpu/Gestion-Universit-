import { useState, useEffect } from 'react';

export function PayEnseignantModal({ isOpen, onClose, onSubmit, initialData }) {
  const [montant, setMontant] = useState('');
  const [modePaiement, setModePaiement] = useState('cash'); // Déclarer modePaiement
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMontant('');
      setModePaiement('cash');
      setError('');
    }
  }, [isOpen, initialData]);

  if (!isOpen || !initialData) return null;

  const handleSubmit = (e) => {
    e.preventDefault();

    const montantValue = parseFloat(montant);

    if (!montantValue || montantValue <= 0) {
      setError('Le montant doit être positif');
      return;
    }

    onSubmit({
      id: initialData.id,
      montant: montantValue,
      mode_paiement: modePaiement
    });
  };

  const reste = parseFloat(initialData.salaire || 0) - parseFloat(initialData.montant_paye || 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Payer {initialData.name}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            {error && <div className="alert alert-error">{error}</div>}

            <div className="field-group">
              <label>Salaire total</label>
              <div className="amount-display">
                {parseFloat(initialData.salaire || 0).toLocaleString()} FCFA
              </div>
            </div>

            <div className="field-group">
              <label>Déjà payé</label>
              <div className="amount-display">
                {parseFloat(initialData.montant_paye || 0).toLocaleString()} FCFA
              </div>
            </div>

            <div className="field-group">
              <label>Reste à payer</label>
              <div className="amount-display highlight">
                {reste.toLocaleString()} FCFA
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="montant">Montant à payer *</label>
              <input
                id="montant"
                type="number"
                value={montant}
                onChange={(e) => setMontant(e.target.value)}
                placeholder="Ex: 100000"
                required
                min="0"
                max={reste}
                className="form-input"
              />
            </div>

            <div className="field-group">
              <label htmlFor="modePaiement">Mode de paiement</label>
              <select
                id="modePaiement"
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

            <div className="modal-form-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Annuler
              </button>
              <button type="submit" className="btn btn-primary">
                Valider le paiement
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}