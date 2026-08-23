import { useEffect, useState } from 'react'
import Shell, { Alerts, useAlerts } from '../../shared/Shell'
import { navRh, RH_ACCUEIL, RH_LOGOUT } from '../../shared/nav-rh'
import { apiGet, apiPost } from '../../shared/api'

export default function RhPersonnel({ pageTitle, userLabel }) {
  const [filtres, setFiltres] = useState({ fonction: '', statut: '', faculte: '', q: '' })
  const [data, setData] = useState(null)
  const { alerts, push } = useAlerts()

  const charger = () => {
    const p = new URLSearchParams()
    if (filtres.fonction) p.set('fonction', filtres.fonction)
    if (filtres.statut) p.set('statut', filtres.statut)
    if (filtres.faculte) p.set('faculte', filtres.faculte)
    if (filtres.q) p.set('q', filtres.q)
    apiGet(`/api/rh/personnel/?${p}`).then(setData).catch((e) => push(e.message, 'danger'))
  }

  useEffect(charger, [filtres.fonction, filtres.statut, filtres.faculte])

  const changerStatut = async (id, statut) => {
    try {
      await apiPost(`/api/rh/personnel/${id}/statut/`, { statut })
      charger()
    } catch (e) {
      push(e.message, 'danger')
    }
  }

  return (
    <Shell navSections={navRh('rh_personnel')} pageTitle={pageTitle}
      accueilHref={RH_ACCUEIL} logoutHref={RH_LOGOUT} userLabel={userLabel} userRole="Ressources Humaines">
      <Alerts items={alerts} />

      <div className="card" style={{ padding: 14, marginBottom: 20 }}>
        <div className="row-g" style={{ alignItems: 'flex-end', marginBottom: 0 }}>
          <div className="col-flex">
            <label className="fl">Fonction</label>
            <select className="form-select" value={filtres.fonction} onChange={(e) => setFiltres((f) => ({ ...f, fonction: e.target.value }))}>
              <option value="">Toutes</option>
              {(data?.fonctions || []).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
            </select>
          </div>
          <div className="col-flex">
            <label className="fl">Statut</label>
            <select className="form-select" value={filtres.statut} onChange={(e) => setFiltres((f) => ({ ...f, statut: e.target.value }))}>
              <option value="">Tous</option>
              <option value="actif">Actif</option>
              <option value="inactif">Inactif</option>
            </select>
          </div>
          <div className="col-flex">
            <label className="fl">Faculté de rattachement</label>
            <select className="form-select" value={filtres.faculte} onChange={(e) => setFiltres((f) => ({ ...f, faculte: e.target.value }))}>
              <option value="">Toutes</option>
              {(data?.facultes || []).map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
            </select>
          </div>
          <div className="col-flex">
            <label className="fl">Recherche</label>
            <div style={{ display: 'flex' }}>
              <input type="text" className="form-control" placeholder="Nom, matricule, téléphone…" value={filtres.q}
                onChange={(e) => setFiltres((f) => ({ ...f, q: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && charger()} />
              <button className="btn btn-ink" style={{ marginLeft: 6 }} onClick={charger}>🔍</button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <a href="/rh/personnel/ajouter/" className="btn btn-ac"><i className="fas fa-user-plus" /> Ajouter un membre du personnel</a>
      </div>

      <div className="card">
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700 }}>
          {data ? data.personnel.length : '…'} personne(s)
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table table-hover" style={{ width: '100%' }}>
            <thead><tr>
              <th>Matricule</th><th>Identité</th><th style={{ textAlign: 'center' }}>Fonction</th>
              <th>Lieu de travail</th><th style={{ textAlign: 'center' }}>Téléphone</th>
              <th style={{ textAlign: 'center' }}>Statut</th>
            </tr></thead>
            <tbody>
              {data && data.personnel.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--ink-3)' }}>📭 Aucun résultat.</td></tr>
              )}
              {data?.personnel.map((p) => (
                <tr key={p.id}>
                  <td><code className="mono" style={{ color: 'var(--primary)' }}>{p.matricule}</code></td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{p.nom.toUpperCase()} {p.prenom}</div>
                    {p.email && <small style={{ color: 'var(--ink-3)' }}>{p.email}</small>}
                  </td>
                  <td style={{ textAlign: 'center' }}><span className="b-tag-primary">{p.fonction_display}</span></td>
                  <td>{p.lieu_travail}{p.faculte_nom ? <small style={{ color: 'var(--ink-3)', display: 'block' }}>{p.faculte_nom}</small> : null}</td>
                  <td style={{ textAlign: 'center' }}>{p.telephone || '—'}</td>
                  <td style={{ textAlign: 'center' }}>
                    <select value={p.statut} onChange={(e) => changerStatut(p.id, e.target.value)}
                      style={{ fontSize: 11, padding: '2px 6px', borderRadius: 5, border: '1px solid var(--border-strong)', fontWeight: 600, cursor: 'pointer' }}>
                      <option value="actif">Actif</option>
                      <option value="inactif">Inactif</option>
                    </select>
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
