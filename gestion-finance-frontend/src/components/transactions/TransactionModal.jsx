import { useState } from 'react' ;
import { Modal } from '../ui/Modal';
import {isNumber} from "chart.js/helpers";

export function TransactionModal({ isOpen, onClose, onSubmit}) {
    const [formData, setFormData] = useState({text: '', amount: ''});
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const {name, value} = e.target;
        setFormData(prev => ({...prev, [name]: value}));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        if (!formData.text.trim()) {
            setError('La description est requise');
            return;
        }

        const amount = parseFloat(formData.amount);
        if (isNaN(amount) || amount === 0) {
            setError('Le montant doit être un nombre différent de zéro');
            return;
        }

        onSubmit({ text: formData.text, amount });
        setFormData({ text: '', amount: ''});
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Nouvelle transaction"
            subtitle="Enregistrer un mouvement"
            footer={
                <>
                    <button className="btn btn-secondary" onClick={onClose}>Annuler</button>
                    <button className="btn btn-primary" onClick={handleSubmit}>Enregistrer</button>
                </>
            }
        >
          <form onSubmit={handleSubmit}>
        {error && <div className="alert alert-error mb-4">{error}</div>}

        <div className="field-group">
          <label htmlFor="text">Description</label>
          <input
            id="text"
            name="text"
            type="text"
            placeholder="Ex: Paiement scolarité - Jean Kouassi"
            value={formData.text}
            onChange={handleChange}
            required
            className="form-input"
            autoFocus
          />
        </div>

        <div className="field-group">
          <label htmlFor="amount">Montant (FCFA)</label>
          <input
            id="amount"
            name="amount"
            type="number"
            placeholder="50000"
            value={formData.amount}
            onChange={handleChange}
            required
            className="form-input"
          />
          <div className="field-hint">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            Utilisez un montant négatif pour une dépense (ex : -25000)
          </div>
        </div>
      </form>

        </Modal>
    )
};
