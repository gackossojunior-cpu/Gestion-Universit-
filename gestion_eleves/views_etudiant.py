from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.utils import timezone
from .models import Etudiant, CompteEtudiant, Note, UniteEnseignement, ResultatSemestre
from .engine import calculer_matrice


# ── Décorateur interface étudiant ──────────────────────────────
def etudiant_required(view_func):
    def wrapper(request, *args, **kwargs):
        if not request.session.get('etudiant_id'):
            return redirect('login_etudiant')
        return view_func(request, *args, **kwargs)
    wrapper.__name__ = view_func.__name__
    return wrapper


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


# ── Inscription ────────────────────────────────────────────────
def inscription_etudiant(request):
    """L'étudiant crée son compte avec son email + mot de passe."""
    if request.session.get('etudiant_id'):
        return redirect('etu_dashboard')

    if request.method == 'POST':
        email = request.POST.get('email', '').strip().lower()
        mdp   = request.POST.get('mot_de_passe', '').strip()
        mdp2  = request.POST.get('mot_de_passe2', '').strip()

        if not email or not mdp:
            messages.error(request, "Email et mot de passe requis.")
            return render(request, 'gestion_eleves/etudiant/inscription.html')

        if mdp != mdp2:
            messages.error(request, "Les deux mots de passe ne correspondent pas.")
            return render(request, 'gestion_eleves/etudiant/inscription.html')

        if len(mdp) < 6:
            messages.error(request, "Le mot de passe doit contenir au moins 6 caractères.")
            return render(request, 'gestion_eleves/etudiant/inscription.html')

        # Vérifier que l'email correspond à un étudiant enregistré
        try:
            etu = Etudiant.objects.get(email=email)
        except Etudiant.DoesNotExist:
            messages.error(request, "Aucun étudiant enregistré avec cet email. Contactez le secrétariat.")
            return render(request, 'gestion_eleves/etudiant/inscription.html')

        # Vérifier qu'il n'a pas déjà un compte
        if CompteEtudiant.objects.filter(etudiant=etu).exists():
            messages.error(request, "Un compte existe déjà pour cet email. Connectez-vous.")
            return redirect('login_etudiant')

        # Créer le compte
        compte = CompteEtudiant(etudiant=etu)
        compte.set_password(mdp)
        compte.save()

        messages.success(request, f"Compte créé avec succès. Bienvenue {etu.prenom} !")
        return redirect('login_etudiant')

    return render(request, 'gestion_eleves/etudiant/inscription.html')


# ── Connexion ─────────────────────────────────────────────────
def login_etudiant(request):
    if request.session.get('etudiant_id'):
        return redirect('etu_dashboard')

    if request.method == 'POST':
        email = request.POST.get('email', '').strip().lower()
        mdp   = request.POST.get('mot_de_passe', '').strip()

        try:
            etu    = Etudiant.objects.get(email=email)
            compte = CompteEtudiant.objects.get(etudiant=etu)
        except (Etudiant.DoesNotExist, CompteEtudiant.DoesNotExist):
            messages.error(request, "Email ou mot de passe incorrect.")
            return render(request, 'gestion_eleves/etudiant/login.html')

        if not compte.actif:
            messages.error(request, "Votre compte a été suspendu. Contactez le secrétariat.")
            return render(request, 'gestion_eleves/etudiant/login.html')

        if not compte.check_password(mdp):
            messages.error(request, "Email ou mot de passe incorrect.")
            return render(request, 'gestion_eleves/etudiant/login.html')

        request.session['etudiant_id'] = etu.id
        request.session['etudiant_nom'] = f"{etu.prenom} {etu.nom.upper()}"
        return redirect('etu_dashboard')

    return render(request, 'gestion_eleves/etudiant/login.html')


# ── Déconnexion ───────────────────────────────────────────────
def logout_etudiant(request):
    request.session.flush()
    return redirect('login_etudiant')


# ── Dashboard étudiant ────────────────────────────────────────
# ── Dashboard étudiant ────────────────────────────────────────
# NOTE MIGRATION REACT : logique et données servies par api_etudiant.py
# (réutilise exactement les mêmes calculs, aucune règle dupliquée).
@etudiant_required
def etu_dashboard(request):
    etu = _get_etudiant_session(request)
    if not etu:
        return redirect('login_etudiant')

    return render(request, 'gestion_eleves/etudiant/dashboard.html', {
        'etudiant': etu,
    })

# ── Réinitialisation mot de passe étudiant ────────────────────
def reset_mdp_etudiant(request):
    """L'étudiant entre son email + nouveau mot de passe. Pas d'email envoyé : il doit connaître son email universitaire."""
    if request.method == 'POST':
        email  = request.POST.get('email', '').strip().lower()
        mdp    = request.POST.get('mot_de_passe', '').strip()
        mdp2   = request.POST.get('mot_de_passe2', '').strip()

        if mdp != mdp2:
            messages.error(request, "Les deux mots de passe ne correspondent pas.")
            return render(request, 'gestion_eleves/etudiant/reset_mdp.html')

        if len(mdp) < 6:
            messages.error(request, "Le mot de passe doit contenir au moins 6 caractères.")
            return render(request, 'gestion_eleves/etudiant/reset_mdp.html')

        try:
            etu    = Etudiant.objects.get(email=email)
            compte = CompteEtudiant.objects.get(etudiant=etu)
        except (Etudiant.DoesNotExist, CompteEtudiant.DoesNotExist):
            messages.error(request, "Aucun compte trouvé avec cet email.")
            return render(request, 'gestion_eleves/etudiant/reset_mdp.html')

        compte.set_password(mdp)
        compte.save()
        messages.success(request, "Mot de passe mis à jour. Vous pouvez vous connecter.")
        return redirect('login_etudiant')

    return render(request, 'gestion_eleves/etudiant/reset_mdp.html')

