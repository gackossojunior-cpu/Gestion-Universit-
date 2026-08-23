import { useEffect, useState } from 'react'
import Shell, { Alerts } from '../../shared/Shell'
import { navRh, RH_ACCUEIL, RH_LOGOUT } from '../../shared/nav-rh'
import GradeRing from '../../shared/GradeRing'
import { apiGet } from '../../shared/api'

const FONCTION_LABELS = {
  menage: 'Agents de ménage', gardien: 'Gardiens / Sécurité', cuisinier: 'Cuisiniers',
  chauffeur: 'Chauffeurs', technicien: 'Techniciens', autre: 'Autres',
}

export default function RhDashboard({ pageTitle, userLabel }) {
  const [data, setData] = useState(null)
  const [erreur, setErreur] = useState(null)

  useEffect(() => {
    apiGet('/api/rh/dashboard/').then(setData).catch((e) => setErreur(e.message))
  }, [])

  return (
    <Shell navSections={navRh('rh_dashboard')} pageTitle={pageTitle}
      accueilHref={RH_ACCUEIL} logoutHref={RH_LOGOUT} userLabel={userLabel} userRole="Ressources Humaines">
      <Alerts items={erreur ? [{ text: erreur, type: 'danger' }] : []} />
      {!data ? <p style={{ color: 'var(--ink-3)' }}>Chargement…</p> : (
        <>
          <div className="row-g">
            <div className="card scard col-flex">
              <div className="scard-ic"><i className="fas fa-users" /></div>
              <div><div className="scard-lbl">Personnel actif</div><div className="scard-val">{data.total_personnel}</div></div>
            </div>
            <div className="card scard col-flex">
              <div className="scard-ic" style={{ background: 'var(--gold-tint)', color: 'var(--gold-600)' }}><i className="fas fa-chalkboard-user" /></div>
              <div><div className="scard-lbl">Enseignants actifs ({data.annee_active || '—'})</div><div className="scard-val">{data.total_enseignants_actifs}</div></div>
            </div>
            <div className="card scard col-flex">
              <div className="scard-ic" style={{ background: 'var(--danger-tint)', color: 'var(--danger)' }}><i className="fas fa-user-tie" /></div>
              <div><div className="scard-lbl">Chefs de département actifs</div><div className="scard-val">{data.chefs_departement_actifs}</div></div>
            </div>
          </div>

          <div className="row-g">
            <div className="card col-flex" style={{ flexBasis: 320, padding: 20 }}>
              <div style={{ fontWeight: 700, marginBottom: 14, fontFamily: 'var(--font-display)' }}>Enseignants — {data.annee_active || 'année en cours'}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                <GradeRing value={data.total_enseignants_actifs ? (data.enseignants_permanents / data.total_enseignants_actifs) * 20 : 0} label="% Permanents" />
                <div style={{ fontSize: 13 }}>
                  <div style={{ marginBottom: 6 }}><span className="b-tag-primary">Permanents</span> {data.enseignants_permanents}</div>
                  <div><span className="b-tag-gold">Vacataires</span> {data.enseignants_vacataires}</div>
                </div>
              </div>
            </div>
            <div className="card col-flex" style={{ flexBasis: 320, flexGrow: 2, padding: 20 }}>
              <div style={{ fontWeight: 700, marginBottom: 14, fontFamily: 'var(--font-display)' }}>Personnel par fonction</div>
              {data.personnel_par_fonction.length === 0 ? (
                <p style={{ color: 'var(--ink-3)', fontSize: 13 }}>Aucun membre du personnel enregistré.</p>
              ) : (
                <table className="table" style={{ width: '100%' }}>
                  <tbody>
                    {data.personnel_par_fonction.map((f, i) => (
                      <tr key={i}>
                        <td>{FONCTION_LABELS[f.fonction] || f.fonction}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{f.n}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </Shell>
  )
}
