"""API JSON — Espace RH.

- Enseignants : ENREGISTREMENT ET GESTION COMPLÈTE (nouveau rôle de la
  RH — c'est elle qui embauche). Un permanent a une faculté/filière fixe.
  Un vacataire peut avoir plusieurs affectations (faculté + filière +
  semestre + volume horaire prévu) via AffectationVacataire, modifiables
  avec historique. La RH ne paie personne — elle transmet juste les
  conditions (taux horaire / salaire, matricule) que l'Espace Finance
  utilisera pour payer, et la Faculté confirme le volume horaire réalisé.
- Personnel : CRUD complet, propre à l'Espace RH. Sert de référence pour
  l'Espace Finance (matricule notamment).
- Étudiants : LECTURE SEULE, réutilise exactement les mêmes filtres que
  api_secretariat.sec_liste_etudiants (faculté, semestre, année, portail,
  filière, recherche).
"""
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .api_common import to_int
from .models import (
    Faculte, Portail, Filiere, AnneeAcademique,
    Enseignant, InterventionEnseignant, Personnel,
    AffectationVacataire, HistoriqueVolumeHoraire,
)

SEMESTRES_LIST = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6']


def require_rh(request):
    if not request.user.is_authenticated:
        return Response(
            {'detail': 'Authentification requise.'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    if request.user.is_superuser or request.user.groups.filter(name='RH').exists():
        return None

    return Response(
        {'detail': 'Accès réservé aux Ressources Humaines.'},
        status=status.HTTP_403_FORBIDDEN
    )


# ── DASHBOARD ─────────────────────────────────────────────────

@api_view(['GET'])
def rh_dashboard(request):
    err = require_rh(request)
    if err:
        return err

    annee_active = AnneeAcademique.objects.filter(est_active=True).first()

    ens_qs = Enseignant.objects.all()

    if annee_active:
        ens_actifs_annee = ens_qs.filter(
            annee_academique=annee_active,
            actif=True
        )
    else:
        ens_actifs_annee = ens_qs.none()

    return Response({
        'annee_active': annee_active.nom if annee_active else None,

        'total_personnel': Personnel.objects.filter(
            statut='actif'
        ).count(),

        'personnel_par_fonction': list(
            Personnel.objects.filter(statut='actif')
            .values('fonction')
            .annotate(n=Count('id'))
            .order_by('-n')
        ),

        'total_enseignants_actifs': ens_actifs_annee.count(),

        'enseignants_vacataires': ens_actifs_annee.filter(
            statut='vacataire'
        ).count(),

        'enseignants_permanents': ens_actifs_annee.filter(
            statut='permanent'
        ).count(),

        'chefs_departement_actifs': ens_actifs_annee.filter(
            chef_departement=True
        ).count(),

        # 'total_etudiants': Etudiant.objects.filter(statut='actif').count(),
        # 'etudiants_par_faculte': list(
        #     Faculte.objects.annotate(
        #         nb=Count('etudiant', filter=Q(etudiant__statut='actif'))
        #     ).filter(nb__gt=0).values('code', 'nom', 'nb')
        # ),
    })


# ── ENSEIGNANTS (gérés entièrement par la RH — enregistrement inclus) ──

def _serialize_affectation(a):
    return {
        'id': a.id,
        'faculte_code': a.faculte.code,
        'faculte_nom': a.faculte.nom,
        'portail_nom': a.portail.nom if a.portail else None,
        'filiere_nom': a.filiere.nom if a.filiere else None,
        'semestre': a.semestre,
        'volume_horaire_prevu': str(a.volume_horaire_prevu),
        'volume_confirme_faculte': a.volume_confirme_faculte,
    }


@api_view(['GET'])
def rh_enseignants(request):
    err = require_rh(request)
    if err:
        return err

    annee_active = AnneeAcademique.objects.filter(
        est_active=True
    ).first()

    fac_id = to_int(request.GET.get('faculte'))
    filiere_id = to_int(request.GET.get('filiere'))
    statut = request.GET.get('statut', '')
    actif_only = request.GET.get('actif') == '1'
    chef_only = request.GET.get('chef') == '1'
    query = request.GET.get('q', '').strip()

    # IMPORTANT :
    # On ne filtre plus automatiquement les enseignants sur l'année active.
    # La RH doit pouvoir consulter les enseignants de toutes les années
    # académiques enregistrées.
    qs = Enseignant.objects.select_related(
        'faculte',
        'filiere',
        'annee_academique'
    )

    if statut in ('vacataire', 'permanent'):
        qs = qs.filter(statut=statut)

    if actif_only:
        qs = qs.filter(actif=True)

    if chef_only:
        qs = qs.filter(chef_departement=True)

    if query:
        qs = qs.filter(
            Q(nom__icontains=query)
            | Q(prenom__icontains=query)
            | Q(matricule__icontains=query)
            | Q(email__icontains=query)
        )

    # Un permanent est filtré sur son unique faculté/filière ;
    # un vacataire est filtré sur ses affectations.
    if fac_id:
        qs = qs.filter(
            Q(faculte_id=fac_id)
            | Q(affectations__faculte_id=fac_id)
        ).distinct()

    if filiere_id:
        qs = qs.filter(
            Q(filiere_id=filiere_id)
            | Q(affectations__filiere_id=filiere_id)
        ).distinct()

    enseignants = list(
        qs.order_by('nom', 'prenom')
    )

    interventions_map = {}

    if enseignants and annee_active:
        for it in InterventionEnseignant.objects.filter(
            enseignant__in=enseignants,
            annee_academique=annee_active
        ):
            interventions_map.setdefault(
                it.enseignant_id,
                []
            ).append(it.semestre)

    affectations_map = {}

    vacataires = [
        e for e in enseignants
        if e.statut == 'vacataire'
    ]

    if vacataires:
        for a in AffectationVacataire.objects.filter(
            enseignant__in=vacataires
        ).select_related(
            'faculte',
            'portail',
            'filiere'
        ):
            affectations_map.setdefault(
                a.enseignant_id,
                []
            ).append(
                _serialize_affectation(a)
            )

    return Response({
        'annee_active': annee_active.nom if annee_active else None,

        'enseignants': [
            {
                'id': e.id,
                'matricule': e.matricule,
                'nom': e.nom,
                'prenom': e.prenom,
                'genre': e.genre,
                'email': e.email,
                'telephone': e.telephone,

                'faculte_code': (
                    e.faculte.code
                    if e.faculte
                    else None
                ),

                'faculte_nom': (
                    e.faculte.nom
                    if e.faculte
                    else None
                ),

                'filiere_nom': (
                    e.filiere.nom
                    if e.filiere
                    else None
                ),

                'statut': e.statut,
                'statut_display': e.get_statut_display(),
                'chef_departement': e.chef_departement,
                'actif': e.actif,

                'date_debut_contrat': (
                    e.date_debut_contrat.isoformat()
                    if e.date_debut_contrat
                    else None
                ),

                'date_fin_contrat': (
                    e.date_fin_contrat.isoformat()
                    if e.date_fin_contrat
                    else None
                ),

                'contrat_expire': e.contrat_expire(),

                'taux_horaire': (
                    str(e.taux_horaire)
                    if e.taux_horaire is not None
                    else None
                ),

                'salaire_mensuel': (
                    str(e.salaire_mensuel)
                    if e.salaire_mensuel is not None
                    else None
                ),

                'interventions': sorted(
                    interventions_map.get(e.id, [])
                ),

                'affectations': affectations_map.get(
                    e.id,
                    []
                ),
            }
            for e in enseignants
        ],

        'facultes': list(
            Faculte.objects.all().values(
                'id',
                'nom',
                'code'
            )
        ),

        'filieres': list(
            Filiere.objects
            .select_related('faculte')
            .order_by('nom')
            .values(
                'id',
                'nom',
                'faculte_id'
            )
        ),
    })


@api_view(['GET', 'POST'])
def rh_ajouter_enseignant(request):
    err = require_rh(request)
    if err:
        return err

    if request.method == 'GET':
        return Response({
            'facultes': list(
                Faculte.objects.all()
                .order_by('nom')
                .values('id', 'nom')
            ),

            'portails': list(
                Portail.objects
                .select_related('faculte')
                .order_by('nom')
                .values(
                    'id',
                    'nom',
                    'faculte_id'
                )
            ),

            'filieres': list(
                Filiere.objects
                .select_related('faculte')
                .order_by('nom')
                .values(
                    'id',
                    'nom',
                    'faculte_id'
                )
            ),

            'annees': list(
                AnneeAcademique.objects
                .all()
                .order_by('-nom')
                .values(
                    'id',
                    'nom',
                    'est_active'
                )
            ),
        })

    body = request.data

    try:
        nom = body.get('nom', '').strip().upper()
        prenom = body.get('prenom', '').strip()
        genre = body.get('genre', '')
        date_naissance = body.get('date_naissance') or None
        lieu_naissance = body.get('lieu_naissance', '').strip()
        nationalite = (
            body.get('nationalite', 'Congolaise').strip()
            or 'Congolaise'
        )
        email = body.get('email', '').strip().lower()
        telephone = body.get('telephone', '').strip()
        adresse = body.get('adresse', '').strip()
        rib = body.get('rib', '').strip()
        numero_secu = body.get('numero_secu', '').strip()
        diplome = body.get('diplome', '').strip()

        annee_id = body.get('annee_academique')
        chef_departement = bool(
            body.get('chef_departement')
        )

        statut = body.get('statut', '')
        date_debut_contrat = (
            body.get('date_debut_contrat')
            or None
        )
        date_fin_contrat = (
            body.get('date_fin_contrat')
            or None
        )
        taux_horaire = (
            body.get('taux_horaire')
            or None
        )
        salaire_mensuel = (
            body.get('salaire_mensuel')
            or None
        )
        affectations = body.get(
            'affectations',
            []
        )

        # ── Champs communs obligatoires ──

        if not all([
            nom,
            prenom,
            genre,
            email,
            annee_id,
            statut,
            date_debut_contrat
        ]):
            return Response(
                {
                    'detail':
                    'Tous les champs obligatoires doivent être remplis.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if statut not in (
            'vacataire',
            'permanent'
        ):
            return Response(
                {'detail': 'Statut invalide.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if Enseignant.objects.filter(
            email=email
        ).exists():
            return Response(
                {
                    'detail':
                    f"Un enseignant avec l'email {email} existe déjà."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # ── Logique intelligente selon le statut ──

        # Permanent :
        # une seule faculté/filière fixe,
        # salaire mensuel obligatoire.

        faculte_id = None
        filiere_id = None

        if statut == 'permanent':
            faculte_id = body.get('faculte')
            filiere_id = body.get('filiere') or None

            if not faculte_id:
                return Response(
                    {
                        'detail':
                        "La faculté est obligatoire pour un permanent."
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            if not salaire_mensuel:
                return Response(
                    {
                        'detail':
                        "Le salaire mensuel est obligatoire pour un permanent."
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            taux_horaire = None

        else:
            # Vacataire :
            # pas de faculté/filière fixe.
            # Au moins une affectation.

            if not taux_horaire:
                return Response(
                    {
                        'detail':
                        "Le taux horaire est obligatoire pour un vacataire."
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            if not date_fin_contrat:
                return Response(
                    {
                        'detail':
                        "La date de fin de contrat est obligatoire pour un vacataire."
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            if not affectations:
                return Response(
                    {
                        'detail':
                        "Ajoutez au moins une affectation (faculté, semestre, volume horaire)."
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            for a in affectations:
                if not a.get('faculte') \
                        or not a.get('semestre') \
                        or not a.get('volume_horaire_prevu'):

                    return Response(
                        {
                            'detail':
                            "Chaque affectation doit avoir une faculté, un semestre et un volume horaire."
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )

                if a.get('portail') and a.get('filiere'):
                    return Response(
                        {
                            'detail':
                            "Une affectation ne peut pas avoir à la fois un portail ET une filière — choisissez l'un ou l'autre."
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )

                # Un portail n'existe qu'en S1-S2.
                # Une filière existe à partir de S3.

                sem_num = int(
                    a['semestre'].replace(
                        'S',
                        ''
                    )
                )

                if a.get('portail') and sem_num > 2:
                    return Response(
                        {
                            'detail':
                            f"Un portail ne concerne que S1-S2 (affectation en {a['semestre']})."
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )

                if a.get('filiere') and sem_num <= 2:
                    return Response(
                        {
                            'detail':
                            f"Une filière ne concerne qu'à partir de S3 (affectation en {a['semestre']})."
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )

            salaire_mensuel = None

        with transaction.atomic():

            ens = Enseignant(
                nom=nom,
                prenom=prenom,
                genre=genre,
                date_naissance=date_naissance,
                lieu_naissance=(
                    lieu_naissance or None
                ),
                nationalite=nationalite,
                email=email,
                telephone=(
                    telephone or None
                ),
                adresse=(
                    adresse or None
                ),
                rib=(
                    rib or None
                ),
                numero_secu=(
                    numero_secu or None
                ),
                diplome=(
                    diplome or None
                ),
                faculte_id=faculte_id,
                filiere_id=filiere_id,
                annee_academique_id=annee_id,
                chef_departement=chef_departement,
                statut=statut,
                date_debut_contrat=date_debut_contrat,
                date_fin_contrat=date_fin_contrat,
                taux_horaire=taux_horaire,
                salaire_mensuel=salaire_mensuel,
                actif=True,
            )

            ens.save()

            if statut == 'vacataire':
                AffectationVacataire.objects.bulk_create([
                    AffectationVacataire(
                        enseignant=ens,
                        faculte_id=a['faculte'],
                        portail_id=(
                            a.get('portail')
                            or None
                        ),
                        filiere_id=(
                            a.get('filiere')
                            or None
                        ),
                        semestre=a['semestre'],
                        volume_horaire_prevu=(
                            a['volume_horaire_prevu']
                        ),
                    )
                    for a in affectations
                ])

        return Response({
            'detail':
            f"{nom} {prenom} enregistré(e) avec le matricule {ens.matricule}.",
            'matricule': ens.matricule,
            'id': ens.id,
        })

    except Exception as e:
        return Response(
            {
                'detail':
                f"Erreur lors de l'enregistrement : {e}"
            },
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
def rh_changer_statut_enseignant(
    request,
    enseignant_id
):
    """Active/désactive un enseignant, ou met à jour sa date de fin de
    contrat (par exemple pour renouveler un vacataire)."""

    err = require_rh(request)

    if err:
        return err

    try:
        ens = Enseignant.objects.get(
            id=enseignant_id
        )

    except Enseignant.DoesNotExist:
        return Response(
            {
                'detail':
                'Enseignant introuvable.'
            },
            status=status.HTTP_404_NOT_FOUND
        )

    body = request.data

    if 'actif' in body:
        ens.actif = bool(
            body.get('actif')
        )

    if 'date_fin_contrat' in body:
        ens.date_fin_contrat = (
            body.get('date_fin_contrat')
            or None
        )

    ens.save(
        update_fields=[
            'actif',
            'date_fin_contrat'
        ]
    )

    return Response({
        'detail':
        "Enseignant mis à jour.",
        'actif': ens.actif
    })


@api_view(['POST'])
def rh_modifier_volume_affectation(
    request,
    affectation_id
):
    """Modifie le volume horaire prévu d'une affectation de vacataire
    (ex : cours reporté, professeur malade, heures rajoutées) — garde
    une trace dans HistoriqueVolumeHoraire à chaque changement."""

    err = require_rh(request)

    if err:
        return err

    try:
        a = AffectationVacataire.objects.select_related(
            'enseignant',
            'faculte',
            'filiere'
        ).get(
            id=affectation_id
        )

    except AffectationVacataire.DoesNotExist:
        return Response(
            {
                'detail':
                'Affectation introuvable.'
            },
            status=status.HTTP_404_NOT_FOUND
        )

    nouveau_volume = request.data.get(
        'volume_horaire_prevu'
    )

    motif = request.data.get(
        'motif',
        ''
    ).strip()

    if not nouveau_volume:
        return Response(
            {
                'detail':
                'Le nouveau volume horaire est requis.'
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    ancien_volume = (
        a.volume_horaire_prevu
    )

    with transaction.atomic():

        HistoriqueVolumeHoraire.objects.create(
            affectation=a,
            ancien_volume=ancien_volume,
            nouveau_volume=nouveau_volume,
            motif=motif,
        )

        a.volume_horaire_prevu = nouveau_volume

        a.save(
            update_fields=[
                'volume_horaire_prevu'
            ]
        )

    return Response({
        'detail':
        f"Volume horaire mis à jour : {ancien_volume}h → {nouveau_volume}h.",
        'volume_horaire_prevu':
        str(a.volume_horaire_prevu),
    })


# ── PERSONNEL ──────────────────────────────────────────────────

@api_view(['GET'])
def rh_personnel(request):
    err = require_rh(request)

    if err:
        return err

    fonction = request.GET.get(
        'fonction',
        ''
    )

    statut = request.GET.get(
        'statut',
        ''
    )

    fac_id = to_int(
        request.GET.get('faculte')
    )

    query = request.GET.get(
        'q',
        ''
    ).strip()

    qs = Personnel.objects.select_related(
        'faculte_rattachement'
    )

    if fonction:
        qs = qs.filter(
            fonction=fonction
        )

    if statut:
        qs = qs.filter(
            statut=statut
        )

    if fac_id:
        qs = qs.filter(
            faculte_rattachement_id=fac_id
        )

    if query:
        qs = qs.filter(
            Q(nom__icontains=query)
            | Q(prenom__icontains=query)
            | Q(matricule__icontains=query)
            | Q(telephone__icontains=query)
        )

    return Response({
        'personnel': [
            {
                'id': p.id,
                'matricule': p.matricule,
                'nom': p.nom,
                'prenom': p.prenom,
                'genre': p.genre,
                'telephone': p.telephone,
                'email': p.email,
                'fonction': p.fonction,
                'fonction_display': p.get_fonction_display_full(),
                'lieu_travail': p.lieu_travail,

                'faculte_nom': (
                    p.faculte_rattachement.nom
                    if p.faculte_rattachement
                    else None
                ),

                'date_embauche': (
                    p.date_embauche.isoformat()
                    if p.date_embauche
                    else None
                ),

                'salaire_mensuel': (
                    str(p.salaire_mensuel)
                    if p.salaire_mensuel is not None
                    else None
                ),

                'statut': p.statut,
            }

            for p in qs
        ],

        'facultes': list(
            Faculte.objects.all().values(
                'id',
                'nom',
                'code'
            )
        ),

        'fonctions': Personnel.FONCTION_CHOICES,
    })


@api_view(['GET', 'POST'])
def rh_ajouter_personnel(request):
    err = require_rh(request)

    if err:
        return err

    if request.method == 'GET':
        return Response({
            'facultes': list(
                Faculte.objects.all()
                .order_by('nom')
                .values(
                    'id',
                    'nom'
                )
            ),

            'fonctions': Personnel.FONCTION_CHOICES,
        })

    body = request.data

    try:
        nom = body.get(
            'nom',
            ''
        ).strip().upper()

        prenom = body.get(
            'prenom',
            ''
        ).strip()

        genre = body.get(
            'genre',
            ''
        )

        telephone = body.get(
            'telephone',
            ''
        ).strip()

        email = (
            body.get(
                'email',
                ''
            ).strip().lower()
            or None
        )

        fonction = body.get(
            'fonction',
            ''
        )

        fonction_autre = body.get(
            'fonction_autre',
            ''
        ).strip()

        lieu_travail = body.get(
            'lieu_travail',
            ''
        ).strip()

        faculte_id = (
            body.get(
                'faculte_rattachement'
            )
            or None
        )

        date_embauche = body.get(
            'date_embauche',
            ''
        )

        salaire_mensuel = (
            body.get(
                'salaire_mensuel'
            )
            or None
        )

        rib = body.get(
            'rib',
            ''
        ).strip()

        if not all([
            nom,
            prenom,
            genre,
            fonction,
            lieu_travail,
            date_embauche,
            salaire_mensuel
        ]):
            return Response(
                {
                    'detail':
                    'Tous les champs obligatoires doivent être remplis (le salaire mensuel est obligatoire pour la transmission à la Finance).'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if fonction == 'autre' and not fonction_autre:
            return Response(
                {
                    'detail':
                    "Précisez la fonction pour 'Autre'."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        p = Personnel(
            nom=nom,
            prenom=prenom,
            genre=genre,
            telephone=(
                telephone or None
            ),
            email=email,
            fonction=fonction,
            fonction_autre=(
                fonction_autre or None
            ),
            lieu_travail=lieu_travail,
            faculte_rattachement_id=faculte_id,
            date_embauche=date_embauche,
            salaire_mensuel=salaire_mensuel,
            rib=(
                rib or None
            ),
            statut='actif',
        )

        p.save()

        return Response({
            'detail':
            f"{nom} {prenom} enregistré(e) avec le matricule {p.matricule}.",
            'matricule': p.matricule,
            'id': p.id
        })

    except Exception as e:
        return Response(
            {
                'detail':
                f"Erreur lors de l'enregistrement : {e}"
            },
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
def rh_changer_statut_personnel(
    request,
    personnel_id
):
    err = require_rh(request)

    if err:
        return err

    try:
        p = Personnel.objects.get(
            id=personnel_id
        )

    except Personnel.DoesNotExist:
        return Response(
            {
                'detail':
                'Membre du personnel introuvable.'
            },
            status=status.HTTP_404_NOT_FOUND
        )

    nouveau_statut = request.data.get(
        'statut',
        ''
    ).strip()

    if nouveau_statut not in [
        'actif',
        'inactif'
    ]:
        return Response(
            {
                'detail':
                'Statut invalide.'
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    p.statut = nouveau_statut

    p.save(
        update_fields=[
            'statut'
        ]
    )

    return Response({
        'detail':
        f"Statut mis à jour : {nouveau_statut}",
        'statut':
        nouveau_statut
    })


# ── ÉTUDIANTS (lecture seule — mêmes filtres que le Secrétariat) ─

# @api_view(['GET'])
# def rh_etudiants(request):
#     err = require_rh(request)
#     if err: return err
#
#     fac_id = to_int(request.GET.get('faculte'))
#     sem = request.GET.get('semestre', '')
#     annee_id = to_int(request.GET.get('annee'))
#     portail_id = to_int(request.GET.get('portail'))
#     filiere_id = to_int(request.GET.get('filiere'))
#     query = request.GET.get('q', '').strip()
#
#     qs = Etudiant.objects.select_related(
#         'faculte',
#         'portail',
#         'filiere',
#         'annee_academique'
#     )
#
#     if fac_id:
#         qs = qs.filter(
#             faculte_id=fac_id
#         )
#
#     if sem:
#         qs = qs.filter(
#             semestre=sem
#         )
#
#     if annee_id:
#         qs = qs.filter(
#             annee_academique_id=annee_id
#         )
#
#     if portail_id:
#         qs = qs.filter(
#             portail_id=portail_id
#         )
#
#     if filiere_id:
#         qs = qs.filter(
#             filiere_id=filiere_id
#         )
#
#     if query:
#         qs = qs.filter(
#             Q(nom__icontains=query)
#             | Q(prenom__icontains=query)
#             | Q(matricule__icontains=query)
#             | Q(email__icontains=query)
#         )
#
#     return Response({
#         'etudiants': [
#             {
#                 'id': e.id,
#                 'nom': e.nom,
#                 'prenom': e.prenom,
#                 'matricule': e.matricule,
#                 'email': e.email,
#                 'genre': e.genre,
#                 'age': e.get_age(),
#                 'semestre': e.semestre,
#                 'cycle': e.cycle,
#                 'statut': e.statut,
#
#                 'faculte_code': (
#                     e.faculte.code
#                     if e.faculte
#                     else None
#                 ),
#
#                 'portail_nom': (
#                     e.portail.nom
#                     if e.portail
#                     else None
#                 ),
#
#                 'filiere_nom': (
#                     e.filiere.nom
#                     if e.filiere
#                     else None
#                 ),
#             }
#             for e in qs
#         ],
#
#         'facultes': list(
#             Faculte.objects.all().values(
#                 'id',
#                 'nom',
#                 'code'
#             )
#         ),
#
#         'annees': list(
#             AnneeAcademique.objects.all().values(
#                 'id',
#                 'nom'
#             )
#         ),
#
#         'fac_id': fac_id,
#         'sem': sem,
#         'annee_id': annee_id,
#         'portail_id': portail_id,
#         'filiere_id': filiere_id,
#         'query': query,
#         'semestres': SEMESTRES_LIST,
#     })