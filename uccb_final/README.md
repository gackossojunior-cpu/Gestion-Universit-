# UCCB — Système de Gestion Académique (Version Finale)
## Mode d'emploi complet — Django 5.x + MySQL

---

## STRUCTURE DU PROJET

```
uccb_final/                          ← Ouvrir CE dossier dans PyCharm
├── manage.py                        ← À la racine (lancer les commandes ici)
├── requirements.txt
├── README.md
├── static/
│   └── gestion_eleves/
│       ├── img/
│       │   └── logo_uccb.jpg        ← PLACER LE LOGO ICI
│       └── js/
│           └── admin_etudiant.js    ← Filtre dynamique Admin Django
├── media/
│   └── logos/
├── uccb_project/                    ← Configuration Django
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
└── gestion_eleves/                  ← Application principale
    ├── models.py                    ← Modèles de données
    ├── engine.py                    ← Moteur de calcul des moyennes
    ├── decorators.py                ← Contrôle d'accès par rôle
    ├── views_auth.py                ← Connexion / Déconnexion
    ├── views_secretaire.py          ← Interface Secrétaire
    ├── views_enseignant.py          ← Interface Enseignant
    ├── admin.py                     ← Interface Django Admin
    ├── urls.py                      ← Routes URL
    ├── templatetags/
    │   └── custom_filters.py
    └── templates/
        └── gestion_eleves/
            ├── auth/                ← Pages de connexion
            ├── secretaire/          ← Templates secrétaire
            ├── enseignant/          ← Templates enseignant
            └── documents/           ← Attestation, relevé, A3, QR
```

---

## ÉTAPE 1 — CRÉER LA BASE DE DONNÉES MySQL

Ouvrez **MySQL Workbench**, connectez-vous et exécutez :

```sql
CREATE DATABASE uccb_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

---

## ÉTAPE 2 — OUVRIR DANS PYCHARM

1. `File → Open` → sélectionnez le dossier **`uccb_final`**
2. PyCharm propose de créer un virtualenv → **Acceptez**
3. Sinon : `File → Settings → Project → Python Interpreter → Add → Virtualenv`

---

## ÉTAPE 3 — INSTALLER LES DÉPENDANCES

Dans le terminal PyCharm (onglet "Terminal" en bas) :

```bash
pip install -r requirements.txt
```

> **Si mysqlclient échoue sur Windows :**
> Installez d'abord Visual C++ Build Tools :
> https://visualstudio.microsoft.com/visual-cpp-build-tools/
> Puis relancez : `pip install mysqlclient`

---

## ÉTAPE 4 — CONFIGURER LE MOT DE PASSE MySQL

Ouvrez `uccb_project/settings.py`, ligne `PASSWORD` :

```python
DATABASES = {
    'default': {
        ...
        'PASSWORD': 'VOTRE_MOT_DE_PASSE_ICI',
        ...
    }
}
```

---

## ÉTAPE 5 — MIGRATIONS

```bash
python manage.py makemigrations gestion_eleves
python manage.py migrate
```

Vérifiez dans MySQL Workbench (F5 pour rafraîchir) que les tables sont créées.

---

## ÉTAPE 6 — CRÉER LE SUPERUSER (Secrétaire)

```bash
python manage.py createsuperuser
```

Exemple :
```
Nom d'utilisateur : admin
Adresse e-mail : admin@uccb.cg
Mot de passe : (choisir un mot de passe fort)
```

Le superuser a accès aux **deux interfaces** (secrétaire ET enseignant).

---

## ÉTAPE 7 — CRÉER LES GROUPES ET COMPTES

Lancez le serveur puis allez dans Django Admin :

```bash
python manage.py runserver
```

Allez sur http://127.0.0.1:8000/django-admin/

### Créer les groupes :
1. `Authentification → Groupes → Ajouter`
2. Créer le groupe **`Secretariat`**
3. Créer le groupe **`Enseignant`**

### Créer un compte enseignant :
1. `Authentification → Utilisateurs → Ajouter`
2. Nom d'utilisateur : ex `prof_martin`
3. Mot de passe : (définir)
4. **NE PAS cocher** "Statut équipe" ni "Statut superutilisateur"
5. Dans "Groupes" → assigner **`Enseignant`**
6. Sauvegarder

### Créer un compte secrétaire (non-superuser) :
1. Même procédure, assigner le groupe **`Secretariat`**
2. Cocher "Statut équipe" pour qu'il puisse accéder à Django Admin

---

## ÉTAPE 8 — PLACER LE LOGO

Copiez votre logo ici :
```
static/gestion_eleves/img/logo_uccb.jpg
```
Le logo apparaît automatiquement sur l'attestation et le relevé de notes.

---

## ÉTAPE 9 — CONFIGURER LES DONNÉES (dans Django Admin)

**Respectez impérativement cet ordre :**

| Ordre | Section | Exemple |
|-------|---------|---------|
| 1 | **Paramètres UCCB** | Nom secrétaire, genre, ville |
| 2 | **Année Académique** | `2024-2025` → cocher "est active" |
| 3 | **Faculté** | FST, nom doyen + genre, vice-doyen |
| 4 | **Portails** | MIP, BCG, PCG → liés à FST |
| 5 | **Filières** | Informatique → liée au portail MIP |
| 6 | **UEs** | S1-S2 → portail · S3+ → filière |
| 7 | **Matières** | Liées à une UE, avec crédits |
| 8 | **Étudiants** | Matricule généré automatiquement |

> ⚠️ Dans le formulaire étudiant : choisissez d'abord la **Faculté**, le menu
> **Portail** et **Filière** se mettent à jour automatiquement grâce au JS.

---

## ACCÈS AUX INTERFACES

| URL | Interface | Qui peut se connecter |
|-----|-----------|----------------------|
| `http://127.0.0.1:8000/` | Secrétaire | Superuser ou groupe Secretariat |
| `http://127.0.0.1:8000/enseignant/` | Enseignant | Superuser ou groupe Enseignant |
| `http://127.0.0.1:8000/django-admin/` | Admin Django | Superuser ou staff |
| `http://127.0.0.1:8000/notes-etudiant/{id}/` | QR Code | Public (sans connexion) |

