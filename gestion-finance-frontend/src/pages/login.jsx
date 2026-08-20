// src/pages/Login.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';
import { saveAuthTokens } from '../utils/authUtils';

export default LoginPage;
export function LoginPage() {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const tokens = await authApi.login(formData.username, formData.password);

      if (tokens) {
        saveAuthTokens(tokens);
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Erreur de connexion:', err);
      setError(
        err.response?.data?.detail ||
        err.message ||
        'Nom d\'utilisateur ou mot de passe incorrect'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-logo">
          <div className="login-logo-icon">U</div>
          <div className="login-logo-text">UCCB</div>
          <div className="login-logo-sub">Gestion Finance</div>
        </div>

        <h1 className="login-title">Espace Finance</h1>
        <p className="login-subtitle">Connectez-vous pour accéder au tableau de bord</p>

        {error && (
          <div className="alert alert-error mb-4">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="field-group">
            <label htmlFor="username">Nom d'utilisateur</label>
            <input
              id="username"
              name="username"
              type="text"
              placeholder="Votre nom d'utilisateur"
              value={formData.username}
              onChange={handleChange}
              required
              autoFocus
              className="form-input"
              disabled={loading}
            />
          </div>

          <div className="field-group">
            <label htmlFor="password">Mot de passe</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Votre mot de passe"
              value={formData.password}
              onChange={handleChange}
              required
              className="form-input"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '16px' }}
            disabled={loading || !formData.username || !formData.password}
          >
            {loading ? (
              <>
                <div className="spinner" style={{ width: '16px', height: '16px', border: '2px solid #fff', borderTopColor: 'transparent' }}></div>
                Connexion...
              </>
            ) : (
              <>
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/>
                </svg>
                Se connecter
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <p className="text-slate" style={{ fontSize: '12px' }}>
            Université Catholique du Congo-Brazzaville
            <br />
            Arrêté N°9554/MESRSIT/CAB du 21/09/2020
          </p>
        </div>
      </div>
    </div>
  );
}