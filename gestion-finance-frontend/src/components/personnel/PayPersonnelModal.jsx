import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { formatCurrency } from "../../utils/formatCurrency";

export function PayPersonnelModal({ isOpen, onClose, onSubmit, initialData = null}) {
    const [montant, setMontant] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setMontant('');
            setError('');
        }
    }, [isOpen, initialData]);

    if (!initialData) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        const amount = parseFloat(montant);
        if (isNaN(amount) || amount <= 0) {
            setError('Le montant doit être un nombre positif');
            return;
        }

        onSubmit({ id: initialData.id, montant: amount });
    };
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Payer un salaire"
            subtitle={formatCurrency(initialData.montant)}
            footer={
                <>
                    <button className="btn btn-secondary" onClick={onClose}>Annuler</button>
                    <button className="btn btn-primary" onClick={handleSubmit}>Valider</button>
                </>
            }
            >
            <form onSubmit={handleSubmit}>
        {error && <div className="alert alert-error mb-4">{error}</div>}

        <div className="field-group">
          <label>Salaire</label>
          <div className="form-input" style={{ background: 'var(--paper)' }}>
            {formatCurrency(initialData.salaire || 0)}
          </div>
        </div>

        <div className="field-group">
          <label>Déjà payé</label>
          <div className="form-input" style={{ background: 'var(--paper)' }}>
            {formatCurrency(initialData.montant_paye || 0)}
          </div>
        </div>

        <div className="field-group">
          <label htmlFor="montant">Montant (FCFA)</label>
          <input
            id="montant"
            name="montant"
            type="number"
            placeholder="150000"
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
            required
            className="form-input"
            autoFocus
          />
        </div>
      </form>
        </Modal>
    );
}