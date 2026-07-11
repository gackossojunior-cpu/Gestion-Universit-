from django.urls import path
from . import views_auth, views_secretaire, views_enseignant, views_etudiant, views_faculte

urlpatterns = [

    # ── PORTAIL ───────────────────────────────────────────────
    path('', views_auth.portail_accueil, name='portail_accueil'),

    # ── AUTHENTIFICATION SECRÉTARIAT ─────────────────────────
    path('connexion/secretaire/',        views_auth.login_secretaire,   name='login_secretaire'),
    path('connexion/secretaire/reset/',  views_auth.reset_mdp_secretaire, name='reset_mdp_secretaire'),
    path('logout/sec/',                  views_auth.logout_secretaire,  name='logout_secretaire'),

    # ── AUTHENTIFICATION ENSEIGNANT (gardé pour compatibilité) ─
    path('connexion/enseignant/',        views_auth.login_enseignant,   name='login_enseignant'),
    path('connexion/enseignant/reset/',  views_auth.reset_mdp_enseignant, name='reset_mdp_enseignant'),
    path('logout/ens/',                  views_auth.logout_enseignant,  name='logout_enseignant'),

    # ── AUTHENTIFICATION ESPACE FACULTÉ ──────────────────────
    path('faculte/connexion/',           views_auth.login_faculte,      name='login_faculte'),
    path('faculte/connexion/reset/',     views_auth.reset_mdp_faculte,  name='reset_mdp_faculte'),
    path('faculte/deconnexion/',         views_auth.logout_faculte,     name='logout_faculte'),

    # ── ESPACE SECRÉTARIAT ────────────────────────────────────
    path('secretaire/dashboard/',        views_secretaire.sec_dashboard,           name='sec_dashboard'),
    path('secretaire/etudiants/',        views_secretaire.sec_liste_etudiants,     name='sec_liste_etudiants'),
    path('secretaire/matrice-a3/',       views_secretaire.sec_matrice_a3,          name='sec_matrice_a3'),
    path('attestation/<int:etudiant_id>/',     views_secretaire.sec_attestation,   name='sec_attestation'),
    path('releve/<int:etudiant_id>/',          views_secretaire.sec_releve,        name='sec_releve'),
    path('etudiant/<int:etudiant_id>/statut/', views_secretaire.sec_changer_statut, name='sec_changer_statut'),

    # ── ESPACE FACULTÉ (calculs, délibération, orientation) ──
    path('faculte/dashboard/',           views_faculte.fac_dashboard,          name='fac_dashboard'),
    path('faculte/classe/',              views_faculte.fac_liste_classe,       name='fac_liste_classe'),
    path('faculte/saisie-notes/',        views_faculte.fac_saisie_notes,       name='fac_saisie_notes'),
    path('faculte/deliberation/',        views_faculte.fac_deliberation,       name='fac_deliberation'),
    path('faculte/note/<int:etudiant_id>/', views_faculte.fac_note_individuelle, name='fac_note_individuelle'),
    path('faculte/matrice-a3/',          views_faculte.fac_matrice_a3,         name='fac_matrice_a3'),

    # Passage semestre et orientation — Espace Faculté
    path('faculte/promotion/',           views_secretaire.sec_promotion,           name='sec_promotion'),
    path('faculte/promotion/appliquer/', views_secretaire.sec_appliquer_promotion, name='sec_appliquer_promotion'),
    path('faculte/orientation-s3/',      views_secretaire.sec_orientation_s3,      name='sec_orientation_s3'),

    # ── ESPACE ÉTUDIANT ───────────────────────────────────────
    path('etudiant/inscription/',        views_etudiant.inscription_etudiant, name='inscription_etudiant'),
    path('etudiant/connexion/',          views_etudiant.login_etudiant,       name='login_etudiant'),
    path('etudiant/deconnexion/',        views_etudiant.logout_etudiant,      name='logout_etudiant'),
    path('etudiant/dashboard/',          views_etudiant.etu_dashboard,        name='etu_dashboard'),
    path('etudiant/reset-mdp/',          views_etudiant.reset_mdp_etudiant,   name='reset_mdp_etudiant'),

    # ── ESPACE ENSEIGNANT (ancien — gardé pour compatibilité) ──
    path('enseignant/dashboard/',    views_enseignant.ens_dashboard,         name='ens_dashboard'),
    path('enseignant/classe/',       views_enseignant.ens_liste_classe,      name='ens_liste_classe'),
    path('enseignant/saisie-notes/', views_enseignant.ens_saisie_notes,      name='ens_saisie_notes'),
    path('enseignant/deliberation/', views_enseignant.ens_deliberation,      name='ens_deliberation'),
    path('enseignant/note/<int:etudiant_id>/', views_enseignant.ens_note_individuelle, name='ens_note_individuelle'),
    path('enseignant/matrice-a3/',   views_enseignant.ens_matrice_a3,        name='ens_matrice_a3'),

    # ── QR CODE PUBLIC ────────────────────────────────────────
    path('notes-etudiant/<int:etudiant_id>/', views_enseignant.vue_qr_etudiant, name='vue_qr_etudiant'),

    # ── API ───────────────────────────────────────────────────
    path('gestion_finance/portails/', views_secretaire.api_portails, name='api_portails'),
    path('gestion_finance/filieres/', views_secretaire.api_filieres, name='api_filieres'),
    path('gestion_finance/ues/',      views_secretaire.api_ues,      name='api_ues'),
]
