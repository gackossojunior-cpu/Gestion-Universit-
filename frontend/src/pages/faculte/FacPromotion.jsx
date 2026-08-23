import { useEffect, useState } from 'react'
import Shell, { Alerts, useAlerts } from '../../shared/Shell'
import { navFaculte, FAC_ACCUEIL, FAC_LOGOUT } from '../../shared/nav-faculte'
import FilterBar from '../../shared/FilterBar'
import { apiGet, apiPost } from '../../shared/api'

export default function FacPromotion({ pageTitle, userLabel }) {
  const [filtres, setFiltres] = useState({ fac_id: null, sem: '', portail_id: null, filiere_id: null })
  const [facultes, setFacultes] = useState([])
  const [semestres, setSemestres] = useState([])
  const [etudiants, setEtudiants] = useState([])
  const [selection, setSelection] = useState(new Set())
  const [cible, setCible] = useState('')
  const { alerts, push, clear } = useAlerts()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const p = new URLSearchParams()
    if (filtres.fac_id) p.set('faculte', filtres.fac_id)
    if (filtres.sem) p.set('semestre', filtres.sem)
    if (filtres.portail_id) p.set('portail', filtres.portail_id)
    if (filtres.filiere_id) p.set('filiere', filtres.filiere_id)
    apiGet(`/api/faculte/promotion/?${p}`).then((d) => {
      setFacultes(d.facultes); setSemestres(d.semestres); setEtudiants(d.etudiants); setSelection(new Set())
    }).catch((e) => push(e.message, 'danger'))
  }, [filtres.fac_id, filtres.sem, filtres.portail_id, filtres.filiere_id])

  const toggleAll = (checked) => setSelection(checked ? new Set(etudiants.map((e) => e.id)) : new Set())
  const toggleOne = (id, checked) => setSelection((s) => { const n = new Set(s); checked ? n.add(id) : n.delete(id); return n })

  const appliquer = async () => {
    clear()
    if (selection.size === 0 || !cible) { push('Sélectionnez des étudiants et un semestre cible.', 'danger'); return }
    if (!window.confirm(`Confirmer le passage de ${selection.size} étudiant(s) en ${cible} ?`)) return
    setSaving(true)
    try {
      const res = await apiPost('/api/faculte/promotion/appliquer/', {
        etudiants_ids: Array.from(selection), nouveau_semestre: cible,
      })
      push(res.detail, 'success')
      setFiltres((f) => ({ ...f })) // recharge
    } catch (e) {
      push(e.message, 'danger')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Shell navSections={navFaculte('sec_promotion')}
      pageTitle={pageTitle} accueilHref={FAC_ACCUEIL} logoutHref={FAC_LOGOUT} userLabel={userLabel} userRole="Faculté">
      <Alerts items={alerts} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <p style={{ color: 'var(--ink-2)', fontSize: 13 }}>⚠️ Seuls les étudiants avec des résultats archivés peuvent être promus.</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href="/faculte/orientation-s3/" className="btn btn-outline">🎯 Orientation S3</a>
          <a href="/faculte/dashboard/" className="btn btn-outline">← Retour</a>
        </div>
      </div>

      <FilterBar facultes={facultes} semestres={semestres} value={filtres} onChange={(p) => setFiltres((f) => ({ ...f, ...p }))} />

      {etudiants.length > 0 ? (
        <div className="card">
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0f4f8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <span style={{ fontSize: 16 }}>{etudiants.length} étudiant(s) en {filtres.sem}</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <label className="fl" style={{ margin: 0 }}>Promouvoir vers :</label>
              <select className="form-select" style={{ width: 'auto' }} value={cible} onChange={(e) => setCible(e.target.value)}>
                <option value="">Cible…</option>
                {semestres.map((s) => <option key={s} value={s}>Semestre {s.slice(1)}</option>)}
              </select>
              <button className="btn btn-ink" onClick={appliquer} disabled={saving}>
                <i className="fas fa-level-up-alt" /> Appliquer
              </button>
            </div>
          </div>
          {filtres.sem === 'S2' && (
            <div className="alert alert-warning" style={{ margin: '12px 16px 0' }}>
              ⚠️ Pour le passage S2→S3, utilisez la <a href="/faculte/orientation-s3/">page Orientation S3</a> dédiée avec choix de filière.
            </div>
          )}
          <div style={{ overflowX: 'auto' }}>
            <table className="table table-hover" style={{ width: '100%' }}>
              <thead><tr>
                <th style={{ width: 38 }}><input type="checkbox" onChange={(e) => toggleAll(e.target.checked)} /></th>
                <th>Étudiant</th><th style={{ textAlign: 'center' }}>Semestre</th>
                <th style={{ textAlign: 'center' }}>Parcours</th><th style={{ textAlign: 'center' }}>Statut résultat</th>
              </tr></thead>
              <tbody>
                {etudiants.map((e) => (
                  <tr key={e.id}>
                    <td><input type="checkbox" checked={selection.has(e.id)} onChange={(ev) => toggleOne(e.id, ev.target.checked)} /></td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{e.nom.toUpperCase()} {e.prenom}</div>
                      <code style={{ fontSize: 10, color: 'var(--gold)' }}>{e.matricule}</code>
                    </td>
                    <td style={{ textAlign: 'center' }}><span className="b-sem">{e.semestre}</span></td>
                    <td style={{ textAlign: 'center' }}><small>{e.parcours}</small></td>
                    <td style={{ textAlign: 'center' }}>
                      {e.a_resultat ? <span style={{ color: '#27ae60', fontSize: 12 }}>✅ Résultats archivés</span> : <span style={{ color: '#e67e22', fontSize: 12 }}>⚠️ Non encore calculé</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : filtres.fac_id && filtres.sem ? (
        <div className="empty-box">📭 Aucun étudiant trouvé.</div>
      ) : (
        <div className="empty-box">🎓 Sélectionnez une <strong>faculté</strong> et un <strong>semestre</strong>.</div>
      )}
    </Shell>
  )
}
