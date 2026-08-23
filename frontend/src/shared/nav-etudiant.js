export function navEtudiant(active) {
  const on = (key) => key === active

  return [
    {
      title: 'Mon espace',
      items: [
        {
          href: '/etudiant/dashboard/',
          icon: 'fas fa-house',
          label: 'Tableau de bord',
          active: on('etu_dashboard'),
        },
        {
          href: '/etudiant/dashboard/?vue=programme',
          icon: 'fas fa-book-open',
          label: 'Programme du semestre',
          active: on('etu_programme'),
        },
        {
          href: '/etudiant/dashboard/?vue=resultats',
          icon: 'fas fa-chart-simple',
          label: 'Mes résultats',
          active: on('etu_resultats'),
        },
      ],
    },
  ]
}

export const ETU_ACCUEIL = '/'
export const ETU_LOGOUT = '/etudiant/deconnexion/'