---

## LOGIQUE MÉTIER

### Portail vs Filière
```
S1 → S2 : Portail (Tronc commun)
           Exemples FST : MIP · BCG · PCG

S3 → S6 : Filière (Spécialisation)
           Exemples : Informatique (via MIP) · Biologie (via BCG)

Règle : Un étudiant ne peut pas avoir portail ET filière simultanément.
        Le système l'interdit automatiquement.
```

### Format du Matricule
```
UCCB 24 POA JO 00042
  │   │  │   │   └── Numéro séquentiel (5 chiffres)
  │   │  │   └────── 2 premières lettres du prénom
  │   │  └────────── 3 premières lettres du nom
  │   └───────────── Année d'inscription (2 derniers chiffres)
  └───────────────── Sigle université
```

### Validation de la date de naissance
- L'étudiant doit avoir **au moins 10 ans** (date > aujourd'hui - 10 ans)
- L'étudiant ne peut pas avoir **plus de 80 ans**
- La date ne peut pas être **dans le futur**

### Calcul des Moyennes pondérées
```
Note d'une matière :
  Normale    = (Devoir + Session) / 2
  Rattrapage = max( (D+S)/2 ,  (D + 2×SR) / 3 )
  Absent     = 0

Note éliminatoire : toute note < 6/20

Moyenne UE = Σ(note_mat × crédits_mat) / Σ(crédits_mat)

Moyenne Semestre = Σ(note_mat × crédits) / Σ(tous crédits semestre)

Décision ADMIS = Moyenne ≥ 10 ET aucune note < 6/20

Mentions :
  PASSABLE   → 10 ≤ moy < 12
  ASSEZ BIEN → 12 ≤ moy < 14
  BIEN       → 14 ≤ moy < 16
  TRÈS BIEN  → moy ≥ 16
```

### QR Code du Relevé
Le QR Code renvoie vers `/notes-etudiant/{id}/`
- Page **publique** (sans connexion)
- Affiche le **détail complet** : toutes les matières de l'étudiant
- Devoir / Session / Rattrapage / Note finale par matière
- Décision et mention
- **Uniquement les données de cet étudiant**

### Matrice A3
- Format **A3 paysage** généré en PDF par xhtml2pdf
- Colonnes : N° · Nom · Sexe · Semestre · [Notes D/S/R + moyenne par matière] · Moy. générale · Crédits · Décision
- Colorisation : vert = admis · rouge = ajourné
- Signataire : **Doyen(ne)** de la faculté (PAS le secrétaire)
- Accessible depuis les **deux interfaces** (secrétaire et enseignant)

---

## RÉSOLUTION DE PROBLÈMES FRÉQUENTS

### `ModuleNotFoundError: No module named 'MySQLdb'`
```bash
pip install mysqlclient
```

### `django.db.utils.OperationalError: (1049, "Unknown database 'uccb_db'")`
Créez la base dans MySQL Workbench :
```sql
CREATE DATABASE uccb_db CHARACTER SET utf8mb4;
```

### `Access denied for user 'root'@'localhost'`
Vérifiez le mot de passe dans `settings.py` → `DATABASES['default']['PASSWORD']`

### Le logo n'apparaît pas dans les documents
Placez `logo_uccb.jpg` dans `static/gestion_eleves/img/`

### La matrice A3 ne s'ouvre pas
xhtml2pdf doit être installé : `pip install xhtml2pdf reportlab`

---

*UCCB — Université Catholique du Congo-Brazzaville © 2025*
