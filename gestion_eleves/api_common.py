"""
Aides communes aux API JSON. On réutilise la même logique d'autorisation
que decorators.py (superuser OU groupe requis), mais on renvoie une
réponse JSON 401/403 au lieu d'une redirection HTML — plus adapté à du
fetch() côté React.
"""
from rest_framework.response import Response
from rest_framework import status


def require_group(request, group_name):
    """Renvoie une Response d'erreur si l'accès est refusé, sinon None."""
    if not request.user.is_authenticated:
        return Response({'detail': 'Authentification requise.'}, status=status.HTTP_401_UNAUTHORIZED)
    if request.user.is_superuser or request.user.groups.filter(name=group_name).exists():
        return None
    return Response({'detail': 'Accès refusé.'}, status=status.HTTP_403_FORBIDDEN)


def require_faculte(request):
    return require_group(request, 'Enseignant')


def require_secretariat(request):
    return require_group(request, 'Secretariat')


def to_int(val):
    try:
        return int(val) if val else None
    except (ValueError, TypeError):
        return None
