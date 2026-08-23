import { useEffect, useState } from 'react'
import Shell, { Alerts, useAlerts } from '../../shared/Shell'
import { navSecretariat, SEC_ACCUEIL, SEC_LOGOUT } from '../../shared/nav-secretariat'
import { useSousCategories } from '../../shared/FilterBar'
import { apiGet, apiPost } from '../../shared/api'

export default function SecListeEtudiants({
  pageTitle,
  userLabel
}) {
  const [filtres, setFiltres] = useState({
    fac_id: null,
    sem: '',
    annee_id: null,
    portail_id: null,
    filiere_id: null,
    q: ''
  })

  const [data, setData] = useState(null)

  const {
    alerts,
    push
  } = useAlerts()

  const {
    portails,
    filieres
  } = useSousCategories(
    filtres.fac_id
  )

  const charger = () => {
    const p =
      new URLSearchParams()

    if (filtres.fac_id)
      p.set(
        'faculte',
        filtres.fac_id
      )

    if (filtres.sem)
      p.set(
        'semestre',
        filtres.sem
      )

    if (filtres.annee_id)
      p.set(
        'annee',
        filtres.annee_id
      )

    if (filtres.portail_id)
      p.set(
        'portail',
        filtres.portail_id
      )

    if (filtres.filiere_id)
      p.set(
        'filiere',
        filtres.filiere_id
      )

    if (filtres.q)
      p.set(
        'q',
        filtres.q
      )

    apiGet(
      `/api/secretariat/etudiants/?${p}`
    )
      .then(setData)
      .catch((e) =>
        push(
          e.message,
          'danger'
        )
      )
  }

  useEffect(
    () => {
      charger()
    },
    [
      filtres.fac_id,
      filtres.sem,
      filtres.annee_id,
      filtres.portail_id,
      filtres.filiere_id
    ]
  )

  const changerStatut = async (
    etuId,
    statut
  ) => {
    try {
      await apiPost(
        `/api/secretariat/etudiant/${etuId}/statut/`,
        { statut }
      )

      charger()

    } catch (e) {
      push(
        e.message,
        'danger'
      )
    }
  }

  return (
    <Shell
      navSections={navSecretariat(
        'sec_liste_etudiants'
      )}
      pageTitle={pageTitle}
      accueilHref={SEC_ACCUEIL}
      logoutHref={SEC_LOGOUT}
      userLabel={userLabel}
      userRole="Secrétariat"
    >
      <Alerts items={alerts} />

      {/* FILTRES */}
      <div
        className="card"
        style={{
          borderLeft:
            '4px solid var(--gold)',
          padding: 14,
          marginBottom: 20
        }}
      >
        <div
          className="row-g"
          style={{
            alignItems: 'flex-end',
            marginBottom: 0
          }}
        >

          <div className="col-flex">
            <label className="fl">
              Faculté
            </label>

            <select
              className="form-select"
              value={
                filtres.fac_id || ''
              }
              onChange={(e) =>
                setFiltres((f) => ({
                  ...f,
                  fac_id:
                    e.target.value
                      ? Number(
                          e.target.value
                        )
                      : null,
                  portail_id: null,
                  filiere_id: null
                }))
              }
            >
              <option value="">
                Toutes
              </option>

              {(
                data?.facultes || []
              ).map((f) => (
                <option
                  key={f.id}
                  value={f.id}
                >
                  {f.code} — {f.nom}
                </option>
              ))}
            </select>
          </div>

          <div className="col-flex">
            <label className="fl">
              Semestre
            </label>

            <select
              className="form-select"
              value={filtres.sem}
              onChange={(e) =>
                setFiltres((f) => ({
                  ...f,
                  sem: e.target.value
                }))
              }
            >
              <option value="">
                Tous
              </option>

              {(
                data?.semestres || []
              ).map((s) => (
                <option
                  key={s}
                  value={s}
                >
                  Sem. {s.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="col-flex">
            <label className="fl">
              Année
            </label>

            <select
              className="form-select"
              value={
                filtres.annee_id || ''
              }
              onChange={(e) =>
                setFiltres((f) => ({
                  ...f,
                  annee_id:
                    e.target.value
                      ? Number(
                          e.target.value
                        )
                      : null
                }))
              }
            >
              <option value="">
                Toutes
              </option>

              {(
                data?.annees || []
              ).map((a) => (
                <option
                  key={a.id}
                  value={a.id}
                >
                  {a.nom}
                </option>
              ))}
            </select>
          </div>

          <div className="col-flex">
            <label className="fl">
              Portail
            </label>

            <select
              className="form-select"
              value={
                filtres.portail_id || ''
              }
              onChange={(e) =>
                setFiltres((f) => ({
                  ...f,
                  portail_id:
                    e.target.value
                      ? Number(
                          e.target.value
                        )
                      : null
                }))
              }
            >
              <option value="">
                Tous
              </option>

              {portails.map((p) => (
                <option
                  key={p.id}
                  value={p.id}
                >
                  {p.nom}
                </option>
              ))}
            </select>
          </div>

          <div className="col-flex">
            <label className="fl">
              Filière
            </label>

            <select
              className="form-select"
              value={
                filtres.filiere_id || ''
              }
              onChange={(e) =>
                setFiltres((f) => ({
                  ...f,
                  filiere_id:
                    e.target.value
                      ? Number(
                          e.target.value
                        )
                      : null
                }))
              }
            >
              <option value="">
                Toutes
              </option>

              {filieres.map((f) => (
                <option
                  key={f.id}
                  value={f.id}
                >
                  {f.nom}
                </option>
              ))}
            </select>
          </div>

          <div className="col-flex">
            <label className="fl">
              Recherche
            </label>

            <div
              style={{
                display: 'flex'
              }}
            >
              <input
                type="text"
                className="form-control"
                placeholder="Nom, matricule…"
                value={filtres.q}
                onChange={(e) =>
                  setFiltres((f) => ({
                    ...f,
                    q: e.target.value
                  }))
                }
                onKeyDown={(e) =>
                  e.key === 'Enter' &&
                  charger()
                }
              />

              <button
                className="btn btn-navy"
                style={{
                  marginLeft: 6
                }}
                onClick={charger}
              >
                🔍
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* AJOUT */}
      <div
        style={{
          display: 'flex',
          justifyContent:
            'flex-end',
          marginBottom: 12
        }}
      >
        <a
          href="/secretaire/etudiant/ajouter/"
          className="btn btn-navy"
        >
          <i className="fas fa-user-plus" />{' '}
          Ajouter un étudiant
        </a>
      </div>

      {/* TABLE */}
      <div className="card">

        <div
          style={{
            padding:
              '14px 20px',
            borderBottom:
              '1px solid #f0f4f8',
            display: 'flex',
            justifyContent:
              'space-between',
            alignItems: 'center'
          }}
        >
          <span
            style={{
              fontSize: 17,
              color:
                'var(--ink)'
            }}
          >
            {data
              ? data.etudiants.length
              : '…'}{' '}
            étudiant(s)
          </span>

          <a
            href="/secretaire/dashboard/"
            className="btn btn-outline"
          >
            ← Retour
          </a>
        </div>

        <div
          style={{
            overflowX: 'auto'
          }}
        >
          <table
            className="table table-hover"
            style={{
              width: '100%',
              verticalAlign:
                'middle'
            }}
          >
            <thead>
              <tr>

                <th style={{ textAlign: 'center' }}>
                  Matricule
                </th>

                <th style={{ textAlign: 'center' }}>
                  Nom &amp; Prénom
                </th>

                <th style={{ textAlign: 'center' }}>
                  Genre
                </th>

                <th style={{ textAlign: 'center' }}>
                  Âge
                </th>

                <th style={{ textAlign: 'center' }}>
                  Nationalité
                </th>

                <th style={{ textAlign: 'center' }}>
                  Faculté
                </th>

                <th style={{ textAlign: 'center' }}>
                  Portail / Filière
                </th>

                <th style={{ textAlign: 'center' }}>
                  Semestre
                </th>

                <th style={{ textAlign: 'center' }}>
                  Statut
                </th>

                <th style={{ textAlign: 'center' }}>
                  Documents
                </th>

              </tr>
            </thead>

            <tbody>

              {data &&
                data.etudiants.length === 0 && (
                  <tr>
                    <td
                      colSpan={10}
                      style={{
                        textAlign:
                          'center',
                        padding: 40,
                        color:
                          'var(--ink-3)'
                      }}
                    >
                      📭 Aucun résultat.
                    </td>
                  </tr>
                )}

              {data?.etudiants.map(
                (e) => (
                  <tr key={e.id}>

                    {/* MATRICULE + TÉLÉPHONE */}
                    <td
                      style={{
                        textAlign:
                          'center',
                        verticalAlign:
                          'middle',
                        minWidth: 180
                      }}
                    >

                      <code
                        style={{
                          color:
                            'var(--gold)',
                          fontWeight:
                            700,
                          display:
                            'block'
                        }}
                      >
                        {e.matricule}
                      </code>

                      <small
                        style={{
                          color:
                            'var(--ink-3)',
                          display:
                            'block',
                          marginTop: 5,
                          whiteSpace:
                            'nowrap'
                        }}
                      >
                        📞{' '}
                        {e.telephone ||
                          'Numéro non renseigné'}
                      </small>

                    </td>

                    {/* IDENTITÉ + EMAIL */}
                    <td
                      style={{
                        textAlign:
                          'center',
                        verticalAlign:
                          'middle',
                        minWidth: 190
                      }}
                    >

                      <div
                        style={{
                          fontWeight:
                            600,
                          lineHeight:
                            1.35
                        }}
                      >
                        {e.nom.toUpperCase()}{' '}
                        {e.prenom}
                      </div>

                      <small
                        style={{
                          color:
                            'var(--ink-3)',
                          display:
                            'block',
                          marginTop: 3
                        }}
                      >
                        {e.email ||
                          'Email non renseigné'}
                      </small>

                    </td>

                    {/* GENRE */}
                    <td
                      style={{
                        textAlign:
                          'center',
                        verticalAlign:
                          'middle',
                        fontWeight:
                          600
                      }}
                    >
                      {e.genre}
                    </td>

                    {/* ÂGE */}
                    <td
                      style={{
                        textAlign:
                          'center',
                        verticalAlign:
                          'middle',
                        whiteSpace:
                          'nowrap'
                      }}
                    >
                      {e.age}&nbsp;ans
                    </td>

                    {/* NATIONALITÉ */}
                    <td
                      style={{
                        textAlign:
                          'center',
                        verticalAlign:
                          'middle'
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          border:
                            '1px solid #e5e7eb',
                          borderRadius: 4,
                          padding:
                            '1px 6px'
                        }}
                      >
                        {e.nationalite}
                      </span>
                    </td>

                    {/* FACULTÉ */}
                    <td
                      style={{
                        textAlign:
                          'center',
                        verticalAlign:
                          'middle'
                      }}
                    >
                      <span
                        style={{
                          background:
                            'var(--ink)',
                          color: '#fff',
                          padding:
                            '2px 8px',
                          borderRadius: 4,
                          fontSize: 11
                        }}
                      >
                        {e.faculte_code}
                      </span>
                    </td>

                    {/* PORTAIL / FILIÈRE */}
                    <td
                      style={{
                        textAlign:
                          'center',
                        verticalAlign:
                          'middle'
                      }}
                    >
                      {e.semestre ===
                        'S1' ||
                      e.semestre ===
                        'S2' ? (
                        <span
                          style={{
                            color:
                              'var(--primary-600)',
                            fontSize: 12,
                            fontWeight:
                              600
                          }}
                        >
                          {e.portail_nom ||
                            '—'}
                        </span>
                      ) : (
                        <span
                          style={{
                            color:
                              'var(--gold-600)',
                            fontSize: 12,
                            fontWeight:
                              600
                          }}
                        >
                          {e.filiere_nom ||
                            '—'}
                        </span>
                      )}
                    </td>

                    {/* SEMESTRE */}
                    <td
                      style={{
                        textAlign:
                          'center',
                        verticalAlign:
                          'middle'
                      }}
                    >
                      <span className="b-sem">
                        {e.semestre}
                      </span>
                    </td>

                    {/* STATUT */}
                    <td
                      style={{
                        textAlign:
                          'center',
                        verticalAlign:
                          'middle'
                      }}
                    >
                      <select
                        value={
                          e.statut
                        }
                        onChange={(
                          ev
                        ) =>
                          changerStatut(
                            e.id,
                            ev.target
                              .value
                          )
                        }
                        style={{
                          fontSize: 11,
                          padding:
                            '2px 6px',
                          borderRadius:
                            5,
                          border:
                            '1px solid #ddd',
                          fontWeight:
                            600,
                          cursor:
                            'pointer'
                        }}
                      >
                        <option value="actif">
                          Actif
                        </option>

                        <option value="diplome">
                          Diplômé
                        </option>

                        <option value="abandonne">
                          Abandonné
                        </option>
                      </select>
                    </td>

                    {/* DOCUMENTS */}
                    <td
                      style={{
                        textAlign:
                          'center',
                        verticalAlign:
                          'middle',
                        whiteSpace:
                          'nowrap'
                      }}
                    >

                      <a
                        href={`/attestation/${e.id}/`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-outline"
                        title="Attestation"
                        style={{
                          marginRight: 4
                        }}
                      >
                        📜
                      </a>

                      <a
                        href={`/releve/${e.id}/`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-outline"
                        title="Relevé"
                      >
                        📊
                      </a>

                    </td>

                  </tr>
                )
              )}

            </tbody>
          </table>
        </div>
      </div>

    </Shell>
  )
}