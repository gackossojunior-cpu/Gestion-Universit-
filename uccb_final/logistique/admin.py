from django.contrib import admin
from .models import Bus, Trajet, AffectationTransport


@admin.register(Bus)
class BusAdmin(admin.ModelAdmin):
    list_display = ("numero", "plaque", "capacite", "statut", "chauffeur_actuel")
    list_filter = ("statut",)
    search_fields = ("numero", "plaque")


@admin.register(Trajet)
class TrajetAdmin(admin.ModelAdmin):
    list_display = ("nom", "depart", "destination", "heure_depart", "heure_arrivee")
    search_fields = ("nom", "depart", "destination")


@admin.register(AffectationTransport)
class AffectationTransportAdmin(admin.ModelAdmin):
    list_display = ("bus", "chauffeur", "trajet", "date_debut", "date_fin", "actif")
    list_filter = ("actif",)
