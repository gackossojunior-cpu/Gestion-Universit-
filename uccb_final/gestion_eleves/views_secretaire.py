from datetime import date, datetime

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
    UniteEnseignement
)

SEMESTRES_LIST = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6']


def _int(val):
    try:
        return int(val) if val else None
    except (ValueError, TypeError):
        return None


# ── DASHBOARD ─────────────────────────────────────────────────
@secretaire_required
def sec_dashboard(request):
    annee_active = AnneeAcademique.objects.filter(est_active=True).first()
    stats = {
        'total':       Etudiant.objects.count(),
        'par_faculte': Faculte.objects.annotate(nb=Count('etudiant')).filter(nb__gt=0),
    }
    recent = Etudiant.objects.select_related(
        'faculte', 'portail', 'filiere', 'annee_academique'
    ).order_by('-id')[:10]
    return render(request, 'gestion_eleves/secretaire/dashboard.html', {
        'stats': stats,
        'annee_active': annee_active,
        'recent': recent,
        'semestres': SEMESTRES_LIST,
    })


# ── LISTE ÉTUDIANTS ───────────────────────────────────────────
@secretaire_required
def sec_liste_etudiants(request):
    facultes   = Faculte.objects.all()
    annees     = AnneeAcademique.objects.all()
    fac_id     = _int(request.GET.get('faculte'))
    sem        = request.GET.get('semestre', '')
    annee_id   = _int(request.GET.get('annee'))
    portail_id = _int(request.GET.get('portail'))
    filiere_id = _int(request.GET.get('filiere'))
    query      = request.GET.get('q', '').strip()

    qs = Etudiant.objects.select_related('faculte', 'portail', 'filiere', 'annee_academique')
    if fac_id:     qs = qs.filter(faculte_id=fac_id)
    if sem:        qs = qs.filter(semestre=sem)
    if annee_id:   qs = qs.filter(annee_academique_id=annee_id)
    if portail_id: qs = qs.filter(portail_id=portail_id)
    if filiere_id: qs = qs.filter(filiere_id=filiere_id)
    if query:
        qs = qs.filter(
            Q(nom__icontains=query) | Q(prenom__icontains=query) |
            Q(matricule__icontains=query) | Q(email__icontains=query)
        )

    portails = Portail.objects.filter(faculte_id=fac_id) if fac_id else []
    filieres = Filiere.objects.filter(
        portail__faculte_id=fac_id
    ).select_related('portail') if fac_id else []

    return render(request, 'gestion_eleves/secretaire/liste_etudiants.html', {
        'etudiants': qs, 'facultes': facultes, 'annees': annees,
        'portails': portails, 'filieres': filieres,
        'fac_id': fac_id, 'sem': sem, 'annee_id': annee_id,
        'portail_id': portail_id, 'filiere_id': filiere_id, 'query': query,
        'semestres': SEMESTRES_LIST,
    })




# ── CHANGER STATUT ÉTUDIANT ───────────────────────────────────
@secretaire_required
def sec_changer_statut(request, etudiant_id):
    """Le secrétaire peut changer le statut d'un étudiant directement."""
    from django.http import JsonResponse
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
    etu    = get_object_or_404(
        Etudiant.objects.select_related('faculte', 'portail', 'filiere', 'annee_academique'),
        id=etudiant_id
    )
    params = ParametresUCCB.objects.first()

    # Semestres disponibles pour l'attestation (tous les semestres avec notes)
    from .models import Note as NoteModel
    semestres_disponibles = list(
        NoteModel.objects.filter(etudiant=etu)
        .values_list('semestre', flat=True)
        .distinct().order_by('semestre')
    )
    # Semestre demandé (par défaut le semestre actuel)
    sem_demande = request.GET.get('semestre', etu.semestre)
    if sem_demande not in semestres_disponibles and semestres_disponibles:
        sem_demande = etu.semestre

    # Déterminer le parcours pour le semestre affiché
    if sem_demande in ['S1', 'S2']:
        parcours_sem = etu.portail.nom if etu.portail else etu.get_parcours()
    else:
        parcours_sem = etu.filiere.nom if etu.filiere else etu.get_parcours()

    return render(request, 'gestion_eleves/documents/attestation.html', {
        'etudiant':            etu,
        'parametres':          params,
        'titre':               etu.get_titre(),
        'qualite':             etu.get_qualite(),
        'parcours':            parcours_sem,
        'titre_secretaire':    params.titre_secretaire() if params else "Le Secrétaire Universitaire",
        'date':                date.today().strftime('%d/%m/%Y'),
        'semestre_affiche':    sem_demande,
        'semestres_disponibles': semestres_disponibles,
        'semestre_selectionne':  sem_demande,
    })


