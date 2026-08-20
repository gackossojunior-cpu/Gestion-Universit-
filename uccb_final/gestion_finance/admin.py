from django.contrib import admin
from .models import (
    AuditLog, DossierFinancier, Transaction, Enseignant,
    Personnel, DepenseTransport
)


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = (
        "date",
        "utilisateur",
        "action",
        "adresse_ip"
    )

    readonly_fields = (
        "utilisateur",
        "action",
        "description",
        "adresse_ip",
        "date"
    )

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(DossierFinancier)
class DossierFinancierAdmin(admin.ModelAdmin):
    list_display = ("etudiant", "montant_total", "montant_paye", "statut", "date_paiement")
    list_filter = ("statut", "mode_paiement")
    search_fields = ("etudiant__nom", "etudiant__prenom", "etudiant__matricule")


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ("text", "amount", "created_at")
    list_filter = ("created_at",)
    search_fields = ("text",)


@admin.register(Enseignant)
class EnseignantAdmin(admin.ModelAdmin):
    list_display = ("name", "type", "salaire", "statut", "mois_concerne")
    list_filter = ("type", "statut")
    search_fields = ("name", "matricule")


@admin.register(Personnel)
class PersonnelAdmin(admin.ModelAdmin):
    list_display = ("name", "poste", "salaire", "statut", "mois_concerne")
    list_filter = ("poste", "statut")
    search_fields = ("name", "matricule")


@admin.register(DepenseTransport)
class DepenseTransportAdmin(admin.ModelAdmin):
    list_display = ("bus", "type_depense", "montant", "date")
    list_filter = ("type_depense",)