import { useEffect, useMemo, useState } from 'react'
import Shell, { Alerts, useAlerts } from '../../shared/Shell'
import { navRh, RH_ACCUEIL, RH_LOGOUT } from '../../shared/nav-rh'
import { apiGet, apiPost } from '../../shared/api'

const SEMESTRES_LIST = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6']

const VIDE = {
  nom: '', prenom: '', genre: '', date_naissance: '', lieu_naissance: '', nationalite: 'Congolaise',
  email: '', telephone: '', adresse: '', rib: '', numero_secu: '', diplome: '',
  annee_academique: '', chef_departement: false,
  statut: '', date_debut_contrat: '', date_fin_contrat: '', taux_horaire: '', salaire_mensuel: '',
  // Permanent uniquement :
  faculte: '', filiere: '',
}
const AFFECTATION_VIDE = { faculte: '', portee: 'faculte', portail: '', filiere: '', semestre: '', volume_horaire_prevu: '' }

export default function RhAjouterEnseignant({ pageTitle, userLabel }) {
  const [meta, setMeta] = useState(null)
  const [form, setForm] = useState(VIDE)
  const [affectations, setAffectations] = useState([{ ...AFFECTATION_VIDE }])
  const { alerts, push, clear } = useAlerts()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    apiGet('/api/rh/enseignants/ajouter/').then(setMeta).catch((e) => push(e.message, 'danger'))
  }, [])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const estVacataire = form.statut === 'vacataire'
  const estPermanent = form.statut === 'permanent'

  const filieresPour = (facId) => (meta?.filieres || []).filter((f) => !facId || String(f.faculte_id) === String(facId))
  const portailsPour = (facId) => (meta?.portails || []).filter((p) => !facId || String(p.faculte_id) === String(facId))

  const setAffectation = (i, k, v) => {
    setAffectations((list) => list.map((a, idx) => {
      if (idx !== i) return a
      const next = { ...a, [k]: v }
      if (k === 'faculte') { next.portail = ''; next.filiere = '' }
      if (k === 'portee') { next.portail = ''; next.filiere = '' }
      // Un portail n'existe qu'en S1-S2, une filière qu'à partir de S3 —
      // si le semestre change et rend le choix de portée invalide, on
      // le réinitialise plutôt que de laisser une combinaison incohérente.
      if (k === 'semestre') {
        const semNum = v ? parseInt(v.replace('S', ''), 10) : 0
        const estPortailPhase = semNum > 0 && semNum <= 2
        if (next.portee === 'portail' && !estPortailPhase) { next.portee = 'faculte'; next.portail = '' }
        if (next.portee === 'filiere' && estPortailPhase) { next.portee = 'faculte'; next.filiere = '' }
      }
      return next
    }))
  }
  const optionsPortee = (semestre) => {
    const semNum = semestre ? parseInt(semestre.replace('S', ''), 10) : 0
    if (semNum > 0 && semNum <= 2) return ['faculte', 'portail']
    if (semNum > 2) return ['faculte', 'filiere']
    return ['faculte', 'portail', 'filiere'] // semestre pas encore choisi : tout proposer
  }
  const ajouterAffectation = () => setAffectations((list) => [...list, { ...AFFECTATION_VIDE }])
  const retirerAffectation = (i) => setAffectations((list) => list.filter((_, idx) => idx !== i))

  const soumettre = async (e) => {
    e.preventDefault()
    clear()
    setSaving(true)
    try {
      const payload = { ...form }
      if (estVacataire) {
        payload.affectations = affectations
          .filter((a) => a.faculte && a.semestre && a.volume_horaire_prevu)
          .map(({ portee, ...rest }) => rest) // "portee" est un helper d'affichage, pas envoyé au serveur
        delete payload.faculte
        delete payload.filiere
      }
      const res = await apiPost('/api/rh/enseignants/ajouter/', payload)
      push(`✅ ${res.detail}`, 'success')
      setForm(VIDE)
      setAffectations([{ ...AFFECTATION_VIDE }])
    } catch (err) {
      push(err.message, 'danger')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Shell navSections={navRh('rh_enseignants')} pageTitle={pageTitle}
      accueilHref={RH_ACCUEIL} logoutHref={RH_LOGOUT} userLabel={userLabel} userRole="Ressources Humaines">
      <Alerts items={alerts} />
      {!meta ? <p style={{ color: 'var(--ink-3)' }}>Chargement…</p> : (
        <div className="card" style={{ padding: 24, maxWidth: 880 }}>
          <form onSubmit={soumettre} className="row-g" style={{ marginBottom: 0 }}>

            {/* ── IDENTITÉ ── */}
            <div style={{ flexBasis: '100%' }}><h6 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>Identité</h6></div>
            <div className="col-flex"><label className="fl">Nom *</label>
              <input className="form-control" required placeholder="NOM" value={form.nom} onChange={(e) => set('nom', e.target.value)} /></div>
            <div className="col-flex"><label className="fl">Prénom *</label>
              <input className="form-control" required placeholder="Prénom" value={form.prenom} onChange={(e) => set('prenom', e.target.value)} /></div>
            <div className="col-flex"><label className="fl">Genre *</label>
              <select className="form-select" required value={form.genre} onChange={(e) => set('genre', e.target.value)}>
                <option value="">—</option><option value="M">Masculin</option><option value="F">Féminin</option>
              </select></div>
            <div className="col-flex"><label className="fl">Date de naissance</label>
              <input type="date" className="form-control" value={form.date_naissance} onChange={(e) => set('date_naissance', e.target.value)} /></div>
            <div className="col-flex"><label className="fl">Lieu de naissance</label>
              <input className="form-control" value={form.lieu_naissance} onChange={(e) => set('lieu_naissance', e.target.value)} /></div>
            <div className="col-flex"><label className="fl">Nationalité</label>
              <input className="form-control" value={form.nationalite} onChange={(e) => set('nationalite', e.target.value)} /></div>

            {/* ── COORDONNÉES ── */}
            <div style={{ flexBasis: '100%', marginTop: 12 }}><h6 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>Coordonnées</h6></div>
            <div className="col-flex"><label className="fl">Email *</label>
              <input type="email" className="form-control" required value={form.email} onChange={(e) => set('email', e.target.value)} /></div>
            <div className="col-flex"><label className="fl">Téléphone</label>
              <input className="form-control" value={form.telephone} onChange={(e) => set('telephone', e.target.value)} /></div>
            <div className="col-flex"><label className="fl">Adresse</label>
              <input className="form-control" value={form.adresse} onChange={(e) => set('adresse', e.target.value)} /></div>
            <div className="col-flex"><label className="fl">RIB (coordonnées bancaires)</label>
              <input className="form-control" placeholder="Pour le versement par la Finance" value={form.rib} onChange={(e) => set('rib', e.target.value)} /></div>

            {/* ── SÉCURITÉ SOCIALE & PARCOURS ── */}
            <div style={{ flexBasis: '100%', marginTop: 12 }}><h6 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>Sécurité sociale & parcours</h6></div>
            <div className="col-flex"><label className="fl">N° sécurité sociale / CNSS</label>
              <input className="form-control" value={form.numero_secu} onChange={(e) => set('numero_secu', e.target.value)} /></div>
            <div className="col-flex"><label className="fl">Diplôme le plus élevé</label>
              <input className="form-control" placeholder="Ex: Doctorat, Master…" value={form.diplome} onChange={(e) => set('diplome', e.target.value)} /></div>
            <div className="col-flex"><label className="fl">Année académique *</label>
              <select className="form-select" required value={form.annee_academique} onChange={(e) => set('annee_academique', e.target.value)}>
                <option value="">— Sélectionner —</option>
                {meta.annees.map((a) => <option key={a.id} value={a.id}>{a.nom}{a.est_active ? ' (active)' : ''}</option>)}
              </select></div>
            {/* Chef de département : n'a de sens que pour un permanent, rattaché
                à UN département fixe — un vacataire peut avoir plusieurs
                affectations, donc pas de "département" unique à diriger. */}
            {!estVacataire && (
              <div className="col-flex" style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 20 }}>
                <input type="checkbox" checked={form.chef_departement} onChange={(e) => set('chef_departement', e.target.checked)} />
                <label>Chef de département</label>
              </div>
            )}

            {/* ── STATUT ── */}
            <div style={{ flexBasis: '100%', marginTop: 12 }}><h6 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>Statut</h6></div>
            <div className="col-flex"><label className="fl">Statut *</label>
              <select className="form-select" required value={form.statut} onChange={(e) => setForm((f) => ({ ...f, statut: e.target.value, chef_departement: e.target.value === 'vacataire' ? false : f.chef_departement }))}>
                <option value="">— Sélectionner —</option>
                <option value="vacataire">Vacataire (payé à l'heure, plusieurs affectations possibles)</option>
                <option value="permanent">Permanent (salaire fixe, un seul département)</option>
              </select></div>
            <div className="col-flex"><label className="fl">Début du contrat *</label>
              <input type="date" className="form-control" required value={form.date_debut_contrat} onChange={(e) => set('date_debut_contrat', e.target.value)} /></div>

            {/* ── PERMANENT : rattachement fixe + salaire ── */}
            {estPermanent && (
              <>
                <div style={{ flexBasis: '100%', marginTop: 12 }}><h6 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>Rattachement & rémunération (permanent)</h6></div>
                <div className="col-flex"><label className="fl">Faculté *</label>
                  <select className="form-select" required value={form.faculte} onChange={(e) => set('faculte', e.target.value)}>
                    <option value="">— Sélectionner —</option>
                    {meta.facultes.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
                  </select></div>
                <div className="col-flex"><label className="fl">Département (filière)</label>
                  <select className="form-select" value={form.filiere} onChange={(e) => set('filiere', e.target.value)}>
                    <option value="">— Aucun —</option>
                    {filieresPour(form.faculte).map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
                  </select></div>
                <div className="col-flex"><label className="fl">Fin du contrat</label>
                  <input type="date" className="form-control" value={form.date_fin_contrat} onChange={(e) => set('date_fin_contrat', e.target.value)} />
                  <small style={{ color: 'var(--ink-3)' }}>Laisser vide pour un CDI.</small>
                </div>
                <div className="col-flex"><label className="fl">Salaire mensuel (FCFA) *</label>
                  <input type="number" step="0.01" min="0" className="form-control" required placeholder="Ex: 450000" value={form.salaire_mensuel} onChange={(e) => set('salaire_mensuel', e.target.value)} />
                  {form.chef_departement && <small style={{ color: 'var(--gold-600)' }}>Pense à une majoration pour la responsabilité de chef de département.</small>}
                </div>
              </>
            )}

            {/* ── VACATAIRE : taux horaire + affectations multiples ── */}
            {estVacataire && (
              <>
                <div className="col-flex"><label className="fl">Fin du contrat *</label>
                  <input type="date" className="form-control" required value={form.date_fin_contrat} onChange={(e) => set('date_fin_contrat', e.target.value)} />
                </div>
                <div className="col-flex"><label className="fl">Taux horaire (FCFA / heure) *</label>
                  <input type="number" step="0.01" min="0" className="form-control" required placeholder="Ex: 10000" value={form.taux_horaire} onChange={(e) => set('taux_horaire', e.target.value)} />
                </div>

                <div style={{ flexBasis: '100%', marginTop: 12 }}>
                  <h6 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                    Affectations (facultés / portails ou filières / semestres)
                  </h6>
                  <p style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: -4, marginBottom: 12 }}>
                    Un vacataire peut intervenir dans plusieurs facultés, sur un portail (tronc commun S1-S2) ou une
                    filière (S3+), sur des semestres différents. Choisissez « Toute la faculté » pour un cours transversal (ex : anglais).
                  </p>

                  {affectations.map((a, i) => (
                    <div key={i} className="row-g" style={{ background: 'var(--surface-2)', padding: 12, borderRadius: 10, marginBottom: 10, alignItems: 'flex-end' }}>
                      <div className="col-flex"><label className="fl">Faculté *</label>
                        <select className="form-select" value={a.faculte} onChange={(e) => setAffectation(i, 'faculte', e.target.value)}>
                          <option value="">— Choisir —</option>
                          {meta.facultes.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
                        </select></div>
                      <div className="col-flex"><label className="fl">Semestre *</label>
                        <select className="form-select" value={a.semestre} onChange={(e) => setAffectation(i, 'semestre', e.target.value)}>
                          <option value="">— Choisir —</option>
                          {SEMESTRES_LIST.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select></div>
                      <div className="col-flex"><label className="fl">Portée</label>
                        <select className="form-select" value={a.portee} onChange={(e) => setAffectation(i, 'portee', e.target.value)}>
                          {optionsPortee(a.semestre).includes('faculte') && <option value="faculte">Toute la faculté</option>}
                          {optionsPortee(a.semestre).includes('portail') && <option value="portail">Un portail (S1-S2)</option>}
                          {optionsPortee(a.semestre).includes('filiere') && <option value="filiere">Une filière (S3+)</option>}
                        </select></div>
                      {a.portee === 'portail' && (
                        <div className="col-flex"><label className="fl">Portail *</label>
                          <select className="form-select" value={a.portail} onChange={(e) => setAffectation(i, 'portail', e.target.value)}>
                            <option value="">— Choisir —</option>
                            {portailsPour(a.faculte).map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
                          </select></div>
                      )}
                      {a.portee === 'filiere' && (
                        <div className="col-flex"><label className="fl">Filière *</label>
                          <select className="form-select" value={a.filiere} onChange={(e) => setAffectation(i, 'filiere', e.target.value)}>
                            <option value="">— Choisir —</option>
                            {filieresPour(a.faculte).map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
                          </select></div>
                      )}
                      <div className="col-flex"><label className="fl">Volume horaire prévu (h) *</label>
                        <input type="number" step="0.5" min="0" className="form-control" placeholder="Ex: 24" value={a.volume_horaire_prevu} onChange={(e) => setAffectation(i, 'volume_horaire_prevu', e.target.value)} />
                      </div>
                      <div style={{ paddingBottom: 4 }}>
                        <button type="button" className="btn btn-outline" style={{ color: 'var(--danger)' }} onClick={() => retirerAffectation(i)} disabled={affectations.length === 1}>
                          <i className="fas fa-trash" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <button type="button" className="btn btn-outline" onClick={ajouterAffectation}>
                    <i className="fas fa-plus" /> Ajouter une affectation
                  </button>
                </div>

                <div style={{ flexBasis: '100%', marginTop: 12 }}>
                  <div className="alert alert-info" style={{ marginBottom: 0 }}>
                    <i className="fas fa-circle-info" /> Chaque affectation est une fiche d'engagement transmise à la Faculté concernée,
                    qui confirmera le volume réalisé en fin de semestre. La Finance s'appuiera sur le taux horaire et cette confirmation pour payer.
                    Le volume horaire pourra être modifié plus tard (report, absence…) depuis la liste des enseignants.
                  </div>
                </div>
              </>
            )}

            <div style={{ flexBasis: '100%', marginTop: 16, display: 'flex', gap: 12 }}>
              <button type="submit" className="btn btn-ac" disabled={saving || !form.statut}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
              <a href="/rh/enseignants/" className="btn btn-outline">Annuler</a>
            </div>
          </form>
        </div>
      )}
    </Shell>
  )
}