# ── RELEVÉ (avec sélection du semestre historique) ───────────
@secretaire_required
def sec_releve(request, etudiant_id):
    etu    = get_object_or_404(
        Etudiant.objects.select_related('faculte', 'portail', 'filiere', 'annee_academique'),
        id=etudiant_id
    )
    params = ParametresUCCB.objects.first()

    # Semestres pour lesquels cet étudiant a des notes enregistrées
    from .models import Note
    semestres_avec_notes = list(
        Note.objects.filter(etudiant=etu)
        .values_list('semestre', flat=True)
        .distinct()
        .order_by('semestre')
    )

    # Toujours inclure au minimum le semestre actuel
    if etu.semestre not in semestres_avec_notes:
        semestres_avec_notes.append(etu.semestre)

    # Semestre demandé (par défaut : semestre actuel)
    sem_demande = request.GET.get('semestre', etu.semestre)
    if sem_demande not in semestres_avec_notes and semestres_avec_notes:
        sem_demande = semestres_avec_notes[-1]  # dernier semestre avec notes

    # Parcours pour le semestre affiché — retrouver depuis les notes si l'étudiant a changé de sem
    if sem_demande in ['S1', 'S2']:
        if etu.portail:
            parcours_sem = etu.portail.nom
        else:
            # Étudiant passé en S3+ : retrouver son portail via les UE de ses notes
            from .models import Note as NoteHist, UniteEnseignement
            note_hist = NoteHist.objects.filter(
                etudiant=etu, semestre=sem_demande
            ).select_related('matiere__ue__portail').first()
            if note_hist and note_hist.matiere.ue.portail:
                parcours_sem = note_hist.matiere.ue.portail.nom
            else:
                parcours_sem = "Tronc Commun"
    else:
        if etu.filiere:
            parcours_sem = etu.filiere.nom
        else:
            from .models import Note as NoteHist
            note_hist = NoteHist.objects.filter(
                etudiant=etu, semestre=sem_demande
            ).select_related('matiere__ue__filiere').first()
            if note_hist and note_hist.matiere.ue.filiere:
                parcours_sem = note_hist.matiere.ue.filiere.nom
            else:
                parcours_sem = "Spécialisation"

    structure, _ = calculer_matrice(None, sem_demande, etudiant_id=etu.id, save_results=False)
    donnees = structure[0] if structure else {}

    return render(request, 'gestion_eleves/documents/releve_notes.html', {
        'etudiant':               etu,
        'parametres':             params,
        'titre':                  etu.get_titre(),
        'qualite':                etu.get_qualite(),
        'parcours':               parcours_sem,
        'semestre_affiche':       sem_demande,
        'semestres_disponibles':  semestres_avec_notes,
        'semestre_selectionne':   sem_demande,
        'titre_secretaire':       params.titre_secretaire() if params else "Le Secrétaire Universitaire",
        'structure':              donnees.get('ues_detail', []),
        'moyenne_generale':       donnees.get('moyenne_semestre', 0),
        'total_credits_valides':  donnees.get('total_credits_valides', 0),
        'total_credits_semestre': donnees.get('total_credits_semestre', 0),
        'decision':               donnees.get('decision', 'AJOURNÉ'),
        'mention':                donnees.get('mention', 'NÉANT'),
        'date':                   datetime.now().strftime('%d/%m/%Y'),
    })


