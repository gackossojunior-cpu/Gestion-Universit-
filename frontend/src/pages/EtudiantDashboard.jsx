import { useEffect, useState } from 'react'
import Shell, { Alerts } from '../shared/Shell'
import { navEtudiant, ETU_ACCUEIL, ETU_LOGOUT } from '../shared/nav-etudiant'
import GradeRing from '../shared/GradeRing'
import { apiGet } from '../shared/api'

export default function EtudiantDashboard({ userLabel }) {
  const [data, setData] = useState(null)
  const [erreur, setErreur] = useState(null)

  useEffect(() => {
    apiGet('/api/etudiant/dashboard/')
      .then((d) => d && setData(d))
      .catch((e) => setErreur(e.message))
  }, [])

  const params = new URLSearchParams(window.location.search)
  const vue = params.get('vue')

  let active = 'etu_dashboard'
  let pageTitle = 'Tableau de bord'

  if (vue === 'programme') {
    active = 'etu_programme'
    pageTitle = 'Programme du semestre'
  } else if (vue === 'resultats') {
    active = 'etu_resultats'
    pageTitle = 'Mes résultats'
  }

  return (
    <Shell
      navSections={navEtudiant(active)}
      pageTitle={pageTitle}
      accueilHref={ETU_ACCUEIL}
      logoutHref={ETU_LOGOUT}
      userLabel={userLabel}
      userRole="Étudiant"
    >
      <Alerts items={erreur ? [{ text: erreur, type: 'danger' }] : []} />

      {!data ? (
        <p style={{ color: 'var(--ink-3)' }}>Chargement…</p>
      ) : (
        <EtudiantContenu data={data} vue={vue} />
      )}
    </Shell>
  )
}

function EtudiantContenu({ data, vue }) {
  const { etudiant, en_regle, unites, resultats } = data

  if (vue === 'programme') {
    return <ProgrammeSemestre etudiant={etudiant} unites={unites} />
  }

  if (vue === 'resultats') {
    return (
      <ResultatsEtudiant
        etudiant={etudiant}
        en_regle={en_regle}
        resultats={resultats}
      />
    )
  }

  return (
    <AccueilEtudiant
      etudiant={etudiant}
      en_regle={en_regle}
      unites={unites}
      resultats={resultats}
    />
  )
}


/* =========================================================
   ACCUEIL ÉTUDIANT
   ========================================================= */

function AccueilEtudiant({
  etudiant,
  en_regle,
  unites,
  resultats,
}) {
  const semestres = Object.keys(resultats)

  const totalMatieres = unites.reduce(
    (total, ue) => total + ue.matieres.length,
    0
  )

  return (
    <>
      <div
        className="card"
        style={{
          padding: '28px 30px',
          marginBottom: 22,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 20,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 24,
                fontWeight: 600,
                color: 'var(--ink)',
                marginBottom: 7,
              }}
            >
              Bienvenue, {etudiant.prenom}
            </div>

            <div
              style={{
                fontSize: 13.5,
                color: 'var(--ink-2)',
                lineHeight: 1.7,
              }}
            >
              <strong>
                {etudiant.nom.toUpperCase()} {etudiant.prenom}
              </strong>
              <br />

              <code
                className="mono"
                style={{ color: 'var(--primary)' }}
              >
                {etudiant.matricule}
              </code>

              <span style={{ margin: '0 8px' }}>·</span>
              {etudiant.cycle}

              <span style={{ margin: '0 8px' }}>·</span>
              Semestre <strong>{etudiant.semestre}</strong>

              <span style={{ margin: '0 8px' }}>·</span>
              {etudiant.annee_academique}
            </div>
          </div>

          {en_regle ? (
            <span className="b-ok">
              <i
                className="fas fa-circle-check"
                style={{ marginRight: 5 }}
              />
              En règle
            </span>
          ) : (
            <span className="b-ko">
              <i
                className="fas fa-triangle-exclamation"
                style={{ marginRight: 5 }}
              />
              Impayés en cours
            </span>
          )}
        </div>
      </div>


      {!en_regle && (
        <div className="alert alert-warning">
          <strong>
            <i className="fas fa-triangle-exclamation" /> Situation
            financière en attente
          </strong>
          <br />

          Votre situation financière présente actuellement des
          impayés. Les résultats du semestre en cours peuvent être
          temporairement masqués.
        </div>
      )}


      <h6
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 15,
          fontWeight: 600,
          color: 'var(--ink)',
          margin: '28px 0 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <i
          className="fas fa-house"
          style={{ color: 'var(--primary)' }}
        />

        Mon espace étudiant
      </h6>


      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 14,
        }}
      >

        <AccueilInfoCard
          icon="fas fa-book-open"
          title="Programme du semestre"
          value={`${unites.length} unité${unites.length > 1 ? 's' : ''} d’enseignement`}
          description={`${totalMatieres} matière${totalMatieres > 1 ? 's' : ''} au programme`}
        />

        <AccueilInfoCard
          icon="fas fa-chart-simple"
          title="Mes résultats"
          value={`${semestres.length} semestre${semestres.length > 1 ? 's' : ''}`}
          description="Consultez vos notes et résultats"
        />

        <AccueilInfoCard
          icon="fas fa-calendar"
          title="Semestre actuel"
          value={etudiant.semestre}
          description={etudiant.annee_academique}
        />

      </div>
    </>
  )
}


