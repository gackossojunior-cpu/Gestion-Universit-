import { useEffect, useState } from 'react'
import Shell, { Alerts } from '../../shared/Shell'
import { navFaculte, FAC_ACCUEIL, FAC_LOGOUT } from '../../shared/nav-faculte'
import { apiGet } from '../../shared/api'

export default function FacDashboard({ pageTitle, userLabel }) {
  const [data, setData] = useState(null)
  const [erreur, setErreur] = useState(null)

  useEffect(() => {
    apiGet('/api/faculte/dashboard/').then(setData).catch((e) => setErreur(e.message))
  }, [])

  return (
    <Shell navSections={navFaculte('fac_dashboard')}
      pageTitle={pageTitle} accueilHref={FAC_ACCUEIL} logoutHref={FAC_LOGOUT} userLabel={userLabel} userRole="Faculté">
      <Alerts items={erreur ? [{ text: erreur, type: 'danger' }] : []} />
      {!data ? <p>Chargement…</p> : (
        <>
          <div className="row-g">
            <div className="card scard col-flex" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 50, height: 50, borderRadius: 13, background: 'rgba(15,32,39,.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🎓</div>
              <div>
                <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--ink-3)' }}>Total Étudiants</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--ink)' }}>{data.total}</div>
              </div>
            </div>
            {data.par_faculte.map((f, i) => (
              <div className="card scard col-flex" key={i} style={{ borderLeftColor: 'var(--primary-600)', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 50, height: 50, borderRadius: 13, background: 'var(--primary-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ background: 'var(--ink)', color: 'var(--primary)', padding: '3px 8px', borderRadius: 5, fontSize: 13, fontWeight: 700 }}>{f.code}</span>
                </div>
                <div>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--ink-3)' }}>{f.nom}</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--primary-600)' }}>{f.nb}</div>
                </div>
              </div>
            ))}
            <div className="card scard col-flex" style={{ borderLeftColor: 'var(--gold)', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 50, height: 50, borderRadius: 13, background: 'var(--gold-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>📅</div>
              <div>
                <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--ink-3)' }}>Année Académique Active</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--gold)' }}>{data.annee_active || '—'}</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0f4f8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>Derniers étudiants inscrits</span>
              <a href="/faculte/classe/" className="btn btn-ink">Voir une classe →</a>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="table table-hover" style={{ width: '100%' }}>
                <thead><tr>
                  <th style={{ textAlign: 'center' }}>Matricule</th><th style={{ textAlign: 'center' }}>Nom &amp; Prénom</th>
                  <th style={{ textAlign: 'center' }}>Genre</th><th style={{ textAlign: 'center' }}>Faculté</th>
                  <th style={{ textAlign: 'center' }}>Portail / Filière</th><th style={{ textAlign: 'center' }}>Semestre</th>
                  <th style={{ textAlign: 'center' }}>Statut</th>
                </tr></thead>
                <tbody>
                  {data.recent.length === 0 && (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--ink-3)' }}>📭 Aucun étudiant enregistré.</td></tr>
                  )}
                  {data.recent.map((e) => (
                    <tr key={e.id}>
                      <td style={{ textAlign: 'center' }}><code style={{ color: 'var(--primary)' }}>{e.matricule}</code></td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 600 }}>{e.nom.toUpperCase()} {e.prenom}</div>
                        <small style={{ color: 'var(--ink-3)' }}>{e.email}</small>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{e.genre}</td>
                      <td style={{ textAlign: 'center' }}><span style={{ background: 'var(--ink)', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>{e.faculte_code}</span></td>
                      <td style={{ textAlign: 'center' }}>
                        {e.semestre === 'S1' || e.semestre === 'S2'
                          ? <span style={{ color: 'var(--primary-600)', fontSize: 12, fontWeight: 600 }}>{e.portail_nom || '—'}</span>
                          : <span style={{ color: 'var(--gold-600)', fontSize: 12, fontWeight: 600 }}>{e.filiere_nom || '—'}</span>}
                      </td>
                      <td style={{ textAlign: 'center' }}><span className="b-sem">{e.semestre}</span></td>
                      <td style={{ textAlign: 'center' }}>
                        {e.statut === 'actif' && <span className="b-ok">Actif</span>}
                        {e.statut === 'diplome' && <span style={{ background: 'var(--primary-tint)', color: 'var(--primary-600)', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>Diplômé</span>}
                        {e.statut === 'abandonne' && <span className="b-ko">Abandonné</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </Shell>
  )
}
