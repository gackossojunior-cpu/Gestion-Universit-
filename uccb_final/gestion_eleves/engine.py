"""
Moteur de calcul UCCB — v7 corrigé.

RÈGLES MÉTIER CORRECTES :
─────────────────────────
1. Note éliminatoire : note SAISIE < 6/20 (absent compte 0, non saisi ignoré)
2. Décision ADMIS : moyenne ≥ 10 ET aucune note éliminatoire
3. Crédits acquis = TOUS les crédits du semestre si ADMIS
   (pas seulement les UE ≥ 10 — la compensation joue entre UEs)
4. Une matière sans note saisie est ignorée du calcul (pas pénalisante)
"""
from .models import Etudiant, Note, UniteEnseignement, ResultatSemestre


def _mention(moy: float) -> str:
    if moy < 10:  return "NÉANT"
    if moy < 12:  return "PASSABLE"
    if moy < 14:  return "ASSEZ BIEN"
    if moy < 16:  return "BIEN"
    return "TRÈS BIEN"


def calculer_ligne_etudiant(etu, sem_id: str, ues_disponibles: list) -> dict:
    ligne = {
        'etudiant':               etu,
        'ues_detail':             [],
        'moyenne_semestre':       0.0,
        'has_eliminatoire':       False,
        'decision':               "AJOURNÉ",
        'mention':                "NÉANT",
        'total_credits_valides':  0,
        'total_credits_semestre': 0,
        'rang':                   0,
    }

    # Charger toutes les notes en UNE requête
    notes_map = {
        n.matiere_id: n
        for n in Note.objects.filter(
            etudiant=etu, semestre=sem_id
        ).select_related('matiere')
    }

    # UEs de cet étudiant
    if sem_id in ['S1', 'S2']:
        ues_etu = [u for u in ues_disponibles if u.portail_id == etu.portail_id]
    else:
        ues_etu = [u for u in ues_disponibles if u.filiere_id == etu.filiere_id]

    pts_total, credits_total = 0.0, 0

    for ue in ues_etu:
        ue_data = {
            'ue':               ue,
            'matieres':         [],
            'moyenne_ue':       0.0,
            'total_points_ue':  0.0,
            'total_credits_ue': 0,
            'est_validee':      False,
        }
        pts_ue, cred_ue = 0.0, 0

        for mat in ue.matieres.all():
            note_obj  = notes_map.get(mat.id)
            is_absent = note_obj.est_absent if note_obj else False
            non_saisi = note_obj is None

            if note_obj is not None:
                n_finale = float(note_obj.moyenne_stockee)
                note_d   = float(note_obj.note_devoir)
                note_s   = float(note_obj.note_session)
                note_sr  = float(note_obj.note_sr) if note_obj.note_sr is not None else None
                # Éliminatoire uniquement si note SAISIE (ou absent=0) < 6
                if n_finale < 6.0:
                    ligne['has_eliminatoire'] = True
                pts_ue  += n_finale * mat.credits
                cred_ue += mat.credits
            else:
                # Non saisi → ignoré
                n_finale = None
                note_d = note_s = note_sr = None

            ue_data['matieres'].append({
                'matiere':       mat,
                'note_calculee': n_finale,
                'note_devoir':   note_d,
                'note_session':  note_s,
                'note_sr':       note_sr,
                'is_absent':     is_absent,
                'non_saisi':     non_saisi,
            })

        credits_ue_total = sum(m.credits for m in ue.matieres.all())
        ligne['total_credits_semestre'] += credits_ue_total

        if cred_ue > 0:
            moy_ue = round(pts_ue / cred_ue, 2)
            ue_data.update({
                'moyenne_ue':       moy_ue,
                'total_points_ue':  round(pts_ue, 2),
                'total_credits_ue': cred_ue,
                # UE validée = moyenne UE ≥ 10
                'est_validee':      moy_ue >= 6,
            })
            pts_total     += pts_ue
            credits_total += cred_ue

        ligne['ues_detail'].append(ue_data)

    # ── Calcul final ──────────────────────────────────────────
    if credits_total > 0:
        moy = round(pts_total / credits_total, 2)
        ligne['moyenne_semestre'] = moy

        if not ligne['has_eliminatoire'] and moy >= 10:
            ligne['decision'] = "ADMIS"
            ligne['mention']  = _mention(moy)
            # ADMIS → tous les crédits acquis par compensation, toutes UE validées
            ligne['total_credits_valides'] = ligne['total_credits_semestre']
            for ud in ligne['ues_detail']:
                ud['est_validee'] = True
        else:
            # AJOURNÉ → UE validée si moyenne >= 6
            for ud in ligne['ues_detail']:
                ud['est_validee'] = ud['moyenne_ue'] >= 6
            ligne['total_credits_valides'] = sum(
                ud['total_credits_ue']
                for ud in ligne['ues_detail']
                if ud['est_validee']
            )

    return ligne


