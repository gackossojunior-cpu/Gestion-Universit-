import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { useBuses } from '../../hooks/useBuses';

const TYPES = [
  { value: 'carburant', label: 'Carburant' },
  { value: 'entretien', label: 'Entretien' },
  { value: 'reparation', label: 'Réparation' },
];

export function DepenseTransportModal({ isOpen, onClose, onSubmit }) {
  const { buses, loading: loadingBuses } = useBuses();
  const [formData, setFormData] = useState({
    bus: '',
    type_depense: TYPES[0].value,
    montant: '',
    description: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setFormData({ bus: '', type_depense: TYPES[0].value, montant: '', description: '' });
      setError('');
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!formData.bus) {
      setError('Sélectionnez un véhicule');
      return;
    }

    const montant = parseFloat(formData.montant);
    if (isNaN(montant) || montant <= 0) {
      setError('Le montant doit être un nombre positif');
      return;
    }

    onSubmit({ ...formData, montant });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nouvelle dépense"
      subtitle="Enregistrer une dépense de transport"
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
          <label htmlFor="bus">Véhicule</label>
          <select
            id="bus"
            name="bus"
            value={formData.bus}
            onChange={handleChange}
            required
            className="form-input"
            disabled={loadingBuses}
          >
            <option value="">— Sélectionner un véhicule —</option>
            {buses.map(b => (
              <option key={b.id} value={b.id}>{b.numero} — {b.plaque}</option>
            ))}
          </select>
          {loadingBuses && <div className="field-hint">Chargement des véhicules…</div>}
          {!loadingBuses && buses.length === 0 && (
            <div className="field-hint">Aucun véhicule enregistré pour le moment.</div>
          )}
        </div>

        <div className="field-group">
          <label htmlFor="type_depense">Type</label>
          <select
            id="type_depense"
            name="type_depense"
            value={formData.type_depense}
            onChange={handleChange}
            className="form-input"
          >
            {TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div className="field-group">
          <label htmlFor="montant">Montant (FCFA)</label>
          <input
            id="montant"
            name="montant"
            type="number"
            placeholder="0"
            step="0.01"
            value={formData.montant}
            onChange={handleChange}
            required
            className="form-input"
          />
        </div>

        <div className="field-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            placeholder="Notes optionnelles…"
            value={formData.description}
            onChange={handleChange}
            className="form-input"
            rows={3}
          />
        </div>
      </form>
    </Modal>
  );
}