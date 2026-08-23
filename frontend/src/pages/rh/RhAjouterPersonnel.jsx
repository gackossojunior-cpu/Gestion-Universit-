import { useEffect, useState } from 'react'
import Shell, { Alerts, useAlerts } from '../../shared/Shell'
import { navRh, RH_ACCUEIL, RH_LOGOUT } from '../../shared/nav-rh'
import { apiGet, apiPost } from '../../shared/api'

const VIDE = {
  nom: '', prenom: '', genre: '', telephone: '', email: '',
  fonction: '', fonction_autre: '', lieu_travail: '', faculte_rattachement: '', date_embauche: '',
  salaire_mensuel: '', rib: '',
}

export default function RhAjouterPersonnel({ pageTitle, userLabel }) {
  const [meta, setMeta] = useState(null)
  const [form, setForm] = useState(VIDE)
  const { alerts, push, clear } = useAlerts()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    apiGet('/api/rh/personnel/ajouter/').then(setMeta).catch((e) => push(e.message, 'danger'))
  }, [])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const soumettre = async (e) => {
    e.preventDefault()
    clear()
    setSaving(true)
    try {
      const res = await apiPost('/api/rh/personnel/ajouter/', form)
      push(`✅ ${res.detail}`, 'success')
      setForm(VIDE)
    } catch (err) {
      push(err.message, 'danger')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Shell navSections={navRh('rh_ajouter_personnel')} pageTitle={pageTitle}
      accueilHref={RH_ACCUEIL} logoutHref={RH_LOGOUT} userLabel={userLabel} userRole="Ressources Humaines">
      <Alerts items={alerts} />
      {!meta ? <p style={{ color: 'var(--ink-3)' }}>Chargement…</p> : (
        <div className="card" style={{ padding: 24, maxWidth: 780 }}>
          <form onSubmit={soumettre} className="row-g" style={{ marginBottom: 0 }}>
            <div style={{ flexBasis: '100%' }}><h6 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>Identité</h6></div>

            <div className="col-flex"><label className="fl">Nom *</label>
              <input className="form-control" required placeholder="NOM" value={form.nom} onChange={(e) => set('nom', e.target.value)} /></div>
            <div className="col-flex"><label className="fl">Prénom *</label>
              <input className="form-control" required placeholder="Prénom" value={form.prenom} onChange={(e) => set('prenom', e.target.value)} /></div>
            <div className="col-flex"><label className="fl">Genre *</label>
              <select className="form-select" required value={form.genre} onChange={(e) => set('genre', e.target.value)}>
                <option value="">—</option><option value="M">Masculin</option><option value="F">Féminin</option>
              </select></div>
            <div className="col-flex"><label className="fl">Téléphone</label>
              <input className="form-control" placeholder="+242 06 000 00 00" value={form.telephone} onChange={(e) => set('telephone', e.target.value)} /></div>
            <div className="col-flex"><label className="fl">Email</label>
              <input type="email" className="form-control" placeholder="(facultatif)" value={form.email} onChange={(e) => set('email', e.target.value)} /></div>

            <div style={{ flexBasis: '100%', marginTop: 12 }}><h6 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>Poste</h6></div>

            <div className="col-flex"><label className="fl">Fonction *</label>
              <select className="form-select" required value={form.fonction} onChange={(e) => set('fonction', e.target.value)}>
                <option value="">— Sélectionner —</option>
                {meta.fonctions.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
              </select></div>
            {form.fonction === 'autre' && (
              <div className="col-flex"><label className="fl">Précisez la fonction *</label>
                <input className="form-control" required value={form.fonction_autre} onChange={(e) => set('fonction_autre', e.target.value)} /></div>
            )}
            <div className="col-flex"><label className="fl">Lieu de travail *</label>
              <input className="form-control" required placeholder="Ex: Faculté des Sciences, Résidence universitaire…" value={form.lieu_travail} onChange={(e) => set('lieu_travail', e.target.value)} /></div>
            <div className="col-flex"><label className="fl">Faculté de rattachement</label>
              <select className="form-select" value={form.faculte_rattachement} onChange={(e) => set('faculte_rattachement', e.target.value)}>
                <option value="">— Aucune / Administration générale —</option>
                {meta.facultes.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
              </select></div>
            <div className="col-flex"><label className="fl">Date d'embauche *</label>
              <input type="date" className="form-control" required value={form.date_embauche} onChange={(e) => set('date_embauche', e.target.value)} /></div>

            <div style={{ flexBasis: '100%', marginTop: 12 }}><h6 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>Rémunération</h6></div>
            <div className="col-flex"><label className="fl">Salaire mensuel (FCFA) *</label>
              <input type="number" step="0.01" min="0" className="form-control" required placeholder="Ex: 150000" value={form.salaire_mensuel} onChange={(e) => set('salaire_mensuel', e.target.value)} /></div>
            <div className="col-flex"><label className="fl">RIB (coordonnées bancaires)</label>
              <input className="form-control" placeholder="Pour le versement par la Finance" value={form.rib} onChange={(e) => set('rib', e.target.value)} /></div>

            <div style={{ flexBasis: '100%', marginTop: 16, display: 'flex', gap: 12 }}>
              <button type="submit" className="btn btn-ac" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
              <a href="/rh/personnel/" className="btn btn-outline">Annuler</a>
            </div>
          </form>
        </div>
      )}
    </Shell>
  )
}
