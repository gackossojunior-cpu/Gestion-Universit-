import { useEffect, useState } from 'react'
import Shell, { Alerts, useAlerts } from '../../shared/Shell'
import { navSecretariat, SEC_ACCUEIL, SEC_LOGOUT } from '../../shared/nav-secretariat'
import { apiGet, apiPost } from '../../shared/api'

export default function SecFacultes({ pageTitle, userLabel }) {
  const [facultes, setFacultes] = useState(null)
  const [nom, setNom] = useState('')
  const [code, setCode] = useState('')
  const { alerts, push, clear } = useAlerts()

  const charger = () => apiGet('/api/secretariat/facultes/').then((d) => setFacultes(d.facultes)).catch((e) => push(e.message, 'danger'))
  useEffect(charger, [])

  const ajouter = async (e) => {
    e.preventDefault()
    clear()
    try {
      const res = await apiPost('/api/secretariat/facultes/', { nom, code })
      push(res.detail, 'success')
      setNom(''); setCode('')
      charger()
    } catch (err) { push(err.message, 'danger') }
  }

  return (
    <Shell navSections={navSecretariat('sec_facultes')}
      pageTitle={pageTitle} accueilHref={SEC_ACCUEIL} logoutHref={SEC_LOGOUT} userLabel={userLabel} userRole="Secrétariat">
      <Alerts items={alerts} />
      <div className="row-g">
        <div className="col-flex" style={{ flexBasis: 300 }}>
          <div className="card" style={{ padding: 20 }}>
            <h6 style={{ fontWeight: 700, marginBottom: 14 }}>Ajouter une faculté</h6>
            <form onSubmit={ajouter}>
              <label className="fl">Nom complet</label>
              <input className="form-control" required placeholder="Faculté de Sciences et Technologies" value={nom} onChange={(e) => setNom(e.target.value)} style={{ marginBottom: 12 }} />
              <label className="fl">Code (ex: FST)</label>
              <input className="form-control" required maxLength={10} placeholder="FST" value={code} onChange={(e) => setCode(e.target.value)} style={{ marginBottom: 14 }} />
              <button type="submit" className="btn btn-navy" style={{ width: '100%' }}>Ajouter</button>
            </form>
          </div>
        </div>
        <div className="col-flex" style={{ flexBasis: 500, flexGrow: 2 }}>
          <div className="card">
            <div style={{ padding: '16px 20px 8px', fontWeight: 700 }}>Facultés enregistrées</div>
            <table className="table" style={{ width: '100%', fontSize: 13 }}>
              <thead><tr><th>Code</th><th>Nom</th><th style={{ textAlign: 'center' }}>Étudiants</th></tr></thead>
              <tbody>
                {facultes && facultes.length === 0 && (
                  <tr><td colSpan={3} style={{ textAlign: 'center', padding: 30, color: 'var(--ink-3)' }}>Aucune faculté enregistrée.</td></tr>
                )}
                {facultes?.map((f) => (
                  <tr key={f.id}>
                    <td><span style={{ background: 'var(--ink)', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 700 }}>{f.code}</span></td>
                    <td>{f.nom}</td>
                    <td style={{ textAlign: 'center' }}>{f.nb_etudiants}</td>
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
