from datetime import date, datetime

from .pdf_utils import link_callback
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib import messages
from django.db import transaction
from django.db.models import Count, Q
from django.http import HttpResponse, JsonResponse
from django.template.loader import get_template
from xhtml2pdf import pisa

from .decorators import secretaire_required, faculte_required
from .engine import calculer_matrice
from .models import (
    Etudiant, Faculte, Portail, Filiere,
    AnneeAcademique, ResultatSemestre, ParametresUCCB,
    UniteEnseignement, Note
)

SEMESTRES_LIST = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6']


def _int(val):
    try:
        return int(val) if val else None
    except (ValueError, TypeError):
        return None


# ── DASHBOARD ─────────────────────────────────────────────────
# NOTE MIGRATION REACT : ces vues ne font plus que l'auth + le rendu de la
# coquille React. Données et logique métier servies par api_secretariat.py
# et api_faculte.py (aucune règle métier dupliquée/modifiée).
@secretaire_required
def sec_dashboard(request):
    return render(request, 'gestion_eleves/secretaire/react_shell.html', {
        'entry': 'sec-dashboard', 'page_title': 'Tableau de bord', 'active': 'sec_dashboard',
    })


# ── LISTE ÉTUDIANTS ───────────────────────────────────────────
@secretaire_required
def sec_liste_etudiants(request):
    return render(request, 'gestion_eleves/secretaire/react_shell.html', {
        'entry': 'sec-liste-etudiants', 'page_title': 'Liste des Étudiants',
        'active': 'sec_liste_etudiants',
    })


# ── CHANGER STATUT ÉTUDIANT ───────────────────────────────────
@secretaire_required
def sec_changer_statut(request, etudiant_id):
    etu = get_object_or_404(Etudiant, id=etudiant_id)

    if request.method == 'POST':
        nouveau_statut = request.POST.get('statut', '').strip()
        STATUTS_VALIDES = ['actif', 'diplome', 'abandonne']

        if nouveau_statut not in STATUTS_VALIDES:
            messages.error(request, "Statut invalide.")
        else:
            ancien = etu.statut
            etu.statut = nouveau_statut
            etu.save(update_fields=['statut'])
            messages.success(
                request,
                f"Statut de {etu.nom} {etu.prenom} changé : {ancien} → {nouveau_statut}"
            )

    return redirect('sec_liste_etudiants')


# ── ATTESTATION ───────────────────────────────────────────────
@secretaire_required
def sec_attestation(request, etudiant_id):
    etu = get_object_or_404(
        Etudiant.objects.select_related('faculte', 'portail', 'filiere', 'annee_academique'),
        id=etudiant_id
    )
    params = ParametresUCCB.objects.first()

    semestres_disponibles = list(
        Note.objects.filter(etudiant=etu)
        .values_list('semestre', flat=True)
        .distinct().order_by('semestre')
    )

    sem_demande = request.GET.get('semestre', etu.semestre)
    if sem_demande not in semestres_disponibles and semestres_disponibles:
        sem_demande = etu.semestre

    if sem_demande in ['S1', 'S2']:
        parcours_sem = etu.portail.nom if etu.portail else etu.get_parcours()
    else:
        parcours_sem = etu.filiere.nom if etu.filiere else etu.get_parcours()

    return render(request, 'gestion_eleves/documents/attestation.html', {
        'etudiant': etu,
        'parametres': params,
        'titre': etu.get_titre(),
        'qualite': etu.get_qualite(),
        'parcours': parcours_sem,
        'titre_secretaire': params.titre_secretaire() if params else "Le Secrétaire Universitaire",
        'date': date.today().strftime('%d/%m/%Y'),
        'semestre_affiche': sem_demande,
        'semestres_disponibles': semestres_disponibles,
        'semestre_selectionne': sem_demande,
    })


