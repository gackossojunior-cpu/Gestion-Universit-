"""API JSON — Espace Secrétariat. Même principe que api_faculte.py :
réutilise la logique de views_secretaire.py, ne fait que changer la sortie.
"""
from django.db.models import Count, Q
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .api_common import require_secretariat, to_int
from .models import Etudiant, Faculte, Portail, Filiere, AnneeAcademique

SEMESTRES_LIST = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6']
SEMESTRES_INSCRIPTION = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10']


def _etu_full(e):
    return {
        'id': e.id, 'nom': e.nom, 'prenom': e.prenom, 'matricule': e.matricule,
        'email': e.email,'telephone': e.telephone, 'genre': e.genre, 'age': e.get_age(),
        'nationalite': e.nationalite, 'semestre': e.semestre, 'cycle': e.cycle,
        'statut': e.statut,
        'faculte_code': e.faculte.code if e.faculte else None,
        'portail_nom': e.portail.nom if e.portail else None,
        'filiere_nom': e.filiere.nom if e.filiere else None,
    }


# ── DASHBOARD ─────────────────────────────────────────────────
@api_view(['GET'])
def sec_dashboard(request):
    err = require_secretariat(request)
    if err: return err

    annee_active = AnneeAcademique.objects.filter(est_active=True).first()
    recent = Etudiant.objects.select_related(
        'faculte', 'portail', 'filiere', 'annee_academique'
    ).order_by('-id')[:10]

    return Response({
        'total': Etudiant.objects.count(),
        'par_faculte': list(
            Faculte.objects.annotate(nb=Count('etudiant')).filter(nb__gt=0)
            .values('code', 'nom', 'nb')
        ),
        'annee_active': annee_active.nom if annee_active else None,
        'recent': [_etu_full(e) for e in recent],
    })


# ── LISTE ÉTUDIANTS ───────────────────────────────────────────
@api_view(['GET'])
def sec_liste_etudiants(request):
    err = require_secretariat(request)
    if err: return err

    fac_id = to_int(request.GET.get('faculte'))
    sem = request.GET.get('semestre', '')
    annee_id = to_int(request.GET.get('annee'))
    portail_id = to_int(request.GET.get('portail'))
    filiere_id = to_int(request.GET.get('filiere'))
    query = request.GET.get('q', '').strip()

    qs = Etudiant.objects.select_related('faculte', 'portail', 'filiere', 'annee_academique')
    if fac_id: qs = qs.filter(faculte_id=fac_id)
    if sem: qs = qs.filter(semestre=sem)
    if annee_id: qs = qs.filter(annee_academique_id=annee_id)
    if portail_id: qs = qs.filter(portail_id=portail_id)
    if filiere_id: qs = qs.filter(filiere_id=filiere_id)
    if query:
        qs = qs.filter(
            Q(nom__icontains=query) | Q(prenom__icontains=query) |
            Q(matricule__icontains=query) | Q(email__icontains=query)
        )

    return Response({
        'etudiants': [_etu_full(e) for e in qs],
        'facultes': list(Faculte.objects.all().values('id', 'nom', 'code')),
        'annees': list(AnneeAcademique.objects.all().values('id', 'nom')),
        'fac_id': fac_id, 'sem': sem, 'annee_id': annee_id,
        'portail_id': portail_id, 'filiere_id': filiere_id, 'query': query,
        'semestres': SEMESTRES_LIST,
    })


# ── CHANGER STATUT ─────────────────────────────────────────────
@api_view(['POST'])
def sec_changer_statut(request, etudiant_id):
    err = require_secretariat(request)
    if err: return err

    try:
        etu = Etudiant.objects.get(id=etudiant_id)
    except Etudiant.DoesNotExist:
        return Response({'detail': 'Étudiant introuvable.'}, status=status.HTTP_404_NOT_FOUND)

    nouveau_statut = request.data.get('statut', '').strip()
    if nouveau_statut not in ['actif', 'diplome', 'abandonne']:
        return Response({'detail': 'Statut invalide.'}, status=status.HTTP_400_BAD_REQUEST)

    ancien = etu.statut
    etu.statut = nouveau_statut
    etu.save(update_fields=['statut'])
    return Response({'detail': f"Statut changé : {ancien} → {nouveau_statut}", 'statut': nouveau_statut})


