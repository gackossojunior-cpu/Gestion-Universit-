import { useEffect, useState } from 'react'
import Shell, { Alerts, useAlerts } from '../../shared/Shell'
import { navFaculte, FAC_ACCUEIL, FAC_LOGOUT } from '../../shared/nav-faculte'
import { apiGet, apiPost } from '../../shared/api'

export default function FacOrientationS3({ pageTitle, userLabel }) {
  const [etudiants, setEtudiants] = useState(null)
  const [choix, setChoix] = useState({}) // { etudiant_id: filiere_id }
  const { alerts, push, clear } = useAlerts()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    apiGet('/api/faculte/orientation-s3/').then((d) => setEtudiants(d.etudiants)).catch((e) => push(e.message, 'danger'))
  }, [])

  const valider = async () => {
    clear()
    const manquants = etudiants.filter((e) => !choix[e.id])
    if (manquants.length > 0) { push('Choisissez une filière pour chaque étudiant.', 'danger'); return }
    if (!window.confirm('Confirmer le passage en S3 ? Cette action est irréversible.')) return
    setSaving(true)
    try {
      const res = await apiPost('/api/faculte/orientation-s3/appliquer/', { filieres: choix })
      push(`✅ ${res.detail}`, 'success')
      apiGet('/api/faculte/orientation-s3/').then((d) => setEtudiants(d.etudiants))
    } catch (e) {
      push(e.message, 'danger')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Shell navSections={navFaculte('sec_orientation_s3')}
      pageTitle={pageTitle} accueilHref={FAC_ACCUEIL} logoutHref={FAC_LOGOUT} userLabel={userLabel} userRole="Faculté">
      <Alerts items={alerts} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <p style={{ color: 'var(--ink-2)', fontSize: 13 }}>Étudiants <strong>admis en S2</strong> — assignez leur filière de spécialisation.</p>
        <a href="/faculte/promotion/" className="btn btn-outline">← Passage Semestre</a>
      </div>

      {!etudiants ? null : etudiants.length > 0 ? (
        <div className="card">
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0f4f8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 16 }}>🎯 {etudiants.length} étudiant(s) éligible(s)</span>
            <span style={{ background: 'var(--gold)', color: '#fff', padding: '3px 14px', borderRadius: 20, fontSize: 11 }}>Admis S2</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table table-hover" style={{ width: '100%' }}>
              <thead><tr>
                <th>Étudiant</th><th style={{ textAlign: 'center' }}>Faculté</th>
                <th style={{ textAlign: 'center' }}>Portail actuel</th><th>Filière cible (S3)</th>
              </tr></thead>
              <tbody>
                {etudiants.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{e.nom.toUpperCase()} {e.prenom}</div>
                      <code style={{ fontSize: 10, color: 'var(--gold)' }}>{e.matricule}</code>
                    </td>
                    <td style={{ textAlign: 'center' }}><span style={{ background: 'var(--ink)', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>{e.faculte_code}</span></td>
                    <td style={{ textAlign: 'center' }}><span style={{ color: 'var(--primary-600)', fontWeight: 600 }}>🏫 {e.portail_nom || '—'}</span></td>
                    <td>
                      <select className="form-select" style={{ maxWidth: 320 }} value={choix[e.id] || ''} onChange={(ev) => setChoix((c) => ({ ...c, [e.id]: ev.target.value }))}>
                        <option value="">— Choisir la spécialité —</option>
                        {e.filieres_options.map((grp, i) => (
                          <optgroup key={i} label={`Via ${grp.portail_nom}`}>
                            {grp.filieres.map((f) => <option key={f.id} value={f.id}>{f.nom} ({f.code})</option>)}
                          </optgroup>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ textAlign: 'center', padding: 16, borderTop: '1px solid #f0f4f8' }}>
            <button className="btn btn-success" onClick={valider} disabled={saving} style={{ marginRight: 8 }}>
              ✅ {saving ? 'Validation…' : 'Valider le passage en S3'}
            </button>
            <a href="/faculte/dashboard/" className="btn btn-outline">Annuler</a>
          </div>
        </div>
      ) : (
        <div className="empty-box">
          🎓 Aucun étudiant admis en S2 pour l'instant.<br />
          <small>Calculez d'abord les résultats du S2 via la Délibération.</small>
        </div>
      )}
    </Shell>
  )
}
