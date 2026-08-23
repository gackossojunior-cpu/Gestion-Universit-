"""
API JSON — Espace Faculté.

Chaque vue reprend EXACTEMENT la même logique métier que views_faculte.py
(mêmes querysets, mêmes règles de calcul via engine.calculer_matrice, même
logique de sauvegarde des notes), pour éviter toute divergence entre
l'ancien et le nouveau frontend. Seule la sortie change (JSON au lieu de
HTML), et les erreurs de validation reviennent en JSON structuré au lieu
de passer par django.contrib.messages.
"""
from django.db import transaction
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .api_common import require_faculte, to_int
from .engine import calculer_matrice
from .models import (
    Etudiant, Faculte, Portail, Filiere, AnneeAcademique,
    Note, Matiere, UniteEnseignement, ResultatSemestre,
    Enseignant, AffectationVacataire,
)

SEMESTRES_LIST = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6']


def _etu_min(e):
    return {
        'id': e.id, 'nom': e.nom, 'prenom': e.prenom, 'matricule': e.matricule,
        'email': e.email, 'telephone': e.telephone, 'semestre': e.semestre, 'genre': e.genre,
        'statut': e.statut,
        'faculte_code': e.faculte.code if e.faculte else None,
        'portail_nom': e.portail.nom if e.portail else None,
        'filiere_nom': e.filiere.nom if e.filiere else None,
        'parcours': e.get_parcours(),
    }


# ── DASHBOARD ─────────────────────────────────────────────────
@api_view(['GET'])
def fac_dashboard(request):
    err = require_faculte(request)
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
        'recent': [_etu_min(e) for e in recent],
        'facultes': list(Faculte.objects.all().values('id', 'nom', 'code')),
        'semestres': SEMESTRES_LIST,
    })


# ── LISTE CLASSE ──────────────────────────────────────────────
@api_view(['GET'])
def fac_liste_classe(request):
    err = require_faculte(request)
    if err: return err

    fac_id = to_int(request.GET.get('faculte'))
    sem = request.GET.get('semestre', '')
    portail_id = to_int(request.GET.get('portail'))
    filiere_id = to_int(request.GET.get('filiere'))
    etudiants_data = []

    if fac_id and sem:
        qs = Etudiant.objects.filter(
            faculte_id=fac_id, semestre=sem
        ).select_related('faculte', 'portail', 'filiere', 'annee_academique')
        if portail_id: qs = qs.filter(portail_id=portail_id)
        if filiere_id: qs = qs.filter(filiere_id=filiere_id)
        etudiants = list(qs.order_by('nom', 'prenom'))
        resultats_map = {
            r.etudiant_id: r for r in
            ResultatSemestre.objects.filter(etudiant__in=etudiants, semestre=sem)
        }
        for e in etudiants:
            r = resultats_map.get(e.id)
            data = _etu_min(e)
            data['resultat'] = (
                {'decision': r.decision, 'moyenne_generale': r.moyenne_generale}
                if r else None
            )
            etudiants_data.append(data)

    return Response({
        'etudiants': etudiants_data,
        'facultes': list(Faculte.objects.all().values('id', 'nom', 'code')),
        'fac_id': fac_id, 'sem': sem, 'portail_id': portail_id, 'filiere_id': filiere_id,
        'semestres': SEMESTRES_LIST,
    })