/* =========================================================
   PETITES CARTES D'ACCUEIL
   ========================================================= */

function AccueilInfoCard({
  icon,
  title,
  value,
  description,
}) {
  return (
    <div
      className="card"
      style={{
        padding: '20px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 10,
          background: 'var(--primary-tint)',
          color: 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 12px',
          fontSize: 17,
        }}
      >
        <i className={icon} />
      </div>

      <div
        style={{
          fontWeight: 700,
          fontSize: 13.5,
          color: 'var(--ink)',
          marginBottom: 7,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--primary)',
          marginBottom: 4,
        }}
      >
        {value}
      </div>

      <div
        style={{
          fontSize: 11.5,
          color: 'var(--ink-2)',
        }}
      >
        {description}
      </div>
    </div>
  )
}


/* =========================================================
   PROGRAMME DU SEMESTRE
   ========================================================= */

function ProgrammeSemestre({ etudiant, unites }) {
  return (
    <>
      <div
        className="card"
        style={{
          padding: '20px 24px',
          marginBottom: 22,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 19,
            fontWeight: 600,
            color: 'var(--ink)',
          }}
        >
          Programme — {etudiant.semestre}
        </div>

        <div
          style={{
            fontSize: 12.5,
            color: 'var(--ink-2)',
            marginTop: 5,
          }}
        >
          {etudiant.annee_academique}
        </div>
      </div>

      {unites.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 14,
          }}
        >
          {unites.map((ue, i) => (
            <div
              className="card"
              key={i}
              style={{
                padding: '16px 18px',
                borderTop: '3px solid var(--primary)',
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'var(--ink)',
                  marginBottom: 8,
                }}
              >
                {ue.nom}
              </div>

              <span
                className="b-tag-primary"
                style={{
                  marginBottom: 8,
                  display: 'inline-block',
                }}
              >
                {ue.credits_total} crédits
              </span>

              <ul
                style={{
                  listStyle: 'none',
                  margin: '8px 0 0',
                  padding: 0,
                }}
              >
                {ue.matieres.map((m, j) => (
                  <li
                    key={j}
                    style={{
                      fontSize: 12,
                      color: 'var(--ink-2)',
                      padding: '4px 0',
                      borderTop:
                        j > 0
                          ? '1px solid var(--border)'
                          : 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <span>{m.nom}</span>

                    <span
                      className="mono"
                      style={{
                        color: 'var(--primary)',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {m.credits} cr.
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-box">
          Programme non encore saisi pour ce semestre.
        </div>
      )}
    </>
  )
}


/* =========================================================
   RÉSULTATS
   ========================================================= */

function ResultatsEtudiant({
  etudiant,
  en_regle,
  resultats,
}) {
  const semestres = Object.keys(resultats)

  return (
    <>
      <div
        className="card"
        style={{
          padding: '20px 24px',
          marginBottom: 22,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 19,
            fontWeight: 600,
            color: 'var(--ink)',
          }}
        >
          Mes résultats
        </div>

        <div
          style={{
            fontSize: 12.5,
            color: 'var(--ink-2)',
            marginTop: 5,
          }}
        >
          Consultez vos résultats par semestre.
        </div>
      </div>


      {!en_regle && (
        <div className="alert alert-warning">
          <strong>
            <i className="fas fa-triangle-exclamation" /> Situation
            financière en attente
          </strong>
          <br />

          Vos résultats du semestre en cours sont temporairement
          masqués. Veuillez régulariser votre situation auprès du
          secrétariat. Vous pouvez consulter vos résultats des
          semestres précédents ci-dessous.
        </div>
      )}


      {semestres.length > 0 ? (
        semestres.map((sem) => {
          const ligne = resultats[sem]

          return (
            <div
              className="card"
              key={sem}
              style={{
                padding: '18px 20px',
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 18,
                  marginBottom: 14,
                  paddingBottom: 12,
                  borderBottom: '1px solid var(--border)',
                  flexWrap: 'wrap',
                }}
              >
                <GradeRing
                  value={ligne.moyenne_semestre}
                  size={58}
                  label={`Sem. ${sem.slice(1)}`}
                />

                <div>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 14.5,
                      color: 'var(--ink)',
                      marginBottom: 4,
                    }}
                  >
                    Semestre {sem} —{' '}
                    <span
                      className={
                        ligne.decision === 'ADMIS'
                          ? 'mok'
                          : 'mko'
                      }
                    >
                      {ligne.decision}
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: 12.5,
                      color: 'var(--ink-2)',
                    }}
                  >
                    Crédits validés :{' '}
                    <strong>
                      {ligne.total_credits_valides}/
                      {ligne.total_credits_semestre}
                    </strong>
                  </div>
                </div>
              </div>


              <div style={{ overflowX: 'auto' }}>
                <style>{`
                  .student-results-table th,
                  .student-results-table td {
                    text-align: center !important;
                    vertical-align: middle !important;
                    white-space: nowrap;
                  }
                `}</style>

                <table
                  className="table student-results-table"
                  style={{
                    width: '100%',
                    minWidth: 760,
                  }}
                >
                  <thead>
                    <tr>
                      <th
                        style={{
                          textAlign: 'center',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Unité d'Enseignement
                      </th>

                      <th
                        style={{
                          textAlign: 'center',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Matière
                      </th>

                      <th
                        style={{
                          textAlign: 'center',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Devoir /20
                      </th>

                      <th
                        style={{
                          textAlign: 'center',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Session /20
                      </th>

                      <th
                        style={{
                          textAlign: 'center',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Moyenne UE
                      </th>

                      <th
                        style={{
                          textAlign: 'center',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Validée
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {ligne.ues_detail.map((ueD, i) =>
                      ueD.matieres.map((m, j) => (
                        <tr key={`${i}-${j}`}>
                          {j === 0 && (
                            <td
                              rowSpan={ueD.matieres.length}
                              style={{
                                textAlign: 'center',
                                fontWeight: 600,
                                verticalAlign: 'middle',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {ueD.ue_nom}
                            </td>
                          )}

                          <td
                            style={{
                              textAlign: 'center',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {m.nom}
                          </td>

                          <td
                            style={{
                              textAlign: 'center',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {m.non_saisi ? (
                              '—'
                            ) : m.is_absent ? (
                              <span
                                style={{
                                  color: 'var(--ink-3)',
                                }}
                              >
                                ABS
                              </span>
                            ) : (
                              <span>
                                {m.note_devoir != null
                                  ? Number(
                                      m.note_devoir
                                    ).toFixed(2)
                                  : '—'}
                              </span>
                            )}
                          </td>

                          <td
                            style={{
                              textAlign: 'center',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {m.non_saisi ? (
                              '—'
                            ) : m.is_absent ? (
                              <span
                                style={{
                                  color: 'var(--ink-3)',
                                }}
                              >
                                ABS
                              </span>
                            ) : (
                              <span>
                                {m.note_session != null
                                  ? Number(
                                      m.note_session
                                    ).toFixed(2)
                                  : '—'}
                              </span>
                            )}
                          </td>

                          {j === 0 && (
                            <>
                              <td
                                rowSpan={ueD.matieres.length}
                                style={{
                                  textAlign: 'center',
                                  verticalAlign: 'middle',
                                }}
                              >
                                <span
                                  className={
                                    ueD.moyenne_ue >= 10
                                      ? 'mok'
                                      : ueD.moyenne_ue < 6
                                      ? 'mko'
                                      : 'mmid'
                                  }
                                >
                                  {ueD.moyenne_ue.toFixed(2)}
                                </span>
                              </td>

                              <td
                                rowSpan={ueD.matieres.length}
                                style={{
                                  textAlign: 'center',
                                  verticalAlign: 'middle',
                                }}
                              >
                                {ueD.est_validee ? (
                                  <span
                                    style={{
                                      color:
                                        'var(--success)',
                                      fontWeight: 700,
                                    }}
                                  >
                                    Oui
                                  </span>
                                ) : (
                                  <span
                                    style={{
                                      color:
                                        'var(--danger)',
                                    }}
                                  >
                                    Non
                                  </span>
                                )}
                              </td>
                            </>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })
      ) : (
        <div className="empty-box">
          {!en_regle
            ? 'Résultats du semestre en cours masqués. Régularisez votre situation financière.'
            : 'Aucun résultat disponible pour le moment.'}
        </div>
      )}
    </>
  )
}