# ── RELEVÉ DE NOTES ───────────────────────────────────────────
@secretaire_required
def sec_releve(request, etudiant_id):
    etu = get_object_or_404(
        Etudiant.objects.select_related('faculte', 'portail', 'filiere', 'annee_academique'),
        id=etudiant_id
    )
    params = ParametresUCCB.objects.first()

    semestres_avec_notes = list(
        Note.objects.filter(etudiant=etu)
        .values_list('semestre', flat=True)
        .distinct()
        .order_by('semestre')
    )

    sem_demande = request.GET.get('semestre', etu.semestre)
    if sem_demande not in semestres_avec_notes and semestres_avec_notes:
        sem_demande = semestres_avec_notes[-1]

    if sem_demande in ['S1', 'S2']:
        if etu.portail:
            parcours_sem = etu.portail.nom
        else:
            note_hist = Note.objects.filter(
                etudiant=etu, semestre=sem_demande
            ).select_related('matiere__ue__portail').first()
            if note_hist and note_hist.matiere.ue.portail:
                parcours_sem = note_hist.matiere.ue.portail.nom
            else:
                parcours_sem = etu.get_parcours()
    else:
        if etu.filiere:
            parcours_sem = etu.filiere.nom
        else:
            note_hist = Note.objects.filter(
                etudiant=etu, semestre=sem_demande
            ).select_related('matiere__ue__filiere').first()
            if note_hist and note_hist.matiere.ue.filiere:
                parcours_sem = note_hist.matiere.ue.filiere.nom
            else:
                parcours_sem = etu.get_parcours()

    structure_matrice, _ = calculer_matrice(None, sem_demande, etudiant_id=etu.id, save_results=False)
    donnees = structure_matrice[0] if structure_matrice else {}

    return render(request, 'gestion_eleves/documents/releve_notes.html', {
        'etudiant':               etu,
        'parametres':             params,
        'titre':                  etu.get_titre() if hasattr(etu, 'get_titre') else "M.",
        'qualite':                etu.get_qualite() if hasattr(etu, 'get_qualite') else "Étudiant",
        'parcours':               parcours_sem,
        'semestre_affiche':       sem_demande,
        'semestres_disponibles':  semestres_avec_notes if semestres_avec_notes else [etu.semestre],
        'semestre_selectionne':   sem_demande,
        'titre_secretaire':       params.titre_secretaire() if (params and hasattr(params, 'titre_secretaire')) else "Le Secrétaire Universitaire",
        'structure':              donnees.get('ues_detail', []),
        'moyenne_generale':       donnees.get('moyenne_semestre', 0),
        'total_credits_valides':  donnees.get('total_credits_valides', 0),
        'total_credits_semestre': donnees.get('total_credits_semestre', 0),
        'decision':               donnees.get('decision', 'AJOURNÉ'),
        'mention':                donnees.get('mention', 'NÉANT'),
        'date':                   datetime.now().strftime('%d/%m/%Y'),
    })


