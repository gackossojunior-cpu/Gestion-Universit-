from decimal import Decimal
from django.contrib import messages
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.db.models import Sum
from django.utils import timezone
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .models import Bus, Trajet, AffectationTransport
from .serializers import BusSerializer
from gestion_finance.models import Personnel, DepenseTransport
from gestion_finance.utils import save_log


# ═══════════════════════════════════════════════════════════════════════════════
# API (DRF) — lecture des bus, consommée par le module Finance
# ═══════════════════════════════════════════════════════════════════════════════

class BusListAPIView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Bus.objects.all().order_by('numero')
    serializer_class = BusSerializer


# ═══════════════════════════════════════════════════════════════════════════════
# Vues classiques (Bus / Trajets / Affectations)
# ═══════════════════════════════════════════════════════════════════════════════

@login_required
def transports_view(request):
    buses = Bus.objects.all()
    trajets = Trajet.objects.all()
    affectations = AffectationTransport.objects.filter(actif=True)
    personnels = Personnel.objects.all()
    depenses = DepenseTransport.objects.all()

    total_buses = buses.count()
    buses_actifs = buses.filter(statut='actif').count()
    buses_maintenance = buses.filter(statut='maintenance').count()
    buses_hors_service = buses.filter(statut='hors_service').count()
    total_trajets = trajets.count()
    active_affectations = affectations.count()
    total_depenses = depenses.aggregate(total=Sum('montant'))['total'] or Decimal('0')

    context = {
        'buses': buses,
        'trajets': trajets,
        'affectations': affectations,
        'personnels': personnels,
        'depenses': depenses,
        'total_buses': total_buses,
        'buses_actifs': buses_actifs,
        'buses_maintenance': buses_maintenance,
        'buses_hors_service': buses_hors_service,
        'total_trajets': total_trajets,
        'active_affectations': active_affectations,
        'total_depenses': total_depenses,
    }
    return render(request, 'transports.html', context)


@login_required
def add_bus(request):
    if request.method == 'POST':
        numero = request.POST.get('numero')
        plaque = request.POST.get('plaque')
        capacite = int(request.POST.get('capacite', 50))

        bus = Bus.objects.create(
            numero=numero,
            plaque=plaque,
            capacite=capacite,
            statut='actif'
        )

        save_log(request, "Ajout bus", f"Bus {bus.numero} ajouté.")
        messages.success(request, f"Bus {bus.numero} ajouté avec succès.")
    return redirect('transports')


@login_required
def edit_bus(request, id):
    bus = get_object_or_404(Bus, id=id)
    if request.method == 'POST':
        bus.numero = request.POST.get('numero', bus.numero)
        bus.plaque = request.POST.get('plaque', bus.plaque)
        bus.capacite = int(request.POST.get('capacite', bus.capacite))
        bus.statut = request.POST.get('statut', bus.statut)
        bus.save()
        save_log(request, "Bus édité", f"Bus {bus.numero} édité.")
        messages.success(request, f"Bus {bus.numero} modifié avec succès.")
    return redirect('transports')


@login_required
def delete_bus(request, id):
    bus = get_object_or_404(Bus, id=id)
    numero = bus.numero
    bus.delete()
    save_log(request, "Suppression Bus", f"Bus {numero} supprimé")
    messages.success(request, f"Bus {numero} supprimé avec succès.")
    return redirect('transports')


@login_required
def add_trajet(request):
    if request.method == 'POST':
        nom = request.POST.get('nom')
        depart = request.POST.get('depart')
        destination = request.POST.get('destination')
        heure_depart = request.POST.get('heure_depart')
        heure_arrivee = request.POST.get('heure_arrivee')

        trajet = Trajet.objects.create(
            nom=nom,
            depart=depart,
            destination=destination,
            heure_depart=heure_depart,
            heure_arrivee=heure_arrivee
        )

        save_log(request, "Ajout trajet", f"{trajet.nom} créé.")
        messages.success(request, f"Trajet {trajet.nom} ajouté avec succès.")
    return redirect('transports')


@login_required
def delete_trajet(request, id):
    trajet = get_object_or_404(Trajet, id=id)
    nom = trajet.nom
    trajet.delete()
    save_log(request, "Suppression trajet", f"le trajet {nom} supprimé")
    messages.success(request, f"Trajet {nom} supprimé avec succès.")
    return redirect('transports')


@login_required
def add_affectation(request):
    if request.method == 'POST':
        bus_id = request.POST.get('bus_id')
        chauffeur_id = request.POST.get('chauffeur_id')
        trajet_id = request.POST.get('trajet_id')
        date_debut = request.POST.get('date_debut')

        bus = get_object_or_404(Bus, id=bus_id)
        chauffeur = get_object_or_404(Personnel, id=chauffeur_id) if chauffeur_id else None
        trajet = get_object_or_404(Trajet, id=trajet_id)

        affectation = AffectationTransport.objects.create(
            bus=bus,
            chauffeur=chauffeur,
            trajet=trajet,
            date_debut=date_debut,
            actif=True
        )

        save_log(
            request,
            "Affectation",
            f"{chauffeur.name if chauffeur else 'N/A'} affecté au bus {bus.numero}."
        )
        messages.success(request, f"Affectation de transport {affectation.id} créée avec succès.")
    return redirect('transports')


@login_required
def end_affectation(request, id):
    affectation = get_object_or_404(AffectationTransport, id=id)
    affectation.date_fin = timezone.now().date()
    affectation.actif = False
    affectation.save()
    save_log(request, "Fin d'affectation", f"Affectation {affectation.id} terminée.")
    messages.success(request, f"Affectation {affectation.id} terminée.")
    return redirect('transports')