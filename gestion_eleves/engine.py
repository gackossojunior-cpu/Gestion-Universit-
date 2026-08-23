"""
Moteur de calcul UCCB — v8.1 optimisé et sécurisé.

RÈGLES MÉTIER CORRECTES :
─────────────────────────
1. Note éliminatoire : note SAISIE < 6.0/20 (absent compte 0, non saisi ignoré)
2. Décision ADMIS : moyenne générale du semestre ≥ 10.0 ET aucune note éliminatoire (< 6.0)
3. Crédits acquis :
   - Si ADMIS : TOUS les crédits du semestre sont validés (compensation intégrale entre UEs).
   - Si AJOURNÉ : Seules les UEs ayant une moyenne UE ≥ 10.0 sont capitalisées/validées.
4. Une matière sans note saisie (Non Saisi) est ignorée du calcul (pas pénalisante).
"""
from .models import Etudiant, Note, UniteEnseignement, ResultatSemestre


def _mention(moy: float) -> str:
    if moy < 10.0: return "NÉANT"
    if moy < 12.0: return "PASSABLE"
    if moy < 14.0: return "ASSEZ BIEN"
    if moy < 16.0: return "BIEN"
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

    # Charger toutes les notes de l'étudiant pour ce semestre en UNE seule requête
    notes_map = {
        n.matiere_id: n
        for n in Note.objects.filter(
            etudiant=etu, semestre=sem_id
        ).select_related('matiere')
    }

    # Sélection des UEs correspondant au parcours de l'étudiant (Portail S1-S2 ou Filière S3+)
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

                # Éliminatoire si une note finale saisie (ou absent=0) est < 6.0
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
                'est_validee':      moy_ue >= 10.0,
            })
            pts_total     += pts_ue
            credits_total += cred_ue

        ligne['ues_detail'].append(ue_data)

    # ── Calcul final du semestre ──────────────────────────────
    if credits_total > 0:
        moy = round(pts_total / credits_total, 2)
        ligne['moyenne_semestre'] = moy

        if not ligne['has_eliminatoire'] and moy >= 10.0:
            ligne['decision'] = "ADMIS"
            ligne['mention']  = _mention(moy)
            ligne['total_credits_valides'] = ligne['total_credits_semestre']
            for ud in ligne['ues_detail']:
                ud['est_validee'] = True
        else:
            ligne['decision'] = "AJOURNÉ"
            ligne['mention']  = "NÉANT"
            for ud in ligne['ues_detail']:
                ud['est_validee'] = ud['moyenne_ue'] >= 10.0

            ligne['total_credits_valides'] = sum(
                ud['total_credits_ue']
                for ud in ligne['ues_detail']
                if ud['est_validee']
            )

    return ligne


def calculer_matrice(fac_id, sem_id, etudiant_id=None, save_results=False, portail_id=None, filiere_id=None) -> tuple:
    if not sem_id:
        return [], []

    if etudiant_id:
        etudiants = list(Etudiant.objects.filter(id=etudiant_id).select_related(
            'faculte', 'portail', 'filiere', 'annee_academique'
        ))
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

    if not etudiants:
        return [], []

    target_fac = fac_id if fac_id else etudiants[0].faculte_id

    # Pour un relevé historique d'un seul étudiant : recherche des UEs via ses notes
    unites = []
    if etudiant_id:
        ue_ids_via_notes = list(
            Note.objects.filter(etudiant_id=etudiant_id, semestre=sem_id)
            .values_list('matiere__ue_id', flat=True).distinct()
        )
        if ue_ids_via_notes:
            unites = list(
                UniteEnseignement.objects.filter(id__in=ue_ids_via_notes)
                .prefetch_related('matieres').order_by('code_ue')
            )

    # Si aucune note spécifique, récupération selon le semestre et les filtres
    if not unites:
        qs_ue = UniteEnseignement.objects.filter(semestre=sem_id)
        if sem_id in ['S1', 'S2']:
            qs_ue = qs_ue.filter(portail__faculte_id=target_fac)
            if portail_id:
                qs_ue = qs_ue.filter(portail_id=portail_id)
        else:
            qs_ue = qs_ue.filter(filiere__faculte_id=target_fac)
            if filiere_id:
                qs_ue = qs_ue.filter(filiere_id=filiere_id)

        unites = list(qs_ue.prefetch_related('matieres').order_by('code_ue'))

    if not unites:
        return [], []

    structure = []
    for etu in etudiants:
        etu_sem_original = etu.semestre
        etu_portail_original = etu.portail_id
        etu_filiere_original = etu.filiere_id

        if etudiant_id and sem_id != etu.semestre:
            note_hist = Note.objects.filter(
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

        # Restauration des attributs
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