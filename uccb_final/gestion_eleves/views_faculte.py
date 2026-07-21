from datetime import datetime

from django.shortcuts import render, get_object_or_404, redirect
from django.contrib import messages
from django.db import transaction
from django.db.models import Count
from django.http import HttpResponse
from django.template.loader import get_template
from xhtml2pdf import pisa
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from .decorators import faculte_required
from .engine import calculer_matrice
from .models import (
    AnneeAcademique,
    Etudiant, Faculte, Portail, Filiere,
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
@faculte_required
def fac_dashboard(request):
    annee_active = AnneeAcademique.objects.filter(est_active=True).first()
    stats = {
        'total':       Etudiant.objects.count(),
        'par_faculte': Faculte.objects.annotate(nb=Count('etudiant')).filter(nb__gt=0),
    }
    recent = Etudiant.objects.select_related(
        'faculte', 'portail', 'filiere', 'annee_academique'
    ).order_by('-id')[:10]
    return render(request, 'gestion_eleves/faculte/dashboard.html', {
        'stats':        stats,
        'annee_active': annee_active,
        'recent':       recent,
        'facultes':     Faculte.objects.all(),
        'semestres':    SEMESTRES_LIST,
    })


# ── LISTE CLASSE ──────────────────────────────────────────────
@faculte_required
def fac_liste_classe(request):
    fac_id     = _int(request.GET.get('faculte'))
    sem        = request.GET.get('semestre', '')
    portail_id = _int(request.GET.get('portail'))
    filiere_id = _int(request.GET.get('filiere'))
    etudiants, resultats_map = Etudiant.objects.none(), {}

    if fac_id and sem:
        qs = Etudiant.objects.filter(
            faculte_id=fac_id, semestre=sem
        ).select_related('faculte', 'portail', 'filiere', 'annee_academique')
        if portail_id: qs = qs.filter(portail_id=portail_id)
        if filiere_id: qs = qs.filter(filiere_id=filiere_id)
        etudiants = qs.order_by('nom', 'prenom')
        for r in ResultatSemestre.objects.filter(etudiant__in=etudiants, semestre=sem):
            resultats_map[r.etudiant_id] = r

    portails = Portail.objects.filter(faculte_id=fac_id) if fac_id else []
    filieres = Filiere.objects.filter(portail__faculte_id=fac_id).select_related('portail') if fac_id else []

    return render(request, 'gestion_eleves/faculte/liste_classe.html', {
        'etudiants': etudiants, 'resultats_map': resultats_map,
        'facultes': Faculte.objects.all(), 'portails': portails, 'filieres': filieres,
        'fac_id': fac_id, 'sem': sem, 'portail_id': portail_id,
        'filiere_id': filiere_id, 'semestres': SEMESTRES_LIST,
    })


# ── SAISIE NOTES ──────────────────────────────────────────────
@faculte_required
def fac_saisie_notes(request):
    fac_id     = _int(request.GET.get('faculte'))
    sem        = request.GET.get('semestre', '')
    ue_id      = _int(request.GET.get('ue'))
    portail_id = _int(request.GET.get('portail'))
    filiere_id = _int(request.GET.get('filiere'))
    etudiants, matieres, unites, notes_dict = [], [], [], {}

    # Listes portails et filières pour les menus
    from .models import Portail, Filiere as FiliereModel
    portails_dispo = Portail.objects.filter(faculte_id=fac_id) if fac_id else []
    filieres_dispo = FiliereModel.objects.filter(
        portail__faculte_id=fac_id) if fac_id else []

    if fac_id and sem:
        if sem in ['S1', 'S2']:
            qs_ue = UniteEnseignement.objects.filter(
                semestre=sem, portail__faculte_id=fac_id)
            if portail_id:
                qs_ue = qs_ue.filter(portail_id=portail_id)
            unites = list(qs_ue.order_by('code_ue'))
        else:
            qs_ue = UniteEnseignement.objects.filter(
                semestre=sem, filiere__portail__faculte_id=fac_id)
            if filiere_id:
                qs_ue = qs_ue.filter(filiere_id=filiere_id)
            unites = list(qs_ue.order_by('code_ue'))

    if fac_id and sem and ue_id:
        qs_etu = Etudiant.objects.filter(
            faculte_id=fac_id, semestre=sem, statut='actif'
        ).select_related('portail', 'filiere')
        # Filtrer par portail ou filière si sélectionné
        if sem in ['S1', 'S2'] and portail_id:
            qs_etu = qs_etu.filter(portail_id=portail_id)
        elif sem not in ['S1', 'S2'] and filiere_id:
            qs_etu = qs_etu.filter(filiere_id=filiere_id)
        etudiants = list(qs_etu.order_by('nom', 'prenom'))
        matieres = list(Matiere.objects.filter(ue_id=ue_id).order_by('nom'))
        # Précharger toutes les notes existantes en une seule requête
        for n in Note.objects.filter(etudiant__in=etudiants, matiere__in=matieres, semestre=sem):
            notes_dict[f"{n.etudiant_id}_{n.matiere_id}"] = n

    if request.method == 'POST' and fac_id and sem and ue_id:
        saved, erreurs = 0, []
        updates = []

        for etu in etudiants:
            for mat in matieres:
                raw_d  = request.POST.get(f"devoir_{etu.id}_{mat.id}", '').strip()
                raw_s  = request.POST.get(f"session_{etu.id}_{mat.id}", '').strip()
                raw_sr = request.POST.get(f"rattrapage_{etu.id}_{mat.id}", '').strip()
                absent = request.POST.get(f"absent_{etu.id}_{mat.id}") == 'on'
                try:
                    d  = float(raw_d)  if raw_d  else 0.0
                    s  = float(raw_s)  if raw_s  else 0.0
                    sr = float(raw_sr) if raw_sr else None
                    for v, n in [(d,'Devoir'),(s,'Session')]:
                        if not 0 <= v <= 20:
                            raise ValueError(f"{n} hors plage [0-20] pour {etu.nom}")
                    if sr is not None and not 0 <= sr <= 20:
                        raise ValueError(f"Rattrapage hors plage [0-20] pour {etu.nom}")
                    updates.append((etu, mat, d, s, sr, absent))
                except ValueError as e:
                    erreurs.append(str(e))

        if erreurs:
            for e in erreurs[:3]: messages.error(request, e)
        else:
            try:
                with transaction.atomic():
                    # Précharger les notes existantes en UNE requête
                    etudiant_ids = [u[0].id for u in updates]
                    matiere_ids  = [u[1].id for u in updates]
                    existantes = {
                        (n.etudiant_id, n.matiere_id): n
                        for n in Note.objects.filter(
                            etudiant_id__in=etudiant_ids,
                            matiere_id__in=matiere_ids,
                            semestre=sem
                        )
                    }
                    a_creer  = []
                    a_update = []
                    for etu, mat, d, s, sr, absent in updates:
                        cle = (etu.id, mat.id)
                        if cle in existantes:
                            n = existantes[cle]
                            n.note_devoir  = d
                            n.note_session = s
                            n.note_sr      = sr
                            n.est_absent   = absent
                            n.moyenne_stockee = n.calculer()
                            a_update.append(n)
                        else:
                            from .models import Note as NoteModel
                            obj = NoteModel(
                                etudiant=etu, matiere=mat, semestre=sem,
                                note_devoir=d, note_session=s,
                                note_sr=sr, est_absent=absent
                            )
                            obj.moyenne_stockee = obj.calculer()
                            a_creer.append(obj)
                        saved += 1

                    # Bulk update (1 requête pour tous les champs)
                    if a_update:
                        Note.objects.bulk_update(
                            a_update,
                            ['note_devoir','note_session','note_sr','est_absent','moyenne_stockee']
                        )
                    # Bulk create (1 requête pour toutes les nouvelles)
                    if a_creer:
                        Note.objects.bulk_create(a_creer)

                messages.success(request, f"✅ {saved} note(s) enregistrée(s).")
            except Exception as e:
                messages.error(request, f"Erreur : {e}")
        return redirect(f"{request.path}?faculte={fac_id}&semestre={sem}&ue={ue_id}")

    return render(request, 'gestion_eleves/faculte/saisie_notes.html', {
        'facultes': Faculte.objects.all(),
        'unites': unites,
        'etudiants': etudiants,
        'matieres': matieres,
        'notes_dict': notes_dict,
        'fac_id': fac_id,
        'sem': sem,
        'ue_id': ue_id,
        'semestres': SEMESTRES_LIST,
        'portails_dispo': list(portails_dispo),
        'filieres_dispo': list(filieres_dispo),
        'portail_id': portail_id,
        'filiere_id': filiere_id,
    })


# ── NOTE INDIVIDUELLE ─────────────────────────────────────────
@faculte_required
def fac_note_individuelle(request, etudiant_id):
    etu = get_object_or_404(
        Etudiant.objects.select_related('faculte', 'portail', 'filiere', 'annee_academique'),
        id=etudiant_id
    )
    notes = Note.objects.filter(
        etudiant=etu, semestre=etu.semestre
    ).select_related('matiere__ue').order_by('matiere__ue__code_ue', 'matiere__nom')

    if request.method == 'POST':
        updates, erreurs = [], []
        for note in notes:
            raw_d  = request.POST.get(f"devoir_{note.id}", '').strip()
            raw_s  = request.POST.get(f"session_{note.id}", '').strip()
            raw_sr = request.POST.get(f"rattrapage_{note.id}", '').strip()
            absent = request.POST.get(f"absent_{note.id}") == 'on'
            try:
                # Si le champ est vide, conserver la valeur déjà en base
                d  = float(raw_d)  if raw_d  != '' else float(note.note_devoir)
                s  = float(raw_s)  if raw_s  != '' else float(note.note_session)
                # Rattrapage : vide = effacer (None), valeur = mettre à jour
                if raw_sr != '':
                    sr = float(raw_sr)
                else:
                    sr = float(note.note_sr) if note.note_sr is not None else None

                for v, n in [(d,'Devoir'),(s,'Session')]:
                    if not 0 <= v <= 20:
                        raise ValueError(f"{n} hors plage [0-20] — {note.matiere.nom}")
                if sr is not None and not 0 <= sr <= 20:
                    raise ValueError(f"Rattrapage hors plage [0-20] — {note.matiere.nom}")
                updates.append((note, d, s, sr, absent))
            except ValueError as e:
                erreurs.append(str(e))

        if erreurs:
            for e in erreurs: messages.error(request, e)
        else:
            with transaction.atomic():
                for note, d, s, sr, absent in updates:
                    note.note_devoir  = d
                    note.note_session = s
                    note.note_sr      = sr
                    note.est_absent   = absent
                    note.save()
            messages.success(request, f"Notes de {etu.nom} {etu.prenom} mises a jour.")
        return redirect('fac_note_individuelle', etudiant_id=etudiant_id)

    return render(request, 'gestion_eleves/faculte/note_individuelle.html', {
        'etudiant': etu, 'notes': notes, 'parcours': etu.get_parcours(),
        'semestres': SEMESTRES_LIST,
    })


# ── DÉLIBÉRATION ──────────────────────────────────────────────
@faculte_required
def fac_deliberation(request):
    facultes = Faculte.objects.all()
    fac_id   = _int(request.GET.get('faculte'))
    sem      = request.GET.get('semestre', '')
    save     = request.GET.get('save') == '1'
    structure, unites = [], []

    if fac_id and sem:
        portail_id = _int(request.GET.get('portail'))
        filiere_id = _int(request.GET.get('filiere'))
        structure, unites = calculer_matrice(fac_id, sem, save_results=save,
                                          portail_id=portail_id, filiere_id=filiere_id)
        if save and structure:
            messages.success(request, f"✅ Résultats de {sem} calculés et archivés.")
        elif save:
            messages.warning(request, "Aucun étudiant trouvé.")

    return render(request, 'gestion_eleves/faculte/deliberation.html', {
        'facultes': facultes, 'structure': structure, 'unites': unites,
        'fac_id': fac_id, 'sem': sem, 'semestres': SEMESTRES_LIST,
    })


# ── EXPORT EXCEL ──────────────────────────────────────────────
@faculte_required
def fac_export_excel(request):
    """Export Excel désactivé — utiliser la Matrice A3."""
    from django.contrib import messages
    messages.info(request, "L'export Excel a été retiré. Utilisez la Matrice A3.")
    return redirect('fac_deliberation')


@faculte_required
def fac_matrice_a3(request):
    from .models import Portail, Filiere as FiliereModel
    facultes     = Faculte.objects.all()
    fac_id       = _int(request.GET.get('faculte'))
    sem_id       = request.GET.get('semestre', '')
    portail_id   = _int(request.GET.get('portail'))
    filiere_id   = _int(request.GET.get('filiere'))
    portails_dispo = list(Portail.objects.filter(faculte_id=fac_id)) if fac_id else []
    filieres_dispo = list(FiliereModel.objects.filter(portail__faculte_id=fac_id)) if fac_id else []

    if not fac_id or not sem_id:
        return render(request, 'gestion_eleves/faculte/matrice_a3_filtre.html', {
            'facultes': facultes, 'fac_id': fac_id, 'sem_id': sem_id,
            'semestres': SEMESTRES_LIST,
            'portails_dispo': portails_dispo, 'filieres_dispo': filieres_dispo,
            'portail_id': portail_id, 'filiere_id': filiere_id,
        })

    faculte = get_object_or_404(Faculte, id=fac_id)
    struct, unites = calculer_matrice(
        fac_id, sem_id, save_results=True,
        portail_id=portail_id, filiere_id=filiere_id
    )

    if not struct:
        messages.warning(request, "Aucun étudiant ou UE trouvé.")
        return render(request, 'gestion_eleves/faculte/matrice_a3_filtre.html', {
            'facultes': facultes, 'fac_id': fac_id, 'sem_id': sem_id,
            'semestres': SEMESTRES_LIST,
            'portails_dispo': portails_dispo, 'filieres_dispo': filieres_dispo,
            'portail_id': portail_id, 'filiere_id': filiere_id,
        })

    params = ParametresUCCB.objects.first()
    titre_sign, nom_sign = faculte.signataire_pv()
    context = {
        'faculte': faculte, 'structure': struct, 'unites': unites,
        'sem_id': sem_id, 'date': datetime.now().strftime('%d/%m/%Y'),
        'parametres': params, 'titre_sign': titre_sign, 'nom_sign': nom_sign,
    }
    html = get_template('gestion_eleves/documents/matrice_a3.html').render(context)
    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = f'inline; filename="MatriceA3_{faculte.code}_{sem_id}.pdf"'
    pisa.CreatePDF(html, dest=response)
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

    parcours_sem = (
        etu.portail.nom if sem_demande in ['S1', 'S2'] and etu.portail
        else etu.filiere.nom if etu.filiere else "—"
    )
    structure, _ = calculer_matrice(None, sem_demande, etudiant_id=etu.id)
    ligne = structure[0] if structure else None

    return render(request, 'gestion_eleves/documents/vue_qr.html', {
        'etudiant':         etu,
        'ligne':            ligne,
        'parcours':         parcours_sem,
        'semestre_affiche': sem_demande,
        'semestres_dispo':  semestres_dispo,
    })
