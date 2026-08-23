import { useEffect, useState } from 'react'
import Shell, { Alerts, useAlerts } from '../../shared/Shell'
import {
  navFaculte,
  FAC_ACCUEIL,
  FAC_LOGOUT
} from '../../shared/nav-faculte'
import FilterBar from '../../shared/FilterBar'
import { apiGet } from '../../shared/api'

export default function FacMatriceA3({ pageTitle, userLabel }) {
  const [filtres, setFiltres] = useState({
    fac_id: '',
    sem: '',
    portail_id: '',
    filiere_id: '',
  })

  const [facultes, setFacultes] = useState([])
  const [semestres, setSemestres] = useState([])

  const { alerts, push, clear } = useAlerts()
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    let actif = true

    apiGet('/api/faculte/dashboard/')
      .then((d) => {
        if (!actif) return

        if (Array.isArray(d?.facultes)) {
          setFacultes(d.facultes)
        }

        if (Array.isArray(d?.semestres)) {
          setSemestres(d.semestres)
        }
      })
      .catch((err) => {
        if (!actif) return

        push(
          'Erreur lors du chargement des filtres.',
          'danger'
        )
      })

    return () => {
      actif = false
    }
  }, [])

  const generer = (e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    clear()

    if (!filtres.fac_id || !filtres.sem) {
      push(
        'Sélectionnez une faculté et un semestre.',
        'danger'
      )
      return
    }

    setChecking(true)

    try {
      const params = new URLSearchParams()

      params.set('faculte', String(filtres.fac_id))
      params.set('semestre', String(filtres.sem))

      if (filtres.portail_id) {
        params.set(
          'portail',
          String(filtres.portail_id)
        )
      }

      if (filtres.filiere_id) {
        params.set(
          'filiere',
          String(filtres.filiere_id)
        )
      }

      /*
       * UNE SEULE DESTINATION :
       * la page Django qui contient la matrice.
       */
      const matrixUrl =
        `/faculte/matrice-a3/?${params.toString()}`

      window.location.assign(matrixUrl)

    } catch (err) {
      push(
        'Erreur lors de l’ouverture de la matrice : ' +
          (err?.message || 'Erreur inconnue.'),
        'danger'
      )

      setChecking(false)
    }
  }

  return (
    <Shell
      navSections={navFaculte('fac_matrice_a3')}
      pageTitle={pageTitle}
      accueilHref={FAC_ACCUEIL}
      logoutHref={FAC_LOGOUT}
      userLabel={userLabel}
      userRole="Faculté"
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

        <FilterBar
          facultes={facultes}
          semestres={semestres}
          value={filtres}
          onChange={(p) =>
            setFiltres((f) => ({
              ...f,
              ...p,
            }))
          }
        />

        <button
          type="button"
          className="btn btn-danger"
          style={{
            width: '100%',
            justifyContent: 'center',
            padding: '11px 0',
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