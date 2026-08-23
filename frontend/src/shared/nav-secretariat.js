export function navSecretariat(active) {
  const on = (key) => key === active
  return [
    {
      title: 'Principal',
      items: [
        { href: '/secretaire/dashboard/', icon: 'fas fa-home', label: 'Tableau de bord', active: on('sec_dashboard') },
        { href: '/secretaire/etudiants/', icon: 'fas fa-users', label: 'Étudiants', active: on('sec_liste_etudiants') },
      ],
    },
    {
      title: 'Documents',
      items: [
        { href: '/secretaire/matrice-a3/', icon: 'fas fa-file-pdf', label: 'Matrice A3 PDF', active: on('sec_matrice_a3') },
      ],
    },
    {
      title: 'Administration',
      items: [
        { href: '/secretaire/annees/', icon: 'fas fa-calendar-alt', label: 'Années Académiques', active: on('sec_annees_academiques') },
        { href: '/secretaire/facultes/', icon: 'fas fa-university', label: 'Facultés', active: on('sec_facultes') },
      ],
    },
  ]
}

export const SEC_ACCUEIL = '/'
export const SEC_LOGOUT = '/logout/sec/'
