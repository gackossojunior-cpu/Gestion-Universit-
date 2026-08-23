import { useEffect, useState } from 'react'
import Shell, { Alerts } from '../../shared/Shell'
import { navSecretariat, SEC_ACCUEIL, SEC_LOGOUT } from '../../shared/nav-secretariat'
import { apiGet } from '../../shared/api'

export default function SecDashboard({ pageTitle, userLabel }) {
  const [data, setData] = useState(null)
  const [erreur, setErreur] = useState(null)

  useEffect(() => {
    apiGet('/api/secretariat/dashboard/').then(setData).catch((e) => setErreur(e.message))
  }, [])

  return (
    <Shell navSections={navSecretariat('sec_dashboard')}
      pageTitle={pageTitle} accueilHref={SEC_ACCUEIL} logoutHref={SEC_LOGOUT} userLabel={userLabel} userRole="Secrétariat">
      <Alerts items={erreur ? [{ text: erreur, type: 'danger' }] : []} />
      {!data ? <p>Chargement…</p> : (
        <>
          <div className="row-g">
            <div className="card scard col-flex" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 50, height: 50, borderRadius: 13, background: 'rgba(10,22,40,.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🎓</div>
              <div><div className="scard-lbl">Total Étudiants</div><div className="scard-val">{data.total}</div></div>
            </div>
            {data.par_faculte.map((f, i) => (
              <div className="card scard col-flex" key={i} style={{ borderLeftColor: 'var(--primary-600)', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 50, height: 50, borderRadius: 13, background: 'var(--primary-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ background: 'var(--ink)', color: 'var(--gold)', padding: '3px 8px', borderRadius: 5, fontSize: 13, fontWeight: 700 }}>{f.code}</span>
                </div>
                <div><div className="scard-lbl">{f.nom}</div><div className="scard-val" style={{ color: 'var(--primary-600)' }}>{f.nb}</div></div>
              </div>
            ))}
            <div className="card scard col-flex" style={{ borderLeftColor: 'var(--gold)', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 50, height: 50, borderRadius: 13, background: 'var(--gold-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>📅</div>
              <div><div className="scard-lbl">Année Académique Active</div><div style={{ fontSize: 18, fontWeight: 700, color: 'var(--gold)' }}>{data.annee_active || '—'}</div></div>
            </div>
          </div>

          <div className="card">
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0f4f8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 17, color: 'var(--ink)' }}>Derniers étudiants inscrits</span>
              <a href="/secretaire/etudiants/" className="btn btn-navy">Voir tout →</a>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="table table-hover" style={{ width: '100%' }}>
                <thead><tr>
                  <th style={{ textAlign: 'center' }}>Matricule</th><th style={{ textAlign: 'center' }}>Nom &amp; Prénom</th>
                  <th style={{ textAlign: 'center' }}>Genre</th><th style={{ textAlign: 'center' }}>Âge</th>
                  <th style={{ textAlign: 'center' }}>Nationalité</th><th style={{ textAlign: 'center' }}>Faculté</th>
                  <th style={{ textAlign: 'center' }}>Portail / Filière</th><th style={{ textAlign: 'center' }}>Semestre</th>
                  <th style={{ textAlign: 'center' }}>Statut</th><th style={{ textAlign: 'center' }}>Documents</th>
                </tr></thead>
                <tbody>
                  {data.recent.length === 0 && (
                    <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--ink-3)' }}>📭 Aucun étudiant enregistré.</td></tr>
                  )}
                  {data.recent.map((e) => (
                    <tr key={e.id}>
                      <td style={{ textAlign: 'center' }}><code style={{ color: 'var(--gold)' }}>{e.matricule}</code></td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 600 }}>{e.nom.toUpperCase()} {e.prenom}</div>
                        <small style={{ color: 'var(--ink-3)' }}>{e.email}</small>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{e.genre}</td>
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>{e.age}&nbsp;ans</td>
                      <td style={{ textAlign: 'center' }}><span style={{ fontSize: 10, border: '1px solid #e5e7eb', borderRadius: 4, padding: '1px 6px' }}>{e.nationalite}</span></td>
                      <td style={{ textAlign: 'center' }}><span style={{ background: 'var(--ink)', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>{e.faculte_code}</span></td>
                      <td style={{ textAlign: 'center' }}>
                        {e.semestre === 'S1' || e.semestre === 'S2'
                          ? <span style={{ color: 'var(--primary-600)', fontSize: 12, fontWeight: 600 }}>{e.portail_nom || '—'}</span>
                          : <span style={{ color: 'var(--gold-600)', fontSize: 12, fontWeight: 600 }}>{e.filiere_nom || '—'}</span>}
                      </td>
                      <td style={{ textAlign: 'center' }}><span className="b-sem">{e.semestre}</span></td>
                      <td style={{ textAlign: 'center' }}>
                        {e.statut === 'actif' && <span style={{ background: 'var(--success-tint)', color: 'var(--success)', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>Actif</span>}
                        {e.statut === 'diplome' && <span style={{ background: 'var(--primary-tint)', color: 'var(--primary-600)', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>Diplômé</span>}
                        {e.statut === 'abandonne' && <span style={{ background: 'var(--danger-tint)', color: 'var(--danger)', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>Abandonné</span>}
                      </td>
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <a href={`/attestation/${e.id}/`} target="_blank" rel="noreferrer" className="btn btn-outline" title="Attestation" style={{ marginRight: 4 }}>📜</a>
                        <a href={`/releve/${e.id}/`} target="_blank" rel="noreferrer" className="btn btn-outline" title="Relevé">📊</a>
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
