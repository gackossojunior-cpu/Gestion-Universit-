from django.shortcuts import render

from .decorators import rh_required


# ── DASHBOARD ─────────────────────────────────────────────────
@rh_required
def rh_dashboard(request):
    return render(request, 'gestion_eleves/rh/react_shell.html', {
        'entry': 'rh-dashboard', 'page_title': 'Tableau de bord', 'active': 'rh_dashboard',
    })


# ── ENSEIGNANTS (hérités de l'Espace Faculté) ─────────────────
@rh_required
def rh_enseignants(request):
    return render(request, 'gestion_eleves/rh/react_shell.html', {
        'entry': 'rh-enseignants', 'page_title': 'Enseignants', 'active': 'rh_enseignants',
    })


@rh_required
def rh_ajouter_enseignant(request):
    return render(request, 'gestion_eleves/rh/react_shell.html', {
        'entry': 'rh-ajouter-enseignant', 'page_title': 'Ajouter un Enseignant',
        'active': 'rh_ajouter_enseignant',
    })


# ── PERSONNEL ──────────────────────────────────────────────────
@rh_required
def rh_personnel(request):
    return render(request, 'gestion_eleves/rh/react_shell.html', {
        'entry': 'rh-personnel', 'page_title': 'Personnel', 'active': 'rh_personnel',
    })


@rh_required
def rh_ajouter_personnel(request):
    return render(request, 'gestion_eleves/rh/react_shell.html', {
        'entry': 'rh-ajouter-personnel', 'page_title': 'Ajouter un Membre du Personnel',
        'active': 'rh_ajouter_personnel',
    })


# ── ÉTUDIANTS (mêmes données/filtres que l'Espace Secrétariat) ─
# @rh_required
# def rh_etudiants(request):
#     return render(request, 'gestion_eleves/rh/react_shell.html', {
#         'entry': 'rh-etudiants', 'page_title': 'Liste des Étudiants', 'active': 'rh_etudiants',
#     })
