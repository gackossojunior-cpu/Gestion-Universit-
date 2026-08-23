// Chemins Django réels (voir gestion_eleves/urls.py) — pas de routeur
// côté client, chaque page reste une URL Django distincte pour garder les
// permissions serveur (@faculte_required) et le bookmarking.
export function navFaculte(active) {
  const on = (key) => key === active
  return [
    {
      title: 'Navigation',
      items: [
        { href: '/faculte/dashboard/', icon: 'fas fa-home', label: 'Accueil', active: on('fac_dashboard') },
        { href: '/faculte/classe/', icon: 'fas fa-users', label: 'Liste de Classe', active: on('fac_liste_classe') },
      ],
    },
    {
      title: 'Notes',
      items: [
        { href: '/faculte/saisie-notes/', icon: 'fas fa-pen', label: 'Saisie des Notes', active: on('fac_saisie_notes') },
        { href: '/faculte/deliberation/', icon: 'fas fa-calculator', label: 'Délibération', active: on('fac_deliberation') },
      ],
    },
    {
      title: 'Passage & Orientation',
      items: [
        { href: '/faculte/promotion/', icon: 'fas fa-arrow-up', label: 'Passage Semestre', active: on('sec_promotion') },
        { href: '/faculte/orientation-s3/', icon: 'fas fa-route', label: 'Orientation S3', active: on('sec_orientation_s3') },
      ],
    },
    {
      title: 'Personnel enseignant',
      items: [
        { href: '/faculte/enseignants/', icon: 'fas fa-chalkboard-user', label: 'Enseignants', active: on('fac_enseignants') },
      ],
    },
    {
      title: 'Exports',
      items: [
        { href: '/faculte/matrice-a3/', icon: 'fas fa-file-pdf', label: 'Matrice A3 PDF', active: on('fac_matrice_a3') },
      ],
    },
  ]
}

export const FAC_ACCUEIL = '/'
export const FAC_LOGOUT = '/faculte/deconnexion/'
