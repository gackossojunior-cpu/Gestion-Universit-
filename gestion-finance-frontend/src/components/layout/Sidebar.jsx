import { Link, useLocation } from 'react-router-dom';

export function Sidebar({ onNavigate }) {
  const location = useLocation();

  const menuItems = [
    { path: '/dashboard', label: 'Tableau de bord', icon: 'M3 3h7v7H3V3zm11 0h7v7h-7V3zm0 11h7v7h-7v-7zm-11 0h7v7H3v-7z' },
    { path: '/etudiants', label: 'Étudiants', icon: 'M22 10v6M2 10l10-5 10 5-10 5zM6 12v5c3 3 9 3 12 0v-5' },
    { path: '/enseignants', label: 'Enseignants', icon: 'M22 10v6M2 10l10-5 10 5-10 5z' },
    { path: '/personnel', label: 'Personnel', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
    { path: '/transactions', label: 'Transactions', icon: 'M1 4h22v16H1V4zm0 7h22' },
    { path: '/transports', label: 'Transports', icon: 'M3 3h15v13H3V3zm15 5h4l3 5v3h-7V8zM5.5 18.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zm13 0a2.5 2.5 0 100-5 2.5 2.5 0 000 5z' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/finance/login';
  };

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
            onClick={onNavigate}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={item.icon} />
            </svg>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="sidebar-user">
        <div className="sidebar-user-info">
          <div className="sidebar-avatar">U</div>
          <div className="sidebar-username">Administrateur</div>
        </div>
        <button className="sidebar-logout-btn" onClick={handleLogout}>
          Déconnexion
        </button>
      </div>
    </aside>
  );
}