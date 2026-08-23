from django.urls import path
from . import views_auth, views_secretaire, views_etudiant, views_faculte, views_rh
from . import api_etudiant, api_faculte, api_secretariat, api_rh

urlpatterns = [

    # ── API REACT (Espace Étudiant) ──────────────────────────
    path('api/etudiant/dashboard/', api_etudiant.api_etudiant_dashboard, name='api_etudiant_dashboard'),

    # ── API REACT (Espace Faculté) ────────────────────────────
    path('api/faculte/dashboard/',           api_faculte.fac_dashboard,               name='api_fac_dashboard'),
    path('api/faculte/classe/',              api_faculte.fac_liste_classe,            name='api_fac_liste_classe'),
    path('api/faculte/saisie-notes/',        api_faculte.fac_saisie_notes,            name='api_fac_saisie_notes'),
    path('api/faculte/note/<int:etudiant_id>/', api_faculte.fac_note_individuelle,    name='api_fac_note_individuelle'),
    path('api/faculte/deliberation/',        api_faculte.fac_deliberation,            name='api_fac_deliberation'),
    path('api/faculte/promotion/',           api_faculte.fac_promotion,               name='api_fac_promotion'),
    path('api/faculte/promotion/appliquer/', api_faculte.fac_appliquer_promotion,     name='api_fac_appliquer_promotion'),
    path('api/faculte/orientation-s3/',      api_faculte.fac_orientation_s3,          name='api_fac_orientation_s3'),
    path('api/faculte/orientation-s3/appliquer/', api_faculte.fac_appliquer_orientation_s3, name='api_fac_appliquer_orientation_s3'),
    path('api/faculte/matrice-a3/check/', api_faculte.fac_matrice_a3_check, name='api_fac_matrice_a3_check'),
    path('api/faculte/enseignants/',      api_faculte.fac_enseignants,      name='api_fac_enseignants'),
    path('api/faculte/affectations/<int:affectation_id>/confirmer/', api_faculte.fac_confirmer_volume_affectation, name='api_fac_confirmer_volume_affectation'),

    # ── API REACT (Espace Secrétariat) ────────────────────────
    path('api/secretariat/dashboard/',       api_secretariat.sec_dashboard,           name='api_sec_dashboard'),
    path('api/secretariat/etudiants/',       api_secretariat.sec_liste_etudiants,     name='api_sec_liste_etudiants'),
    path('api/secretariat/etudiant/<int:etudiant_id>/statut/', api_secretariat.sec_changer_statut, name='api_sec_changer_statut'),
    path('api/secretariat/etudiant/ajouter/', api_secretariat.sec_ajouter_etudiant,   name='api_sec_ajouter_etudiant'),
    path('api/secretariat/annees/',          api_secretariat.sec_annees_academiques,  name='api_sec_annees_academiques'),
    path('api/secretariat/facultes/',        api_secretariat.sec_facultes,            name='api_sec_facultes'),
    path('api/secretariat/matrice-a3/check/', api_secretariat.sec_matrice_a3_check,   name='api_sec_matrice_a3_check'),

    # ── API REACT (Espace RH) ─────────────────────────────────
    path('api/rh/dashboard/',                api_rh.rh_dashboard,                    name='api_rh_dashboard'),
    path('api/rh/enseignants/',              api_rh.rh_enseignants,                  name='api_rh_enseignants'),
    path('api/rh/enseignants/ajouter/',      api_rh.rh_ajouter_enseignant,           name='api_rh_ajouter_enseignant'),
    path('api/rh/enseignants/<int:enseignant_id>/statut/', api_rh.rh_changer_statut_enseignant, name='api_rh_changer_statut_enseignant'),
    path('api/rh/affectations/<int:affectation_id>/volume/', api_rh.rh_modifier_volume_affectation, name='api_rh_modifier_volume_affectation'),
    path('api/rh/personnel/',                api_rh.rh_personnel,                    name='api_rh_personnel'),
    path('api/rh/personnel/ajouter/',        api_rh.rh_ajouter_personnel,            name='api_rh_ajouter_personnel'),
    path('api/rh/personnel/<int:personnel_id>/statut/', api_rh.rh_changer_statut_personnel, name='api_rh_changer_statut_personnel'),
    #path('api/rh/etudiants/',                api_rh.rh_etudiants,                    name='api_rh_etudiants'),

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

    # ── AUTHENTIFICATION ESPACE RH ────────────────────────────
    path('rh/connexion/',                views_auth.login_rh,           name='login_rh'),
    path('rh/connexion/reset/',          views_auth.reset_mdp_rh,       name='reset_mdp_rh'),
    path('rh/deconnexion/',              views_auth.logout_rh,          name='logout_rh'),

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
    path('faculte/enseignants/',         views_faculte.fac_enseignants,        name='fac_enseignants'),

    # Passage semestre et orientation — Espace Faculté
    path('faculte/promotion/',           views_secretaire.sec_promotion,           name='sec_promotion'),
    path('faculte/promotion/appliquer/', views_secretaire.sec_appliquer_promotion, name='sec_appliquer_promotion'),
    path('faculte/orientation-s3/',      views_secretaire.sec_orientation_s3,      name='sec_orientation_s3'),

    # ── GESTION SECRÉTARIAT ──────────────────────────────────
    path('secretaire/etudiant/ajouter/', views_secretaire.sec_ajouter_etudiant,   name='sec_ajouter_etudiant'),
    path('secretaire/annees/',           views_secretaire.sec_annees_academiques,  name='sec_annees_academiques'),
    path('secretaire/facultes/',         views_secretaire.sec_facultes,            name='sec_facultes'),

    # ── ESPACE ÉTUDIANT ───────────────────────────────────────
    path('etudiant/inscription/',        views_etudiant.inscription_etudiant, name='inscription_etudiant'),
    path('etudiant/connexion/',          views_etudiant.login_etudiant,       name='login_etudiant'),
    path('etudiant/deconnexion/',        views_etudiant.logout_etudiant,      name='logout_etudiant'),
    path('etudiant/dashboard/',          views_etudiant.etu_dashboard,        name='etu_dashboard'),
    path('etudiant/reset-mdp/',          views_etudiant.reset_mdp_etudiant,   name='reset_mdp_etudiant'),

    # ── ESPACE RH ──────────────────────────────────────────────
    path('rh/dashboard/',                views_rh.rh_dashboard,           name='rh_dashboard'),
    path('rh/enseignants/',              views_rh.rh_enseignants,         name='rh_enseignants'),
    path('rh/enseignants/ajouter/',      views_rh.rh_ajouter_enseignant,  name='rh_ajouter_enseignant'),
    path('rh/personnel/',                views_rh.rh_personnel,           name='rh_personnel'),
    path('rh/personnel/ajouter/',        views_rh.rh_ajouter_personnel,   name='rh_ajouter_personnel'),
   #path('rh/etudiants/',                views_rh.rh_etudiants,           name='rh_etudiants'),

    # ── ESPACE ENSEIGNANT (alias → redirige vers Espace Faculté) ──
    path('enseignant/dashboard/',    views_auth.redirect_to_faculte,  name='ens_dashboard'),
    path('enseignant/classe/',       views_auth.redirect_to_faculte,  name='ens_liste_classe'),
    path('enseignant/saisie-notes/', views_auth.redirect_to_faculte,  name='ens_saisie_notes'),
    path('enseignant/deliberation/', views_auth.redirect_to_faculte,  name='ens_deliberation'),
    path('enseignant/note/<int:etudiant_id>/', views_auth.redirect_to_faculte, name='ens_note_individuelle'),
    path('enseignant/matrice-a3/',   views_auth.redirect_to_faculte,  name='ens_matrice_a3'),

    # ── QR CODE PUBLIC ────────────────────────────────────────
    path('notes-etudiant/<int:etudiant_id>/', views_faculte.vue_qr_etudiant, name='vue_qr_etudiant'),

    # ── API ───────────────────────────────────────────────────
    path('api/portails/', views_secretaire.api_portails, name='api_portails'),
    path('api/filieres/', views_secretaire.api_filieres, name='api_filieres'),
    path('api/ues/',      views_secretaire.api_ues,      name='api_ues'),
]