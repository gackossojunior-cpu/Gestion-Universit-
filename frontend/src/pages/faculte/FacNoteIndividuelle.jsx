import { useEffect, useState } from 'react'
import Shell, { Alerts, useAlerts } from '../../shared/Shell'
import { navFaculte, FAC_ACCUEIL, FAC_LOGOUT } from '../../shared/nav-faculte'
import { apiGet, apiPost } from '../../shared/api'

export default function FacNoteIndividuelle({ pageTitle, userLabel, etudiantId }) {
  const [data, setData] = useState(null)
  const [valeurs, setValeurs] = useState({})
  const { alerts, push, clear } = useAlerts()
  const [saving, setSaving] = useState(false)

  const charger = () => {
    apiGet(`/api/faculte/note/${etudiantId}/`).then((d) => {
      setData(d)
      const init = {}
      d.notes.forEach((n) => { init[n.id] = { devoir: n.devoir, session: n.session, rattrapage: n.rattrapage ?? '', absent: n.absent } })
      setValeurs(init)
    }).catch((e) => push(e.message, 'danger'))
  }

  useEffect(charger, [etudiantId])

  const setCell = (noteId, field, val) => setValeurs((v) => ({ ...v, [noteId]: { ...v[noteId], [field]: val } }))

  const enregistrer = async () => {
    clear()
    setSaving(true)
    const lignes = Object.entries(valeurs).map(([noteId, v]) => ({
      note_id: Number(noteId),
      devoir: v.devoir === '' ? undefined : v.devoir,
      session: v.session === '' ? undefined : v.session,
      rattrapage: v.rattrapage === '' ? null : v.rattrapage,
      absent: !!v.absent,
    }))
    try {
      const res = await apiPost(`/api/faculte/note/${etudiantId}/`, { notes: lignes })
      push(`✅ ${res.detail}`, 'success')
      charger()
    } catch (e) {
      push(e.message, 'danger')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Shell navSections={navFaculte('fac_note_individuelle')}
      pageTitle={pageTitle} accueilHref={FAC_ACCUEIL} logoutHref={FAC_LOGOUT} userLabel={userLabel} userRole="Faculté">
      <Alerts items={alerts} />
      {!data ? <p>Chargement…</p> : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h5 style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 3 }}>{data.etudiant.nom.toUpperCase()} {data.etudiant.prenom}</h5>
              <code style={{ color: 'var(--primary)' }}>{data.etudiant.matricule}</code>
              <span className="b-sem" style={{ marginLeft: 8 }}>{data.etudiant.semestre}</span>
              <span style={{ marginLeft: 8, color: 'var(--ink-2)', fontSize: 13 }}>{data.etudiant.parcours} · {data.etudiant.cycle}</span>
            </div>
            <a href="/faculte/classe/" className="btn btn-outline">← Retour</a>
          </div>
          <div className="card">
            <div style={{ padding: '14px 20px', fontWeight: 700, color: 'var(--ink)' }}>✏️ {data.notes.length} matière(s) — modifier individuellement</div>
            <div style={{ overflowX: 'auto' }}>
              <table className="table table-hover" style={{ width: '100%' }}>
                <thead><tr>
                  <th>UE</th><th>Matière</th><th style={{ textAlign: 'center' }}>Crédits</th>
                  <th style={{ textAlign: 'center' }}>Devoir /20</th><th style={{ textAlign: 'center' }}>Session /20</th>
                  <th style={{ textAlign: 'center' }}>Rattrapage /20</th><th style={{ textAlign: 'center' }}>Absent</th>
                  <th style={{ textAlign: 'center' }}>Moy. actuelle</th>
                </tr></thead>
                <tbody>
                  {data.notes.map((n) => {
                    const v = valeurs[n.id] || {}
                    return (
                      <tr key={n.id}>
                        <td><code style={{ fontSize: 10, color: 'var(--primary)' }}>{n.ue_code}</code></td>
                        <td>{n.matiere_nom}</td>
                        <td style={{ textAlign: 'center' }}><span style={{ background: 'var(--ink)', color: '#fff', padding: '2px 7px', borderRadius: 4, fontSize: 11 }}>{n.credits}</span></td>
                        <td style={{ textAlign: 'center' }}><input type="number" step="0.01" min="0" max="20" className="form-control" style={{ width: 78, margin: 'auto', textAlign: 'center' }} value={v.devoir} onChange={(e) => setCell(n.id, 'devoir', e.target.value)} /></td>
                        <td style={{ textAlign: 'center' }}><input type="number" step="0.01" min="0" max="20" className="form-control" style={{ width: 78, margin: 'auto', textAlign: 'center' }} value={v.session} onChange={(e) => setCell(n.id, 'session', e.target.value)} /></td>
                        <td style={{ textAlign: 'center' }}><input type="number" step="0.01" min="0" max="20" className="form-control" style={{ width: 78, margin: 'auto', textAlign: 'center', borderColor: '#ffd166' }} value={v.rattrapage} onChange={(e) => setCell(n.id, 'rattrapage', e.target.value)} /></td>
                        <td style={{ textAlign: 'center' }}><input type="checkbox" checked={!!v.absent} onChange={(e) => setCell(n.id, 'absent', e.target.checked)} /></td>
                        <td style={{ textAlign: 'center' }}><span className={n.moyenne >= 10 ? 'mok' : 'mko'} style={{ fontSize: 14 }}>{n.moyenne.toFixed(2)}</span></td>
                      </tr>
                    )
                  })}
                  {data.notes.length === 0 && (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: 30, color: 'var(--ink-3)' }}>Aucune note enregistrée.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {data.notes.length > 0 && (
              <div style={{ textAlign: 'center', padding: 16, borderTop: '1px solid #f0f4f8' }}>
                <button className="btn btn-success" onClick={enregistrer} disabled={saving}>
                  <i className="fas fa-save" /> {saving ? 'Enregistrement…' : 'Mettre à jour'}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </Shell>
  )
}
