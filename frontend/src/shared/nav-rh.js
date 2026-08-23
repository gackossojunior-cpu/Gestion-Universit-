export function navRh(active) {
  const on = (key) => key === active
  return [
    {
      title: 'Principal',
      items: [
        { href: '/rh/dashboard/', icon: 'fas fa-house', label: 'Tableau de bord', active: on('rh_dashboard') },
      ],
    },
    {
      title: 'Ressources Humaines',
      items: [
        { href: '/rh/enseignants/', icon: 'fas fa-chalkboard-user', label: 'Enseignants', active: on('rh_enseignants') },
        { href: '/rh/personnel/', icon: 'fas fa-users', label: 'Personnel', active: on('rh_personnel') },
      ],
    },
  ]
}

export const RH_ACCUEIL = '/'
export const RH_LOGOUT = '/rh/deconnexion/'