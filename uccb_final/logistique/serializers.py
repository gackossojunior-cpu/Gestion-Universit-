from rest_framework import serializers
from .models import Bus, Trajet, AffectationTransport

class BusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bus
        fields = ['id', 'numero', 'plaque', 'capacite', 'statut']

class TrajetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Trajet
        fields = ['id', 'nom', 'destination', 'heure_depart', 'heure_arrivee']

class AffectationTransportSerializer(serializers.ModelSerializer):
    bus_numero = serializers.CharField(source='bus.numero', read_only=True)
    trajet_nom = serializers.CharField(source='trajet.nom', read_only=True)
    chauffeur_nom = serializers.CharField(source='chauffeur.name', read_only=True)

    class Meta:
        model = AffectationTransport
        fields = [
            'id', 'bus', 'bus_numero', 'trajet_nom',
            'chauffeur', 'chauffeur_nom', 'date_debut', 'date_fin', 'actif',
        ]
