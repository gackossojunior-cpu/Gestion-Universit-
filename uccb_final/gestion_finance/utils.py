from .models import AuditLog

def save_log(request, action, description=""):
    AuditLog.objects.create(
        utilisateur=request.user if request.user.is_authenticated else None,
        action=action,
        description=description,
        adresse_ip=request.META.get("REMOTE_ADDR"),
    )