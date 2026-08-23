import { useEffect, useMemo, useState } from 'react'
import Shell, { Alerts, useAlerts } from '../../shared/Shell'
import { navSecretariat, SEC_ACCUEIL, SEC_LOGOUT } from '../../shared/nav-secretariat'
import { apiGet, apiPost } from '../../shared/api'

const SEMESTRES_INSCRIPTION = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6']

const VIDE = {
  nom: '',
  prenom: '',
  genre: '',
  date_naissance: '',
  nationalite: 'Congolaise',
  email: '',
  telephone: '',
  faculte: '',
  annee_academique: '',
  semestre: 'S1',
  portail: '',
  filiere: '',
  en_regle: true,
}

export default function SecAjouterEtudiant({ pageTitle, userLabel }) {
  const [meta, setMeta] = useState(null)
  const [form, setForm] = useState(VIDE)
  const { alerts, push, clear } = useAlerts()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    apiGet('/api/secretariat/etudiant/ajouter/')
      .then(setMeta)
      .catch((e) => push(e.message, 'danger'))
  }, [])

  const set = (k, v) => {
    setForm((f) => ({
      ...f,
      [k]: v
    }))
  }

  const isS1S2 =
    form.semestre === 'S1' ||
    form.semestre === 'S2'

  const portailsFiltres = useMemo(
    () =>
      (meta?.portails || []).filter(
        (p) =>
          !form.faculte ||
          String(p.faculte_id) === String(form.faculte)
      ),
    [meta, form.faculte]
  )

  const filieresFiltrees = useMemo(
    () =>
      (meta?.filieres || []).filter(
        (f) =>
          !form.faculte ||
          String(f.faculte_id) === String(form.faculte)
      ),
    [meta, form.faculte]
  )

  const dateNaissanceValide = (val) => {
    if (!val) return true

    const dob = new Date(val)
    const today = new Date()

    let age =
      today.getFullYear() -
      dob.getFullYear()

    const mois =
      today.getMonth() -
      dob.getMonth()

    if (
      mois < 0 ||
      (mois === 0 &&
        today.getDate() < dob.getDate())
    ) {
      age--
    }

    if (age < 17) {
      alert(
        "L'étudiant doit avoir au moins 17 ans."
      )
      return false
    }

    return true
  }

  const soumettre = async (e) => {
    e.preventDefault()

    clear()
    setSaving(true)

    try {
      const res = await apiPost(
        '/api/secretariat/etudiant/ajouter/',
        form
      )

      push(
        `✅ ${res.detail}`,
        'success'
      )

      setForm({
        ...VIDE
      })

    } catch (err) {
      push(
        err.message,
        'danger'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Shell
      navSections={navSecretariat(
        'sec_ajouter_etudiant'
      )}
      pageTitle={pageTitle}
      accueilHref={SEC_ACCUEIL}
      logoutHref={SEC_LOGOUT}
      userLabel={userLabel}
      userRole="Secrétariat"
    >
      <Alerts items={alerts} />

      {!meta ? (
        <p>Chargement…</p>
      ) : (
        <div
          className="card"
          style={{
            padding: 24
          }}
        >
          <form
            onSubmit={soumettre}
            className="row-g"
            style={{
              marginBottom: 0
            }}
          >

            {/* IDENTITÉ */}
            <div
              style={{
                flexBasis: '100%'
              }}
            >
              <h6
                style={{
                  fontWeight: 700,
                  borderBottom: '1px solid #eee',
                  paddingBottom: 8
                }}
              >
                Identité
              </h6>
            </div>

            <div className="col-flex">
              <label className="fl">
                Nom *
              </label>

              <input
                className="form-control"
                required
                placeholder="NOM"
                value={form.nom}
                onChange={(e) =>
                  set('nom', e.target.value)
                }
              />
            </div>

            <div className="col-flex">
              <label className="fl">
                Prénom *
              </label>

              <input
                className="form-control"
                required
                placeholder="Prénom"
                value={form.prenom}
                onChange={(e) =>
                  set('prenom', e.target.value)
                }
              />
            </div>

            <div className="col-flex">
              <label className="fl">
                Genre *
              </label>

              <select
                className="form-select"
                required
                value={form.genre}
                onChange={(e) =>
                  set('genre', e.target.value)
                }
              >
                <option value="">
                  —
                </option>

                <option value="M">
                  Masculin
                </option>

                <option value="F">
                  Féminin
                </option>
              </select>
            </div>

            <div className="col-flex">
              <label className="fl">
                Date de naissance *
              </label>

              <input
                type="date"
                className="form-control"
                required
                value={form.date_naissance}
                onChange={(e) => {
                  if (
                    dateNaissanceValide(
                      e.target.value
                    )
                  ) {
                    set(
                      'date_naissance',
                      e.target.value
                    )
                  }
                }}
              />
            </div>

            <div className="col-flex">
              <label className="fl">
                Nationalité
              </label>

              <input
                className="form-control"
                value={form.nationalite}
                onChange={(e) =>
                  set(
                    'nationalite',
                    e.target.value
                  )
                }
              />
            </div>

            {/* EMAIL + TÉLÉPHONE */}
            <div
              style={{
                flexBasis: '100%',
                display: 'grid',
                gridTemplateColumns:
                  'repeat(2, minmax(0, 1fr))',
                gap: 16
              }}
            >
              <div>
                <label className="fl">
                  Email universitaire *
                </label>

                <input
                  type="email"
                  className="form-control"
                  required
                  placeholder="prenom.nom@uccb.cg"
                  value={form.email}
                  onChange={(e) =>
                    set(
                      'email',
                      e.target.value
                    )
                  }
                />
              </div>

              <div>
                <label className="fl">
                  Numéro de téléphone
                </label>

                <input
                  type="tel"
                  className="form-control"
                  placeholder="+242 06 XXX XX XX"
                  value={form.telephone}
                  onChange={(e) =>
                    set(
                      'telephone',
                      e.target.value
                    )
                  }
                />

                <small
                  style={{
                    color: 'var(--ink-3)',
                    display: 'block',
                    marginTop: 4
                  }}
                >
                  Exemple : +242 06 123 45 67
                </small>
              </div>
            </div>

            {/* CURSUS */}
            <div
              style={{
                flexBasis: '100%',
                marginTop: 12
              }}
            >
              <h6
                style={{
                  fontWeight: 700,
                  borderBottom:
                    '1px solid #eee',
                  paddingBottom: 8
                }}
              >
                Cursus
              </h6>
            </div>

            <div className="col-flex">
              <label className="fl">
                Faculté *
              </label>

              <select
                className="form-select"
                required
                value={form.faculte}
                onChange={(e) =>
                  set(
                    'faculte',
                    e.target.value
                  )
                }
              >
                <option value="">
                  — Sélectionner —
                </option>

                {meta.facultes.map((f) => (
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
                Année Académique *
              </label>

              <select
                className="form-select"
                required
                value={
                  form.annee_academique
                }
                onChange={(e) =>
                  set(
                    'annee_academique',
                    e.target.value
                  )
                }
              >
                <option value="">
                  — Sélectionner —
                </option>

                {meta.annees.map((a) => (
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
                Semestre *
              </label>

              <select
                className="form-select"
                required
                value={form.semestre}
                onChange={(e) =>
                  set(
                    'semestre',
                    e.target.value
                  )
                }
              >
                {SEMESTRES_INSCRIPTION.map(
                  (s) => (
                    <option
                      key={s}
                      value={s}
                    >
                      {s}
                    </option>
                  )
                )}
              </select>
            </div>

            <div
              className="col-flex"
              style={{
                opacity: isS1S2 ? 1 : 0.4
              }}
            >
              <label className="fl">
                Portail (S1-S2)
              </label>

              <select
                className="form-select"
                disabled={!isS1S2}
                value={form.portail}
                onChange={(e) =>
                  set(
                    'portail',
                    e.target.value
                  )
                }
              >
                <option value="">
                  — Aucun —
                </option>

                {portailsFiltres.map(
                  (p) => (
                    <option
                      key={p.id}
                      value={p.id}
                    >
                      {p.nom}
                    </option>
                  )
                )}
              </select>
            </div>

            <div
              className="col-flex"
              style={{
                opacity: !isS1S2
                  ? 1
                  : 0.4
              }}
            >
              <label className="fl">
                Filière (S3+)
              </label>

              <select
                className="form-select"
                disabled={isS1S2}
                value={form.filiere}
                onChange={(e) =>
                  set(
                    'filiere',
                    e.target.value
                  )
                }
              >
                <option value="">
                  — Aucune —
                </option>

                {filieresFiltrees.map(
                  (f) => (
                    <option
                      key={f.id}
                      value={f.id}
                    >
                      {f.nom}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* FINANCES */}
            <div
              style={{
                flexBasis: '100%',
                marginTop: 12
              }}
            >
              <h6
                style={{
                  fontWeight: 700,
                  borderBottom:
                    '1px solid #eee',
                  paddingBottom: 8
                }}
              >
                Statut financier
              </h6>
            </div>

            <div
              className="col-flex"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                paddingTop: 6
              }}
            >
              <input
                type="checkbox"
                checked={form.en_regle}
                onChange={(e) =>
                  set(
                    'en_regle',
                    e.target.checked
                  )
                }
              />

              <label>
                Étudiant en règle financièrement
              </label>
            </div>

            {/* BOUTONS */}
            <div
              style={{
                flexBasis: '100%',
                marginTop: 16,
                display: 'flex',
                gap: 12
              }}
            >
              <button
                type="submit"
                className="btn btn-navy"
                disabled={saving}
              >
                {saving
                  ? 'Enregistrement…'
                  : "Enregistrer l'étudiant"}
              </button>

              <a
                href="/secretaire/etudiants/"
                className="btn btn-outline"
              >
                Annuler
              </a>
            </div>

          </form>
        </div>
      )}
    </Shell>
  )
}