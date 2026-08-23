import { useState } from 'react'

/**
 * Shell commun aux 3 espaces (Étudiant / Faculté / Secrétariat) — même
 * identité visuelle, seul le rôle affiché en pastille change.
 *
 * navSections: [{ title, items: [{ href, icon, label, active }] }]
 */
export default function Shell({
  navSections,
  pageTitle,
  accueilHref,
  logoutHref,
  userLabel,
  userRole,
  children,
}) {
  return (
    <>
      <aside className="sidebar">

        {/* IDENTITÉ UCCB */}
        <div
          className="sb-brand"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center'
          }}
        >
          <div className="sb-mark">
            U
          </div>

          <div className="sb-name">
            UCCB
          </div>

          <span className="sb-role">
            {userRole}
          </span>
        </div>

        <nav className="sb-nav">
          {navSections.map((sec, i) => (
            <div key={i}>

              <div className="sb-sec">
                {sec.title}
              </div>

              {sec.items.map((it, j) => (
                <a
                  key={j}
                  href={it.href}
                  className={`nav-a ${
                    it.active ? 'on' : ''
                  }`}
                >
                  <span className="nav-ic">
                    <i className={it.icon} />
                  </span>

                  {it.label}
                </a>
              ))}

            </div>
          ))}
        </nav>

        <div className="sb-foot">
          <div className="u-row">

            <div className="u-av">
              {userLabel
                ? userLabel[0].toUpperCase()
                : '?'}
            </div>

            <div>
              <div className="u-name">
                {userLabel}
              </div>

              <div className="u-role">
                {userRole}
              </div>
            </div>

          </div>
        </div>

      </aside>

      <div className="main">

        <header className="topbar">

          <div className="tb-title">
            {pageTitle}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10
            }}
          >

            <a
              href={accueilHref}
              className="btn btn-outline"
            >
              <i className="fas fa-table-cells-large" />{' '}
              Accueil
            </a>

            <a
              href={logoutHref}
              className="btn btn-outline"
              style={{
                color: 'var(--danger)'
              }}
            >
              <i className="fas fa-arrow-right-from-bracket" />{' '}
              Déconnexion
            </a>

          </div>

        </header>

        <main className="content">
          {children}
        </main>

      </div>
    </>
  )
}

/** Petit composant d'alertes réutilisé sur toutes les pages. */
export function Alerts({ items }) {
  if (!items || items.length === 0) {
    return null
  }

  return (
    <>
      {items.map((a, i) => (
        <div
          key={i}
          className={`alert alert-${a.type || 'info'}`}
        >
          {a.text}
        </div>
      ))}
    </>
  )
}

/** Hook simple pour gérer une liste d'alertes locales (succès/erreur). */
export function useAlerts() {
  const [alerts, setAlerts] = useState([])

  const push = (
    text,
    type = 'info'
  ) => {
    setAlerts((cur) => [
      ...cur,
      {
        text,
        type
      }
    ])

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  const clear = () => setAlerts([])

  return {
    alerts,
    push,
    clear
  }
}