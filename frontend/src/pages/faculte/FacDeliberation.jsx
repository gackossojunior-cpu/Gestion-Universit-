import { useEffect, useState, Fragment } from 'react'
import Shell, { Alerts, useAlerts } from '../../shared/Shell'
import { navFaculte, FAC_ACCUEIL, FAC_LOGOUT } from '../../shared/nav-faculte'
import FilterBar from '../../shared/FilterBar'
import { apiGet } from '../../shared/api'

export default function FacDeliberation({ pageTitle, userLabel }) {
  const [filtres, setFiltres] = useState({ fac_id: null, sem: '', portail_id: null, filiere_id: null })
  const [facultes, setFacultes] = useState([])
  const [semestres, setSemestres] = useState([])
  const [data, setData] = useState(null)
  const { alerts, push, clear } = useAlerts()

  useEffect(() => {
    apiGet('/api/faculte/dashboard/').then((d) => { setFacultes(d.facultes); setSemestres(d.semestres) }).catch(() => {})
  }, [])

  const charger = (save) => {
    if (!filtres.fac_id || !filtres.sem) { setData(null); return }
    const p = new URLSearchParams({ faculte: filtres.fac_id, semestre: filtres.sem })
    if (filtres.portail_id) p.set('portail', filtres.portail_id)
    if (filtres.filiere_id) p.set('filiere', filtres.filiere_id)
    if (save) p.set('save', '1')
    apiGet(`/api/faculte/deliberation/?${p}`).then((d) => {
      setData(d)
      if (save) {
        clear()
        push(d.structure.length ? `✅ Résultats de ${filtres.sem} calculés et archivés.` : 'Aucun étudiant trouvé.', d.structure.length ? 'success' : 'warning')
      }
    }).catch((e) => push(e.message, 'danger'))
  }

  useEffect(() => { charger(false) }, [filtres.fac_id, filtres.sem, filtres.portail_id, filtres.filiere_id])

  return (
    <Shell navSections={navFaculte('fac_deliberation')}
      pageTitle={pageTitle} accueilHref={FAC_ACCUEIL} logoutHref={FAC_LOGOUT} userLabel={userLabel} userRole="Faculté">
      <Alerts items={alerts} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <p style={{ color: 'var(--ink-2)', fontSize: 13 }}>Calculez les moyennes. "Archiver" sauvegarde pour le passage de semestre.</p>
        <a href="/faculte/classe/" className="btn btn-outline">← Classe</a>
      </div>

      <FilterBar facultes={facultes} semestres={semestres} value={filtres} onChange={(p) => setFiltres((f) => ({ ...f, ...p }))}>
        <div className="col-flex" style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-success" style={{ flex: 1 }} onClick={() => charger(true)}>Calculer &amp; Archiver</button>
          {data && data.structure.length > 0 && (
            <a href={`/faculte/matrice-a3/?faculte=${filtres.fac_id}&semestre=${filtres.sem}`} target="_blank" rel="noreferrer" className="btn btn-danger" title="PDF">
              <i className="fas fa-file-pdf" />
            </a>
          )}
        </div>
      </FilterBar>

      {data && data.structure.length > 0 ? (
        <div className="card">
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ fontSize: 11, borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr>
                  <th rowSpan={3} className="th0 scol" style={{ width: 30 }}>Rang</th>
                  <th rowSpan={3} className="th0 scol" style={{ minWidth: 170 }}>NOM ET PRÉNOMS</th>
                  {data.unites.map((ue, i) => (
                    <th key={i} colSpan={ue.matieres.length + 2} className="th-ue">{ue.nom.slice(0, 22)}<br /><span style={{ fontSize: '7.5px', opacity: .8 }}>{ue.credits_total} cr.</span></th>
                  ))}
                  <th rowSpan={3} className="th0" style={{ width: 55 }}>MOY.<br />GÉN.</th>
                  <th rowSpan={3} className="th0" style={{ width: 50 }}>CRÉDITS</th>
                  <th rowSpan={3} className="th0" style={{ width: 70 }}>DÉCISION</th>
                  <th rowSpan={3} className="th0" style={{ width: 65 }}>MENTION</th>
                </tr>
                <tr>
                  {data.unites.map((ue, i) => (
                    <Fragment key={i}>
                      {ue.matieres.map((m, j) => (
                        <th key={j} className="th-sub" style={{ minWidth: 45 }}>{m.nom.slice(0, 12)}<br /><span style={{ fontSize: '6.5px', opacity: .85 }}>{m.credits} cr.</span></th>
                      ))}
                      <th className="th-sub" style={{ minWidth: 42 }}>M.UE</th>
                      <th className="th-sub" style={{ minWidth: 28 }}>CR.</th>
                    </Fragment>
                  ))}
                </tr>
                <tr>
                  {data.unites.map((ue, i) => (
                    <Fragment key={i}>
                      {ue.matieres.map((_, j) => <th key={j} className="th-mat">/20</th>)}
                      <th className="th-mat">/20</th>
                      <th className="th-mat">V.</th>
                    </Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.structure.map((l, i) => (
                  <tr key={i} style={l.decision === 'ADMIS' ? { background: '#f0fdf4' } : {}}>
                    <td className="scol" style={{ fontWeight: 700 }}>{l.rang}</td>
                    <td className="scol">
                      <div style={{ fontWeight: 600, fontSize: '11.5px' }}>{l.etudiant.nom.toUpperCase()} {l.etudiant.prenom}</div>
                      <code style={{ fontSize: 9, color: 'var(--primary)' }}>{l.etudiant.matricule}</code>
                    </td>
                    {l.ues_detail.map((ue, j) => (
                      <Fragment key={j}>
                        {ue.matieres.map((m, k) => (
                          <td key={k} style={{ textAlign: 'center', fontSize: '10.5px', fontWeight: 600, color: m.non_saisi || m.is_absent ? '#aaa' : m.note_calculee < 6 ? 'var(--danger)' : '#000' }}>
                            {m.non_saisi ? '—' : m.is_absent ? 'ABS' : m.note_calculee.toFixed(2)}
                          </td>
                        ))}
                        <td style={{ textAlign: 'center', background: ue.moyenne_ue >= 10 ? '#f0fdf4' : '#fff8f8' }}>
                          <span className={ue.moyenne_ue >= 10 ? 'mok' : ue.moyenne_ue >= 6 ? 'mmid' : 'mko'}>{ue.moyenne_ue.toFixed(2)}</span>
                        </td>
                        <td style={{ textAlign: 'center', fontSize: 10 }}>{ue.est_validee ? <span style={{ color: 'var(--success)', fontWeight: 700 }}>V</span> : '—'}</td>
                      </Fragment>
                    ))}
                    <td style={{ textAlign: 'center' }}><span className={l.moyenne_semestre >= 10 ? 'mok' : 'mko'} style={{ fontSize: 13 }}>{l.moyenne_semestre.toFixed(2)}</span></td>
                    <td style={{ textAlign: 'center' }}>{l.total_credits_valides}/{l.total_credits_semestre}</td>
                    <td style={{ textAlign: 'center' }}>{l.decision === 'ADMIS' ? <span className="b-ok">ADMIS</span> : <span className="b-ko">AJOURNÉ</span>}</td>
                    <td style={{ textAlign: 'center', fontSize: 10, color: '#555' }}>{l.mention && l.mention !== 'NEANT' && l.mention !== 'NÉANT' ? l.mention : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : filtres.fac_id && filtres.sem ? (
        <div className="empty-box">Aucun étudiant trouvé.</div>
      ) : (
        <div className="empty-box">Sélectionnez une <strong>faculté</strong> et un <strong>semestre</strong>.</div>
      )}
    </Shell>
  )
}