# ── SAISIE NOTES ──────────────────────────────────────────────
@api_view(['GET', 'POST'])
def fac_saisie_notes(request):
    err = require_faculte(request)
    if err: return err

    if request.method == 'GET':
        fac_id = to_int(request.GET.get('faculte'))
        sem = request.GET.get('semestre', '')
        ue_id = to_int(request.GET.get('ue'))
        portail_id = to_int(request.GET.get('portail'))
        filiere_id = to_int(request.GET.get('filiere'))

        etudiants, matieres, notes_dict = [], [], {}

        if fac_id and sem and ue_id:
            qs_etu = Etudiant.objects.filter(
                faculte_id=fac_id, semestre=sem, statut='actif'
            ).select_related('portail', 'filiere').order_by('nom', 'prenom')
            if portail_id: qs_etu = qs_etu.filter(portail_id=portail_id)
            if filiere_id: qs_etu = qs_etu.filter(filiere_id=filiere_id)
            etudiants = list(qs_etu)
            matieres = list(Matiere.objects.filter(ue_id=ue_id).order_by('nom'))

            for n in Note.objects.filter(etudiant__in=etudiants, matiere__in=matieres, semestre=sem):
                notes_dict[f"{n.etudiant_id}_{n.matiere_id}"] = {
                    'devoir': float(n.note_devoir), 'session': float(n.note_session),
                    'rattrapage': float(n.note_sr) if n.note_sr is not None else None,
                    'absent': n.est_absent,
                }

        return Response({
            'etudiants': [
                {'id': e.id, 'nom': e.nom, 'prenom': e.prenom, 'matricule': e.matricule}
                for e in etudiants
            ],
            'matieres': [{'id': m.id, 'nom': m.nom, 'credits': m.credits} for m in matieres],
            'notes': notes_dict,
        })

    # POST — enregistrement en masse (même logique que views_faculte.fac_saisie_notes)
    body = request.data
    fac_id = to_int(body.get('faculte'))
    sem = body.get('semestre', '')
    ue_id = to_int(body.get('ue'))
    lignes = body.get('notes', [])  # [{etudiant_id, matiere_id, devoir, session, rattrapage, absent}]

    if not (fac_id and sem and ue_id):
        return Response({'detail': 'Faculté, semestre et UE requis.'}, status=status.HTTP_400_BAD_REQUEST)

    updates, erreurs = [], []
    for ligne in lignes:
        try:
            etu = Etudiant.objects.get(id=ligne['etudiant_id'])
            mat = Matiere.objects.get(id=ligne['matiere_id'])
            d = float(ligne.get('devoir') or 0)
            s = float(ligne.get('session') or 0)
            sr_raw = ligne.get('rattrapage')
            sr = float(sr_raw) if sr_raw not in (None, '') else None
            absent = bool(ligne.get('absent'))
            for v, n in [(d, 'Devoir'), (s, 'Session')]:
                if not 0 <= v <= 20:
                    raise ValueError(f"{n} hors plage [0-20] pour {etu.nom}")
            if sr is not None and not 0 <= sr <= 20:
                raise ValueError(f"Rattrapage hors plage [0-20] pour {etu.nom}")
            updates.append((etu, mat, d, s, sr, absent))
        except (Etudiant.DoesNotExist, Matiere.DoesNotExist):
            erreurs.append("Étudiant ou matière introuvable.")
        except (ValueError, KeyError) as e:
            erreurs.append(str(e))

    if erreurs:
        return Response({'detail': 'Erreurs de validation.', 'erreurs': erreurs[:5]},
                         status=status.HTTP_400_BAD_REQUEST)

    saved = 0
    try:
        with transaction.atomic():
            etudiant_ids = [u[0].id for u in updates]
            matiere_ids = [u[1].id for u in updates]
            existantes = {
                (n.etudiant_id, n.matiere_id): n
                for n in Note.objects.filter(
                    etudiant_id__in=etudiant_ids, matiere_id__in=matiere_ids, semestre=sem
                )
            }
            a_creer, a_update = [], []
            for etu, mat, d, s, sr, absent in updates:
                cle = (etu.id, mat.id)
                if cle in existantes:
                    n = existantes[cle]
                    n.note_devoir, n.note_session, n.note_sr, n.est_absent = d, s, sr, absent
                    n.moyenne_stockee = n.calculer()
                    a_update.append(n)
                else:
                    obj = Note(etudiant=etu, matiere=mat, semestre=sem,
                               note_devoir=d, note_session=s, note_sr=sr, est_absent=absent)
                    obj.moyenne_stockee = obj.calculer()
                    a_creer.append(obj)
                saved += 1
            if a_update:
                Note.objects.bulk_update(
                    a_update, ['note_devoir', 'note_session', 'note_sr', 'est_absent', 'moyenne_stockee']
                )
            if a_creer:
                Note.objects.bulk_create(a_creer)
    except Exception as e:
        return Response({'detail': f"Erreur : {e}"}, status=status.HTTP_400_BAD_REQUEST)

    return Response({'detail': f"{saved} note(s) enregistrée(s).", 'saved': saved})


