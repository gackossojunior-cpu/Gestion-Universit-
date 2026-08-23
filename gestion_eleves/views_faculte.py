from datetime import datetime

from .pdf_utils import link_callback
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib import messages
from django.db import transaction
from django.db.models import Count, Q
from django.http import HttpResponse
from django.template.loader import get_template
from xhtml2pdf import pisa

from .decorators import faculte_required
from .engine import calculer_matrice
from .models import (
    Etudiant, Faculte, Portail, Filiere, AnneeAcademique,
    Note, Matiere, UniteEnseignement,
    ResultatSemestre, ParametresUCCB
)

SEMESTRES_LIST = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6']


def _int(val):
    try:
        return int(val) if val else None
    except (ValueError, TypeError):
        return None


# ── DASHBOARD ─────────────────────────────────────────────────
# NOTE MIGRATION REACT : ces vues ne font plus que l'auth + le rendu de la
# coquille React (le div #root + le bundle JS). Toutes les données et la
# logique métier sont désormais servies par gestion_eleves/api_faculte.py,
# qui réutilise les mêmes calculs (aucune règle métier dupliquée/modifiée).
@faculte_required
def fac_dashboard(request):
    return render(request, 'gestion_eleves/faculte/react_shell.html', {
        'entry': 'fac-dashboard', 'page_title': 'Tableau de bord', 'active': 'fac_dashboard',
    })


# ── LISTE CLASSE ──────────────────────────────────────────────
@faculte_required
def fac_liste_classe(request):
    return render(request, 'gestion_eleves/faculte/react_shell.html', {
        'entry': 'fac-liste-classe', 'page_title': 'Liste de la Classe', 'active': 'fac_liste_classe',
    })


# ── SAISIE NOTES ──────────────────────────────────────────────
@faculte_required
def fac_saisie_notes(request):
    return render(request, 'gestion_eleves/faculte/react_shell.html', {
        'entry': 'fac-saisie-notes', 'page_title': 'Saisie des Notes', 'active': 'fac_saisie_notes',
    })


# ── NOTE INDIVIDUELLE ─────────────────────────────────────────
@faculte_required
def fac_note_individuelle(request, etudiant_id):
    return render(request, 'gestion_eleves/faculte/react_shell.html', {
        'entry': 'fac-note-individuelle', 'page_title': 'Mise à jour individuelle',
        'active': 'fac_note_individuelle', 'etudiant_id': etudiant_id,
    })


# ── DÉLIBÉRATION ──────────────────────────────────────────────
@faculte_required
def fac_deliberation(request):
    return render(request, 'gestion_eleves/faculte/react_shell.html', {
        'entry': 'fac-deliberation', 'page_title': 'Délibération & Calcul des Moyennes',
        'active': 'fac_deliberation',
    })


# ── EXPORT EXCEL ──────────────────────────────────────────────
@faculte_required
def fac_export_excel(request):
    messages.info(request, "L'export Excel a été retiré. Utilisez la Matrice A3.")
    return redirect('fac_deliberation')

from django.http import HttpResponse, JsonResponse
from django.shortcuts import render, get_object_or_404
from datetime import datetime
from xhtml2pdf import pisa
from django.template.loader import get_template


# ── ENSEIGNANTS (reçus de l'Espace RH, lecture + confirmation) ──
@faculte_required
def fac_enseignants(request):
    return render(request, 'gestion_eleves/faculte/react_shell.html', {
        'entry': 'fac-enseignants', 'page_title': 'Enseignants', 'active': 'fac_enseignants',
    })


@faculte_required
def fac_matrice_a3(request):
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
            'gestion_eleves/faculte/react_shell.html',
            {
                'entry': 'fac-matrice-a3',
                'page_title': 'Matrice A3',
                'active': 'fac_matrice_a3',
            }
        )

    # ============================================================
    # 2. PARAMÈTRES OBLIGATOIRES
    # ============================================================
    if not fac_id or not sem_id:
        return JsonResponse(
            {'error': 'Sélectionnez une faculté et un semestre.'},
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
    response['Content-Disposition'] = f'inline; filename="MatriceA3_{faculte.code}_{sem_id}.pdf"'
    pisa.CreatePDF(html, dest=response, link_callback=link_callback)
    return response
# ── VUE QR CODE (publique) ────────────────────────────────────
def vue_qr_etudiant(request, etudiant_id):
    etu = get_object_or_404(
        Etudiant.objects.select_related('faculte', 'portail', 'filiere', 'annee_academique'),
        id=etudiant_id
    )
    semestres_dispo = list(
        Note.objects.filter(etudiant=etu)
        .values_list('semestre', flat=True)
        .distinct().order_by('semestre')
    )
    sem_demande = request.GET.get('semestre', etu.semestre)
    if sem_demande not in semestres_dispo and semestres_dispo:
        sem_demande = semestres_dispo[-1]

    if sem_demande in ['S1', 'S2']:
        parcours_sem = etu.portail.nom if etu.portail else "—"
    else:
        parcours_sem = etu.filiere.nom if etu.filiere else "—"

    structure, _ = calculer_matrice(None, sem_demande, etudiant_id=etu.id)
    ligne = structure[0] if structure else None

    return render(request, 'gestion_eleves/documents/vue_qr.html', {
        'etudiant': etu,
        'ligne': ligne,
        'parcours': parcours_sem,
        'semestre_affiche': sem_demande,
        'semestres_dispo': semestres_dispo,
    })