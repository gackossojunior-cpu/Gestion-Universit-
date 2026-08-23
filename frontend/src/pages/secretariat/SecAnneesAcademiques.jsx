import { useEffect, useState } from 'react'
import Shell, { Alerts, useAlerts } from '../../shared/Shell'
import { navSecretariat, SEC_ACCUEIL, SEC_LOGOUT } from '../../shared/nav-secretariat'
import { apiGet, apiPost } from '../../shared/api'

export default function SecAnneesAcademiques({ pageTitle, userLabel }) {
  const [annees, setAnnees] = useState(null)
  const [nom, setNom] = useState('')
  const [activer, setActiver] = useState(false)
  const { alerts, push, clear } = useAlerts()

  const charger = () => apiGet('/api/secretariat/annees/').then((d) => setAnnees(d.annees)).catch((e) => push(e.message, 'danger'))
  useEffect(charger, [])

  const ajouter = async (e) => {
    e.preventDefault()
    clear()
    if (!/^\d{4}-\d{4}$/.test(nom)) { push("Format attendu : 2025-2026", 'danger'); return }
    try {
      const res = await apiPost('/api/secretariat/annees/', { action: 'ajouter', nom, activer })
      push(res.detail, 'success')
      setNom(''); setActiver(false)
      charger()
    } catch (err) { push(err.message, 'danger') }
  }

  const activerAnnee = async (id) => {
    try {
      const res = await apiPost('/api/secretariat/annees/', { action: 'activer', annee_id: id })
      push(res.detail, 'success')
      charger()
    } catch (err) { push(err.message, 'danger') }
  }

  return (
    <Shell navSections={navSecretariat('sec_annees_academiques')}
      pageTitle={pageTitle} accueilHref={SEC_ACCUEIL} logoutHref={SEC_LOGOUT} userLabel={userLabel} userRole="Secrétariat">
      <Alerts items={alerts} />
      <div className="row-g">
        <div className="col-flex" style={{ flexBasis: 340 }}>
          <div className="card" style={{ padding: 20 }}>
            <h6 style={{ fontWeight: 700, marginBottom: 14 }}>Ajouter une année</h6>
            <form onSubmit={ajouter}>
              <label className="fl">Nom (format : 2025-2026)</label>
              <input className="form-control" placeholder="2025-2026" required value={nom} onChange={(e) => setNom(e.target.value)} style={{ marginBottom: 12 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <input type="checkbox" checked={activer} onChange={(e) => setActiver(e.target.checked)} />
                <label>Définir comme année active</label>
              </div>
              <button type="submit" className="btn btn-navy" style={{ width: '100%' }}>Ajouter</button>
            </form>
          </div>
        </div>
        <div className="col-flex" style={{ flexBasis: 420, flexGrow: 2 }}>
          <div className="card">
            <div style={{ padding: '16px 20px 8px', fontWeight: 700 }}>Années enregistrées</div>
            <table className="table" style={{ width: '100%', fontSize: 13 }}>
              <thead><tr><th>Année</th><th style={{ textAlign: 'center' }}>Statut</th><th style={{ textAlign: 'center' }}>Action</th></tr></thead>
              <tbody>
                {annees && annees.length === 0 && (
                  <tr><td colSpan={3} style={{ textAlign: 'center', padding: 30, color: 'var(--ink-3)' }}>Aucune année enregistrée.</td></tr>
                )}
                {annees?.map((a) => (
                  <tr key={a.id}>
                    <td><strong>{a.nom}</strong></td>
                    <td style={{ textAlign: 'center' }}>
                      {a.est_active
                        ? <span style={{ background: 'var(--success-tint)', color: 'var(--success)', padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>Active</span>
                        : <span style={{ background: '#f3f4f6', color: '#6b7280', padding: '2px 10px', borderRadius: 10, fontSize: 11 }}>Inactive</span>}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {!a.est_active && <button className="btn btn-outline" style={{ color: 'var(--success)' }} onClick={() => activerAnnee(a.id)}>Activer</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Shell>
  )
}
