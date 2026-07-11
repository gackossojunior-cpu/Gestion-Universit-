from functools import wraps
from django.shortcuts import redirect
from django.contrib import messages


def secretaire_required(view_func):
    """Accès : superuser OU groupe Secretariat."""
    @wraps(view_func)
    def _wrapped(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect('login_secretaire')
        if (request.user.is_superuser or
                request.user.groups.filter(name='Secretariat').exists()):
            return view_func(request, *args, **kwargs)
        messages.error(request, "Accès réservé au Secrétariat Universitaire.")
        return redirect('login_secretaire')
    return _wrapped


def enseignant_required(view_func):
    """
    Accès : groupe Enseignant OU superuser.
    Le superuser peut accéder aux deux interfaces.
    """
    @wraps(view_func)
    def _wrapped(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect('login_enseignant')
        if (request.user.is_superuser or
                request.user.groups.filter(name='Enseignant').exists()):
            return view_func(request, *args, **kwargs)
        messages.error(request, "Accès réservé aux Enseignants.")
        return redirect('login_enseignant')
    return _wrapped


def faculte_required(view_func):
    """
    Espace Faculté — même accès que enseignant_required.
    Groupe Enseignant OU superuser.
    """
    @wraps(view_func)
    def _wrapped(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect('login_faculte')
        if (request.user.is_superuser or
                request.user.groups.filter(name='Enseignant').exists()):
            return view_func(request, *args, **kwargs)
        messages.error(request, "Accès réservé à l'Espace Faculté.")
        return redirect('login_faculte')
    return _wrapped
