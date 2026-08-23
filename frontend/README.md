# Frontend React — UCCB (migration complète)

## État de la migration

**Migré en React** (Django ne sert plus que l'API JSON + une coquille HTML) :
- Espace Étudiant : Dashboard
- Espace Faculté : Dashboard, Liste de Classe, Saisie des Notes, Note Individuelle,
  Délibération, Passage de Semestre (Promotion), Orientation S3
- Espace Secrétariat : Dashboard, Liste des Étudiants, Ajouter un Étudiant,
  Années Académiques, Facultés

**Volontairement laissé en Django classique** (aucun gain à migrer) :
- Connexion / déconnexion / réinitialisation de mot de passe (formulaires
  d'authentification — la frontière d'auth reste côté serveur)
- Génération de documents PDF (Matrice A3, Attestation, Relevé de notes, QR code
  étudiant) — ce sont des documents, pas des pages d'interface ; xhtml2pdf reste
  côté serveur. Les formulaires de filtre qui précèdent ces PDF (`matrice_a3_filtre.html`)
  restent aussi en Django classique + le JS existant (`api/portails/`, `api/filieres/`)
  puisqu'ils ne font que paramétrer un téléchargement.

L'ancien espace "Enseignant" (dupliqué avec l'espace Faculté) a été supprimé :
`views_enseignant.py` et ses templates ne servaient plus (toutes les routes
`enseignant/*` redirigeaient déjà vers l'espace Faculté).

## Principe d'architecture
- Django reste le backend : auth par session, permissions (`@faculte_required`,
  `@secretaire_required`), calculs métier (`engine.py`), génération PDF.
- Chaque page migrée a une URL Django dédiée (ex. `/faculte/saisie-notes/`) qui
  rend une coquille commune (`react_shell.html`) avec un `<div id="root">` et un
  bundle JS. Pas de routeur côté client : chaque page reste une vraie URL Django
  (bookmarking, permissions serveur, et navigation par simples `<a href>` entre
  pages — cohérent avec l'architecture "React ajouté progressivement" choisie).
- Auth : cookie de session Django + header `X-CSRFToken` sur les écritures
  (déposé par `{% csrf_token %}` dans `react_shell.html`). Aucun changement
  d'authentification.
- API JSON : `gestion_eleves/api_faculte.py` et `api_secretariat.py` réutilisent
  la même logique métier que les anciennes vues (aucune règle recalculée ou
  dupliquée) — seule la sortie change (JSON au lieu de HTML).
- Le build Vite sort dans `../static/gestion_eleves/dist/`, donc
  `collectstatic` le prend en compte comme n'importe quel fichier statique.

## Installation (une seule fois)
```bash
cd frontend
npm install
```

## Build
```bash
npm run build
```
Puis rafraîchir la page Django normalement (`python manage.py runserver` doit tourner).
Il n'y a pas de hot-reload configuré : après chaque modification, relancer `npm run build`.

⚠️ Cette base de code a été préparée sans accès réseau côté outil, donc le
build n'a **pas pu être exécuté ni testé automatiquement** ici. Fais un premier
`npm install && npm run build` chez toi et remonte-moi toute erreur — je
corrigerai.

## Ajouter une nouvelle page migrée
1. Créer `src/pages/<espace>/<Nom>.jsx` (composant) + `src/pages/<espace>/<slug>.jsx` (point d'entrée qui monte le composant sur `#root`).
2. Ajouter l'entrée dans `vite.config.js` → `rollupOptions.input`.
3. `npm run build`.
4. Dans `views_<espace>.py`, faire pointer la vue vers `react_shell.html` avec `'entry': '<slug>'`.
5. Créer/étendre la vue API DRF correspondante dans `gestion_eleves/api_<espace>.py`
   en réutilisant la logique déjà existante (ne pas dupliquer les calculs).