# ── MATRICE A3 ────────────────────────────────────────────────
from django.http import HttpResponse, JsonResponse
from django.shortcuts import render, get_object_or_404
from datetime import datetime
from xhtml2pdf import pisa
from django.template.loader import get_template
@secretaire_required
def sec_matrice_a3(request):
    fac_id = _int(request.GET.get('faculte'))
    sem_id = request.GET.get('semestre', '')
    portail_id = _int(request.GET.get('portail'))
    filiere_id = _int(request.GET.get('filiere'))

    # ============================================================
    # 1. CHARGEMENT NORMAL DE LA PAGE REACT (aucun paramètre)
    # ============================================================
    if not fac_id and not sem_id:
        return render(
            request,
            'gestion_eleves/secretaire/react_shell.html',
            {
                'entry': 'sec-matrice-a3',
                'page_title': 'Matrice A3',
                'active': 'sec_matrice_a3',
            }
        )

    # ============================================================
    # 2. VÉRIFICATION DES PARAMÈTRES
    # ============================================================
    if (
        not fac_id
        or not sem_id
        or (not portail_id and not filiere_id)
    ):
        return JsonResponse(
            {
                'error':
                    'Sélectionnez une faculté, un semestre et '
                    'un portail ou une filière.'
            },
            status=400
        )

    # ============================================================
    # 3. FACULTÉ
    # ============================================================
    faculte = get_object_or_404(Faculte, id=fac_id)

    # ============================================================
    # 4. PORTAIL / FILIÈRE
    # ============================================================
    portail_obj = Portail.objects.filter(id=portail_id).first() if portail_id else None
    filiere_obj = Filiere.objects.filter(id=filiere_id).first() if filiere_id else None

    # ============================================================
    # 5. CALCUL DE LA MATRICE
    # ============================================================
    struct, unites = calculer_matrice(
        fac_id, sem_id, save_results=True,
        portail_id=portail_id, filiere_id=filiere_id
    )

    # ============================================================
    # 5bis. IMAGES VERTICALES DES NOMS DE MATIÈRES (pour l'en-tête PDF)
    # On reconstruit "unites" en dictionnaires simples (au lieu du
    # queryset ORM) pour pouvoir attacher à chaque matière son image
    # verticale déjà générée, sans risque que Django ré-interroge la
    # base et perde l'info entre les 3 boucles du template (colgroup,
    # ligne des noms, ligne des /20).
    # ============================================================
    from .pdf_utils import matiere_vertical_image

    unites_ctx = []
    for ue in unites:
        matieres_ctx = []
        for mat in ue.matieres.all():
            img_uri, img_w, img_h = matiere_vertical_image(mat.nom)
            matieres_ctx.append({
                'nom': mat.nom,
                'credits': mat.credits,
                'img': img_uri,
                'img_w': img_w,
                'img_h': img_h,
            })
        unites_ctx.append({
            'nom': ue.nom,
            'credits_total': ue.credits_total,
            'matieres': matieres_ctx,
        })

    # ============================================================
    # 6. AUCUN ÉTUDIANT / AUCUNE UE
    # ============================================================
    if not struct:
        return JsonResponse(
            {'error': 'Aucun étudiant ou UE trouvé pour cette sélection.'},
            status=400
        )

    # ============================================================
    # 7. DONNÉES DU DOCUMENT
    # ============================================================
    params = ParametresUCCB.objects.first()
    titre_sign, nom_sign = faculte.signataire_pv()
    annee_active = AnneeAcademique.objects.filter(est_active=True).first()
    toutes_matieres = [
        {'ue': ue, 'mat': mat}
        for ue in unites for mat in ue.matieres.all()
    ]

    # ============================================================
    # 8. CONTEXTE
    # ============================================================
    context = {
        'faculte': faculte,
        'structure': struct,
        'unites': unites_ctx,
        'toutes_matieres': toutes_matieres,
        'sem_id': sem_id,
        'portail': portail_obj,
        'filiere': filiere_obj,
        'annee_academique': annee_active,
        'date': datetime.now().strftime('%d/%m/%Y'),
        'parametres': params,
        'titre_sign': titre_sign,
        'nom_sign': nom_sign,
        'is_pdf': True,
    }

    # ============================================================
    # 9. GÉNÉRATION DIRECTE DU PDF — une seule réponse, point final.
    # ============================================================
    html = get_template('gestion_eleves/documents/matrice_a3.html').render(context)
    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = f'inline; filename="Matrice_{faculte.code}_{sem_id}.pdf"'
    pisa.CreatePDF(html, dest=response, link_callback=link_callback)
    return response
# ── PROMOTION ─────────────────────────────────────────────────
@faculte_required
def sec_promotion(request):
    return render(request, 'gestion_eleves/faculte/react_shell.html', {
        'entry': 'fac-promotion', 'page_title': 'Passage de Semestre', 'active': 'sec_promotion',
    })


