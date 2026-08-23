import { useEffect, useState } from 'react'
import Shell, { Alerts, useAlerts } from '../../shared/Shell'
import { navFaculte, FAC_ACCUEIL, FAC_LOGOUT } from '../../shared/nav-faculte'
import { apiGet, apiPost } from '../../shared/api'

export default function FacEnseignants({ pageTitle, userLabel }) {
  const [filtres, setFiltres] = useState({ faculte: '', filiere: '', statut: '', q: '' })
  const [data, setData] = useState(null)
  const { alerts, push } = useAlerts()

  const charger = () => {
    const p = new URLSearchParams()
    if (filtres.faculte) p.set('faculte', filtres.faculte)
    if (filtres.filiere) p.set('filiere', filtres.filiere)
    if (filtres.statut) p.set('statut', filtres.statut)
    if (filtres.q) p.set('q', filtres.q)
    apiGet(`/api/faculte/enseignants/?${p}`).then(setData).catch((e) => push(e.message, 'danger'))
  }

  useEffect(charger, [filtres.faculte, filtres.filiere, filtres.statut])

  const confirmerVolume = async (affectationId, confirmeActuel) => {
    try {
      const res = await apiPost(`/api/faculte/affectations/${affectationId}/confirmer/`, { confirme: !confirmeActuel })
      push(`✅ ${res.detail}`, 'success')
      charger()
    } catch (e) {
      push(e.message, 'danger')
    }
  }

  const filieresFiltrees = (data?.filieres || []).filter((f) => !filtres.faculte || String(f.faculte_id) === String(filtres.faculte))

  return (
    <Shell navSections={navFaculte('fac_enseignants')} pageTitle={pageTitle}
      accueilHref={FAC_ACCUEIL} logoutHref={FAC_LOGOUT} userLabel={userLabel} userRole="Faculté">
      <Alerts items={alerts} />
      <div className="alert alert-info" style={{ marginBottom: 16 }}>
        <i className="fas fa-circle-info" /> Les enseignants sont enregistrés par la RH. La Faculté consulte la liste et
        confirme le volume horaire réalisé par les vacataires en fin de semestre — cette confirmation est ce qui permet ensuite à la Finance de payer.
      </div>

      <div className="card" style={{ padding: 14, marginBottom: 20 }}>
        <div className="row-g" style={{ alignItems: 'flex-end', marginBottom: 0 }}>
          <div className="col-flex">
            <label className="fl">Faculté</label>
            <select className="form-select" value={filtres.faculte} onChange={(e) => setFiltres((f) => ({ ...f, faculte: e.target.value, filiere: '' }))}>
              <option value="">Toutes</option>
              {(data?.facultes || []).map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
            </select>
          </div>
          <div className="col-flex">
            <label className="fl">Département (filière)</label>
            <select className="form-select" value={filtres.filiere} onChange={(e) => setFiltres((f) => ({ ...f, filiere: e.target.value }))}>
              <option value="">Tous</option>
              {filieresFiltrees.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
            </select>
          </div>
          <div className="col-flex">
            <label className="fl">Statut</label>
            <select className="form-select" value={filtres.statut} onChange={(e) => setFiltres((f) => ({ ...f, statut: e.target.value }))}>
              <option value="">Tous</option>
              <option value="vacataire">Vacataire</option>
              <option value="permanent">Permanent</option>
            </select>
          </div>
          <div className="col-flex">
            <label className="fl">Recherche</label>
            <div style={{ display: 'flex' }}>
              <input type="text" className="form-control" placeholder="Nom, matricule…" value={filtres.q}
                onChange={(e) => setFiltres((f) => ({ ...f, q: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && charger()} />
              <button className="btn btn-ink" style={{ marginLeft: 6 }} onClick={charger}>🔍</button>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700 }}>
          {data ? data.enseignants.length : '…'} enseignant(s)
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table table-hover" style={{ width: '100%', minWidth: 900 }}>
            <thead><tr>
              <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Matricule</th>
              <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Enseignant</th>
              <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Statut</th>
              <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Rattachement / Affectations</th>
              <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Diplôme</th>
            </tr></thead>
            <tbody>
              {data && data.enseignants.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--ink-3)' }}>📭 Aucun enseignant trouvé.</td></tr>
              )}
              {data?.enseignants.map((e) => (
                <tr key={e.id}>
                  <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}><code className="mono" style={{ color: 'var(--primary)' }}>{e.matricule}</code></td>
                  <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <div style={{ fontWeight: 600 }}>{e.nom.toUpperCase()} {e.prenom}</div>
                    <small style={{ color: 'var(--ink-3)' }}>{e.email}</small>
                    {e.chef_departement && <span className="b-tag-gold" style={{ marginLeft: 6 }}>Chef dépt.</span>}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {e.statut === 'permanent' ? <span className="b-tag-primary">Permanent</span> : <span className="b-tag-gold">Vacataire</span>}
                  </td>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                    {e.statut === 'permanent' ? (
                      <>
                        <span className="b-chip">{e.faculte_code}</span>
                        <span style={{ marginLeft: 6, fontSize: 12.5 }}>{e.filiere_nom || '—'}</span>
                      </>
                    ) : (
                      e.affectations.length === 0
                        ? <span style={{ color: 'var(--ink-3)', fontSize: 12 }}>Aucune affectation</span>
                        : (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                            {e.affectations.map((a) => (
                              <div key={a.id} style={{ fontSize: 11.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                                <span className="b-chip">{a.faculte_code}</span>
                                <span>{a.filiere_nom || a.portail_nom || 'toute la faculté'}</span>
                                <span className="b-sem">{a.semestre}</span>
                                <span style={{ fontWeight: 600 }}>{a.volume_horaire_prevu}h prévues</span>
                                <button
                                  className={`btn ${a.volume_confirme_faculte ? 'btn-outline' : 'btn-ac'}`}
                                  style={{ padding: '2px 9px', fontSize: 10.5 }}
                                  onClick={() => confirmerVolume(a.id, a.volume_confirme_faculte)}>
                                  {a.volume_confirme_faculte ? <><i className="fas fa-check" /> Confirmé</> : 'Confirmer le volume'}
                                </button>
                              </div>
                            ))}
                          </div>
                        )
                    )}
                  </td>
                  <td style={{ textAlign: 'center', whiteSpace: 'nowrap', fontSize: 12.5 }}>{e.diplome || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  )
}
