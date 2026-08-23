from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib import messages

from .models import Etudiant, Faculte, Filiere, Enseignant, Personnel, AnneeAcademique


def portail_accueil(request):
    """Page d'accueil commune — portail central de tous les espaces,
    avec un aperçu chiffré en temps réel de l'université."""
    annee_active = AnneeAcademique.objects.filter(est_active=True).first()

    enseignants_actifs = Enseignant.objects.filter(actif=True)
    if annee_active:
        enseignants_actifs = enseignants_actifs.filter(annee_academique=annee_active)

    return render(request, 'gestion_eleves/accueil/portail.html', {
        'annee_active': annee_active.nom if annee_active else None,
        'total_etudiants': Etudiant.objects.filter(statut='actif').count(),
        'total_facultes': Faculte.objects.count(),
        'total_filieres': Filiere.objects.count(),
        'total_enseignants': enseignants_actifs.count(),
        'total_personnel': Personnel.objects.filter(statut='actif').count(),
    })




def login_secretaire(request):
    # Déjà connecté en secrétaire → dashboard secrétaire
    if request.user.is_authenticated:
        if (request.user.is_superuser or
                request.user.groups.filter(name='Secretariat').exists()):
            return redirect('sec_dashboard')

    if request.method == 'POST':
        username = request.POST.get('username', '').strip()
        password = request.POST.get('password', '')
        user = authenticate(request, username=username, password=password)
        if user is not None:
            if (user.is_superuser or
                    user.groups.filter(name='Secretariat').exists()):
                login(request, user)
                return redirect('sec_dashboard')
        messages.error(request, "Identifiants incorrects ou accès non autorisé.")

    return render(request, 'gestion_eleves/auth/login_secretaire.html')


def logout_secretaire(request):
    logout(request)
    return redirect('login_secretaire')


def login_enseignant(request):
    # Déjà connecté en enseignant ou superuser → dashboard enseignant
    if request.user.is_authenticated:
        if (request.user.is_superuser or
                request.user.groups.filter(name='Enseignant').exists()):
            return redirect('ens_dashboard')

    if request.method == 'POST':
        username = request.POST.get('username', '').strip()
        password = request.POST.get('password', '')
        user = authenticate(request, username=username, password=password)
        if user is not None:
            if (user.is_superuser or
                    user.groups.filter(name='Enseignant').exists()):
                login(request, user)
                return redirect('ens_dashboard')
        messages.error(request, "Identifiants incorrects ou accès non autorisé.")

    return render(request, 'gestion_eleves/auth/login_enseignant.html')


def logout_enseignant(request):
    logout(request)
    return redirect('login_enseignant')

# ── Réinitialisation mot de passe Secrétaire / Enseignant ─────
def reset_mdp_secretaire(request):
    from django.contrib.auth.models import User
    if request.method == 'POST':
        username = request.POST.get('username', '').strip()
        mdp      = request.POST.get('mot_de_passe', '').strip()
        mdp2     = request.POST.get('mot_de_passe2', '').strip()

        if mdp != mdp2:
            messages.error(request, "Les deux mots de passe ne correspondent pas.")
            return render(request, 'gestion_eleves/auth/reset_mdp_secretaire.html')
        if len(mdp) < 6:
            messages.error(request, "Minimum 6 caractères.")
            return render(request, 'gestion_eleves/auth/reset_mdp_secretaire.html')

        try:
            user = User.objects.get(username=username, is_staff=True)
        except User.DoesNotExist:
            messages.error(request, "Identifiant non trouvé ou non autorisé.")
            return render(request, 'gestion_eleves/auth/reset_mdp_secretaire.html')

        user.set_password(mdp)
        user.save()
        messages.success(request, "Mot de passe mis à jour. Connectez-vous.")
        return redirect('login_secretaire')

    return render(request, 'gestion_eleves/auth/reset_mdp_secretaire.html')


def reset_mdp_enseignant(request):
    from django.contrib.auth.models import User
    if request.method == 'POST':
        username = request.POST.get('username', '').strip()
        mdp      = request.POST.get('mot_de_passe', '').strip()
        mdp2     = request.POST.get('mot_de_passe2', '').strip()

        if mdp != mdp2:
            messages.error(request, "Les deux mots de passe ne correspondent pas.")
            return render(request, 'gestion_eleves/auth/reset_mdp_enseignant.html')
        if len(mdp) < 6:
            messages.error(request, "Minimum 6 caractères.")
            return render(request, 'gestion_eleves/auth/reset_mdp_enseignant.html')

        try:
            user = User.objects.get(username=username, is_staff=False)
        except User.DoesNotExist:
            messages.error(request, "Identifiant non trouvé.")
            return render(request, 'gestion_eleves/auth/reset_mdp_enseignant.html')

        user.set_password(mdp)
        user.save()
        messages.success(request, "Mot de passe mis à jour. Connectez-vous.")
        return redirect('login_enseignant')

    return render(request, 'gestion_eleves/auth/reset_mdp_enseignant.html')