@faculte_required
def sec_appliquer_promotion(request):
    # Conservé pour compatibilité, mais React utilise désormais
    # api_faculte.fac_appliquer_promotion (retour JSON, pas de redirection).
    if request.method != 'POST':
        return redirect('sec_promotion')

    ids = request.POST.getlist('etudiants_selectionnes')
    nv_sem = request.POST.get('nouveau_semestre', '')
    if not ids or not nv_sem:
        messages.error(request, "Sélectionnez des étudiants et un semestre cible.")
        return redirect('sec_promotion')

    ok, skip = 0, 0
    with transaction.atomic():
        for e_id in ids:
            try:
                etu = Etudiant.objects.get(id=e_id)
            except Etudiant.DoesNotExist:
                skip += 1
                continue

            res = ResultatSemestre.objects.filter(etudiant=etu, semestre=etu.semestre).first()
            if not res:
                messages.warning(request, f"{etu.nom} {etu.prenom} : résultats manquants — ignoré.")
                skip += 1
                continue

            if nv_sem == 'S3':
                fil_id = request.POST.get(f'filiere_{etu.id}')
                if not fil_id:
                    skip += 1
                    continue
                try:
                    filiere = Filiere.objects.get(id=fil_id)
                    if filiere.faculte_id != etu.faculte_id:
                        raise ValueError(f"Filière '{filiere.nom}' incohérente.")
                    etu.semestre = 'S3'
                    etu.filiere = filiere
                    etu.portail = None
                    etu.save()
                    ok += 1
                except Exception as e:
                    messages.error(request, str(e))
                    skip += 1
            else:
                etu.semestre = nv_sem
                etu.save()
                ok += 1

    if ok:   messages.success(request, f"{ok} étudiant(s) promu(s) en {nv_sem}.")
    if skip: messages.warning(request, f"{skip} ignoré(s).")
    return redirect('sec_promotion')


# ── ORIENTATION S3 ────────────────────────────────────────────
@faculte_required
def sec_orientation_s3(request):
    return render(request, 'gestion_eleves/faculte/react_shell.html', {
        'entry': 'fac-orientation-s3', 'page_title': 'Orientation vers le Semestre 3',
        'active': 'sec_orientation_s3',
    })


# ── API AJAX ──────────────────────────────────────────────────
def api_portails(request):
    fac_id = request.GET.get('faculte_id', '')
    data = list(Portail.objects.filter(faculte_id=fac_id).values('id', 'nom', 'code')) if fac_id else []
    return JsonResponse({'portails': data})


def api_filieres(request):
    fac_id = request.GET.get('faculte_id', '')
    if not fac_id:
        filieres = Filiere.objects.all().values('id', 'nom', 'code')
    else:
        filieres = Filiere.objects.filter(faculte_id=fac_id).values('id', 'nom', 'code')
    return JsonResponse({'filieres': list(filieres)})


def api_ues(request):
    fac_id = request.GET.get('faculte_id', '')
    sem = request.GET.get('semestre', '')
    if not fac_id or not sem:
        return JsonResponse({'ues': []})
    if sem in ['S1', 'S2']:
        ues = UniteEnseignement.objects.filter(
            semestre=sem
        ).filter(
            Q(portail__faculte_id=fac_id) | Q(filiere__faculte_id=fac_id)
        ).distinct().values('id', 'nom', 'code_ue')
    else:
        ues = UniteEnseignement.objects.filter(
            semestre=sem, filiere__faculte_id=fac_id
        ).values('id', 'nom', 'code_ue')
    return JsonResponse({'ues': list(ues)})


# ── GESTION ÉTUDIANTS ────────────────────────────────────────
@secretaire_required
def sec_ajouter_etudiant(request):
    return render(request, 'gestion_eleves/secretaire/react_shell.html', {
        'entry': 'sec-ajouter-etudiant', 'page_title': 'Ajouter un Étudiant',
        'active': 'sec_ajouter_etudiant',
    })


@secretaire_required
def sec_annees_academiques(request):
    return render(request, 'gestion_eleves/secretaire/react_shell.html', {
        'entry': 'sec-annees-academiques', 'page_title': 'Gestion des Années Académiques',
        'active': 'sec_annees_academiques',
    })


@secretaire_required
def sec_facultes(request):
    return render(request, 'gestion_eleves/secretaire/react_shell.html', {
        'entry': 'sec-facultes', 'page_title': 'Gestion des Facultés', 'active': 'sec_facultes',
    })
