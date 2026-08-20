// src/components/layout/Sidebar.jsx
import { Link, useLocation } from 'react-router-dom';

export function Sidebar() {
  const location = useLocation();

  const menuItems = [
    { path: '/dashboard', label: 'Tableau de bord', icon: 'M3 3h7v7H3V3zm11 0h7v7h-7V3zm0 11h7v7h-7v-7zm-11 0h7v7H3v-7z' },
    { path: '/etudiants', label: 'Étudiants', icon: 'M22 10v6M2 10l10-5 10 5-10 5zM6 12v5c3 3 9 3 12 0v-5' },
    { path: '/transactions', label: 'Transactions', icon: 'M1 4h22v16H1V4zm0 7h22' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">U</div>
        <div>
          <div className="sidebar-logo-title">UCCB</div>
          <div className="sidebar-logo-sub">Gestion Finance</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={`sidebar-link ${location.pathname === item.path ? 'active' : ''}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={item.icon} />
            </svg>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="sidebar-user">
        <div className="sidebar-avatar">U</div>
        <div className="sidebar-username">Administrateur</div>
        <button
          className="sidebar-logout-btn"
          onClick={() => {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            window.location.href = '/login';
          }}
        >
          Déconnexion
        </button>
      </div>
    </aside>
  );
}