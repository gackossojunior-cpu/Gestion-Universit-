// Client fetch minimal. On envoie 'same-origin' pour que le cookie de
// session Django (etudiant_id) parte avec chaque requête — c'est ce qui
// fait marcher l'auth sans rien changer côté serveur.
export async function apiGet(path) {
  const res = await fetch(path, {
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  })
  if (res.status === 401) {
    window.location.href = '/etudiant/connexion/'
    return null
  }
  if (!res.ok) {
    throw new Error(`Erreur API ${res.status} sur ${path}`)
  }
  return res.json()
}