# ── MATRICE A3 ────────────────────────────────────────────────
@secretaire_required
def sec_matrice_a3(request):
    from .models import Portail, Filiere as FiliereModel
    facultes     = Faculte.objects.all()
    fac_id       = _int(request.GET.get('faculte'))
    sem_id       = request.GET.get('semestre', '')
    portail_id   = _int(request.GET.get('portail'))
    filiere_id   = _int(request.GET.get('filiere'))
    portails_dispo = list(Portail.objects.filter(faculte_id=fac_id)) if fac_id else []
    filieres_dispo = list(FiliereModel.objects.filter(portail__faculte_id=fac_id)) if fac_id else []
    facultes = Faculte.objects.all()
    fac_id   = _int(request.GET.get('faculte'))
    sem_id   = request.GET.get('semestre', '')

    if not fac_id or not sem_id:
        return render(request, 'gestion_eleves/secretaire/matrice_a3_filtre.html', {
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

    faculte = get_object_or_404(Faculte, id=fac_id)
    struct, unites = calculer_matrice(fac_id, sem_id, save_results=True)

    if not struct:
        messages.warning(request, "Aucun étudiant ou UE trouvé.")
        return render(request, 'gestion_eleves/secretaire/matrice_a3_filtre.html', {
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
    toutes_matieres = [
        {'ue': ue, 'mat': mat}
        for ue in unites for mat in ue.matieres.all()
    ]

    context = {
        'faculte': faculte, 'structure': struct, 'unites': unites,
        'toutes_matieres': toutes_matieres, 'sem_id': sem_id,
        'date': datetime.now().strftime('%d/%m/%Y'),
        'parametres': params, 'titre_sign': titre_sign, 'nom_sign': nom_sign,
    }
    html     = get_template('gestion_eleves/documents/matrice_a3.html').render(context)
    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = f'inline; filename="Matrice_{faculte.code}_{sem_id}.pdf"'
    pisa.CreatePDF(html, dest=response)
    return response


# ── PROMOTION ─────────────────────────────────────────────────
@faculte_required
def sec_promotion(request):
    facultes = Faculte.objects.all()
    fac_id   = _int(request.GET.get('faculte'))
    sem      = request.GET.get('semestre', '')

    etudiants, resultats_map = [], {}
    if fac_id and sem:
        etudiants = list(
            Etudiant.objects.filter(faculte_id=fac_id, semestre=sem)
            .select_related('faculte', 'portail', 'filiere').order_by('nom', 'prenom')
        )
        for r in ResultatSemestre.objects.filter(etudiant__in=etudiants, semestre=sem):
            resultats_map[r.etudiant_id] = r

    return render(request, 'gestion_eleves/faculte/promotion.html', {
        'facultes': facultes, 'etudiants': etudiants,
        'resultats_map': resultats_map,
        'fac_id': fac_id, 'semestre_selected': sem,
        'semestres': SEMESTRES_LIST,
    })


@faculte_required
def sec_appliquer_promotion(request):
    if request.method != 'POST':
        return redirect('sec_promotion')

    ids    = request.POST.getlist('etudiants_selectionnes')
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
                    if filiere.portail.faculte_id != etu.faculte_id:
                        raise ValueError(f"Filière '{filiere.nom}' incohérente.")
                    etu.semestre = 'S3'
                    etu.filiere  = filiere
                    etu.portail  = None
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
    admis_ids = ResultatSemestre.objects.filter(
        semestre='S2', decision='ADMIS'
    ).values_list('etudiant_id', flat=True)

    etudiants = Etudiant.objects.filter(
        id__in=admis_ids, semestre='S2'
    ).select_related('faculte', 'portail').order_by('nom')

    if request.method == 'POST':
        manquants = [e for e in etudiants if not request.POST.get(f'filiere_{e.id}')]
        if manquants:
            messages.error(request, "Choisissez une filière pour chaque étudiant.")
        else:
            try:
                with transaction.atomic():
                    n = 0
                    for etu in etudiants:
                        fil = get_object_or_404(Filiere, id=request.POST.get(f'filiere_{etu.id}'))
                        if fil.portail.faculte_id != etu.faculte_id:
                            raise ValueError(f"Filière '{fil.nom}' incohérente.")
                        etu.semestre = 'S3'
                        etu.filiere  = fil
                        etu.portail  = None
                        etu.save()
                        n += 1
                messages.success(request, f"{n} étudiant(s) basculé(s) en S3.")

                return redirect('fac_dashboard')

            except Exception as e:
                messages.error(request, f"Erreur : {e}")

    return render(request, 'gestion_eleves/faculte/orientation_s3.html',
                  {'etudiants': etudiants, 'semestres': SEMESTRES_LIST})


# ── API AJAX ──────────────────────────────────────────────────
def api_portails(request):
    fac_id = request.GET.get('faculte_id', '')
    data   = list(Portail.objects.filter(faculte_id=fac_id).values('id', 'nom', 'code')) if fac_id else []
    return JsonResponse({'portails': data})


def api_filieres(request):
    fac_id = request.GET.get('faculte_id', '')
    data   = list(
        Filiere.objects.filter(portail__faculte_id=fac_id).values('id', 'nom', 'code', 'portail__nom')
    ) if fac_id else []
    return JsonResponse({'filieres': data})


def api_ues(request):
    fac_id = request.GET.get('faculte_id', '')
    sem    = request.GET.get('semestre', '')
    if not fac_id or not sem:
        return JsonResponse({'ues': []})
    if sem in ['S1', 'S2']:
        ues = UniteEnseignement.objects.filter(
            semestre=sem, portail__faculte_id=fac_id
        ).values('id', 'nom', 'code_ue')
    else:
        ues = UniteEnseignement.objects.filter(
            semestre=sem, filiere__portail__faculte_id=fac_id
        ).values('id', 'nom', 'code_ue')
    return JsonResponse({'ues': list(ues)})

# ── GESTION ÉTUDIANTS ────────────────────────────────────────
@secretaire_required
def sec_ajouter_etudiant(request):
    """Formulaire d'ajout d'étudiant depuis le secrétariat."""
    from .models import Faculte, Portail, Filiere, AnneeAcademique
    
    facultes  = Faculte.objects.all().order_by('nom')
    portails  = Portail.objects.all().select_related('faculte').order_by('nom')
    filieres  = Filiere.objects.all().select_related('portail').order_by('nom')
    annees    = AnneeAcademique.objects.all().order_by('-nom')
    SEMESTRES = ['S1','S2','S3','S4','S5','S6','S7','S8','S9','S10']

    if request.method == 'POST':
        try:
            nom            = request.POST.get('nom','').strip().upper()
            prenom         = request.POST.get('prenom','').strip()
            genre          = request.POST.get('genre','')
            date_naissance = request.POST.get('date_naissance','')
            nationalite    = request.POST.get('nationalite','Congolaise').strip()
            email          = request.POST.get('email','').strip().lower()
            faculte_id     = request.POST.get('faculte')
            portail_id     = request.POST.get('portail') or None
            filiere_id     = request.POST.get('filiere') or None
            annee_id       = request.POST.get('annee_academique')
            semestre       = request.POST.get('semestre','S1')
            en_regle       = request.POST.get('en_regle') == 'on'

            if not all([nom, prenom, genre, date_naissance, email, faculte_id, annee_id]):
                messages.error(request, "Tous les champs obligatoires doivent être remplis.")
            elif Etudiant.objects.filter(email=email).exists():
                messages.error(request, f"Un étudiant avec l'email {email} existe déjà.")
            else:
                etu = Etudiant(
                    nom=nom, prenom=prenom, genre=genre,
                    date_naissance=date_naissance,
                    nationalite=nationalite, email=email,
                    faculte_id=faculte_id,
                    portail_id=portail_id,
                    filiere_id=filiere_id,
                    annee_academique_id=annee_id,
                    semestre=semestre,
                    en_regle=en_regle,
                    statut='actif',
                )
                etu.save()
                messages.success(request, f"Étudiant {nom} {prenom} enregistré avec le matricule {etu.matricule}.")
                return redirect('sec_liste_etudiants')
        except Exception as e:
            messages.error(request, f"Erreur lors de l'enregistrement : {e}")

    return render(request, 'gestion_eleves/secretaire/ajouter_etudiant.html', {
        'facultes': facultes, 'portails': portails,
        'filieres': filieres, 'annees':   annees,
        'semestres': SEMESTRES,
    })


@secretaire_required
def sec_annees_academiques(request):
    """Gestion des années académiques."""
    from .models import AnneeAcademique
    annees = AnneeAcademique.objects.all().order_by('-nom')

    if request.method == 'POST':
        action = request.POST.get('action')
        if action == 'ajouter':
            nom = request.POST.get('nom','').strip()
            activer = request.POST.get('activer') == 'on'
            if nom:
                if activer:
                    AnneeAcademique.objects.update(est_active=False)
                AnneeAcademique.objects.create(nom=nom, est_active=activer)
                messages.success(request, f"Année {nom} ajoutée.")
            else:
                messages.error(request, "Le nom de l'année est requis (ex: 2025-2026).")
        elif action == 'activer':
            annee_id = request.POST.get('annee_id')
            AnneeAcademique.objects.update(est_active=False)
            AnneeAcademique.objects.filter(id=annee_id).update(est_active=True)
            messages.success(request, "Année académique activée.")
        return redirect('sec_annees_academiques')

    return render(request, 'gestion_eleves/secretaire/annees_academiques.html', {
        'annees': annees,
    })


@secretaire_required  
def sec_facultes(request):
    """Gestion des facultés depuis le secrétariat."""
    from .models import Faculte
    facultes = Faculte.objects.all().order_by('nom')

    if request.method == 'POST':
        nom  = request.POST.get('nom','').strip()
        code = request.POST.get('code','').strip().upper()
        if nom and code:
            Faculte.objects.get_or_create(code=code, defaults={'nom': nom})
            messages.success(request, f"Faculté {nom} ({code}) ajoutée.")
        else:
            messages.error(request, "Nom et code obligatoires.")
        return redirect('sec_facultes')

    return render(request, 'gestion_eleves/secretaire/facultes.html', {
        'facultes': facultes,
    })
