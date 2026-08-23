import { useEffect, useState } from 'react'
import Shell, { Alerts, useAlerts } from '../../shared/Shell'
import { navRh, RH_ACCUEIL, RH_LOGOUT } from '../../shared/nav-rh'
import { apiGet, apiPost } from '../../shared/api'

function fmtDate(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
function fmtMontant(v) {
  if (v === null || v === undefined) return '—'
  return Number(v).toLocaleString('fr-FR')
}

export default function RhEnseignants({ pageTitle, userLabel }) {
  const [filtres, setFiltres] = useState({ faculte: '', filiere: '', statut: '', actif: '', chef: '', q: '' })
  const [data, setData] = useState(null)
  const { alerts, push } = useAlerts()

  const charger = () => {
    const p = new URLSearchParams()
    if (filtres.faculte) p.set('faculte', filtres.faculte)
    if (filtres.filiere) p.set('filiere', filtres.filiere)
    if (filtres.statut) p.set('statut', filtres.statut)
    if (filtres.actif) p.set('actif', '1')
    if (filtres.chef) p.set('chef', '1')
    if (filtres.q) p.set('q', filtres.q)
    apiGet(`/api/rh/enseignants/?${p}`).then(setData).catch((e) => push(e.message, 'danger'))
  }

  useEffect(charger, [filtres.faculte, filtres.filiere, filtres.statut, filtres.actif, filtres.chef])

  const toggleActif = async (id, actif) => {
    try {
      await apiPost(`/api/rh/enseignants/${id}/statut/`, { actif: !actif })
      charger()
    } catch (e) {
      push(e.message, 'danger')
    }
  }

  const modifierVolume = async (affectationId, volumeActuel) => {
    const nouveau = window.prompt("Nouveau volume horaire (heures) :", volumeActuel)
    if (nouveau === null || nouveau.trim() === '') return
    const motif = window.prompt("Motif de la modification (ex: cours reporté, professeur malade…) :", "")
    try {
      const res = await apiPost(`/api/rh/affectations/${affectationId}/volume/`, {
        volume_horaire_prevu: nouveau, motif: motif || '',
      })
      push(`✅ ${res.detail}`, 'success')
      charger()
    } catch (e) {
      push(e.message, 'danger')
    }
  }

  const filieresFiltrees = (data?.filieres || []).filter((f) => !filtres.faculte || String(f.faculte_id) === String(filtres.faculte))

  return (
    <Shell navSections={navRh('rh_enseignants')} pageTitle={pageTitle}
      accueilHref={RH_ACCUEIL} logoutHref={RH_LOGOUT} userLabel={userLabel} userRole="Ressources Humaines">
      <Alerts items={alerts} />

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
          <div className="col-flex" style={{ display: 'flex', gap: 14, alignItems: 'center', paddingBottom: 9 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <input type="checkbox" checked={!!filtres.actif} onChange={(e) => setFiltres((f) => ({ ...f, actif: e.target.checked }))} /> Actifs uniquement
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <input type="checkbox" checked={!!filtres.chef} onChange={(e) => setFiltres((f) => ({ ...f, chef: e.target.checked }))} /> Chefs de département
            </label>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <a href="/rh/enseignants/ajouter/" className="btn btn-ac"><i className="fas fa-user-plus" /> Ajouter un enseignant</a>
      </div>

      <div className="card">
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700 }}>
          {data ? data.enseignants.length : '…'} enseignant(s) — année {data?.annee_active || 'en cours'}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table table-hover" style={{ width: '100%', minWidth: 1180 }}>
            <thead><tr>
              <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Matricule</th>
              <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Enseignant</th>
              <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Statut</th>
              <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Contrat</th>
              <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Affectations / Rattachement</th>
              <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Rémunération</th>
              <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Actif</th>
            </tr></thead>
            <tbody>
              {data && data.enseignants.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--ink-3)' }}>📭 Aucun enseignant trouvé. <a href="/rh/enseignants/ajouter/">Ajoutez-en un</a>.</td></tr>
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
                  <td style={{ textAlign: 'center', whiteSpace: 'nowrap', fontSize: 12 }}>
                    {fmtDate(e.date_debut_contrat)} → {e.date_fin_contrat ? fmtDate(e.date_fin_contrat) : 'CDI'}
                    {e.contrat_expire && <div className="b-ko" style={{ marginTop: 4, display: 'inline-block' }}>Contrat expiré</div>}
                  </td>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                    {e.statut === 'permanent' ? (
                      <>
                        <span className="b-chip">{e.faculte_code}</span>
                        <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 3 }}>{e.filiere_nom || '—'}</div>
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
                                <span style={{ fontWeight: 600 }}>{a.volume_horaire_prevu}h</span>
                                {a.volume_confirme_faculte
                                  ? <span className="b-ok">Confirmé</span>
                                  : <span style={{ color: 'var(--ink-3)' }}>En attente</span>}
                                <button className="btn btn-outline" style={{ padding: '1px 7px', fontSize: 10.5 }}
                                  onClick={() => modifierVolume(a.id, a.volume_horaire_prevu)}>
                                  <i className="fas fa-pen" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )
                    )}
                  </td>
                  <td style={{ textAlign: 'center', fontSize: 12.5 }}>
                    {e.statut === 'vacataire'
                      ? <>{fmtMontant(e.taux_horaire)} FCFA/h</>
                      : <>{fmtMontant(e.salaire_mensuel)} FCFA/mois</>}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button className={`btn ${e.actif ? 'btn-outline' : 'btn-ac'}`} style={{ padding: '4px 10px', fontSize: 11.5 }}
                      onClick={() => toggleActif(e.id, e.actif)}>
                      {e.actif ? 'Désactiver' : 'Activer'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  )
}