def calculer_matrice(fac_id, sem_id, etudiant_id=None, save_results=False, portail_id=None, filiere_id=None
) -> tuple:
    if not sem_id:
        return [], []

    if etudiant_id:
        etudiants = Etudiant.objects.filter(id=etudiant_id).select_related(
            'faculte', 'portail', 'filiere', 'annee_academique'
        )
    elif fac_id:
        qs = Etudiant.objects.filter(
            faculte__id=fac_id, semestre=sem_id, statut='actif'
        ).select_related('faculte', 'portail', 'filiere', 'annee_academique')
        if portail_id:
            qs = qs.filter(portail_id=portail_id)
        if filiere_id:
            qs = qs.filter(filiere_id=filiere_id)
        etudiants = list(qs)
    else:
        return [], []

    if not etudiants.exists():
        return [], []

    target_fac = fac_id if fac_id else etudiants.first().faculte_id

    # Pour un relevé historique d'un seul étudiant, on cherche d'abord les UE
    # via les notes réellement enregistrées pour ce semestre (le plus fiable),
    # puis on retombe sur le filtre par faculté si aucune note n'existe encore.
    unites = []
    if etudiant_id:
        from .models import Note as NoteHist
        ue_ids_via_notes = list(
            NoteHist.objects.filter(etudiant_id=etudiant_id, semestre=sem_id)
            .values_list('matiere__ue_id', flat=True).distinct()
        )
        if ue_ids_via_notes:
            unites = list(
                UniteEnseignement.objects.filter(id__in=ue_ids_via_notes)
                .prefetch_related('matieres').order_by('code_ue')
            )

    if not unites:
        if sem_id in ['S1', 'S2']:
            unites = list(
                UniteEnseignement.objects.filter(
                    semestre=sem_id, portail__faculte_id=target_fac
                ).prefetch_related('matieres').order_by('code_ue')
            )
        else:
            unites = list(
                UniteEnseignement.objects.filter(
                    semestre=sem_id, filiere__portail__faculte_id=target_fac
                ).prefetch_related('matieres').order_by('code_ue')
            )

    if not unites:
        return [], []

    structure = []
    for etu in etudiants:
        # Pour les relevés historiques : si l'étudiant est passé en semestre
        # supérieur, il n'a plus le portail/filière d'origine. On ajuste
        # temporairement pour le calcul sans modifier l'objet en base.
        etu_sem_original = etu.semestre
        etu_portail_original = etu.portail_id
        etu_filiere_original = etu.filiere_id

        if etudiant_id and sem_id != etu.semestre:
            # Semestre historique : on cherche le portail/filière correspondant
            # via les notes saisies pour ce semestre
            from .models import Note as NoteHist
            note_hist = NoteHist.objects.filter(
                etudiant=etu, semestre=sem_id
            ).select_related('matiere__ue').first()
            if note_hist:
                ue_hist = note_hist.matiere.ue
                if sem_id in ['S1', 'S2'] and ue_hist.portail_id:
                    etu.portail_id = ue_hist.portail_id
                    etu.filiere_id = None
                elif sem_id not in ['S1', 'S2'] and ue_hist.filiere_id:
                    etu.filiere_id = ue_hist.filiere_id
                    etu.portail_id = None

        ligne = calculer_ligne_etudiant(etu, sem_id, unites)

        # Restaurer les valeurs originales
        etu.semestre   = etu_sem_original
        etu.portail_id = etu_portail_original
        etu.filiere_id = etu_filiere_original

        if save_results and ligne['total_credits_semestre'] > 0:
            ResultatSemestre.objects.update_or_create(
                etudiant=etu,
                semestre=sem_id,
                annee=etu.annee_academique,
                defaults={
                    'moyenne_generale': ligne['moyenne_semestre'],
                    'credits_obtenus':  ligne['total_credits_valides'],
                    'credits_totaux':   ligne['total_credits_semestre'],
                    'decision':         ligne['decision'],
                    'mention':          ligne['mention'],
                    'est_archive':      True,
                }
            )
        structure.append(ligne)

    structure.sort(key=lambda x: x['moyenne_semestre'], reverse=True)
    for i, l in enumerate(structure):
        l['rang'] = i + 1

    return structure, unites