# ── AJOUTER ÉTUDIANT ───────────────────────────────────────────
@api_view(['GET', 'POST'])
def sec_ajouter_etudiant(request):
    err = require_secretariat(request)
    if err: return err

    if request.method == 'GET':
        return Response({
            'facultes': list(Faculte.objects.all().order_by('nom').values('id', 'nom')),
            'portails': list(
                Portail.objects.select_related('faculte').order_by('nom')
                .values('id', 'nom', 'faculte_id')
            ),
            'filieres': list(
                Filiere.objects.select_related('faculte').order_by('nom')
                .values('id', 'nom', 'faculte_id')
            ),
            'annees': list(
                AnneeAcademique.objects.all().order_by('-nom').values('id', 'nom', 'est_active')
            ),
            'semestres': SEMESTRES_INSCRIPTION,
        })

    body = request.data
    try:
        nom = body.get('nom', '').strip().upper()
        prenom = body.get('prenom', '').strip()
        genre = body.get('genre', '')
        date_naissance = body.get('date_naissance', '')
        nationalite = body.get('nationalite', 'Congolaise').strip() or 'Congolaise'
        email = body.get('email', '').strip().lower()
        telephone = body.get('telephone', '').strip()
        faculte_id = body.get('faculte')
        portail_id = body.get('portail') or None
        filiere_id = body.get('filiere') or None
        annee_id = body.get('annee_academique')
        semestre = body.get('semestre', 'S1')
        en_regle = bool(body.get('en_regle'))

        if semestre in ['S1', 'S2']:
            filiere_id = None
        else:
            portail_id = None

        if not all([nom, prenom, genre, date_naissance, email, faculte_id, annee_id]):
            return Response({'detail': 'Tous les champs obligatoires doivent être remplis.'},
                             status=status.HTTP_400_BAD_REQUEST)
        if Etudiant.objects.filter(email=email).exists():
            return Response({'detail': f"Un étudiant avec l'email {email} existe déjà."},
                             status=status.HTTP_400_BAD_REQUEST)

        etu = Etudiant(
            nom=nom, prenom=prenom, genre=genre, date_naissance=date_naissance,
            nationalite=nationalite, email=email, telephone=telephone,faculte_id=faculte_id,
            portail_id=portail_id, filiere_id=filiere_id, annee_academique_id=annee_id,
            semestre=semestre, en_regle=en_regle, statut='actif',
        )
        etu.save()
        return Response({'detail': f"Étudiant {nom} {prenom} enregistré avec le matricule {etu.matricule}.",
                          'matricule': etu.matricule, 'id': etu.id})
    except Exception as e:
        return Response({'detail': f"Erreur lors de l'enregistrement : {e}"},
                         status=status.HTTP_400_BAD_REQUEST)


# ── ANNÉES ACADÉMIQUES ────────────────────────────────────────
@api_view(['GET', 'POST'])
def sec_annees_academiques(request):
    err = require_secretariat(request)
    if err: return err

    if request.method == 'POST':
        action = request.data.get('action')
        if action == 'ajouter':
            nom = request.data.get('nom', '').strip()
            activer = bool(request.data.get('activer'))
            if not nom:
                return Response({'detail': "Le nom de l'année est requis (ex: 2025-2026)."},
                                 status=status.HTTP_400_BAD_REQUEST)
            if activer:
                AnneeAcademique.objects.update(est_active=False)
            AnneeAcademique.objects.create(nom=nom, est_active=activer)
            return Response({'detail': f"Année {nom} ajoutée."})
        elif action == 'activer':
            annee_id = request.data.get('annee_id')
            AnneeAcademique.objects.update(est_active=False)
            AnneeAcademique.objects.filter(id=annee_id).update(est_active=True)
            return Response({'detail': "Année académique activée."})
        return Response({'detail': 'Action inconnue.'}, status=status.HTTP_400_BAD_REQUEST)

    return Response({
        'annees': list(
            AnneeAcademique.objects.all().order_by('-nom').values('id', 'nom', 'est_active')
        )
    })


# ── FACULTÉS ───────────────────────────────────────────────────
@api_view(['GET', 'POST'])
def sec_facultes(request):
    err = require_secretariat(request)
    if err: return err

    if request.method == 'POST':
        nom = request.data.get('nom', '').strip()
        code = request.data.get('code', '').strip().upper()
        if not (nom and code):
            return Response({'detail': 'Nom et code obligatoires.'}, status=status.HTTP_400_BAD_REQUEST)
        Faculte.objects.get_or_create(code=code, defaults={'nom': nom})
        return Response({'detail': f"Faculté {nom} ({code}) ajoutée."})

    return Response({
        'facultes': [
            {'id': f.id, 'code': f.code, 'nom': f.nom, 'nb_etudiants': f.etudiant_set.count()}
            for f in Faculte.objects.all().order_by('nom')
        ]
    })


# ── MATRICE A3 — vérification avant génération (même correctif que côté
# Faculté : on vérifie en AJAX avant d'ouvrir le PDF, pour ne plus faire
# "sauter" la page de filtre quand il n'y a aucun étudiant). Le
# Secrétariat exige en plus un portail OU une filière (comme la vue PDF
# existante).
@api_view(['GET'])
def sec_matrice_a3_check(request):
    err = require_secretariat(request)
    if err: return err

    fac_id = to_int(request.GET.get('faculte'))
    sem = request.GET.get('semestre', '')
    portail_id = to_int(request.GET.get('portail'))
    filiere_id = to_int(request.GET.get('filiere'))

    if not fac_id or not sem or (not portail_id and not filiere_id):
        return Response({'count': 0, 'detail': 'Faculté, semestre et portail/filière requis.'})

    qs = Etudiant.objects.filter(faculte_id=fac_id, semestre=sem, statut='actif')
    if portail_id: qs = qs.filter(portail_id=portail_id)
    if filiere_id: qs = qs.filter(filiere_id=filiere_id)
    count = qs.count()

    return Response({
        'count': count,
        'detail': (
            f"{count} étudiant(s) actif(s) trouvé(s)." if count
            else "Aucun étudiant actif trouvé pour ces critères."
        ),
    })
