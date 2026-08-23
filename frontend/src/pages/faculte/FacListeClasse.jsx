import { useEffect, useState } from 'react'
import Shell, { Alerts } from '../../shared/Shell'
import { navFaculte, FAC_ACCUEIL, FAC_LOGOUT } from '../../shared/nav-faculte'
import FilterBar from '../../shared/FilterBar'
import { apiGet } from '../../shared/api'

export default function FacListeClasse({ pageTitle, userLabel }) {
  const [filtres, setFiltres] = useState({
    fac_id: null,
    sem: '',
    portail_id: null,
    filiere_id: null
  })

  const [data, setData] = useState(null)
  const [erreur, setErreur] = useState(null)

  useEffect(() => {
    const p = new URLSearchParams()

    if (filtres.fac_id) p.set('faculte', filtres.fac_id)
    if (filtres.sem) p.set('semestre', filtres.sem)
    if (filtres.portail_id) p.set('portail', filtres.portail_id)
    if (filtres.filiere_id) p.set('filiere', filtres.filiere_id)

    setErreur(null)

    apiGet(`/api/faculte/classe/?${p}`)
      .then(setData)
      .catch((e) => setErreur(e.message))
  }, [
    filtres.fac_id,
    filtres.sem,
    filtres.portail_id,
    filtres.filiere_id
  ])

  return (
    <Shell
      navSections={navFaculte('fac_liste_classe')}
      pageTitle={pageTitle}
      accueilHref={FAC_ACCUEIL}
      logoutHref={FAC_LOGOUT}
      userLabel={userLabel}
      userRole="Faculté"
    >
      <Alerts
        items={
          erreur
            ? [{ text: erreur, type: 'danger' }]
            : []
        }
      />

      <FilterBar
        facultes={data?.facultes || []}
        semestres={data?.semestres || []}
        value={filtres}
        onChange={(p) =>
          setFiltres((f) => ({
            ...f,
            ...p
          }))
        }
      />

      {!data ? null : data.etudiants.length > 0 ? (
        <div className="card">

          <div
            style={{
              padding: '14px 20px',
              borderBottom: '1px solid #f0f4f8',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span
              style={{
                fontWeight: 700,
                color: 'var(--ink)'
              }}
            >
              {data.etudiants.length} étudiant(s)
            </span>

            <div style={{ display: 'flex', gap: 8 }}>
              <a
                href={`/faculte/saisie-notes/?faculte=${filtres.fac_id}&semestre=${filtres.sem}`}
                className="btn btn-ac"
              >
                ✏️ Notes
              </a>

              <a
                href={`/faculte/deliberation/?faculte=${filtres.fac_id}&semestre=${filtres.sem}`}
                className="btn btn-ink"
              >
                📊 Délibérer
              </a>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table
              className="table table-hover"
              style={{
                width: '100%',
                verticalAlign: 'middle'
              }}
            >
              <thead>
                <tr>
                  <th style={{ textAlign: 'center' }}>
                    Matricule
                  </th>

                  <th style={{ textAlign: 'center' }}>
                    Identité
                  </th>

                  <th style={{ textAlign: 'center' }}>
                    Parcours
                  </th>

                  <th style={{ textAlign: 'center' }}>
                    Semestre
                  </th>

                  <th style={{ textAlign: 'center' }}>
                    Résultat archivé
                  </th>

                  <th style={{ textAlign: 'center' }}>
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {data.etudiants.map((e) => (
                  <tr key={e.id}>

                    {/* MATRICULE + TÉLÉPHONE */}
                    <td
                      style={{
                        textAlign: 'center',
                        verticalAlign: 'middle',
                        minWidth: 180
                      }}
                    >
                      <code
                        style={{
                          color: 'var(--primary)',
                          display: 'block'
                        }}
                      >
                        {e.matricule}
                      </code>

                      <small
                        style={{
                          color: 'var(--ink-3)',
                          display: 'block',
                          marginTop: 5,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {e.telephone || 'Numéro non renseigné'}
                      </small>
                    </td>

                    {/* IDENTITÉ */}
                    <td
                      style={{
                        textAlign: 'center',
                        verticalAlign: 'middle',
                        minWidth: 190
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 600,
                          lineHeight: 1.35
                        }}
                      >
                        {e.nom.toUpperCase()} {e.prenom}
                      </div>

                      <small
                        style={{
                          color: 'var(--ink-3)',
                          display: 'block',
                          marginTop: 3
                        }}
                      >
                        {e.email || 'Email non renseigné'}
                      </small>
                    </td>

                    {/* PARCOURS */}
                    <td
                      style={{
                        textAlign: 'center',
                        verticalAlign: 'middle'
                      }}
                    >
                      <small>{e.parcours}</small>
                    </td>

                    {/* SEMESTRE */}
                    <td
                      style={{
                        textAlign: 'center',
                        verticalAlign: 'middle'
                      }}
                    >
                      <span className="b-sem">
                        {e.semestre}
                      </span>
                    </td>

                    {/* RÉSULTAT */}
                    <td
                      style={{
                        textAlign: 'center',
                        verticalAlign: 'middle'
                      }}
                    >
                      {e.resultat ? (
                        <span
                          className={
                            e.resultat.decision === 'ADMIS'
                              ? 'b-ok'
                              : 'b-ko'
                          }
                        >
                          {e.resultat.decision} ·{' '}
                          {Number(
                            e.resultat.moyenne_generale
                          ).toFixed(2)}
                          /20
                        </span>
                      ) : (
                        <span
                          style={{
                            color: 'var(--ink-3)',
                            fontSize: 12
                          }}
                        >
                          Non calculé
                        </span>
                      )}
                    </td>

                    {/* ACTION */}
                    <td
                      style={{
                        textAlign: 'center',
                        verticalAlign: 'middle'
                      }}
                    >
                      <a
                        href={`/faculte/note/${e.id}/`}
                        className="btn btn-outline"
                        title="Modifier notes"
                      >
                        ✏️
                      </a>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      ) : filtres.fac_id && filtres.sem ? (

        <div className="empty-box">
          📭 Aucun étudiant trouvé.
        </div>

      ) : (

        <div className="empty-box">
          🔍 Sélectionnez une <strong>faculté</strong> et un{' '}
          <strong>semestre</strong>.
        </div>

      )}
    </Shell>
  )
}