# ── NOTE INDIVIDUELLE ─────────────────────────────────────────
@api_view(['GET', 'POST'])
def fac_note_individuelle(request, etudiant_id):
    err = require_faculte(request)
    if err: return err

    etu = get_object_or_404(
        Etudiant.objects.select_related('faculte', 'portail', 'filiere', 'annee_academique'),
        id=etudiant_id
    )
    notes = Note.objects.filter(
        etudiant=etu, semestre=etu.semestre
    ).select_related('matiere__ue').order_by('matiere__ue__code_ue', 'matiere__nom')

    if request.method == 'POST':
        body = request.data
        lignes = {int(l['note_id']): l for l in body.get('notes', [])}
        updates, erreurs = [], []
        for note in notes:
            l = lignes.get(note.id)
            if not l:
                continue
            try:
                d = float(l['devoir']) if l.get('devoir') not in (None, '') else float(note.note_devoir)
                s = float(l['session']) if l.get('session') not in (None, '') else float(note.note_session)
                sr_raw = l.get('rattrapage')
                sr = float(sr_raw) if sr_raw not in (None, '') else (
                    float(note.note_sr) if note.note_sr is not None else None
                )
                absent = bool(l.get('absent'))
                for v, n in [(d, 'Devoir'), (s, 'Session')]:
                    if not 0 <= v <= 20:
                        raise ValueError(f"{n} hors plage [0-20] — {note.matiere.nom}")
                if sr is not None and not 0 <= sr <= 20:
                    raise ValueError(f"Rattrapage hors plage [0-20] — {note.matiere.nom}")
                updates.append((note, d, s, sr, absent))
            except (ValueError, KeyError) as e:
                erreurs.append(str(e))

        if erreurs:
            return Response({'detail': 'Erreurs de validation.', 'erreurs': erreurs},
                             status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            for note, d, s, sr, absent in updates:
                note.note_devoir, note.note_session, note.note_sr, note.est_absent = d, s, sr, absent
                note.moyenne_stockee = note.calculer()
                note.save()

        return Response({'detail': f"Notes de {etu.nom} {etu.prenom} mises à jour."})

    return Response({
        'etudiant': {
            'id': etu.id, 'nom': etu.nom, 'prenom': etu.prenom, 'matricule': etu.matricule,
            'semestre': etu.semestre, 'cycle': etu.cycle, 'parcours': etu.get_parcours(),
        },
        'notes': [
            {
                'id': n.id, 'ue_code': n.matiere.ue.code_ue, 'matiere_nom': n.matiere.nom,
                'credits': n.matiere.credits, 'devoir': float(n.note_devoir),
                'session': float(n.note_session),
                'rattrapage': float(n.note_sr) if n.note_sr is not None else None,
                'absent': n.est_absent, 'moyenne': float(n.moyenne_stockee),
            }
            for n in notes
        ],
    })


# ── DÉLIBÉRATION ──────────────────────────────────────────────
def _serialize_matiere(m_data):
    return {
        'nom': m_data['matiere'].nom, 'credits': m_data['matiere'].credits,
        'non_saisi': m_data.get('non_saisi', False), 'is_absent': m_data.get('is_absent', False),
        'note_calculee': m_data.get('note_calculee'),
    }


def _serialize_ue_detail(ue_data):
    return {
        'ue_nom': ue_data['ue'].nom,
        'moyenne_ue': ue_data['moyenne_ue'], 'est_validee': ue_data['est_validee'],
        'matieres': [_serialize_matiere(m) for m in ue_data['matieres']],
    }


def _serialize_unites(unites):
    return [
        {
            'nom': ue.nom, 'credits_total': ue.credits_total,
            'matieres': [{'nom': m.nom, 'credits': m.credits} for m in ue.matieres.all()],
        }
        for ue in unites
    ]


@api_view(['GET'])
def fac_deliberation(request):
    err = require_faculte(request)
    if err: return err

    fac_id = to_int(request.GET.get('faculte'))
    sem = request.GET.get('semestre', '')
    portail_id = to_int(request.GET.get('portail'))
    filiere_id = to_int(request.GET.get('filiere'))
    save = request.GET.get('save') == '1'

    structure, unites = [], []
    if fac_id and sem:
        structure, unites = calculer_matrice(
            fac_id, sem, save_results=save, portail_id=portail_id, filiere_id=filiere_id
        )

    return Response({
        'structure': [
            {
                'rang': l['rang'],
                'etudiant': {'nom': l['etudiant'].nom, 'prenom': l['etudiant'].prenom,
                             'matricule': l['etudiant'].matricule},
                'moyenne_semestre': l['moyenne_semestre'],
                'total_credits_valides': l['total_credits_valides'],
                'total_credits_semestre': l['total_credits_semestre'],
                'decision': l['decision'], 'mention': l['mention'],
                'ues_detail': [_serialize_ue_detail(u) for u in l['ues_detail']],
            }
            for l in structure
        ],
        'unites': _serialize_unites(unites),
        'saved': save and bool(structure),
    })


# ── PROMOTION ─────────────────────────────────────────────────
@api_view(['GET'])
def fac_promotion(request):
    err = require_faculte(request)
    if err: return err

    fac_id = to_int(request.GET.get('faculte'))
    portail_id = to_int(request.GET.get('portail'))
    filiere_id = to_int(request.GET.get('filiere'))
    sem = request.GET.get('semestre', '')

    etudiants_data = []
    if fac_id and sem:
        qs = Etudiant.objects.filter(faculte_id=fac_id, semestre=sem)
        if portail_id: qs = qs.filter(portail_id=portail_id)
        if filiere_id: qs = qs.filter(filiere_id=filiere_id)
        etudiants = list(qs.select_related('faculte', 'portail', 'filiere').order_by('nom', 'prenom'))
        resultats_map = {
            r.etudiant_id: r for r in ResultatSemestre.objects.filter(etudiant__in=etudiants, semestre=sem)
        }
        for e in etudiants:
            data = _etu_min(e)
            data['a_resultat'] = e.id in resultats_map
            etudiants_data.append(data)

    return Response({
        'facultes': list(Faculte.objects.all().values('id', 'nom', 'code')),
        'etudiants': etudiants_data, 'fac_id': fac_id, 'semestre_selected': sem,
        'semestres': SEMESTRES_LIST, 'portail_id': portail_id, 'filiere_id': filiere_id,
    })


@api_view(['POST'])
def fac_appliquer_promotion(request):
    err = require_faculte(request)
    if err: return err

    ids = request.data.get('etudiants_ids', [])
    nv_sem = request.data.get('nouveau_semestre', '')
    filieres_par_etudiant = request.data.get('filieres', {})  # {etudiant_id: filiere_id} pour S3

    if not ids or not nv_sem:
        return Response({'detail': 'Sélectionnez des étudiants et un semestre cible.'},
                         status=status.HTTP_400_BAD_REQUEST)

    ok, skip, erreurs = 0, 0, []
    with transaction.atomic():
        for e_id in ids:
            try:
                etu = Etudiant.objects.get(id=e_id)
            except Etudiant.DoesNotExist:
                skip += 1
                continue

            res = ResultatSemestre.objects.filter(etudiant=etu, semestre=etu.semestre).first()
            if not res:
                erreurs.append(f"{etu.nom} {etu.prenom} : résultats manquants — ignoré.")
                skip += 1
                continue

            if nv_sem == 'S3':
                fil_id = filieres_par_etudiant.get(str(e_id))
                if not fil_id:
                    skip += 1
                    continue
                try:
                    filiere = Filiere.objects.get(id=fil_id)
                    if filiere.faculte_id != etu.faculte_id:
                        raise ValueError(f"Filière '{filiere.nom}' incohérente.")
                    etu.semestre, etu.filiere, etu.portail = 'S3', filiere, None
                    etu.save()
                    ok += 1
                except Exception as e:
                    erreurs.append(str(e))
                    skip += 1
            else:
                etu.semestre = nv_sem
                etu.save()
                ok += 1

    return Response({'detail': f"{ok} étudiant(s) promu(s), {skip} ignoré(s).",
                      'ok': ok, 'skip': skip, 'erreurs': erreurs})


# ── ORIENTATION S3 ────────────────────────────────────────────
@api_view(['GET'])
def fac_orientation_s3(request):
    err = require_faculte(request)
    if err: return err

    admis_ids = ResultatSemestre.objects.filter(
        semestre='S2', decision='ADMIS'
    ).values_list('etudiant_id', flat=True)

    etudiants = Etudiant.objects.filter(
        id__in=admis_ids, semestre='S2'
    ).select_related('faculte', 'portail').order_by('nom')

    data = []
    for e in etudiants:
        portails = e.faculte.portails.all() if e.faculte else []
        data.append({
            'id': e.id, 'nom': e.nom, 'prenom': e.prenom, 'matricule': e.matricule,
            'faculte_code': e.faculte.code if e.faculte else None,
            'portail_nom': e.portail.nom if e.portail else None,
            'filieres_options': [
                {
                    'portail_nom': p.nom,
                    'filieres': [{'id': f.id, 'nom': f.nom, 'code': f.code} for f in p.filieres.all()],
                }
                for p in portails
            ],
        })

    return Response({'etudiants': data})


@api_view(['POST'])
def fac_appliquer_orientation_s3(request):
    err = require_faculte(request)
    if err: return err

    filieres_par_etudiant = request.data.get('filieres', {})  # {etudiant_id: filiere_id}

    admis_ids = ResultatSemestre.objects.filter(
        semestre='S2', decision='ADMIS'
    ).values_list('etudiant_id', flat=True)
    etudiants = list(Etudiant.objects.filter(id__in=admis_ids, semestre='S2'))

    manquants = [e for e in etudiants if not filieres_par_etudiant.get(str(e.id))]
    if manquants:
        return Response({'detail': 'Choisissez une filière pour chaque étudiant.'},
                         status=status.HTTP_400_BAD_REQUEST)

    try:
        with transaction.atomic():
            n = 0
            for etu in etudiants:
                fil = get_object_or_404(Filiere, id=filieres_par_etudiant[str(etu.id)])
                if fil.faculte_id != etu.faculte_id:
                    raise ValueError(f"Filière '{fil.nom}' incohérente avec la faculté de l'étudiant.")
                etu.semestre, etu.filiere, etu.portail = 'S3', fil, None
                etu.save()
                n += 1
    except Exception as e:
        return Response({'detail': f"Erreur : {e}"}, status=status.HTTP_400_BAD_REQUEST)

    return Response({'detail': f"{n} étudiant(s) basculé(s) en S3."})


# ── MATRICE A3 — vérification avant génération ──────────────────
# Corrige le bug remonté : cliquer sur "Générer" faisait naviguer le
# navigateur vers l'URL de génération (formulaire GET classique), et si
# aucun étudiant ne correspondait, la même page de filtre était
# ré-affichée avec un message — donnant l'impression que "la page change
# pour rien". On vérifie maintenant D'ABORD (en AJAX, sans navigation)
# s'il y a des étudiants, et on n'ouvre le PDF dans un nouvel onglet que
# si c'est le cas — sinon on affiche l'alerte sur place, sans bouger.
@api_view(['GET'])
def fac_matrice_a3_check(request):
    err = require_faculte(request)
    if err: return err

    fac_id = to_int(request.GET.get('faculte'))
    sem = request.GET.get('semestre', '')
    portail_id = to_int(request.GET.get('portail'))
    filiere_id = to_int(request.GET.get('filiere'))

    if not fac_id or not sem:
        return Response({'count': 0, 'detail': 'Faculté et semestre requis.'})

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


# ── ENSEIGNANTS (reçus de l'Espace RH — lecture + confirmation volume) ──
# La Faculté ne CRÉE aucun enseignant (c'est le rôle de la RH). Elle
# consulte la liste enregistrée par la RH, et pour les vacataires, elle
# confirme que le volume horaire prévu a bien été effectué avant que la
# Finance ne puisse s'appuyer dessus pour payer.
def _serialize_affectation_fac(a):
    return {
        'id': a.id,
        'faculte_code': a.faculte.code, 'faculte_nom': a.faculte.nom,
        'portail_nom': a.portail.nom if a.portail else None,
        'filiere_nom': a.filiere.nom if a.filiere else None,
        'semestre': a.semestre,
        'volume_horaire_prevu': str(a.volume_horaire_prevu),
        'volume_confirme_faculte': a.volume_confirme_faculte,
    }


@api_view(['GET'])
def fac_enseignants(request):
    err = require_faculte(request)
    if err: return err

    fac_id = to_int(request.GET.get('faculte'))
    filiere_id = to_int(request.GET.get('filiere'))
    statut = request.GET.get('statut', '')  # vacataire | permanent
    query = request.GET.get('q', '').strip()

    qs = Enseignant.objects.select_related('faculte', 'filiere', 'annee_academique').filter(actif=True)
    if statut in ('vacataire', 'permanent'): qs = qs.filter(statut=statut)
    if query:
        qs = qs.filter(
            Q(nom__icontains=query) | Q(prenom__icontains=query) |
            Q(matricule__icontains=query)
        )
    if fac_id:
        qs = qs.filter(Q(faculte_id=fac_id) | Q(affectations__faculte_id=fac_id)).distinct()
    if filiere_id:
        qs = qs.filter(Q(filiere_id=filiere_id) | Q(affectations__filiere_id=filiere_id)).distinct()

    enseignants = list(qs.order_by('nom', 'prenom'))
    affectations_map = {}
    vacataires = [e for e in enseignants if e.statut == 'vacataire']
    if vacataires:
        for a in AffectationVacataire.objects.filter(enseignant__in=vacataires).select_related('faculte', 'portail', 'filiere'):
            affectations_map.setdefault(a.enseignant_id, []).append(_serialize_affectation_fac(a))

    return Response({
        'enseignants': [
            {
                'id': e.id, 'matricule': e.matricule, 'nom': e.nom, 'prenom': e.prenom,
                'email': e.email, 'telephone': e.telephone,
                'faculte_code': e.faculte.code if e.faculte else None,
                'filiere_nom': e.filiere.nom if e.filiere else None,
                'statut': e.statut, 'statut_display': e.get_statut_display(),
                'chef_departement': e.chef_departement,
                'diplome': e.diplome,
                'affectations': affectations_map.get(e.id, []),
            }
            for e in enseignants
        ],
        'facultes': list(Faculte.objects.all().values('id', 'nom', 'code')),
        'filieres': list(
            Filiere.objects.select_related('faculte').order_by('nom')
            .values('id', 'nom', 'faculte_id')
        ),
    })


@api_view(['POST'])
def fac_confirmer_volume_affectation(request, affectation_id):
    """La Faculté atteste que le volume horaire prévu par la RH a bien
    été effectué par le vacataire — sert de feu vert pour la Finance."""
    err = require_faculte(request)
    if err: return err

    try:
        a = AffectationVacataire.objects.get(id=affectation_id)
    except AffectationVacataire.DoesNotExist:
        return Response({'detail': 'Affectation introuvable.'}, status=status.HTTP_404_NOT_FOUND)

    confirme = bool(request.data.get('confirme', True))
    a.volume_confirme_faculte = confirme
    a.date_confirmation = timezone.now() if confirme else None
    a.save(update_fields=['volume_confirme_faculte', 'date_confirmation'])

    return Response({
        'detail': "Volume horaire confirmé." if confirme else "Confirmation retirée.",
        'volume_confirme_faculte': a.volume_confirme_faculte,
    })
