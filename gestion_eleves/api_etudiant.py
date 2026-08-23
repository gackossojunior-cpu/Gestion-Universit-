"""
API JSON pour l'Espace Étudiant — utilisée par les composants React.

Principe : on garde l'authentification par session Django existante
(request.session['etudiant_id']), donc pas besoin de JWT ni de CORS
puisque React est servi par Django (même origine). On réutilise la
logique métier déjà écrite dans views_etudiant.py / engine.py, on ne
la duplique pas : on la fait juste sortir en JSON au lieu de HTML.
"""
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .models import Etudiant, UniteEnseignement, Note
from .engine import calculer_matrice


def _get_etudiant_session(request):
    eid = request.session.get('etudiant_id')
    if not eid:
        return None
    try:
        return Etudiant.objects.select_related(
            'faculte', 'portail', 'filiere', 'annee_academique'
        ).get(id=eid)
    except Etudiant.DoesNotExist:
        return None


def _serialize_matiere(m_data):
    return {
        'nom': m_data['matiere'].nom,
        'credits': m_data['matiere'].credits,
        'non_saisi': m_data.get('non_saisi', False),
        'is_absent': m_data.get('is_absent', False),
        'note_devoir': m_data.get('note_devoir'),
        'note_session': m_data.get('note_session'),
        'note_calculee': m_data.get('note_calculee'),
    }


def _serialize_ue_detail(ue_data):
    return {
        'ue_nom': ue_data['ue'].nom,
        'moyenne_ue': ue_data['moyenne_ue'],
        'est_validee': ue_data['est_validee'],
        'matieres': [_serialize_matiere(m) for m in ue_data['matieres']],
    }


@api_view(['GET'])
def api_etudiant_dashboard(request):
    etu = _get_etudiant_session(request)
    if not etu:
        return Response({'detail': 'Non authentifié.'}, status=status.HTTP_401_UNAUTHORIZED)

    # Programme du semestre actuel
    if etu.semestre in ['S1', 'S2']:
        unites_qs = UniteEnseignement.objects.filter(
            semestre=etu.semestre, portail__faculte=etu.faculte
        ).prefetch_related('matieres').order_by('code_ue')
    else:
        unites_qs = UniteEnseignement.objects.filter(
            semestre=etu.semestre, filiere__faculte=etu.faculte
        ).prefetch_related('matieres').order_by('code_ue')

    unites = [
        {
            'nom': ue.nom,
            'credits_total': ue.credits_total,
            'matieres': [{'nom': m.nom, 'credits': m.credits} for m in ue.matieres.all()],
        }
        for ue in unites_qs
    ]

    # Résultats par semestre (même règle que la vue HTML : semestre en cours
    # masqué si l'étudiant n'est pas en règle)
    semestres_notes = list(
        Note.objects.filter(etudiant=etu)
        .values_list('semestre', flat=True)
        .distinct().order_by('semestre')
    )

    resultats = {}
    for sem in semestres_notes:
        if sem == etu.semestre and not etu.en_regle:
            continue
        structure, _ = calculer_matrice(None, sem, etudiant_id=etu.id, save_results=False)
        if structure:
            ligne = structure[0]
            resultats[sem] = {
                'decision': ligne['decision'],
                'moyenne_semestre': ligne['moyenne_semestre'],
                'total_credits_valides': ligne['total_credits_valides'],
                'total_credits_semestre': ligne['total_credits_semestre'],
                'ues_detail': [_serialize_ue_detail(u) for u in ligne['ues_detail']],
            }

    return Response({
        'etudiant': {
            'nom': etu.nom,
            'prenom': etu.prenom,
            'matricule': etu.matricule,
            'telephone': etu.telephone,
            'cycle': etu.cycle,
            'semestre': etu.semestre,
            'annee_academique': etu.annee_academique.nom if etu.annee_academique else None,
        },
        'en_regle': etu.en_regle,
        'unites': unites,
        'resultats': resultats,
    })
