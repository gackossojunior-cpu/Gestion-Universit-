import { useEffect, useState, Fragment } from 'react'
import Shell, { Alerts, useAlerts } from '../../shared/Shell'
import { navFaculte, FAC_ACCUEIL, FAC_LOGOUT } from '../../shared/nav-faculte'
import FilterBar from '../../shared/FilterBar'
import { apiGet, apiPost } from '../../shared/api'

export default function FacSaisieNotes({ pageTitle, userLabel }) {
  const [filtres, setFiltres] = useState({ fac_id: null, sem: '', portail_id: null, filiere_id: null })
  const [ueId, setUeId] = useState(null)
  const [ues, setUes] = useState([])
  const [facultes, setFacultes] = useState([])
  const [semestres, setSemestres] = useState([])
  const [grille, setGrille] = useState(null) // { etudiants, matieres, notes }
  const [valeurs, setValeurs] = useState({}) // { "etuId_matId": {devoir, session, rattrapage, absent} }
  const { alerts, push, clear } = useAlerts()
  const [saving, setSaving] = useState(false)

  // Facultes/semestres via le dashboard (léger, déjà mis en cache par le navigateur)
  useEffect(() => {
    apiGet('/api/faculte/dashboard/').then((d) => { setFacultes(d.facultes); setSemestres(d.semestres) }).catch(() => {})
  }, [])

  // Charger la liste des UE dès que faculté+semestre(+portail/filiere) sont connus
  useEffect(() => {
    setUeId(null)
    if (!filtres.fac_id || !filtres.sem) { setUes([]); return }
    const p = new URLSearchParams({ faculte_id: filtres.fac_id, semestre: filtres.sem })
    if (filtres.sem === 'S1' || filtres.sem === 'S2') {
      if (filtres.portail_id) p.set('portail_id', filtres.portail_id)
    } else if (filtres.filiere_id) {
      p.set('filiere_id', filtres.filiere_id)
    }
    fetch(`/api/ues/?${p}`).then((r) => r.json()).then((d) => setUes(d.ues || []))
  }, [filtres.fac_id, filtres.sem, filtres.portail_id, filtres.filiere_id])

  // Charger la grille dès qu'une UE est choisie
  useEffect(() => {
    setGrille(null)
    if (!filtres.fac_id || !filtres.sem || !ueId) return
    const p = new URLSearchParams({ faculte: filtres.fac_id, semestre: filtres.sem, ue: ueId })
    if (filtres.portail_id) p.set('portail', filtres.portail_id)
    if (filtres.filiere_id) p.set('filiere', filtres.filiere_id)
    apiGet(`/api/faculte/saisie-notes/?${p}`).then((d) => {
      setGrille(d)
      const init = {}
      d.etudiants.forEach((e) => d.matieres.forEach((m) => {
        const key = `${e.id}_${m.id}`
        const n = d.notes[key]
        init[key] = n
          ? { devoir: n.devoir, session: n.session, rattrapage: n.rattrapage ?? '', absent: n.absent }
          : { devoir: '', session: '', rattrapage: '', absent: false }
      }))
      setValeurs(init)
    }).catch((e) => push(e.message, 'danger'))
  }, [ueId])

  const setCell = (etuId, matId, field, val) => {
    const key = `${etuId}_${matId}`
    setValeurs((v) => ({ ...v, [key]: { ...v[key], [field]: val } }))
  }

  const enregistrer = async () => {
    clear()
    setSaving(true)
    const lignes = []
    grille.etudiants.forEach((e) => grille.matieres.forEach((m) => {
      const key = `${e.id}_${m.id}`
      const v = valeurs[key] || {}
      lignes.push({
        etudiant_id: e.id, matiere_id: m.id,
        devoir: v.devoir === '' ? 0 : v.devoir, session: v.session === '' ? 0 : v.session,
        rattrapage: v.rattrapage === '' ? null : v.rattrapage, absent: !!v.absent,
      })
    }))
    try {
      const res = await apiPost('/api/faculte/saisie-notes/', {
        faculte: filtres.fac_id, semestre: filtres.sem, ue: ueId, notes: lignes,
      })
      push(`✅ ${res.detail}`, 'success')
    } catch (e) {
      push(e.message, 'danger')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Shell navSections={navFaculte('fac_saisie_notes')}
      pageTitle={pageTitle} accueilHref={FAC_ACCUEIL} logoutHref={FAC_LOGOUT} userLabel={userLabel} userRole="Faculté">
      <Alerts items={alerts} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <p style={{ color: 'var(--ink-2)', fontSize: 13 }}>Sélectionnez faculté, semestre et UE pour afficher la matrice.</p>
        <a href="/faculte/classe/" className="btn btn-outline">← Classe</a>
      </div>

      <FilterBar facultes={facultes} semestres={semestres} value={filtres} onChange={(p) => setFiltres((f) => ({ ...f, ...p }))}>
        <div className="col-flex">
          <label className="fl">Unité d'Enseignement</label>
          <select className="form-select" value={ueId || ''} onChange={(e) => setUeId(e.target.value ? Number(e.target.value) : null)}>
            <option value="">— Choisir l'UE —</option>
            {ues.map((u) => <option key={u.id} value={u.id}>[{u.code_ue}] {u.nom}</option>)}
          </select>
        </div>
      </FilterBar>

      {grille && grille.etudiants.length > 0 ? (
        <div className="card">
          <div style={{ padding: '10px 20px', borderBottom: '1px solid #f0f4f8', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>{grille.etudiants.length} étudiant(s) · {grille.matieres.length} matière(s)</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ fontSize: 12, borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr>
                  <th rowSpan={2} className="scol th0">NOM ET PRÉNOMS</th>
                  {grille.matieres.map((m) => (
                    <th key={m.id} colSpan={4} className="th0">{m.nom.toUpperCase()}<br /><span style={{ background: 'var(--primary)', color: '#fff', padding: '1px 5px', borderRadius: 3, fontSize: 9 }}>{m.credits}cr.</span></th>
                  ))}
                </tr>
                <tr className="th1">
                  {grille.matieres.map((m) => (
                    <Fragment key={m.id}>
                      <th>DEV.</th><th>SESS.</th>
                      <th style={{ color: '#b45309' }}>RATT.</th><th style={{ color: '#ef4444' }}>ABS</th>
                    </Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grille.etudiants.map((e) => (
                  <tr key={e.id}>
                    <td className="scol">
                      <div style={{ fontWeight: 600 }}>{e.nom.toUpperCase()}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-2)' }}>{e.prenom}</div>
                      <code style={{ fontSize: 9, color: 'var(--primary)' }}>{e.matricule}</code>
                    </td>
                    {grille.matieres.map((m) => {
                      const key = `${e.id}_${m.id}`
                      const v = valeurs[key] || {}
                      return (
                        <Fragment key={key}>
                          <td><input type="number" step="0.01" min="0" max="20" className="ni" value={v.devoir} onChange={(ev) => setCell(e.id, m.id, 'devoir', ev.target.value)} /></td>
                          <td><input type="number" step="0.01" min="0" max="20" className="ni" value={v.session} onChange={(ev) => setCell(e.id, m.id, 'session', ev.target.value)} /></td>
                          <td><input type="number" step="0.01" min="0" max="20" className="ni r" value={v.rattrapage} onChange={(ev) => setCell(e.id, m.id, 'rattrapage', ev.target.value)} /></td>
                          <td style={{ textAlign: 'center' }}><input type="checkbox" checked={!!v.absent} onChange={(ev) => setCell(e.id, m.id, 'absent', ev.target.checked)} /></td>
                        </Fragment>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ textAlign: 'center', padding: 16, borderTop: '1px solid #f0f4f8' }}>
            <button className="btn btn-success" onClick={enregistrer} disabled={saving}>
              <i className="fas fa-save" /> {saving ? 'Enregistrement…' : 'Enregistrer les notes'}
            </button>
          </div>
        </div>
      ) : filtres.fac_id && filtres.sem && !ueId ? (
        <div className="empty-box">📋 Sélectionnez une UE pour afficher.</div>
      ) : filtres.fac_id && filtres.sem ? null : (
        <div className="empty-box">🎯 Sélectionnez faculté, semestre et UE.</div>
      )}
    </Shell>
  )
}
