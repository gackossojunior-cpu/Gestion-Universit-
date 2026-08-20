import { useState} from "react";
import { Modal } from '../ui/Modal';


export function TransactionForm({isOpen, onClose, onSubmit, initialData = null }) {
    const [formData, setFormData] = useState({
        text: '',
        amount: '',
    });

    const [error, setError] = useState('');
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevState => ({ ...prev, [name]: value }));
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
            setError('Le motant doit être un nombre non nul');
            return;
        }

        const submitData = {
            text: formData.text,
            amount: amount
        };

        onSubmit(submitData);
        setError({ text: '', amount: ''});
        onClose();
    };

    const isExpense = parseFloat(formData.amount) < 0;

    // Préremplir si édition
    if(initialData) {
        setFormData({
            text: initialData.text || '',
            amount: (initialData.amount || 0).toString()
        });
    }

    return (
        <Modal
            isOpen = {isOpen}
            onClose = {onClose}
            title = {initialData ? 'Modifier la transaction' : 'Nouvelle transaction'}
            subtile = {initialData ? 'Mettre à jour ce mouvement' : 'Enregistrer un mouvement financier'}
            footer = {
                <>
                    <button className="btn btn-secondary" onClick={onClose}>Annuler</button>
                    <button className="btn btn-primary" onClick={handleSubmit} disabled={!formData.text.trim()}>{initialData ? 'Mettre à jour' : 'Enregistrer'}</button>
                </>
            }
        >
            <form onSubmit={handleSubmit}>
                {error && (
                    <div className="alert alert-error mb-4">{error}</div>
                )}
                <div className="field-group">
                    <input
                        id="text"
                        name="text"
                        type="text"
                        placeholder="Ex: Salaire Juin"
                        value={formData.text}
                        onChange={handleChange}
                        required
                        autoFocus
                        className="form-input"
                    />
                </div>

                <div className="field-group">
                    <label htmlFor="amount">Montant (FCFA)</label>
                    <div className="amount-input-wrapper">
                        <input
                            id="amount"
                            name="amount"
                            type="number"
                            placeholder="Ex: -2000.00"
                            step="0.01"
                            value={formData.amount}
                            onChange={handleChange}
                            required
                            className={`form-input ${isExpense ? 'amount-negative' : ''}`}
                        />
                        <span className="amount-currency">FCFA</span>
                    </div>
                    <p className="field-hint">
                        {isExpense ? 'Utilisez un montant négatif pour une dépense (ex: -2000.00)' : 'Montant positif pour un revenu'}
                    </p>
                </div>
            </form>
        </Modal>
    );
}