# ── LOGIN / LOGOUT ESPACE FACULTÉ ─────────────────────────────
def login_faculte(request):
    """Login Espace Faculté — même logique que l'enseignant."""
    if request.user.is_authenticated:
        if (request.user.is_superuser or
                request.user.groups.filter(name='Enseignant').exists()):
            return redirect('fac_dashboard')

    if request.method == 'POST':
        username = request.POST.get('username', '').strip()
        password = request.POST.get('password', '').strip()
        from django.contrib.auth import authenticate, login as auth_login
        user = authenticate(request, username=username, password=password)
        if user:
            if user.is_superuser or user.groups.filter(name='Enseignant').exists():
                auth_login(request, user)
                return redirect('fac_dashboard')
            else:
                messages.error(request, "Accès non autorisé pour ce compte.")
        else:
            messages.error(request, "Identifiant ou mot de passe incorrect.")

    return render(request, 'gestion_eleves/faculte/login.html')


def logout_faculte(request):
    from django.contrib.auth import logout as auth_logout
    auth_logout(request)
    response = redirect('login_faculte')
    response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    return response


def reset_mdp_faculte(request):
    from django.contrib.auth.models import User
    if request.method == 'POST':
        username = request.POST.get('username', '').strip()
        mdp      = request.POST.get('mot_de_passe', '').strip()
        mdp2     = request.POST.get('mot_de_passe2', '').strip()

        if mdp != mdp2:
            messages.error(request, "Les deux mots de passe ne correspondent pas.")
            return render(request, 'gestion_eleves/faculte/reset_mdp.html')
        if len(mdp) < 6:
            messages.error(request, "Minimum 6 caractères.")
            return render(request, 'gestion_eleves/faculte/reset_mdp.html')

        try:
            user = User.objects.get(username=username)
            if user.is_superuser or user.groups.filter(name='Enseignant').exists():
                user.set_password(mdp)
                user.save()
                messages.success(request, "Mot de passe mis à jour.")
                return redirect('login_faculte')
            else:
                messages.error(request, "Compte non autorisé.")
        except User.DoesNotExist:
            messages.error(request, "Identifiant non trouvé.")

    return render(request, 'gestion_eleves/faculte/reset_mdp.html')


def redirect_to_faculte(request, **kwargs):
    """Redirige les anciens liens /enseignant/* vers l'Espace Faculté."""
    return redirect('login_faculte')


# ── LOGIN / LOGOUT ESPACE RH ──────────────────────────────────
def login_rh(request):
    """Login Espace RH — même logique que les autres espaces (groupe RH)."""
    if request.user.is_authenticated:
        if (request.user.is_superuser or
                request.user.groups.filter(name='RH').exists()):
            return redirect('rh_dashboard')

    if request.method == 'POST':
        username = request.POST.get('username', '').strip()
        password = request.POST.get('password', '').strip()
        user = authenticate(request, username=username, password=password)
        if user:
            if user.is_superuser or user.groups.filter(name='RH').exists():
                login(request, user)
                return redirect('rh_dashboard')
            else:
                messages.error(request, "Accès non autorisé pour ce compte.")
        else:
            messages.error(request, "Identifiant ou mot de passe incorrect.")

    return render(request, 'gestion_eleves/rh/login.html')


def logout_rh(request):
    logout(request)
    response = redirect('login_rh')
    response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    return response


def reset_mdp_rh(request):
    from django.contrib.auth.models import User
    if request.method == 'POST':
        username = request.POST.get('username', '').strip()
        mdp      = request.POST.get('mot_de_passe', '').strip()
        mdp2     = request.POST.get('mot_de_passe2', '').strip()

        if mdp != mdp2:
            messages.error(request, "Les deux mots de passe ne correspondent pas.")
            return render(request, 'gestion_eleves/rh/reset_mdp.html')
        if len(mdp) < 6:
            messages.error(request, "Minimum 6 caractères.")
            return render(request, 'gestion_eleves/rh/reset_mdp.html')

        try:
            user = User.objects.get(username=username)
            if user.is_superuser or user.groups.filter(name='RH').exists():
                user.set_password(mdp)
                user.save()
                messages.success(request, "Mot de passe mis à jour.")
                return redirect('login_rh')
            else:
                messages.error(request, "Compte non autorisé.")
        except User.DoesNotExist:
            messages.error(request, "Identifiant non trouvé.")

    return render(request, 'gestion_eleves/rh/reset_mdp.html')