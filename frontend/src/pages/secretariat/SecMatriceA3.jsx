import { useEffect, useState } from 'react'
import Shell, { Alerts, useAlerts } from '../../shared/Shell'
import {
  navSecretariat,
  SEC_ACCUEIL,
  SEC_LOGOUT,
} from '../../shared/nav-secretariat'
import { apiGet } from '../../shared/api'

const SEMESTRES_LIST = [
  'S1',
  'S2',
  'S3',
  'S4',
  'S5',
  'S6',
]

export default function SecMatriceA3({ pageTitle, userLabel }) {
  const [fac_id, setFacId] = useState('')
  const [sem, setSem] = useState('')
  const [portail_id, setPortailId] = useState('')
  const [filiere_id, setFiliereId] = useState('')

  const [facultes, setFacultes] = useState([])
  const [portails, setPortails] = useState([])
  const [filieres, setFilieres] = useState([])

  const { alerts, push, clear } = useAlerts()
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    let actif = true

    apiGet('/api/secretariat/facultes/')
      .then((d) => {
        if (!actif) return

        const list = Array.isArray(d)
          ? d
          : Array.isArray(d?.facultes)
            ? d.facultes
            : []

        const facultesNormalisees = list
          .map((f) => ({
            ...f,
            id: String(f.id),
          }))
          .filter(
            (f) =>
              f.id &&
              f.id !== 'undefined' &&
              f.id !== 'null'
          )

        setFacultes(facultesNormalisees)
      })
      .catch((err) => {
        if (!actif) return

        push(
          'Erreur chargement facultés : ' +
            (err?.message ||
              'Impossible de charger les facultés.'),
          'danger'
        )
      })

    return () => {
      actif = false
    }
  }, [])

  useEffect(() => {
    setPortailId('')
    setFiliereId('')
    setPortails([])
    setFilieres([])

    if (!fac_id) {
      return
    }

    let actif = true

    const chargerDonnees = async () => {
      try {
        const [
          portailsData,
          filieresData,
        ] = await Promise.all([
          apiGet(
            `/api/portails/?faculte_id=${encodeURIComponent(
              fac_id
            )}`
          ),
          apiGet(
            `/api/filieres/?faculte_id=${encodeURIComponent(
              fac_id
            )}`
          ),
        ])

        if (!actif) return

        const listePortails =
          Array.isArray(portailsData)
            ? portailsData
            : Array.isArray(portailsData?.portails)
              ? portailsData.portails
              : []

        setPortails(
          listePortails.map((p) => ({
            ...p,
            id: String(p.id),
          }))
        )

        const listeFilieres =
          Array.isArray(filieresData)
            ? filieresData
            : Array.isArray(filieresData?.filieres)
              ? filieresData.filieres
              : []

        setFilieres(
          listeFilieres.map((f) => ({
            ...f,
            id: String(f.id),
          }))
        )
      } catch (err) {
        if (!actif) return

        push(
          'Erreur lors du chargement des portails ou filières.',
          'danger'
        )
      }
    }

    chargerDonnees()

    return () => {
      actif = false
    }
  }, [fac_id])

  const semNum = sem
    ? parseInt(sem.replace('S', ''), 10)
    : 0

  const isPortailPhase =
    semNum > 0 && semNum <= 2

  const isFilierePhase =
    semNum > 2

  const generer = (e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    clear()

    if (!fac_id || !sem) {
      push(
        'Sélectionnez une faculté et un semestre.',
        'danger'
      )
      return
    }

    if (isPortailPhase && !portail_id) {
      push(
        'Sélectionnez un portail pour ce semestre.',
        'danger'
      )
      return
    }

    if (isFilierePhase && !filiere_id) {
      push(
        'Sélectionnez une filière pour ce semestre.',
        'danger'
      )
      return
    }

    setChecking(true)

    try {
      const params = new URLSearchParams()

      params.set(
        'faculte',
        String(fac_id)
      )

      params.set(
        'semestre',
        String(sem)
      )

      if (isPortailPhase && portail_id) {
        params.set(
          'portail',
          String(portail_id)
        )
      }

      if (isFilierePhase && filiere_id) {
        params.set(
          'filiere',
          String(filiere_id)
        )
      }

      /*
       * UNE SEULE MATRICE.
       * Aucun window.open().
       */
      const matrixUrl =
        `/secretaire/matrice-a3/?${params.toString()}`

      window.location.assign(matrixUrl)

    } catch (err) {
      push(
        'Erreur lors de l’ouverture de la matrice : ' +
          (err?.message ||
            'Erreur inconnue.'),
        'danger'
      )

      setChecking(false)
    }
  }

  return (
    <Shell
      navSections={navSecretariat('sec_matrice_a3')}
      pageTitle={pageTitle}
      accueilHref={SEC_ACCUEIL}
      logoutHref={SEC_LOGOUT}
      userLabel={userLabel}
      userRole="Secrétariat"
    >
      <Alerts items={alerts} />

      <div
        className="card"
        style={{
          padding: 28,
          maxWidth: 640,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 18,
          }}
        >
          <div
            className="scard-ic"
            style={{
              background: 'var(--danger-tint)',
              color: 'var(--danger)',
            }}
          >
            <i className="fas fa-file-pdf" />
          </div>

          <div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                fontSize: 16,
              }}
            >
              Matrice A3 de délibération
            </div>

            <div
              style={{
                fontSize: 12.5,
                color: 'var(--ink-3)',
              }}
            >
              Affichage de la matrice avant impression ou téléchargement.
            </div>
          </div>
        </div>

        <div
          className="row-g"
          style={{
            alignItems: 'flex-end',
          }}
        >
          <div className="col-flex">
            <label className="fl">
              Faculté
            </label>

            <select
              className="form-select"
              value={fac_id}
              onChange={(e) => {
                const value = e.target.value

                setFacId(value)
                setPortailId('')
                setFiliereId('')
              }}
            >
              <option value="">
                — Sélectionner —
              </option>

              {facultes.map((f) => (
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
              Semestre
            </label>

            <select
              className="form-select"
              value={sem}
              onChange={(e) => {
                setSem(e.target.value)
                setPortailId('')
                setFiliereId('')
              }}
            >
              <option value="">
                — Semestre —
              </option>

              {SEMESTRES_LIST.map((s) => (
                <option
                  key={s}
                  value={s}
                >
                  Sem. {s.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div
            className="col-flex"
            style={{
              opacity: isPortailPhase ? 1 : 0.4,
            }}
          >
            <label className="fl">
              Portail
            </label>

            <select
              className="form-select"
              disabled={
                !isPortailPhase ||
                !fac_id
              }
              value={portail_id}
              onChange={(e) => {
                setPortailId(e.target.value)
              }}
            >
              <option value="">
                — Choisir —
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

          <div
            className="col-flex"
            style={{
              opacity: isFilierePhase ? 1 : 0.4,
            }}
          >
            <label className="fl">
              Filière
            </label>

            <select
              className="form-select"
              disabled={
                !isFilierePhase ||
                !fac_id
              }
              value={filiere_id}
              onChange={(e) => {
                setFiliereId(e.target.value)
              }}
            >
              <option value="">
                — Choisir —
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
        </div>

        <button
          type="button"
          className="btn btn-danger"
          style={{
            width: '100%',
            justifyContent: 'center',
            padding: '11px 0',
            marginTop: 16,
          }}
          onClick={generer}
          disabled={checking}
        >
          <i className="fas fa-table" />

          {checking
            ? 'Ouverture…'
            : 'Afficher la Matrice A3'}
        </button>
      </div>
    </Shell>
  )
}